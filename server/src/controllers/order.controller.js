// src/controllers/order.controller.js
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Order, ORDER_STATUS, PAYMENT_STATUS } = require('../models/Order.model');
const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');
const Seller = require('../models/Seller.model');
const User = require('../models/User.model');
const { v4: uuidv4 } = require('uuid');

/**
 * Create orders from cart (checkout)
 * POST /api/orders
 * @body { shippingAddress, paymentMethod, couponCode, notes }
 */
const createOrders = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get user's cart
  const cart = await Cart.findOne({ userId }).populate('items.productId');
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, 'Cart is empty');
  }

  const { shippingAddress, paymentMethod, couponCode, notes } = req.body;

  // Validate payment method
  const validPaymentMethods = ['stripe', 'paypal','WALLEMIX','COD'];
  if (!validPaymentMethods.includes(paymentMethod)) {
    throw new ApiError(400, 'Invalid payment method');
  }

  // Group cart items by sellerId
  const itemsBySeller = {};
  for (const item of cart.items) {
    const product = item.productId;
    if (!product) continue;
    const sellerId = product.sellerId.toString();
    if (!itemsBySeller[sellerId]) {
      itemsBySeller[sellerId] = [];
    }
    // Check stock
    if (product.stock < item.quantity) {
      throw new ApiError(400, `Insufficient stock for ${product.name}`);
    }
    itemsBySeller[sellerId].push({
      productId: product._id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      productSnapshot: {
        images: product.images,
        description: product.description,
        category: product.category
      }
    });
  }

  // Create a checkout session ID for grouping
  const checkoutSessionId = uuidv4();

  // Fetch seller details for each seller
  const sellerIds = Object.keys(itemsBySeller);
  const sellers = await Seller.find({ _id: { $in: sellerIds } });

  // Prepare order documents
  const orderDocs = [];
  const totalAmounts = {};

  for (const sellerId of sellerIds) {
    const items = itemsBySeller[sellerId];
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Get seller commission rate (from settings or global)
    // For MVP, we'll use a default commission rate from env or setting
    const commissionRate = parseFloat(process.env.DEFAULT_COMMISSION_RATE) || 5; // percentage
    const commissionAmount = (subtotal * commissionRate) / 100;

    const order = new Order({
      userId,
      sellerId,
      items,
      subtotal,
      shippingCharge: 0, // We can calculate later
      tax: 0,
      discount: 0,
      couponCode: couponCode || null,
      totalAmount: subtotal, // will be recalculated on save
      shippingAddress,
      paymentMethod,
      paymentStatus: PAYMENT_STATUS.PENDING,
      checkoutSessionId,
      notes: notes || '',
      commissionRate,
      commissionAmount,
      status: ORDER_STATUS.PENDING
    });

    // Save order (pre-save middleware calculates total)
    await order.save();
    orderDocs.push(order);
    totalAmounts[sellerId] = order.totalAmount;
  }

  // Clear the cart after orders created
  await Cart.findOneAndDelete({ userId });

  // Prepare response: order list and total amount for payment
  const totalOrderAmount = Object.values(totalAmounts).reduce((a, b) => a + b, 0);

  // TODO: Integrate payment gateway (Stripe/PayPal) - will be done later
  // For now, we just return the orders and payment intent placeholder

  res.status(201).json({
    success: true,
    data: {
      orders: orderDocs,
      checkoutSessionId,
      totalAmount: totalOrderAmount,
      paymentMethod,
      // paymentIntent: { clientSecret: '...' } // will be added after payment integration
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
  const { page = 1, limit = 20, status, sellerId, startDate, endDate } = req.query;
  const skip = (page - 1) * limit;

  const filter = {};
  if (status) filter.status = status;
  if (sellerId) filter.sellerId = sellerId;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('userId', 'name email')
      .populate('sellerId', 'shopName')
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
  adminUpdateOrderStatus
};