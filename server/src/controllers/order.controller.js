// src/controllers/order.controller.js
const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Order, ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHODS } = require('../models/Order.model');
const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');
const Seller = require('../models/Seller.model');
const User = require('../models/User.model');
const Setting = require('../models/Setting.model');
const { v4: uuidv4 } = require('uuid');

/**
 * Validate a coupon code against admin platform settings
 * POST /api/orders/validate-coupon
 * @body { code, subtotal }
 */
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, subtotal = 0 } = req.body;
  const normalizedCode = (code || '').trim().toUpperCase();

  if (!normalizedCode) {
    throw new ApiError(400, 'Coupon code is required');
  }

  const settings = await Setting.getSettings();
  const coupons = settings.couponCodes || [];

  const coupon = coupons.find(
    (c) => c.code && c.code.trim().toUpperCase() === normalizedCode
  );

  if (!coupon) {
    throw new ApiError(400, `Coupon "${normalizedCode}" is invalid`);
  }

  if (coupon.isActive === false) {
    throw new ApiError(400, `Coupon "${normalizedCode}" is no longer active`);
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    throw new ApiError(400, `Coupon "${normalizedCode}" has expired`);
  }

  if (
    coupon.usageLimit !== null &&
    coupon.usageLimit !== undefined &&
    coupon.usedCount >= coupon.usageLimit
  ) {
    throw new ApiError(400, `Coupon "${normalizedCode}" usage limit has been reached`);
  }

  const numericSubtotal = Number(subtotal) || 0;
  if (coupon.minOrderAmount > 0 && numericSubtotal < coupon.minOrderAmount) {
    throw new ApiError(
      400,
      `Minimum order amount for coupon "${normalizedCode}" is ৳${coupon.minOrderAmount.toFixed(2)}`
    );
  }

  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    discountAmount = (numericSubtotal * (Number(coupon.discount) || 0)) / 100;
  } else {
    discountAmount = Math.min(numericSubtotal, Number(coupon.discount) || 0);
  }

  res.status(200).json({
    success: true,
    data: {
      code: coupon.code,
      discount: coupon.discount,
      discountType: coupon.discountType || 'percentage',
      discountAmount: Number(discountAmount.toFixed(2)),
      minOrderAmount: coupon.minOrderAmount || 0,
    },
    message: `Coupon ${coupon.code} applied successfully!`
  });
});

/**
 * Create orders from cart (checkout)
 * POST /api/orders
 * @body { shippingAddress, paymentMethod, couponCode, notes }
 */
const createOrders = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { 
    shippingAddress, 
    paymentMethod = 'COD', 
    couponCode, 
    notes,
    items: customItems 
  } = req.body;

  let checkoutItems = [];

  if (customItems && customItems.length > 0) {
    for (const cItem of customItems) {
      const product = await Product.findById(cItem.productId);
      if (!product) {
        throw new ApiError(404, `Product not found`);
      }
      const qty = Number(cItem.quantity) || 1;
      if (product.stock < qty) {
        throw new ApiError(400, `Insufficient stock for ${product.name}`);
      }
      checkoutItems.push({
        productId: product,
        quantity: qty,
        price: Number(cItem.price ?? product.price ?? 0)
      });
    }
  } else {
    // Get user's cart
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      throw new ApiError(400, 'Cart is empty');
    }
    checkoutItems = cart.items;
  }

  // Validate payment method
  const validPaymentMethods = Object.values(PAYMENT_METHODS); // ['PORTPOS', 'COD']
  if (!validPaymentMethods.includes(paymentMethod)) {
    throw new ApiError(400, 'Invalid payment method. Allowed methods: PORTPOS, COD');
  }

  // Check coupon validity if provided
  let validCouponObj = null;
  if (couponCode) {
    const settings = await Setting.getSettings();
    const normalizedCode = couponCode.trim().toUpperCase();
    const foundCoupon = (settings.couponCodes || []).find(
      (c) => c.code && c.code.trim().toUpperCase() === normalizedCode && c.isActive !== false
    );
    if (foundCoupon) {
      validCouponObj = foundCoupon;
      foundCoupon.usedCount = (foundCoupon.usedCount || 0) + 1;
      await settings.save();
    }
  }

  // Group cart items by sellerId
  const itemsBySeller = {};
  for (const item of checkoutItems) {
    const product = item.productId;
    if (!product) continue;
    const rawSeller = product.sellerId || product.seller || userId;
    const sellerId = rawSeller.toString();

    if (!itemsBySeller[sellerId]) {
      itemsBySeller[sellerId] = [];
    }

    if (product.stock < item.quantity) {
      throw new ApiError(400, `Insufficient stock for ${product.name}`);
    }

    let catId = product.category;
    if (catId && typeof catId === 'object' && catId._id) {
      catId = catId._id;
    }
    if (!mongoose.Types.ObjectId.isValid(catId)) {
      catId = undefined;
    }

    const formattedImages = Array.isArray(product.images)
      ? product.images.map((img) =>
          typeof img === 'string' ? { url: img } : { url: img?.url || '' }
        )
      : [];

    itemsBySeller[sellerId].push({
      productId: product._id,
      name: product.name,
      price: item.price || product.price,
      quantity: item.quantity,
      productSnapshot: {
        images: formattedImages,
        description: product.description || '',
        category: catId
      }
    });
  }

  // Create a checkout session ID for grouping
  const checkoutSessionId = uuidv4();
  const sellerIds = Object.keys(itemsBySeller);
  const orderDocs = [];
  const totalAmounts = {};

  for (const sellerId of sellerIds) {
    const items = itemsBySeller[sellerId];
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const commissionRate = parseFloat(process.env.DEFAULT_COMMISSION_RATE) || 5;
    const commissionAmount = (subtotal * commissionRate) / 100;
    const shippingCharge = subtotal >= 100 ? 0 : 50;

    let discount = 0;
    if (validCouponObj) {
      if (validCouponObj.discountType === 'percentage') {
        discount = (subtotal * (Number(validCouponObj.discount) || 0)) / 100;
      } else {
        discount = Math.min(subtotal, Number(validCouponObj.discount) || 0);
      }
    }
    discount = Number(discount.toFixed(2));
    const totalAmount = Math.max(0, Number((subtotal - discount + shippingCharge).toFixed(2)));

    const validSellerId = mongoose.Types.ObjectId.isValid(sellerId)
      ? sellerId
      : userId;

    const order = new Order({
      userId,
      sellerId: validSellerId,
      items,
      subtotal,
      shippingCharge,
      tax: 0,
      discount,
      couponCode: validCouponObj ? validCouponObj.code : (couponCode || null),
      totalAmount,
      shippingAddress,
      paymentMethod,
      paymentStatus: PAYMENT_STATUS.PENDING,
      checkoutSessionId,
      notes: notes || '',
      commissionRate,
      commissionAmount,
      status: ORDER_STATUS.PENDING
    });

    await order.save();
    orderDocs.push(order);
    totalAmounts[sellerId] = order.totalAmount;
  }

  // Clear or remove ordered items from cart
  if (customItems && customItems.length > 0) {
    const orderedProductIds = customItems.map((c) => c.productId.toString());
    await Cart.findOneAndUpdate(
      { userId },
      { $pull: { items: { productId: { $in: orderedProductIds } } } }
    );
  } else {
    await Cart.findOneAndDelete({ userId });
  }

  const totalOrderAmount = Object.values(totalAmounts).reduce((a, b) => a + b, 0);

  res.status(201).json({
    success: true,
    data: {
      orders: orderDocs,
      checkoutSessionId,
      totalAmount: Number(totalOrderAmount.toFixed(2)),
      paymentMethod
    },
    message: 'Orders created successfully. Proceed to payment.'
  });
});

