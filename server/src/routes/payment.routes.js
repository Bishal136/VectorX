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

// ==================== Public Routes (Webhook & Redirects) ====================

// Webhook endpoint (no auth, signature verification inside)
router.post('/webhook', express.raw({ type: 'application/json' }), webhookHandler);

// Payment success and cancel callbacks (redirects)
router.get('/success', paymentSuccess);
router.get('/cancel', paymentCancel);

// ==================== Protected Routes ====================

// Initiate payment
router.post('/initiate', verifyToken, isUser, validate(initiatePaymentSchema), initiatePayment);

// Get payment status
router.get('/status/:orderId', verifyToken, isUser, getPaymentStatus);

module.exports = router;