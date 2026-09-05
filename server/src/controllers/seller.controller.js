
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Seller = require('../models/Seller.model');
const Product = require('../models/Product.model');
const { Order, ORDER_STATUS, PAYMENT_STATUS } = require('../models/Order.model');
const User = require('../models/User.model');
const productService = require('../services/product.service');
const {
  uploadProductImage: uploadProdImg,
  uploadProductVideo: uploadProdVid,
  uploadFile,
  uploadShopLogo
} = require('../config/cloudinary');
const fs = require('fs');

/**
 * Register as a seller (create seller profile)
 * POST /api/sellers/register
 */
const registerSeller = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Check if user already has a seller profile
  const existingSeller = await Seller.findOne({ user: userId });
  if (existingSeller) {
    throw new ApiError(400, 'User already has a seller profile');
  }

  const {
    shopName,
    shopAddress,
    location,
    gstNumber,
    panNumber,
    bankDetails
  } = req.body;

  // Validate location coordinates
  if (!location || !location.coordinates || location.coordinates.length !== 2) {
    throw new ApiError(400, 'Valid location coordinates are required');
  }

  const [lng, lat] = location.coordinates;
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    throw new ApiError(400, 'Invalid coordinate range');
  }

  // Check if shop name is unique
  const existingShop = await Seller.findOne({ shopName });
  if (existingShop) {
    throw new ApiError(400, 'Shop name already exists');
  }

  const seller = await Seller.create({
    user: userId,
    shopName,
    shopAddress,
    location: {
      type: 'Point',
      coordinates: location.coordinates
    },
    gstNumber,
    panNumber,
    bankDetails,
    verificationStatus: 'pending'
  });

  // Update user role to seller
  await User.findByIdAndUpdate(userId, { role: 'seller' });

  res.status(201).json({
    success: true,
    data: {
      seller,
      message: 'Seller registration submitted for verification'
    }
  });
});

/**
 * Get seller dashboard stats
 * GET /api/sellers/dashboard
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  const seller = await Seller.findOne({ user: req.user.id });
  if (!seller) {
    throw new ApiError(404, 'Seller profile not found');
  }

  // If seller is not yet approved, return zeroed stats with verification info
  if (seller.verificationStatus !== 'approved') {
    return res.json({
      success: true,
      data: {
        totalOrders: 0,
        totalRevenue: 0,
        pendingOrders: 0,
        totalProducts: 0,
        topProducts: [],
        lowStockProducts: [],
        recentOrders: [],
        verificationStatus: seller.verificationStatus,
        isVerified: false
      }
    });
  }

  const sellerId = seller._id;

  // Get orders sorted newest first
  const orders = await Order.find({ sellerId })
    .sort({ createdAt: -1 })
    .populate('userId', 'name email phone')
    .lean();

  const totalOrders = orders.length;

  // Calculate revenue from non-cancelled/refunded orders
  const totalRevenue = orders
    .filter(o => o.status !== 'Cancelled' && o.status !== 'Refunded')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // Get pending orders count
  const pendingOrders = orders.filter(o =>
    o.status === 'Pending' || o.status === 'Processing'
  ).length;

  // Get pending return requests count
  const pendingReturnRequests = orders.filter(o =>
    o.status === 'Return_Requested' || (o.returnRequest && o.returnRequest.status === 'pending')
  ).length;

  // Get top products
  const productSales = {};
  orders.forEach(order => {
    (order.items || []).forEach(item => {
      const productId = item.productId ? item.productId.toString() : (item.name || 'item');
      if (!productSales[productId]) {
        productSales[productId] = {
          productId,
          name: item.name || 'Product',
          quantity: 0,
          revenue: 0
        };
      }
      productSales[productId].quantity += (item.quantity || 1);
      productSales[productId].revenue += (item.price || 0) * (item.quantity || 1);
    });
  });

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Get total products count
  const totalProducts = await Product.countDocuments({ sellerId });

  // Get low stock products
  const lowStockProducts = await Product.find({
    sellerId,
    $expr: { $lte: ['$stock', '$lowStockThreshold'] }
  }).limit(10).lean();

  res.json({
    success: true,
    data: {
      totalOrders,
      totalRevenue,
      pendingOrders,
      pendingReturnRequests,
      totalProducts,
      topProducts,
      lowStockProducts,
      recentOrders: orders.slice(0, 10),
      verificationStatus: seller.verificationStatus,
      isVerified: true
    }
  });
});

/**
 * Get seller's products
 * GET /api/sellers/products
 */
