// vectorx-backend/src/routes/user.routes.js
const express = require('express');
const router = express.Router();
const {
 
  getProfile,
  updateProfile,
  updateLocation,
  getOrders,
  getOrderDetails,
  addWishlist,
  removeWishlist,
  getWishlist,
  addAddress,
  updateAddress,
  removeAddress,
  setDefaultAddress,
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require('../controllers/user.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// All user routes require authentication
router.use(verifyToken);

// Profile management
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Location management
router.put('/location', updateLocation);

// Address management
router.get('/addresses', getProfile); // Reuses getProfile
router.post('/addresses', addAddress);
router.put('/addresses/:addressId', updateAddress);
router.delete('/addresses/:addressId', removeAddress);
router.put('/addresses/:addressId/default', setDefaultAddress);

// Order management

router.get('/orders', getOrders);
router.get('/orders/:orderId', getOrderDetails);

// Wishlist management
router.get('/wishlist', getWishlist);
router.post('/wishlist/:productId', addWishlist);
router.delete('/wishlist/:productId', removeWishlist);

// Cart management
router.get('/cart', getCart);
router.post('/cart', addToCart);
router.put('/cart/:itemId', updateCartItem);
router.delete('/cart/:itemId', removeFromCart);
router.delete('/cart', clearCart);

module.exports = router;