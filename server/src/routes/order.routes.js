// src/routes/order.routes.js
const express = require('express');
const router = express.Router();
const {
  createOrders,
  getUserOrders,
  getOrderById,
  cancelOrder,
  adminGetOrders,
  adminUpdateOrderStatus
} = require('../controllers/order.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { isUser, isAdmin } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const Joi = require('joi');

// ===================== Validation Schemas =====================

const createOrderSchema = Joi.object({
  shippingAddress: Joi.object({
    label: Joi.string().optional(),
    line1: Joi.string().required(),
    line2: Joi.string().optional().allow(''),
    city: Joi.string().required(),
    state: Joi.string().optional(),
    pincode: Joi.string().required(),
    coordinates: Joi.array().items(Joi.number()).length(2).optional(),
    phone: Joi.string().optional()
  }).required(),
  paymentMethod: Joi.string().valid('stripe', 'paypal','WALLEMIX','COD').required(),
  couponCode: Joi.string().optional().allow(''),
  notes: Joi.string().optional().allow('')
});

const cancelOrderSchema = Joi.object({
  cancellationReason: Joi.string().optional()
});

const adminUpdateStatusSchema = Joi.object({
  status: Joi.string().valid(
    'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'
  ).required()
});

// ===================== Admin Routes =====================

router.get('/admin/all',verifyToken, isAdmin, adminGetOrders);
router.put('/admin/:id/status',verifyToken, isAdmin, validate(adminUpdateStatusSchema), adminUpdateOrderStatus);


// ===================== User Routes (Authenticated) =====================

router.use(verifyToken);
router.use(isUser); // All order routes require user role (except admin ones)

// Create order (checkout)
router.post('/', validate(createOrderSchema), createOrders);

// Get user orders
router.get('/', getUserOrders);

// Get single order
router.get('/:id', getOrderById);

// Cancel order
router.put('/:id/cancel', validate(cancelOrderSchema), cancelOrder);


module.exports = router;