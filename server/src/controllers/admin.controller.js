// src/controllers/admin.controller.js
const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const User = require('../models/User.model');
const Seller = require('../models/Seller.model');
const Product = require('../models/Product.model');
const { Order } = require('../models/Order.model'); // we need to import the model, not the object
const Category = require('../models/Category.model');
const Setting = require('../models/Setting.model');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../models/Order.model');
const Cart = require('../models/Cart.model');

// -------------------- Dashboard --------------------
const getDashboardStats = asyncHandler(async (req, res) => {
  // Aggregations in parallel for performance
  const [
    totalUsers,
    totalSellers,
    totalOrders,
    revenueStats,
    pendingSellers,
    recentOrders,
  ] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'seller' }),
    Order.countDocuments(),
    Order.aggregate([
      { $match: { paymentStatus: PAYMENT_STATUS.PAID, status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.SHIPPED] } } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, totalCommission: { $sum: '$commissionAmount' } } },
    ]),
    Seller.countDocuments({ verificationStatus: 'pending' }),
    Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'name email')
      .populate('sellerId', 'shopName')
      .lean(),
  ]);

  const revenue = revenueStats.length > 0 ? revenueStats[0] : { totalRevenue: 0, totalCommission: 0 };

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      totalSellers,
      totalOrders,
      totalRevenue: revenue.totalRevenue,
      totalCommission: revenue.totalCommission,
      pendingSellerVerifications: pendingSellers,
      recentOrders,
    },
  });
});

// -------------------- User Management --------------------
const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '', role = '' } = req.query;
  const skip = (page - 1) * limit;

  const filter = {};
  if (role) filter.role = role;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password -refreshTokens')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .lean(),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

const blockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { block } = req.body; // block: true/false

  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found');

  // Prevent admin from blocking themselves
  if (user._id.toString() === req.user.id) {
    throw new ApiError(400, 'You cannot block your own account');
  }

  user.isBlocked = block;
  await user.save();

  res.status(200).json({
    success: true,
    data: {
      id: user._id,
      isBlocked: user.isBlocked,
    },
    message: `User ${block ? 'blocked' : 'unblocked'} successfully`,
  });
});

// -------------------- Seller Management --------------------
const getSellers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, verificationStatus = '', search = '' } = req.query;
  const skip = (page - 1) * limit;

  // We need to join with User to filter by name/email
  const filter = {};
  if (verificationStatus) filter.verificationStatus = verificationStatus;

  // For search on shopName, we can add a regex on shopName
  // Or we can also search by user's name/email via populate match
  // We'll use aggregation for better search
  const pipeline = [
    { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    { $match: filter },
  ];

  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { shopName: { $regex: search, $options: 'i' } },
          { 'user.name': { $regex: search, $options: 'i' } },
          { 'user.email': { $regex: search, $options: 'i' } },
        ],
      },
    });
  }

  const [sellers, total] = await Promise.all([
    Seller.aggregate([
      ...pipeline,
      { $skip: skip },
      { $limit: parseInt(limit) },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          _id: 1,
          shopName: 1,
          shopAddress: 1,
          location: 1,
          gstNumber: 1,
          panNumber: 1,
          isVerified: 1,
          verificationStatus: 1,
          rejectionReason: 1,
          createdAt: 1,
          user: { _id: 1, name: 1, email: 1, phone: 1, isBlocked: 1 },
        },
      },
    ]),
    Seller.aggregate([...pipeline, { $count: 'total' }]),
  ]);

  const totalCount = total.length > 0 ? total[0].total : 0;

  res.status(200).json({
    success: true,
    data: sellers,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  });
});