const getSellerProducts = asyncHandler(async (req, res) => {
  const seller = await Seller.findOne({ user: req.user.id });
  if (!seller) {
    throw new ApiError(404, 'Seller profile not found');
  }

  const { page = 1, limit = 20, search, category, isActive } = req.query;
  const skip = (page - 1) * limit;

  const filter = { sellerId: seller._id };

  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }
  if (category) {
    filter.category = category;
  }
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 }),
    Product.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      products,
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
 * Create a product
 * POST /api/sellers/products
 */
const createProduct = asyncHandler(async (req, res) => {
  const seller = await Seller.findOne({ user: req.user.id });
  if (!seller) {
    throw new ApiError(404, 'Seller profile not found');
  }

  if (seller.verificationStatus !== 'approved' && !seller.isVerified) {
    throw new ApiError(403, 'Seller account not verified. Please wait for admin approval.');
  }

  const product = await productService.createProduct(req.user.id, req.body);

  res.status(201).json({
    success: true,
    data: product
  });
});

/**
 * Update a product (seller's own product only)
 * PUT /api/sellers/products/:id
 */
const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const seller = await Seller.findOne({ user: req.user.id });
  if (!seller) {
    throw new ApiError(404, 'Seller profile not found');
  }

  // Verify product belongs to this seller
  const product = await Product.findOne({
    _id: id,
    sellerId: seller._id
  });

  if (!product) {
    throw new ApiError(404, 'Product not found or unauthorized');
  }

  // Don't allow changing sellerId or location directly
  delete req.body.sellerId;
  delete req.body.location;

  if (req.body.video !== undefined) {
    if (typeof req.body.video === 'string' && req.body.video.trim()) {
      product.video = {
        url: req.body.video.trim(),
        publicId: `vid_${Date.now()}`,
        thumbnail: null
      };
    } else if (req.body.video && typeof req.body.video === 'object' && req.body.video.url) {
      product.video = {
        url: req.body.video.url.trim(),
        publicId: req.body.video.publicId || `vid_${Date.now()}`,
        thumbnail: req.body.video.thumbnail || null
      };
    } else {
      product.video = { url: null, publicId: null, thumbnail: null };
    }
    product.markModified('video');
    delete req.body.video;
  }

  if (Array.isArray(req.body.images)) {
    product.images = req.body.images
      .map((img, idx) => {
        if (typeof img === 'string' && img.trim()) {
          return {
            url: img.trim(),
            isPrimary: idx === 0,
            publicId: `img_${Date.now()}_${idx}`
          };
        }
        if (img && typeof img === 'object' && img.url) {
          return {
            url: img.url,
            isPrimary: img.isPrimary !== undefined ? img.isPrimary : idx === 0,
            publicId: img.publicId || `img_${Date.now()}_${idx}`,
            alt: img.alt || ''
          };
        }
        return null;
      })
      .filter(Boolean);
    product.markModified('images');
    delete req.body.images;
  }

  Object.assign(product, req.body);
  await product.save();
  await product.populate('category', 'name slug');

  res.json({
    success: true,
    data: product
  });
});

/**
 * Delete a product (seller's own product only)
 * DELETE /api/sellers/products/:id
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const seller = await Seller.findOne({ user: req.user.id });
  if (!seller) {
    throw new ApiError(404, 'Seller profile not found');
  }

  const product = await Product.findOneAndDelete({
    _id: id,
    sellerId: seller._id
  });

  if (!product) {
    throw new ApiError(404, 'Product not found or unauthorized');
  }

  res.json({
    success: true,
    message: 'Product deleted successfully'
  });
});

/**
 * Get seller's orders
 * GET /api/sellers/orders
 */
/**
 * Get seller's orders
 * GET /api/sellers/orders
 */
