// src/middlewares/role.middleware.js
const ApiError = require('../utils/ApiError');
const User = require('../models/User.model');
const Seller = require('../models/Seller.model');

/**
 * Check if user has the required role
 * @param {string|string[]} roles - Single role or array of allowed roles
 */
const hasRole = (roles) => {
  return async (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, 'Insufficient permissions');
    }

    next();
  };
};

/**
 * Middleware: User role required
 */
const isUser = hasRole('user');

/**
 * Middleware: Seller role required
 */
const isSeller = hasRole('seller');

/**
 * Middleware: Admin role required
 */
const isAdmin = hasRole('admin');

/**
 * Middleware: Seller must be verified
 */
const isVerifiedSeller = async (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  if (req.user.role !== 'seller') {
    throw new ApiError(403, 'Seller account required');
  }

  const seller = await Seller.findOne({ user: req.user.id });
  if (!seller) {
    throw new ApiError(404, 'Seller profile not found');
  }

  if (seller.verificationStatus !== 'approved') {
    throw new ApiError(403, 'Seller account not verified. Please wait for admin approval.');
  }

  // Attach seller to request for use in controllers
  req.seller = seller;
  next();
};

/**
 * Middleware: Check if user is the owner of a resource
 * Can be composed with other middleware
 */
const isResourceOwner = (model, paramName = 'id', idField = '_id') => {
  return async (req, res, next) => {
    try {
      const resource = await model.findOne({
        [idField]: req.params[paramName],
        userId: req.user.id
      });

      if (!resource) {
        throw new ApiError(403, 'You do not have permission to access this resource');
      }

      req.resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware: Allow only admin or resource owner
 */
const isAdminOrOwner = (model, paramName = 'id', idField = '_id') => {
  return async (req, res, next) => {
    if (req.user.role === 'admin') {
      return next();
    }

    const resource = await model.findOne({
      [idField]: req.params[paramName],
      userId: req.user.id
    });

    if (!resource) {
      throw new ApiError(403, 'You do not have permission to access this resource');
    }

    req.resource = resource;
    next();
  };
};

module.exports = {
  hasRole,
  isUser,
  isSeller,
  isAdmin,
  isVerifiedSeller,
  isResourceOwner,
  isAdminOrOwner
};