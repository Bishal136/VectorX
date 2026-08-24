
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Seller = require('../models/Seller.model');
const Product = require('../models/Product.model');
const { Order } = require('../models/Order.model');
const User = require('../models/User.model');
const productService = require('../services/product.service');
const { uploadProductImage: uploadProdImg, uploadProductVideo: uploadProdVid } = require('../config/cloudinary');
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
const getSellerOrders = asyncHandler(async (req, res) => {
  const seller = await Seller.findOne({ user: req.user.id });
  if (!seller) {
    throw new ApiError(404, 'Seller profile not found');
  }

  const { page = 1, limit = 20, status } = req.query;
  const skip = (page - 1) * limit;

  const filter = { sellerId: seller._id };
  if (status && status !== 'all') {
    filter.status = status;
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('userId', 'name email phone')
      .populate('items.productId', 'name images')
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
    'pending': 'Pending',
    'processing': 'Processing',
    'shipped': 'Shipped',
    'delivered': 'Delivered',
    'cancelled': 'Cancelled',
    'refunded': 'Refunded'
  };

  const normalizedStatus = validStatusesMap[String(status || '').toLowerCase().trim()];
  if (!normalizedStatus) {
    throw new ApiError(400, 'Invalid order status. Allowed: Pending, Processing, Shipped, Delivered, Cancelled, Refunded');
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
  if (normalizedStatus === 'Delivered') {
    order.deliveryDate = new Date();
    if (order.paymentMethod === 'COD' && order.paymentStatus === 'pending') {
      order.paymentStatus = 'paid';
    }
  } else if (normalizedStatus === 'Shipped') {
    if (trackingNumber) {
      order.trackingNumber = trackingNumber.trim();
    }
  } else if (normalizedStatus === 'Cancelled') {
    if (cancellationReason || notes) {
      order.cancellationReason = (cancellationReason || notes).trim();
    }
  }

  if (notes) {
    order.notes = notes.trim();
  }

  await order.save();
  await order.populate('userId', 'name email phone');
  await order.populate('items.productId', 'name images price');

  res.json({
    success: true,
    data: order,
    message: `Order status updated to ${normalizedStatus}`
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
    .populate('user', 'name email phone isVerified isBlocked');

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

  // Only allow updating certain fields
  const allowedUpdates = ['shopName', 'shopAddress', 'gstNumber', 'panNumber', 'bankDetails'];
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
  ).populate('user', 'name email phone isVerified');

  // If location coordinates changed, sync all products of this seller
  if (updates.location) {
    await Product.updateMany(
      { sellerId: seller._id },
      { location: updates.location }
    );
  }

  res.json({
    success: true,
    data: updatedSeller
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

module.exports = {
  registerSeller,
  getDashboardStats,
  getSellerProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getSellerOrders,
  updateOrderStatus,
  getSellerProfile,
  updateSellerProfile,
  getSellerEarnings,
  uploadProductImage,
  uploadProductVideo
};