const getSellerOrders = asyncHandler(async (req, res) => {
  const seller = await Seller.findOne({ user: req.user.id });
  if (!seller) {
    throw new ApiError(404, 'Seller profile not found');
  }

  const { page = 1, limit = 20, status } = req.query;
  const skip = (page - 1) * limit;

  const filter = { sellerId: seller._id };
  if (status && status !== 'all') {
    if (status.toLowerCase() === 'returns' || status.toLowerCase() === 'return_requested' || status.toLowerCase() === 'return_requests') {
      filter.$or = [
        { status: { $in: [ORDER_STATUS.RETURN_REQUESTED, ORDER_STATUS.RETURN_APPROVED, ORDER_STATUS.RETURN_REJECTED] } },
        { 'returnRequest.isRequested': true }
      ];
    } else {
      filter.status = status;
    }
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('userId', 'name email phone avatar')
      .populate('items.productId', 'name images price')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 }),
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
 * Update order status (seller's own order only)
 * PUT /api/sellers/orders/:id/status
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, notes, trackingNumber, cancellationReason } = req.body;

  const validStatusesMap = {
    'pending': ORDER_STATUS.PENDING,
    'processing': ORDER_STATUS.PROCESSING,
    'shipped': ORDER_STATUS.SHIPPED,
    'delivered': ORDER_STATUS.DELIVERED,
    'cancelled': ORDER_STATUS.CANCELLED,
    'return_requested': ORDER_STATUS.RETURN_REQUESTED,
    'return_approved': ORDER_STATUS.RETURN_APPROVED,
    'return_rejected': ORDER_STATUS.RETURN_REJECTED,
    'refunded': ORDER_STATUS.REFUNDED
  };

  const normalizedStatus = validStatusesMap[String(status || '').toLowerCase().trim()];
  if (!normalizedStatus) {
    throw new ApiError(400, 'Invalid order status. Allowed: Pending, Processing, Shipped, Delivered, Cancelled, Return_Requested, Return_Approved, Return_Rejected, Refunded');
  }

  const seller = await Seller.findOne({ user: req.user.id });
  if (!seller) {
    throw new ApiError(404, 'Seller profile not found');
  }

  const order = await Order.findOne({
    _id: id,
    sellerId: seller._id
  });

  if (!order) {
    throw new ApiError(404, 'Order not found or unauthorized');
  }

  // Update status
  order.status = normalizedStatus;

  // Handle specific status side-effects
  if (normalizedStatus === ORDER_STATUS.DELIVERED) {
    order.deliveryDate = new Date();
    if (order.paymentMethod === 'COD' && order.paymentStatus === 'pending') {
      order.paymentStatus = 'paid';
    }
  } else if (normalizedStatus === ORDER_STATUS.SHIPPED) {
    if (trackingNumber) {
      order.trackingNumber = trackingNumber.trim();
    }
  } else if (normalizedStatus === ORDER_STATUS.CANCELLED) {
    if (cancellationReason || notes) {
      order.cancellationReason = (cancellationReason || notes).trim();
    }
    // Restore product stock on cancellation
    for (const item of order.items) {
      if (item.productId) {
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: item.quantity } }
        );
      }
    }
  } else if (normalizedStatus === ORDER_STATUS.REFUNDED) {
    order.paymentStatus = PAYMENT_STATUS.REFUNDED;
    order.refundDate = new Date();
    order.refundAmount = order.refundAmount || order.totalAmount;
    if (order.returnRequest) {
      order.returnRequest.status = 'refunded';
      order.returnRequest.refundDate = new Date();
      order.returnRequest.refundAmount = order.refundAmount;
    }
  }

  if (notes) {
    order.notes = notes.trim();
  }

  await order.save();
  await order.populate('userId', 'name email phone avatar');
  await order.populate('items.productId', 'name images price');

  res.json({
    success: true,
    data: order,
    message: `Order status updated to ${normalizedStatus}`
  });
});

/**
 * Handle buyer return request (seller approval / rejection)
 * PUT /api/sellers/orders/:id/return-decision
 * Body: { decision: 'approved' | 'rejected', comment, refundAmount, restockItems, action }
 */
