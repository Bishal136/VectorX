// src/controllers/auth.controller.js
const User = require('../models/User.model');
const Seller = require('../models/Seller.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { generateAccessToken, generateRefreshToken, refreshAccessToken, removeRefreshToken, removeAllRefreshTokens } = require('../services/refreshToken.service');
const { sendOTP, verifyOTP } = require('../services/otp.service');

// ==================== Manual Authentication ====================

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;
  const normalizedEmail = email ? email.trim().toLowerCase() : '';
  const normalizedPhone = phone ? phone.trim() : undefined;

  // Validate role - only user and seller can self-register
  if (role && !['user', 'seller'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid role. Only user and seller can self-register.'
    });
  }

  // Check if user exists
  const orConditions = [{ email: normalizedEmail }];
  if (normalizedPhone) orConditions.push({ phone: normalizedPhone });

  const userExists = await User.findOne({
    $or: orConditions
  });

  if (userExists) {
    // If the account is already verified, inform them to login
    if (userExists.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or phone. Please sign in.'
      });
    }

    // Account was created but not yet verified:
    // Update password, name, phone, role, and send fresh OTP
    userExists.name = name ? name.trim() : userExists.name;
    userExists.password = password; // Will be hashed in userSchema pre('save')
    if (normalizedPhone) userExists.phone = normalizedPhone;
    if (role) userExists.role = role;
    await userExists.save();

    // If role is seller, ensure seller profile exists
    let sellerProfile = null;
    if (userExists.role === 'seller') {
      try {
        sellerProfile = await Seller.findOne({ user: userExists._id });
        if (!sellerProfile) {
          sellerProfile = await Seller.create({
            user: userExists._id,
            shopName: `${userExists.name || 'Merchant'}'s Shop`,
            shopAddress: {
              line1: 'Please update your shop address',
              city: 'Unknown',
              pincode: '000000'
            },
            location: {
              type: 'Point',
              coordinates: [0, 0]
            },
            verificationStatus: 'pending',
            isVerified: false
          });
        }
      } catch (error) {
        console.error('Failed to update seller profile:', error);
      }
    }

    // Generate fresh OTP
    await sendOTP(normalizedEmail);

    const responseData = {
      id: userExists._id,
      name: userExists.name,
      email: userExists.email,
      role: userExists.role,
      isVerified: userExists.isVerified
    };

    if (sellerProfile) {
      responseData.sellerProfile = {
        id: sellerProfile._id,
        shopName: sellerProfile.shopName,
        verificationStatus: sellerProfile.verificationStatus,
        needsCompletion: true
      };
    }

    return res.status(200).json({
      success: true,
      message: 'Account already registered but not verified. A new OTP has been sent to your email.',
      data: responseData
    });
  }

  // Create new user
  const user = await User.create({
    name: name ? name.trim() : name,
    email: normalizedEmail,
    password,
    phone: normalizedPhone,
    role: role || 'user'
  });

  // If role is seller, automatically create a seller profile
  let sellerProfile = null;
  if (user.role === 'seller') {
    try {
      sellerProfile = await Seller.create({
        user: user._id,
        shopName: `${name || 'Merchant'}'s Shop`,
        shopAddress: {
          line1: 'Please update your shop address',
          city: 'Unknown',
          pincode: '000000'
        },
        location: {
          type: 'Point',
          coordinates: [0, 0]
        },
        verificationStatus: 'pending',
        isVerified: false
      });
    } catch (error) {
      console.error('Failed to create seller profile:', error);
      // Don't fail the registration, just log the error
    }
  }

  // Generate OTP
  await sendOTP(normalizedEmail);

  const responseData = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified
  };

  // Add seller info if applicable
  if (sellerProfile) {
    responseData.sellerProfile = {
      id: sellerProfile._id,
      shopName: sellerProfile.shopName,
      verificationStatus: sellerProfile.verificationStatus,
      needsCompletion: true
    };
  }

  res.status(201).json({
    success: true,
    message: user.role === 'seller'
      ? 'Seller registered successfully. Please verify your email with OTP and complete your shop details after verification.'
      : 'User registered successfully. Please verify your email with OTP.',
    data: responseData
  });
});

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTPController = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const normalizedEmail = email ? email.trim().toLowerCase() : '';

  // Verify OTP from database
  const result = await verifyOTP(normalizedEmail, otp, 'verification');

  if (!result.valid) {
    return res.status(400).json({
      success: false,
      message: result.message
    });
  }

  // Find and verify user
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  user.isVerified = true;
  await user.save();

  // Check if seller has profile (for seller users)
  let sellerWarning = null;
  if (user.role === 'seller') {
    const sellerExists = await Seller.findOne({ user: user._id });
    if (!sellerExists) {
      sellerWarning = 'Your seller profile is missing. Please register as a seller to complete your shop setup.';
    }
  }

  res.json({
    success: true,
    message: 'Email verified successfully. You can now login.',
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified
    },
    ...(sellerWarning && { warning: sellerWarning })
  });
});

