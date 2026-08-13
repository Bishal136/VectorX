// src/services/seller.service.js (new file)

const Seller = require('../models/Seller.model');
const User = require('../models/User.model');
const ApiError = require('../utils/ApiError');

/**
 * Get seller profile or throw appropriate error
 */
const getSellerProfileOrThrow = async (userId) => {
  // Check user
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.isBlocked) {
    throw new ApiError(403, 'Your account has been blocked');
  }

  // Check if user has seller role
  if (user.role !== 'seller') {
    throw new ApiError(400, 'You are not registered as a seller');
  }

  // Find seller profile
  const seller = await Seller.findOne({ user: userId })
    .populate('user', 'name email phone isVerified isBlocked');

  if (!seller) {
    throw new ApiError(404, 'Seller profile not found. Please complete your seller registration.');
  }

  // Check verification status
  if (seller.verificationStatus === 'pending') {
    throw new ApiError(403, 'Your seller account is pending verification. Please wait for admin approval.');
  }

  if (seller.verificationStatus === 'rejected') {
    throw new ApiError(403, `Your seller application was rejected: ${seller.rejectionReason || 'No reason provided'}`);
  }

  return seller;
};

/**
 * Check if user is a verified seller
 */
const isVerifiedSeller = async (userId) => {
  try {
    const seller = await getSellerProfileOrThrow(userId);
    return seller.verificationStatus === 'approved';
  } catch (error) {
    return false;
  }
};

/**
 * Get seller dashboard data
 */
const getSellerDashboardData = async (sellerId) => {
  // Implement dashboard data aggregation
  // This would include orders, revenue, products count, etc.
};

module.exports = {
  getSellerProfileOrThrow,
  isVerifiedSeller,
  getSellerDashboardData
};