const handleReturnDecision = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    decision,
    comment,
    refundAmount,
    restockItems = true,
    action = 'approve_and_refund'
  } = req.body;

  if (!['approved', 'rejected'].includes(decision)) {
    throw new ApiError(400, 'Decision must be "approved" or "rejected"');
  }

  const seller = await Seller.findOne({ user: req.user.id });
  if (!seller) {
    throw new ApiError(404, 'Seller profile not found');
  }

  const order = await Order.findOne({
    _id: id,
    sellerId: seller._id
  });

  if (!order) {
    throw new ApiError(404, 'Order not found or unauthorized');
  }

  if (!order.canSellerDecideReturn()) {
    throw new ApiError(400, 'Order does not have a pending return request (Current status: ' + order.status + ')');
  }

  const Payment = require('../models/Payment.model');

  if (decision === 'approved') {
    const effectiveRefundAmount = refundAmount !== undefined && Number(refundAmount) >= 0
      ? Number(refundAmount)
      : order.totalAmount;

    if (action === 'approve_return') {
      // Stage 1: Return approved, awaiting customer physical shipment
      order.status = ORDER_STATUS.RETURN_APPROVED;
      order.returnRequest = {
        ...(order.returnRequest?.toObject ? order.returnRequest.toObject() : order.returnRequest || {}),
        isRequested: true,
        status: 'approved',
        refundAmount: effectiveRefundAmount,
        sellerResponse: {
          decision: 'approved',
          comment: comment ? String(comment).trim() : 'Return approved. Please ship the item back to our store address.',
          respondedAt: new Date()
        }
      };
    } else {
      // Stage 2 / Direct: Approve and issue refund immediately
      order.status = ORDER_STATUS.REFUNDED;
      order.paymentStatus = PAYMENT_STATUS.REFUNDED;
      order.refundAmount = effectiveRefundAmount;
      order.refundDate = new Date();
      order.returnRequest = {
        ...(order.returnRequest?.toObject ? order.returnRequest.toObject() : order.returnRequest || {}),
        isRequested: true,
        status: 'refunded',
        refundAmount: effectiveRefundAmount,
        refundDate: new Date(),
        sellerResponse: {
          decision: 'approved',
          comment: comment ? String(comment).trim() : 'Return request approved and refund issued.',
          respondedAt: new Date()
        }
      };

      // Restock items
      if (restockItems !== false) {
        for (const item of order.items) {
          if (item.productId) {
            await Product.findByIdAndUpdate(
              item.productId,
              { $inc: { stock: item.quantity } }
            );
          }
        }
      }

      // Update Payment record
      await Payment.findOneAndUpdate(
        { orderId: order._id },
        { status: 'refunded', refundedAt: new Date() }
      );
    }
  } else {
    // Rejected
    order.status = ORDER_STATUS.RETURN_REJECTED;
    order.returnRequest = {
      ...(order.returnRequest?.toObject ? order.returnRequest.toObject() : order.returnRequest || {}),
      isRequested: true,
      status: 'rejected',
      sellerResponse: {
        decision: 'rejected',
        comment: comment ? String(comment).trim() : 'Return request was declined by the seller.',
        respondedAt: new Date()
      }
    };
  }

  await order.save();
  await order.populate('userId', 'name email phone avatar');
  await order.populate('items.productId', 'name images price');

  res.json({
    success: true,
    data: order,
    message: decision === 'approved'
      ? (action === 'approve_return'
          ? 'Return request approved. Customer notified to return items.'
          : `Return approved and refund of ৳${order.refundAmount} issued successfully.`)
      : 'Return request has been declined.'
  });
});

/**
 * Issue refund directly or finalize refund for approved return (seller)
 * PUT /api/sellers/orders/:id/refund
 * Body: { refundAmount, notes, restockItems }
 */
