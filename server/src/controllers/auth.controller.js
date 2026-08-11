const User = require('../models/User.model');
const asyncHandler = require('../utils/asyncHandler');
const { generateAccessToken, generateRefreshToken, refreshAccessToken, removeRefreshToken, removeAllRefreshTokens } = require('../services/refreshToken.service');
const { sendOTP, verifyOTP } = require('../services/otp.service');

// ==================== Manual Authentication ====================

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  // Validate role - only user and seller can self-register
  if (role && !['user', 'seller'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid role. Only user and seller can self-register.'
    });
  }

  // Check if user exists
  const userExists = await User.findOne({ 
    $or: [{ email }, { phone }] 
  });

  if (userExists) {
    return res.status(400).json({
      success: false,
      message: 'User already exists with this email or phone'
    });
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: role || 'user'
  });

  // Generate OTP
  await sendOTP(email);

  res.status(201).json({
    success: true,
    message: 'User registered successfully. Please verify your email with OTP.',
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified
    }
  });
});

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTPController = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  // Verify OTP
  const result = verifyOTP(email, otp);
  
  if (!result.valid) {
    return res.status(400).json({
      success: false,
      message: result.message
    });
  }

  // Find and verify user
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  user.isVerified = true;
  await user.save();

  res.json({
    success: true,
    message: 'Email verified successfully. You can now login.'
  });
});

// @desc    Login user (manual)
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Get user with password field
  const user = await User.findOne({ email }).select('+password');

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

  res.json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        location: user.location
      }
    }
  });
});

// ==================== Google OAuth ====================

// @desc    Initiate Google OAuth
// @route   GET /api/auth/google
// @access  Public
const googleAuth = asyncHandler(async (req, res) => {
  // This route will be handled by passport.authenticate('google')
  // The controller is just a placeholder
  res.status(200).json({
    success: true,
    message: 'Google auth endpoint'
  });
});

// @desc    Google OAuth callback
// @route   GET /api/auth/google/callback
// @access  Public
const googleAuthCallback = asyncHandler(async (req, res) => {
  // This is handled by passport.authenticate('google')
  // The user is attached to req.user by passport
  const user = req.user;
  
  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = await generateRefreshToken(user._id);
  
  // Redirect to frontend with tokens
  const redirectUrl = `${process.env.FRONTEND_URL}/oauth-success?accessToken=${accessToken}&refreshToken=${refreshToken}`;
  
  res.redirect(redirectUrl);
});

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .select('-refreshTokens');
  
  res.json({
    success: true,
    data: user
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

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  // Send OTP for password reset
  await sendOTP(email);
  
  res.json({
    success: true,
    message: 'OTP sent to your email for password reset'
  });
});

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  
  // Verify OTP
  const result = verifyOTP(email, otp);
  
  if (!result.valid) {
    return res.status(400).json({
      success: false,
      message: result.message
    });
  }
  
  // Find user and update password
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  user.password = newPassword;
  await user.save();
  
  res.json({
    success: true,
    message: 'Password reset successfully'
  });
});

// ==================== Seed Admin ====================

// @desc    Seed admin account (should be called once via script)
// @route   POST /api/auth/seed-admin
// @access  Public (but should be protected in production)
const seedAdmin = asyncHandler(async (req, res) => {
  const { secret } = req.body;
  
  // Check secret to prevent unauthorized admin creation
  if (secret !== process.env.ADMIN_SEED_SECRET) {
    return res.status(401).json({
      success: false,
      message: 'Invalid seed secret'
    });
  }
  
  // Check if admin already exists
  const existingAdmin = await User.findOne({ role: 'admin' });
  if (existingAdmin) {
    return res.status(400).json({
      success: false,
      message: 'Admin account already exists'
    });
  }
  
  // Create admin
  const admin = await User.create({
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

module.exports = {
  // Manual auth
  register,
  verifyOTPController,
  login,
  
  // Google auth
  googleAuth,
  googleAuthCallback,
  
  // Token management
  refreshToken,
  logout,
  
  // Password management
  forgotPassword,
  resetPassword,
  
  // Profile
  getProfile,
  checkRole,
  
  // Admin seed
  seedAdmin
};