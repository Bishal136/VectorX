const express = require('express');
const passport = require('passport');
const router = express.Router();
const { 
  register,
  verifyOTPController,
  login,
  googleAuth,
  googleAuthCallback,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  getProfile,
  checkRole,
  seedAdmin
} = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// ==================== Public Routes ====================

// Manual auth
router.post('/register', register);
router.post('/verify-otp', verifyOTPController);
router.post('/login', login);

// Google OAuth
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'] 
}));
router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
    session: false
  }),
  googleAuthCallback
);

// Token refresh
router.post('/refresh', refreshToken);

// Password management
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Admin seed (protect in production)
router.post('/seed-admin', seedAdmin);

// ==================== Private Routes ====================

// Profile
router.get('/profile', verifyToken, getProfile);
router.get('/check-role', verifyToken, checkRole);

// Logout
router.post('/logout', verifyToken, logout);

module.exports = router;