const issueOrderRefund = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { refundAmount, notes, restockItems = true } = req.body;

  const seller = await Seller.findOne({ user: req.user.id });
  if (!seller) {
    throw new ApiError(404, 'Seller profile not found');
  }

  const order = await Order.findOne({
    _id: id,
    sellerId: seller._id
  });

  if (!order) {
    throw new ApiError(404, 'Order not found or unauthorized');
  }

  if (order.status === ORDER_STATUS.CANCELLED) {
    throw new ApiError(400, 'Cannot refund a cancelled order');
  }

  const effectiveRefundAmount = refundAmount !== undefined && Number(refundAmount) >= 0
    ? Number(refundAmount)
    : order.totalAmount;

  order.status = ORDER_STATUS.REFUNDED;
  order.paymentStatus = PAYMENT_STATUS.REFUNDED;
  order.refundAmount = effectiveRefundAmount;
  order.refundDate = new Date();

  if (notes) {
    order.notes = (order.notes || '') + (order.notes ? '\n' : '') + `Refund remark: ${String(notes).trim()}`;
  }

  order.returnRequest = {
    ...(order.returnRequest?.toObject ? order.returnRequest.toObject() : order.returnRequest || {}),
    isRequested: true,
    status: 'refunded',
    refundAmount: effectiveRefundAmount,
    refundDate: new Date(),
    sellerResponse: {
      decision: 'approved',
      comment: notes ? String(notes).trim() : 'Refund processed by seller.',
      respondedAt: new Date()
    }
  };

  if (restockItems !== false) {
    for (const item of order.items) {
      if (item.productId) {
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: item.quantity } }
        );
      }
    }
  }

  const Payment = require('../models/Payment.model');
  await Payment.findOneAndUpdate(
    { orderId: order._id },
    { status: 'refunded', refundedAt: new Date() }
  );

  await order.save();
  await order.populate('userId', 'name email phone avatar');
  await order.populate('items.productId', 'name images price');

  res.json({
    success: true,
    data: order,
    message: `Refund of ৳${effectiveRefundAmount} processed successfully`
  });
});

/**
 * Get seller profile
 * GET /api/sellers/profile
 */
const getSellerProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id?.toString() || req.user.id;

  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Check if user is blocked
  if (user.isBlocked) {
    throw new ApiError(403, 'Your account has been blocked. Please contact support.');
  }

  // Check if user is a seller
  if (user.role !== 'seller') {
    return res.status(400).json({
      success: false,
      message: 'You are not registered as a seller. Please register as a seller first.',
      data: {
        currentRole: user.role,
        needsRegistration: true,
        registrationEndpoint: '/api/sellers/register'
      }
    });
  }

  // Find seller profile
  const seller = await Seller.findOne({ user: userId })
    .populate('user', 'name email phone isVerified isBlocked avatar banner');

  if (!seller) {
    return res.status(404).json({
      success: false,
      message: 'Seller profile not found. Please complete your seller registration.',
      data: {
        userRole: user.role,
        needsRegistration: true,
        registrationEndpoint: '/api/sellers/register',
        note: 'Your user account has role "seller" but the seller profile is missing. Please register as a seller to create your profile.'
      }
    });
  }

  res.json({
    success: true,
    data: seller
  });
});

/**
 * Update seller profile
 * PUT /api/sellers/profile
 */
const updateSellerProfile = asyncHandler(async (req, res) => {
  const seller = await Seller.findOne({ user: req.user.id });
  if (!seller) {
    throw new ApiError(404, 'Seller profile not found');
  }

  // Update seller owner name on User model if provided
  if (req.body.name || req.body.ownerName) {
    const newName = (req.body.name || req.body.ownerName).trim();
    if (newName) {
      await User.findByIdAndUpdate(req.user.id, { name: newName });
    }
  }

  // Allowed fields for seller profile update
  const allowedUpdates = [
    'shopName',
    'headline',
    'bio',
    'skills',
    'socialLinks',
    'banner',
    'logo',
    'shopAddress',
    'gstNumber',
    'panNumber',
    'bankDetails'
  ];
  const updates = {};

  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  // Location can be updated separately with validation
  if (req.body.location && req.body.location.coordinates) {
    const [lng, lat] = req.body.location.coordinates;
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      throw new ApiError(400, 'Invalid coordinate range');
    }
    updates.location = {
      type: 'Point',
      coordinates: req.body.location.coordinates
    };
  }

  // If shop name is being updated, check uniqueness
  if (updates.shopName && updates.shopName !== seller.shopName) {
    const existingShop = await Seller.findOne({
      shopName: updates.shopName,
      _id: { $ne: seller._id }
    });
    if (existingShop) {
      throw new ApiError(400, 'Shop name already exists');
    }
  }

  const updatedSeller = await Seller.findByIdAndUpdate(
    seller._id,
    updates,
    { new: true, runValidators: true }
  ).populate('user', 'name email phone isVerified avatar banner');

  // If location coordinates changed, sync all products of this seller
  if (updates.location) {
    await Product.updateMany(
      { sellerId: seller._id },
      { location: updates.location }
    );
  }

  res.json({
    success: true,
    data: updatedSeller,
    message: 'Profile updated successfully'
  });
});

/**
 * Upload seller shop logo / avatar
 * POST /api/sellers/upload/logo
 */