/**
 * Get user's orders
 * GET /api/orders
 * @query { page, limit, status }
 */
const getUserOrders = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20, status } = req.query;
  const skip = (page - 1) * limit;

  const filter = { userId };
  if (status) {
    filter.status = status;
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('sellerId', 'shopName shopAddress')
      .populate('items.productId', 'name images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Order.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * Get order details by ID
 * GET /api/orders/:id
 */
const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const order = await Order.findOne({ _id: id, userId })
    .populate('sellerId', 'shopName shopAddress location')
    .populate('items.productId', 'name images');

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  res.json({
    success: true,
    data: order
  });
});

/**
 * Cancel an order (user)
 * PUT /api/orders/:id/cancel
 * @body { cancellationReason }
 */
const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { cancellationReason } = req.body;

  const order = await Order.findOne({ _id: id, userId });
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (!order.canCancel()) {
    throw new ApiError(400, 'Order cannot be cancelled at this stage');
  }

  // Update order status
  order.status = ORDER_STATUS.CANCELLED;
  order.cancellationReason = cancellationReason || 'Cancelled by user';
  await order.save();

  // Restore product stock
  const Product = require('../models/Product.model');
  for (const item of order.items) {
    await Product.findByIdAndUpdate(
      item.productId,
      { $inc: { stock: item.quantity } }
    );
  }

  res.json({
    success: true,
    data: order,
    message: 'Order cancelled successfully'
  });
});

/**
 * Admin: Get all orders (with filters)
 * GET /api/orders/admin
 * (Admin only)
 */
const adminGetOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, paymentStatus, sellerId, startDate, endDate, fromDate, toDate } = req.query;
  const skip = (page - 1) * limit;

  const filter = {};
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (sellerId) filter.sellerId = sellerId;
  
  const effectiveStart = startDate || fromDate;
  const effectiveEnd = endDate || toDate;
  if (effectiveStart || effectiveEnd) {
    filter.createdAt = {};
    if (effectiveStart) {
      const from = new Date(effectiveStart);
      if (!isNaN(from.getTime())) {
        if (effectiveStart.length <= 10) from.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = from;
      }
    }
    if (effectiveEnd) {
      const to = new Date(effectiveEnd);
      if (!isNaN(to.getTime())) {
        if (effectiveEnd.length <= 10) to.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = to;
      }
    }
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('userId', 'name email phone avatar')
      .populate('sellerId', 'shopName shopAddress isVerified')
      .populate('items.productId', 'name images price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Order.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * Admin: Update order status (e.g., for dispute resolution)
 * PUT /api/orders/admin/:id/status
 * @body { status }
 */
const adminUpdateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = Object.values(ORDER_STATUS);
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, 'Invalid order status');
  }

  const order = await Order.findById(id);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  order.status = status;
  await order.save();

  res.json({
    success: true,
    data: order,
    message: `Order status updated to ${status}`
  });
});

module.exports = {
  createOrders,
  getUserOrders,
  getOrderById,
  cancelOrder,
  adminGetOrders,
  adminUpdateOrderStatus,
  validateCoupon
};