const verifySeller = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body; // status: 'approved' | 'rejected'

  if (!['approved', 'rejected'].includes(status)) {
    throw new ApiError(400, 'Invalid status. Must be "approved" or "rejected"');
  }

  const seller = await Seller.findById(id);
  if (!seller) throw new ApiError(404, 'Seller not found');

  // If already verified, prevent re-verification unless status changes
  if (seller.verificationStatus === 'approved' && status === 'approved') {
    throw new ApiError(400, 'Seller already approved');
  }

  seller.verificationStatus = status;
  seller.isVerified = status === 'approved';
  if (status === 'rejected' && rejectionReason) {
    seller.rejectionReason = rejectionReason;
  } else if (status === 'approved') {
    seller.rejectionReason = undefined; // clear reason on approval
  }

  await seller.save();

  // Also update the user's role to 'seller' if approved? Already should be.
  // If rejected, maybe keep user as 'user' (already done)

  res.status(200).json({
    success: true,
    data: {
      id: seller._id,
      verificationStatus: seller.verificationStatus,
      isVerified: seller.isVerified,
      rejectionReason: seller.rejectionReason,
    },
    message: `Seller ${status} successfully`,
  });
});

// -------------------- Category Management --------------------
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
  res.status(200).json({ success: true, data: categories });
});

const createCategory = asyncHandler(async (req, res) => {
  const { name, slug, description, parent, image, seo, sortOrder, isActive } = req.body;

  // Check if name already exists
  const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
  if (existing) throw new ApiError(400, 'Category with this name already exists');

  // Auto-generate slug from name if not provided
  const finalSlug = slug || name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const category = await Category.create({
    name,
    slug: finalSlug,
    description,
    parent: parent || null,
    image: image || {},
    seo: seo || {},
    sortOrder: sortOrder || 0,
    isActive: isActive !== undefined ? isActive : true,
  });

  res.status(201).json({
    success: true,
    data: category,
    message: 'Category created successfully',
  });
});

const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const category = await Category.findById(id);
  if (!category) throw new ApiError(404, 'Category not found');

  // Prevent duplicate name if changing name
  if (updates.name && updates.name !== category.name) {
    const existing = await Category.findOne({ name: { $regex: new RegExp(`^${updates.name}$`, 'i') } });
    if (existing) throw new ApiError(400, 'Category with this name already exists');
  }

  Object.assign(category, updates);
  await category.save();

  res.status(200).json({
    success: true,
    data: category,
    message: 'Category updated successfully',
  });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { force } = req.query; // ?force=true for cascade delete

  const category = await Category.findById(id);
  if (!category) throw new ApiError(404, 'Category not found');

  // Check if category has products
  const productCount = await Product.countDocuments({ category: id });
  if (productCount > 0) {
    throw new ApiError(400, 'Cannot delete category with existing products. Reassign or archive first.');
  }

  // Check subcategories
  const subCount = await Category.countDocuments({ parent: id });
  if (subCount > 0) {
    if (force !== 'true') {
      throw new ApiError(400, 'Cannot delete category that has subcategories. Use ?force=true to delete subcategories too, or delete them first.');
    }
    // Cascade delete subcategories
    await Category.deleteMany({ parent: id });
  }

  await Category.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: force === 'true' 
      ? 'Category and its subcategories deleted successfully' 
      : 'Category deleted successfully',
  });
});

// -------------------- Order Management --------------------
const getOrders = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status = '',
    paymentStatus = '',
    sellerId = '',
    userId = '',
    fromDate = '',
    toDate = '',
  } = req.query;
  const skip = (page - 1) * limit;

  const filter = {};
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (sellerId) filter.sellerId = sellerId;
  if (userId) filter.userId = userId;

  // Date range
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) filter.createdAt.$lte = new Date(toDate);
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('userId', 'name email')
      .populate('sellerId', 'shopName')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .lean(),
    Order.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: orders,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// Optional: Admin can update order status (e.g., for dispute resolution)
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  if (!Object.values(ORDER_STATUS).includes(status)) {
    throw new ApiError(400, 'Invalid order status');
  }

  const order = await Order.findById(id);
  if (!order) throw new ApiError(404, 'Order not found');

  // Admin can set any status, but we might add validation
  order.status = status;
  if (notes) order.notes = (order.notes || '') + `\nAdmin note: ${notes}`;
  await order.save();

  res.status(200).json({
    success: true,
    data: order,
    message: 'Order status updated',
  });
});