const uploadSellerLogo = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No image file provided');
  }

  const seller = await Seller.findOne({ user: req.user.id });
  if (!seller) {
    throw new ApiError(404, 'Seller profile not found');
  }

  const result = await uploadShopLogo(req.file.path, seller._id);

  if (req.file.path && fs.existsSync(req.file.path)) {
    try {
      fs.unlinkSync(req.file.path);
    } catch {
      // non-fatal
    }
  }

  seller.logo = {
    url: result.url,
    publicId: result.publicId
  };
  await seller.save();

  await User.findByIdAndUpdate(req.user.id, {
    avatar: { url: result.url, publicId: result.publicId }
  });

  const populatedSeller = await Seller.findById(seller._id)
    .populate('user', 'name email phone isVerified avatar banner');

  res.json({
    success: true,
    data: {
      seller: populatedSeller,
      logo: seller.logo,
      url: result.url,
      publicId: result.publicId
    },
    message: 'Shop avatar/logo uploaded successfully'
  });
});

/**
 * Upload seller shop banner
 * POST /api/sellers/upload/banner
 */
const uploadSellerBanner = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No image file provided');
  }

  const seller = await Seller.findOne({ user: req.user.id });
  if (!seller) {
    throw new ApiError(404, 'Seller profile not found');
  }

  const result = await uploadFile(req.file.path, {
    folder: `vectorx/sellers/${seller._id}/banner`,
    transformation: [
      { width: 1500, height: 500, crop: 'fill', quality: 'auto' },
      { fetch_format: 'auto' }
    ]
  });

  if (req.file.path && fs.existsSync(req.file.path)) {
    try {
      fs.unlinkSync(req.file.path);
    } catch {
      // non-fatal
    }
  }

  seller.banner = {
    url: result.secure_url,
    publicId: result.public_id,
    slogan: seller.banner?.slogan || 'Building The Future with Code, Creativity, and Technology',
    subtitle: seller.banner?.subtitle || 'Innovate, Create ★★★★★'
  };
  await seller.save();

  await User.findByIdAndUpdate(req.user.id, {
    banner: { url: result.secure_url, publicId: result.public_id }
  });

  const populatedSeller = await Seller.findById(seller._id)
    .populate('user', 'name email phone isVerified avatar banner');

  res.json({
    success: true,
    data: {
      seller: populatedSeller,
      banner: seller.banner,
      url: result.secure_url,
      publicId: result.public_id
    },
    message: 'Shop banner uploaded successfully'
  });
});

/**
 * Request verification badge
 * POST /api/sellers/request-verification
 */
const requestVerification = asyncHandler(async (req, res) => {
  const seller = await Seller.findOne({ user: req.user.id });
  if (!seller) {
    throw new ApiError(404, 'Seller profile not found');
  }

  if (seller.verificationStatus === 'approved') {
    return res.json({
      success: true,
      data: seller,
      message: 'Your store is already verified!'
    });
  }

  const { gstNumber, panNumber } = req.body || {};
  if (gstNumber) seller.gstNumber = gstNumber.trim();
  if (panNumber) seller.panNumber = panNumber.trim();
  seller.verificationStatus = 'pending';
  seller.rejectionReason = undefined;

  await seller.save();
  const populatedSeller = await Seller.findById(seller._id)
    .populate('user', 'name email phone isVerified avatar banner');

  res.json({
    success: true,
    data: populatedSeller,
    message: 'Verification badge request submitted successfully! VectorX staff will review your profile.'
  });
});

/**
 * Get seller earnings summary
 * GET /api/sellers/earnings
 */
