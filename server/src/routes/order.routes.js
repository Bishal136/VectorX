// src/routes/order.routes.js
const express = require('express');
const router = express.Router();
const {
  createOrders,
  getUserOrders,
  getOrderById,
  cancelOrder,
  requestReturn,
  adminGetOrders,
  adminUpdateOrderStatus,
  validateCoupon
} = require('../controllers/order.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { isUser, isAdmin } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const Joi = require('joi');

// ===================== Validation Schemas =====================

const createOrderSchema = Joi.object({
  shippingAddress: Joi.object({
    label: Joi.string().optional().allow(''),
    line1: Joi.string().required(),
    line2: Joi.string().optional().allow(''),
    city: Joi.string().required(),
    state: Joi.string().optional().allow(''),
    pincode: Joi.string().required(),
    coordinates: Joi.array().items(Joi.number()).length(2).optional(),
    phone: Joi.string().optional().allow('')
  }).required(),
  paymentMethod: Joi.string().valid('PORTPOS', 'COD').default('COD'),
  couponCode: Joi.string().optional().allow(''),
  notes: Joi.string().optional().allow(''),
  outOfStockAction: Joi.string().optional().allow(''),
  referralSource: Joi.string().optional().allow(''),
  items: Joi.array().items(Joi.object({
    productId: Joi.string().required(),
    quantity: Joi.number().integer().min(1).default(1)
  })).optional()
});

const cancelOrderSchema = Joi.object({
  cancellationReason: Joi.string().optional()
});

const returnRequestSchema = Joi.object({
  reason: Joi.string().required().min(3).max(500),
  customerNotes: Joi.string().optional().allow('')
});

const adminUpdateStatusSchema = Joi.object({
  status: Joi.string().valid(
    'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return_Requested', 'Return_Approved', 'Return_Rejected', 'Refunded'
  ).required()
});

// ===================== Public / Coupon Validation =====================
router.post('/validate-coupon', validateCoupon);

// ===================== Admin Routes =====================

router.get('/admin/all', verifyToken, isAdmin, adminGetOrders);
router.put('/admin/:id/status', verifyToken, isAdmin, validate(adminUpdateStatusSchema), adminUpdateOrderStatus);


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

// Request return / refund
router.post('/:id/return', validate(returnRequestSchema), requestReturn);
router.put('/:id/return', validate(returnRequestSchema), requestReturn);


module.exports = router;