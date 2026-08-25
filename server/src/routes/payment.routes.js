// src/routes/payment.routes.js
const express = require('express');
const router = express.Router();
const {
  initiatePayment,
  paymentSuccess,
  paymentCancel,
  webhookHandler,
  getPaymentStatus
} = require('../controllers/payment.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { isUser } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const Joi = require('joi');

// Validation schema for initiate payment
const initiatePaymentSchema = Joi.object({
  orderId: Joi.string().required()
});

// ==================== Public Routes (IPN & Callbacks) ====================

// IPN / Webhook endpoints (server-to-server notifications from PortPos)
router.post('/ipn', webhookHandler);
router.post('/webhook', webhookHandler);

// Payment success and cancel callbacks (GET/POST redirects from PortPos)
router.get('/success', paymentSuccess);
router.post('/success', paymentSuccess);
router.get('/cancel', paymentCancel);
router.post('/cancel', paymentCancel);

// ==================== Protected Routes ====================

// Initiate PortPos payment for an order
router.post('/initiate', verifyToken, isUser, validate(initiatePaymentSchema), initiatePayment);

// Get payment status for an order
router.get('/status/:orderId', verifyToken, isUser, getPaymentStatus);

module.exports = router;