const getSellerEarnings = asyncHandler(async (req, res) => {
  const seller = await Seller.findOne({ user: req.user.id });
  if (!seller) {
    throw new ApiError(404, 'Seller profile not found');
  }

  const { period = 'month' } = req.query;

  // If seller is not yet approved, return zeroed earnings
  if (seller.verificationStatus !== 'approved' && !seller.isVerified) {
    return res.json({
      success: true,
      data: {
        totalEarnings: 0,
        orderCount: 0,
        averageOrderValue: 0,
        dailyEarnings: [],
        period
      }
    });
  }

  const now = new Date();
  let startDate = new Date();

  switch (period) {
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setMonth(now.getMonth() - 1);
  }

  const orders = await Order.find({
    sellerId: seller._id,
    status: { $in: ['Delivered', 'Processing', 'Shipped'] },
    createdAt: { $gte: startDate }
  });

  const totalEarnings = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const orderCount = orders.length;

  // Calculate earnings by day
  const earningsByDay = {};
  orders.forEach(order => {
    const day = order.createdAt ? order.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    if (!earningsByDay[day]) {
      earningsByDay[day] = 0;
    }
    earningsByDay[day] += (order.totalAmount || 0);
  });

  const dailyEarnings = Object.entries(earningsByDay)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  res.json({
    success: true,
    data: {
      totalEarnings,
      orderCount,
      averageOrderValue: orderCount > 0 ? totalEarnings / orderCount : 0,
      dailyEarnings,
      period
    }
  });
});

/**
 * Upload product image for sellers
 * POST /api/sellers/upload/image
 */
const uploadProductImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No image file provided');
  }

  const result = await uploadProdImg(req.file.path);

  if (req.file.path && fs.existsSync(req.file.path)) {
    try {
      fs.unlinkSync(req.file.path);
    } catch {
      // non-fatal
    }
  }

  res.json({
    success: true,
    data: {
      url: result.url,
      publicId: result.publicId
    }
  });
});

/**
 * Upload product video for sellers
 * POST /api/sellers/upload/video
 */
const uploadProductVideo = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No video file provided');
  }

  const result = await uploadProdVid(req.file.path);

  if (req.file.path && fs.existsSync(req.file.path)) {
    try {
      fs.unlinkSync(req.file.path);
    } catch {
      // non-fatal
    }
  }

  res.json({
    success: true,
    data: {
      url: result.url,
      publicId: result.publicId,
      thumbnail: result.thumbnail
    }
  });
});

/**
 * Get all customer reviews for this seller's products
 * GET /api/sellers/reviews
 * Query: rating, productId, hasReply, search, sort, page, limit
 */
const getSellerReviews = asyncHandler(async (req, res) => {
  const seller = await Seller.findOne({ user: req.user.id });
  if (!seller) {
    throw new ApiError(404, 'Seller profile not found');
  }

  const {
    rating,
    productId,
    hasReply,
    search,
    sort = 'newest',
    page = 1,
    limit = 20
  } = req.query;

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = Math.min(parseInt(limit, 10) || 20, 100);

  // Fetch all products for this seller with populated reviews
  const products = await Product.find({ sellerId: seller._id })
    .populate({
      path: 'reviews.userId',
      select: 'name email avatar'
    })
    .lean();

  // Aggregate all reviews across all products
  const allReviews = [];
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  products.forEach(p => {
    (p.reviews || []).forEach(r => {
      if (r.rating && ratingDistribution[r.rating] !== undefined) {
        ratingDistribution[r.rating] += 1;
      }

      let primaryImg = null;
      if (p.images && p.images.length > 0) {
        primaryImg = typeof p.images[0] === 'string' ? p.images[0] : (p.images[0].url || null);
      }

      allReviews.push({
        _id: r._id,
        productId: p._id,
        productName: p.name,
        productSlug: p.slug,
        productPrice: p.price,
        productImage: primaryImg,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        images: r.images || [],
        video: r.video || null,
        isVerifiedPurchase: r.isVerifiedPurchase !== false,
        helpful: r.helpful || 0,
        reported: r.reported || false,
        user: r.userId ? {
          _id: r.userId._id,
          name: r.userId.name,
          email: r.userId.email,
          avatar: r.userId.avatar
        } : null,
        reply: r.reply || null,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      });
    });
  });

  const totalReviews = allReviews.length;
  const totalScore = allReviews.reduce((sum, r) => sum + (r.rating || 0), 0);
  const averageRating = totalReviews > 0 ? parseFloat((totalScore / totalReviews).toFixed(1)) : 0;
  const repliedCount = allReviews.filter(r => r.reply && r.reply.comment).length;
  const unrepliedCount = totalReviews - repliedCount;
  const responseRate = totalReviews > 0 ? Math.round((repliedCount / totalReviews) * 100) : 0;

  // Filter reviews
  let filtered = [...allReviews];

  if (rating && !isNaN(parseInt(rating, 10))) {
    const targetRating = parseInt(rating, 10);
    filtered = filtered.filter(r => r.rating === targetRating);
  }

  if (productId && mongoose.Types.ObjectId.isValid(productId)) {
    filtered = filtered.filter(r => r.productId.toString() === productId.toString());
  }

  if (hasReply === 'true') {
    filtered = filtered.filter(r => r.reply && r.reply.comment);
  } else if (hasReply === 'false') {
    filtered = filtered.filter(r => !r.reply || !r.reply.comment);
  }

  if (search && String(search).trim()) {
    const q = String(search).trim().toLowerCase();
    filtered = filtered.filter(r =>
      (r.productName && r.productName.toLowerCase().includes(q)) ||
      (r.title && r.title.toLowerCase().includes(q)) ||
      (r.comment && r.comment.toLowerCase().includes(q)) ||
      (r.user?.name && r.user.name.toLowerCase().includes(q))
    );
  }

  // Sort
  switch (sort) {
    case 'oldest':
      filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      break;
    case 'highest':
      filtered.sort((a, b) => b.rating - a.rating);
      break;
    case 'lowest':
      filtered.sort((a, b) => a.rating - b.rating);
      break;
    case 'unreplied':
      filtered.sort((a, b) => {
        const aReplied = a.reply && a.reply.comment ? 1 : 0;
        const bReplied = b.reply && b.reply.comment ? 1 : 0;
        return aReplied - bReplied;
      });
      break;
    case 'newest':
    default:
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  const filteredTotal = filtered.length;
  const totalPages = Math.ceil(filteredTotal / limitNum) || 1;
  const skip = (pageNum - 1) * limitNum;
  const paginatedReviews = filtered.slice(skip, skip + limitNum);

  res.json({
    success: true,
    data: {
      reviews: paginatedReviews,
      stats: {
        totalReviews,
        averageRating,
        ratingDistribution,
        repliedCount,
        unrepliedCount,
        responseRate
      },
      sellerProducts: products.map(p => ({
        _id: p._id,
        name: p.name,
        slug: p.slug
      }))
    },
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: filteredTotal,
      totalPages
    }
  });
});