// -------------------- Settings Management --------------------
const getSettings = asyncHandler(async (req, res) => {
  const settings = await Setting.getSettings();
  res.status(200).json({ success: true, data: settings });
});

const updateSettings = asyncHandler(async (req, res) => {
  const { deliveryCharge, commissionRate, couponCodes } = req.body;

  const settings = await Setting.getSettings();

  if (deliveryCharge !== undefined) settings.deliveryCharge = deliveryCharge;
  if (commissionRate !== undefined) settings.commissionRate = commissionRate;
  if (couponCodes) settings.couponCodes = couponCodes; // replace entire array

  await settings.save();

  res.status(200).json({
    success: true,
    data: settings,
    message: 'Settings updated successfully',
  });
});

// -------------------- Get Single User (Admin) --------------------
const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid user ID format');
  }

  const user = await User.findById(id)
    .select('-password -refreshTokens')
    .lean();

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Optionally, also fetch seller profile if user is a seller
  let sellerProfile = null;
  if (user.role === 'seller') {
    sellerProfile = await Seller.findOne({ user: user._id })
      .select('shopName shopAddress location verificationStatus isVerified rejectionReason')
      .lean();
  }

  res.status(200).json({
    success: true,
    data: {
      ...user,
      ...(sellerProfile && { seller: sellerProfile }),
    },
  });
});

// -------------------- Delete User (Permanent) --------------------
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid user ID format');
  }

  // Prevent admin from deleting themselves
  if (id === req.user.id) {
    throw new ApiError(400, 'You cannot delete your own account');
  }

  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // If user is a seller, also delete their seller profile and products?
  // We'll optionally handle seller profile deletion.
  if (user.role === 'seller') {
    // Delete seller profile
    const seller = await Seller.findOne({ user: id });
    if (seller) {
      // Optionally delete all products of this seller
      await Product.deleteMany({ sellerId: seller._id });
      await Seller.findByIdAndDelete(seller._id);
    }
  }

  // Delete the user
  await User.findByIdAndDelete(id);

  // Also clean up any related data (cart, orders? We may want to keep orders for audit)
  // But we can optionally delete cart and reviews, but we skip orders for record-keeping.
  await Cart.deleteMany({ userId: id });

  res.status(200).json({
    success: true,
    message: 'User and associated data deleted successfully',
  });
});

const getSellerById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid seller ID format');
  }

  const seller = await Seller.findById(id)
    .populate('user', 'name email phone isVerified isBlocked')
    .lean();

  if (!seller) {
    throw new ApiError(404, 'Seller not found');
  }

  res.status(200).json({
    success: true,
    data: seller
  });
});

const suspendSeller = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { suspend, reason } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid seller ID format');
  }

  const seller = await Seller.findById(id);
  if (!seller) throw new ApiError(404, 'Seller not found');

  seller.isSuspended = suspend;
  if (suspend && reason) {
    seller.suspensionReason = reason;
  } else if (!suspend) {
    seller.suspensionReason = undefined; // clear on unsuspend
  }

  await seller.save();

  res.status(200).json({
    success: true,
    data: {
      id: seller._id,
      isSuspended: seller.isSuspended,
      suspensionReason: seller.suspensionReason,
    },
    message: `Seller ${suspend ? 'suspended' : 'unsuspended'} successfully`,
  });
});


// -------------------- Export --------------------
module.exports = {
  suspendSeller,
  getSellerById,
  getUserById,
  deleteUser,
  getDashboardStats,
  getUsers,
  blockUser,
  getSellers,
  verifySeller,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getOrders,
  updateOrderStatus,
  getSettings,
  updateSettings,
};