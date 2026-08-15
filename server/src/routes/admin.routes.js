// src/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middlewares/role.middleware');
const {verifyToken} = require('../middlewares/auth.middleware');
const {validate} = require('../middlewares/validate.middleware'); // assuming Joi validation
const adminController = require('../controllers/admin.controller');
const { adminSchemas } = require('../validations/admin.validation'); // we'll define schemas
const Cart = require('../models/Cart.model');

// All admin routes require authentication and admin role
router.use(verifyToken, isAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// User management
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById); 

router.put('/users/:id/block', validate(adminSchemas.blockUser), adminController.blockUser);
router.delete('/users/:id', validate(adminSchemas.deleteUserSchema), adminController.deleteUser); 

// Seller management
router.get('/sellers', adminController.getSellers);
router.get('/sellers/:id', adminController.getSellerById); 
router.put(
  '/sellers/:id/verify',
  validate(adminSchemas.verifySeller),
  adminController.verifySeller
);



// Category management
router.get('/categories', adminController.getCategories);
router.post('/categories', validate(adminSchemas.createCategory), adminController.createCategory);
router.put('/categories/:id', validate(adminSchemas.updateCategory), adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);

// Order management
router.get('/orders', adminController.getOrders);
router.put(
  '/orders/:id/status',
  validate(adminSchemas.updateOrderStatus),
  adminController.updateOrderStatus
);

router.put(
  '/sellers/:id/suspend',
  validate(adminSchemas.suspendSeller),
  adminController.suspendSeller
);

// Settings
router.get('/settings', adminController.getSettings);
router.put('/settings', validate(adminSchemas.updateSettings), adminController.updateSettings);

module.exports = router;