/**
 * Seller reply to a review
 * POST /api/sellers/products/:productId/reviews/:reviewId/reply
 * Body: { comment }
 */
const replyToReview = asyncHandler(async (req, res) => {
  const { productId, reviewId } = req.params;
  const { comment } = req.body;

  if (!comment || !String(comment).trim()) {
    throw new ApiError(400, 'Reply comment is required');
  }

  const seller = await Seller.findOne({ user: req.user.id });
  if (!seller) {
    throw new ApiError(404, 'Seller profile not found');
  }

  const product = await Product.findOne({
    _id: productId,
    sellerId: seller._id
  });

  if (!product) {
    throw new ApiError(404, 'Product not found or unauthorized');
  }

  const review = product.reviews.id(reviewId);
  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  review.reply = {
    comment: String(comment).trim(),
    sellerId: seller._id,
    createdAt: new Date()
  };

  await product.save();

  res.json({
    success: true,
    data: {
      reply: review.reply
    },
    message: 'Reply posted successfully'
  });
});

/**
 * Delete a seller's reply to a review
 * DELETE /api/sellers/products/:productId/reviews/:reviewId/reply
 */
const deleteReviewReply = asyncHandler(async (req, res) => {
  const { productId, reviewId } = req.params;

  const seller = await Seller.findOne({ user: req.user.id });
  if (!seller) {
    throw new ApiError(404, 'Seller profile not found');
  }

  const product = await Product.findOne({
    _id: productId,
    sellerId: seller._id
  });

  if (!product) {
    throw new ApiError(404, 'Product not found or unauthorized');
  }

  const review = product.reviews.id(reviewId);
  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  review.reply = undefined;
  await product.save();

  res.json({
    success: true,
    message: 'Reply removed successfully'
  });
});

module.exports = {
  registerSeller,
  getDashboardStats,
  getSellerProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getSellerOrders,
  updateOrderStatus,
  handleReturnDecision,
  issueOrderRefund,
  getSellerProfile,
  updateSellerProfile,
  uploadSellerLogo,
  uploadSellerBanner,
  requestVerification,
  getSellerEarnings,
  uploadProductImage,
  uploadProductVideo,
  getSellerReviews,
  replyToReview,
  deleteReviewReply
};