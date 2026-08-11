const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const crypto = require('crypto');

// Generate access token
const generateAccessToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Generate refresh token
const generateRefreshToken = async (userId) => {
  // Generate random token
  const refreshToken = crypto.randomBytes(40).toString('hex');
  
  // Store in user document with expiry (30 days)
  const user = await User.findById(userId);
  if (user) {
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    // Keep only last 5 refresh tokens
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }
    await user.save();
  }
  
  return refreshToken;
};

// Verify refresh token
const verifyRefreshToken = async (userId, refreshToken) => {
  const user = await User.findById(userId);
  if (!user) return false;
  
  const tokenRecord = user.refreshTokens?.find(
    t => t.token === refreshToken && t.expiresAt > new Date()
  );
  
  return !!tokenRecord;
};

// Remove refresh token
const removeRefreshToken = async (userId, refreshToken) => {
  const user = await User.findById(userId);
  if (user) {
    user.refreshTokens = user.refreshTokens?.filter(
      t => t.token !== refreshToken
    ) || [];
    await user.save();
  }
};

// Remove all refresh tokens (logout from all devices)
const removeAllRefreshTokens = async (userId) => {
  const user = await User.findById(userId);
  if (user) {
    user.refreshTokens = [];
    await user.save();
  }
};

// Refresh access token
const refreshAccessToken = async (refreshToken) => {
  // Find user with this refresh token
  const user = await User.findOne({
    'refreshTokens.token': refreshToken,
    'refreshTokens.expiresAt': { $gt: new Date() }
  });
  
  if (!user) {
    throw new Error('Invalid or expired refresh token');
  }
  
  // Generate new tokens
  const newAccessToken = generateAccessToken(user._id);
  
  // Keep existing refresh token (or you could rotate them)
  // For security, we'll keep the same refresh token
  
  return {
    accessToken: newAccessToken,
    refreshToken: refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified
    }
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  removeRefreshToken,
  removeAllRefreshTokens,
  refreshAccessToken
};