// @desc    Login user (manual)
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email ? email.trim().toLowerCase() : '';

  // Get user with password field
  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Check if user is blocked
  if (user.isBlocked) {
    return res.status(403).json({
      success: false,
      message: 'Your account has been blocked'
    });
  }

  // Check if user is verified
  if (!user.isVerified) {
    return res.status(401).json({
      success: false,
      message: 'Please verify your email first'
    });
  }

  // Verify password
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = await generateRefreshToken(user._id);

  // Prepare user data
  const userData = {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isVerified: user.isVerified,
    location: user.location
  };

  // If user is a seller, check seller profile
  let sellerData = null;
  let warning = null;

  if (user.role === 'seller') {
    const sellerProfile = await Seller.findOne({ user: user._id });

    if (!sellerProfile) {
      warning = {
        message: 'Your seller profile is missing. Please register as a seller to manage your shop.',
        needsSellerRegistration: true
      };
    } else {
      sellerData = {
        id: sellerProfile._id,
        shopName: sellerProfile.shopName,
        verificationStatus: sellerProfile.verificationStatus,
        isVerified: sellerProfile.isVerified
      };

      // Add warnings based on verification status
      if (sellerProfile.verificationStatus === 'pending') {
        warning = {
          message: 'Your seller account is pending verification. You can browse products but cannot sell until verified.',
          needsVerification: true
        };
      } else if (sellerProfile.verificationStatus === 'rejected') {
        warning = {
          message: `Your seller application was rejected: ${sellerProfile.rejectionReason || 'No reason provided'}`,
          needsReapply: true
        };
      }
    }
  }

  res.json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      user: userData,
      ...(sellerData && { seller: sellerData }),
      ...(warning && { warning })
    }
  });
});

// ==================== Google OAuth ====================

// @desc    Initiate Google OAuth
// @route   GET /api/auth/google
// @access  Public
const googleAuth = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Google auth endpoint'
  });
});

// @desc    Google OAuth callback
// @route   GET /api/auth/google/callback
// @access  Public
const googleAuthCallback = asyncHandler(async (req, res) => {
  const user = req.user;

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = await generateRefreshToken(user._id);

  const userData = {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isVerified: user.isVerified,
    location: user.location
  };

  const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
  const redirectUrl =
    `${frontendUrl}/auth/google/callback` +
    `?accessToken=${encodeURIComponent(accessToken)}` +
    `&refreshToken=${encodeURIComponent(refreshToken)}` +
    `&user=${encodeURIComponent(JSON.stringify(userData))}`;

  res.redirect(redirectUrl);

});

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, 'Not authenticated');
  }

  const user = req.user.toObject ? req.user.toObject() : { ...req.user };

  // Remove sensitive fields
  delete user.password;
  delete user.refreshTokens;

  // If user is seller, fetch seller profile
  let sellerProfile = null;
  if (user.role === 'seller') {
    sellerProfile = await Seller.findOne({ user: user._id })
      .select('shopName shopAddress location verificationStatus isVerified rejectionReason');
  }

  res.json({
    success: true,
    data: {
      ...user,
      ...(sellerProfile && { seller: sellerProfile })
    }
  });
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: 'Refresh token is required'
    });
  }

  try {
    const result = await refreshAccessToken(refreshToken);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message || 'Invalid refresh token'
    });
  }
});

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    await removeRefreshToken(req.user.id, refreshToken);
  } else {
    await removeAllRefreshTokens(req.user.id);
  }

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// ==================== Password Management ====================

