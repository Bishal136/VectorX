
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Seller = require('../models/Seller.model');
const Product = require('../models/Product.model');
const { Order } = require('../models/Order.model');
const User = require('../models/User.model');
const productService = require('../services/product.service');

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

  if (seller.verificationStatus !== 'approved') {
    throw new ApiError(403, 'Seller account not verified');
  }

  const sellerId = seller._id;

  // Get orders
  const orders = await Order.find({ sellerId });
  const totalOrders = orders.length;

  // Calculate revenue
  const totalRevenue = orders
    .filter(o => o.status !== 'Cancelled' && o.status !== 'Refunded')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  // Get pending orders count
  const pendingOrders = orders.filter(o =>
    o.status === 'Pending' || o.status === 'Processing'
  ).length;

  // Get top products
  const productSales = {};
  orders.forEach(order => {
    order.items.forEach(item => {
      const productId = item.productId.toString();
      if (!productSales[productId]) {
        productSales[productId] = {
          productId,
          name: item.name,
          quantity: 0,
          revenue: 0
        };
      }
      productSales[productId].quantity += item.quantity;
      productSales[productId].revenue += item.price * item.quantity;
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
  }).limit(10);

  res.json({
    success: true,
    data: {
      totalOrders,
      totalRevenue,
      pendingOrders,
      totalProducts,
      topProducts,
      lowStockProducts,
      recentOrders: orders.slice(0, 10)
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

  if (seller.verificationStatus !== 'approved') {
    throw new ApiError(403, 'Seller account not verified');
  }

  const productData = {
    ...req.body,
    sellerId: seller._id,
    location: seller.location // Inherit seller's location
  };
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

  // Don't allow changing sellerId or location
  delete req.body.sellerId;
  delete req.body.location;

  const updatedProduct = await Product.findByIdAndUpdate(
    id,
    req.body,
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    data: updatedProduct
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
  if (status) {
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
  const { status } = req.body;

  const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'];
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, 'Invalid order status');
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

  // Prevent invalid status transitions (optional but recommended)
  const currentStatus = order.status;
  const transitions = {
    'Pending': ['Processing', 'Cancelled'],
    'Processing': ['Shipped', 'Cancelled'],
    'Shipped': ['Delivered', 'Cancelled'],
    'Delivered': ['Refunded'],
    'Cancelled': [],
    'Refunded': []
  };

  if (!transitions[currentStatus]?.includes(status)) {
    throw new ApiError(400, `Invalid status transition from ${currentStatus} to ${status}`);
  }

  order.status = status;
  await order.save();

  // TODO: Trigger email notification for buyer

  res.json({
    success: true,
    data: order,
    message: `Order status updated to ${status}`
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
        registrationEndpoint: '/api/seller/register'
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
        registrationEndpoint: '/api/seller/register',
        note: 'Your user account has role "seller" but the seller profile is missing. Please register as a seller to create your profile.'
      }
    });
  }

  // Check verification status
  if (seller.verificationStatus === 'pending') {
    return res.status(403).json({
      success: false,
      message: 'Your seller account is pending verification. Please wait for admin approval.',
      data: {
        verificationStatus: 'pending',
        estimatedWaitTime: 'Usually 24-48 hours'
      }
    });
  }

  if (seller.verificationStatus === 'rejected') {
    return res.status(403).json({
      success: false,
      message: `Your seller application was rejected: ${seller.rejectionReason || 'No reason provided'}`,
      data: {
        verificationStatus: 'rejected',
        rejectionReason: seller.rejectionReason,
        canReapply: true
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
  const allowedUpdates = ['shopName', 'shopAddress', 'gstNumber', 'panNumber'];
  const updates = {};

  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  // Location can be updated separately with validation
  if (req.body.location) {
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

  res.json({
    success: true,
    data: updatedSeller
  });
});

/**
 * Get seller earnings summary
 * GET /api/seller/earnings
 */
const getSellerEarnings = asyncHandler(async (req, res) => {
  const seller = await Seller.findOne({ user: req.user.id });
  if (!seller) {
    throw new ApiError(404, 'Seller profile not found');
  }

  const { period = 'month' } = req.query;

  let startDate;
  const now = new Date();

  switch (period) {
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'month':
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case 'year':
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      startDate = new Date(now.setMonth(now.getMonth() - 1));
  }

  const orders = await Order.find({
    sellerId: seller._id,
    status: { $in: ['Delivered', 'Processing', 'Shipped'] },
    createdAt: { $gte: startDate }
  });

  const totalEarnings = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const orderCount = orders.length;

  // Calculate earnings by day
  const earningsByDay = {};
  orders.forEach(order => {
    const day = order.createdAt.toISOString().split('T')[0];
    if (!earningsByDay[day]) {
      earningsByDay[day] = 0;
    }
    earningsByDay[day] += order.totalAmount;
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
  getSellerEarnings
};