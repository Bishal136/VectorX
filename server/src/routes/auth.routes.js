const express = require('express');
const passport = require('passport');
const router = express.Router();
const { 
  register,
  verifyOTPController,
  resendOTP,
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
router.post('/resend-otp', resendOTP);
router.post('/login', login);

// Google OAuth
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'],
  prompt: 'select_account'
}));

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user, info) => {
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    if (err) {
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(err.message || 'google_auth_failed')}`);
    }
    if (!user) {
      const msg = info?.message || 'Account not found. Please register first before using Google Login.';
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(msg)}`);
    }
    req.user = user;
    return googleAuthCallback(req, res, next);
  })(req, res, next);
});

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