// @desc    Forgot password - send reset OTP
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = email ? email.trim().toLowerCase() : '';

  if (!normalizedEmail) {
    return res.status(400).json({
      success: false,
      message: 'Email is required'
    });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset OTP'
    });
  }

  if (user.isBlocked) {
    return res.status(403).json({
      success: false,
      message: 'Your account has been blocked'
    });
  }

  const result = await sendOTP(normalizedEmail, 'password_reset');

  if (!result.success) {
    return res.status(500).json({
      success: false,
      message: 'Failed to send reset email. Please try again later.'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Password reset OTP sent to your email. Valid for 10 minutes.'
  });
});

// @desc    Reset password with OTP
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword, confirmPassword } = req.body;
  const normalizedEmail = email ? email.trim().toLowerCase() : '';

  if (!normalizedEmail || !otp || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Email, OTP, and new password are required'
    });
  }

  if (confirmPassword && newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Passwords do not match'
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long'
    });
  }

  const result = await verifyOTP(normalizedEmail, otp, 'password_reset');

  if (!result.valid) {
    return res.status(400).json({
      success: false,
      message: result.message
    });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  if (user.isBlocked) {
    return res.status(403).json({
      success: false,
      message: 'Your account has been blocked'
    });
  }

  user.password = newPassword;
  await user.save();

  await removeAllRefreshTokens(user._id);

  res.status(200).json({
    success: true,
    message: 'Password reset successfully. Please login with your new password.'
  });
});

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOTP = asyncHandler(async (req, res) => {
  const { email, type = 'verification' } = req.body;
  const normalizedEmail = email ? email.trim().toLowerCase() : '';

  if (!normalizedEmail) {
    return res.status(400).json({
      success: false,
      message: 'Email is required'
    });
  }

  if (type === 'verification') {
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }
  }

  const result = await sendOTP(normalizedEmail, type);

  if (!result.success) {
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again later.'
    });
  }

  res.status(200).json({
    success: true,
    message: `OTP resent to your email. Valid for 10 minutes.`
  });
});

// ==================== Seed Admin ====================

// @desc    Seed admin account (should be called once via script)
// @route   POST /api/auth/seed-admin
// @access  Public (but should be protected in production)
const seedAdmin = asyncHandler(async (req, res) => {
  const { secret } = req.body;
  const validSecret = process.env.ADMIN_SEED_SECRET || 'your-seed-secret';

  if (secret !== validSecret) {
    return res.status(401).json({
      success: false,
      message: 'Invalid seed secret'
    });
  }

  let admin = await User.findOne({ role: 'admin' });
  if (admin) {
    admin.password = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
    admin.isVerified = true;
    await admin.save();

    return res.status(201).json({
      success: true,
      message: 'Admin account verified and seeded successfully',
      data: {
        id: admin._id,
        email: admin.email,
        role: admin.role
      }
    });
  }

  admin = await User.create({
    name: 'Admin',
    email: 'admin@vectorx.com',
    password: process.env.ADMIN_DEFAULT_PASSWORD || 'admin123',
    role: 'admin',
    isVerified: true
  });

  res.status(201).json({
    success: true,
    message: 'Admin account created successfully',
    data: {
      id: admin._id,
      email: admin.email,
      role: admin.role
    }
  });
});

// ==================== Role-Based Access Check ====================

// @desc    Check user role
// @route   GET /api/auth/check-role
// @access  Private
const checkRole = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      role: req.user.role,
      isVerified: req.user.isVerified,
      isBlocked: req.user.isBlocked
    }
  });
});

// @desc    Change password for authenticated user
// @route   POST /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current password and new password are required');
  }

  if (confirmPassword && newPassword !== confirmPassword) {
    throw new ApiError(400, 'New passwords do not match');
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, 'New password must be at least 6 characters long');
  }

  if (currentPassword === newPassword) {
    throw new ApiError(400, 'New password cannot be the same as the current password');
  }

  // Find user with password
  const user = await User.findById(req.user.id).select('+password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Verify current password
  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password changed successfully'
  });
});

module.exports = {
  register,
  verifyOTPController,
  login,
  googleAuth,
  googleAuthCallback,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  resendOTP,
  getProfile,
  checkRole,
  seedAdmin
};