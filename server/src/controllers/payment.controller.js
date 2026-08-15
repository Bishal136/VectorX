// src/controllers/payment.controller.js
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Order, ORDER_STATUS, PAYMENT_STATUS } = require('../models/Order.model');
const paymentService = require('../services/payment.service');

/**
 * Initiate payment for an order
 * POST /api/payments/initiate
 */
const initiatePayment = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const userId = req.user.id;

  // Find order
  const order = await Order.findOne({ _id: orderId, userId });
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Check if order is already paid
  if (order.paymentStatus === PAYMENT_STATUS.PAID) {
    throw new ApiError(400, 'Order already paid');
  }

  // Check if order is in a state where payment can be initiated
  if (order.status !== ORDER_STATUS.PENDING) {
    throw new ApiError(400, 'Cannot initiate payment for this order');
  }

  // Get customer info from user or order
  const user = req.user;
  const customerName = user.name || 'Customer';
  const customerEmail = user.email || '';
  const customerPhone = order.shippingAddress?.phone || user.phone || '';

  // Initiate payment
  const paymentResult = await paymentService.initiatePayment(order, {
    customerName,
    customerEmail,
    customerPhone
  });

  // Save payment reference to order
  order.paymentReference = paymentResult.transactionId || paymentResult.paymentId;
  order.paymentStatus = PAYMENT_STATUS.PENDING;
  await order.save();

  res.json({
    success: true,
    data: {
      orderId: order._id,
      paymentUrl: paymentResult.paymentUrl,
      transactionId: paymentResult.transactionId
    },
    message: 'Payment initiated successfully'
  });
});

/**
 * Payment success callback (redirect from gateway)
 * GET /api/payments/success
 */
const paymentSuccess = asyncHandler(async (req, res) => {
  const { order_id, transaction_id, status } = req.query;

  // Find order
  const order = await Order.findById(order_id);
  if (!order) {
    return res.redirect(`${process.env.FRONTEND_URL}/payment/failed?error=order_not_found`);
  }

  // Verify payment status
  try {
    const verification = await paymentService.verifyPayment(transaction_id);
    
    if (verification.status === 'paid') {
      // Update order
      order.paymentStatus = PAYMENT_STATUS.PAID;
      order.paymentReference = transaction_id;
      order.status = ORDER_STATUS.PROCESSING; // Move to processing
      await order.save();

      // TODO: Send email notification to seller and buyer

      // Redirect to success page
      return res.redirect(`${process.env.FRONTEND_URL}/payment/success?orderId=${order._id}`);
    } else {
      // Payment not successful
      order.paymentStatus = PAYMENT_STATUS.FAILED;
      await order.save();
      return res.redirect(`${process.env.FRONTEND_URL}/payment/failed?orderId=${order._id}`);
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    return res.redirect(`${process.env.FRONTEND_URL}/payment/failed?orderId=${order._id}`);
  }
});

/**
 * Payment cancel callback (redirect from gateway)
 * GET /api/payments/cancel
 */
const paymentCancel = asyncHandler(async (req, res) => {
  const { order_id } = req.query;

  // Update order status
  if (order_id) {
    await Order.findByIdAndUpdate(order_id, {
      paymentStatus: PAYMENT_STATUS.FAILED
    });
  }

  res.redirect(`${process.env.FRONTEND_URL}/payment/cancel?orderId=${order_id}`);
});

/**
 * Webhook handler for payment status updates
 * POST /api/payments/webhook
 */
const webhookHandler = asyncHandler(async (req, res) => {
  const signature = req.headers['x-signature'] || req.headers['x-webhook-signature'];
  
  if (!signature) {
    throw new ApiError(401, 'Missing signature');
  }

  // Parse webhook payload
  const payload = req.body;
  
  // Verify and parse using service
  let webhookData;
  try {
    webhookData = paymentService.handleWebhook(payload, signature);
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    throw new ApiError(401, 'Invalid signature');
  }

  const { orderId, transactionId, status, amount, paymentMethod } = webhookData;

  // Find order
  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  // Update order based on payment status
  if (status === 'paid') {
    order.paymentStatus = PAYMENT_STATUS.PAID;
    order.paymentReference = transactionId;
    order.status = ORDER_STATUS.PROCESSING;
    // Optionally update payment method if provided
    if (paymentMethod) {
      order.paymentMethod = paymentMethod;
    }
    await order.save();

    // TODO: Send notifications
  } else if (status === 'failed') {
    order.paymentStatus = PAYMENT_STATUS.FAILED;
    await order.save();
  } else {
    // pending or other statuses
    order.paymentStatus = PAYMENT_STATUS.PENDING;
    await order.save();
  }

  res.json({ success: true, message: 'Webhook processed' });
});

/**
 * Get payment status for an order
 * GET /api/payments/status/:orderId
 */
const getPaymentStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id;

  const order = await Order.findOne({ _id: orderId, userId });
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  res.json({
    success: true,
    data: {
      orderId: order._id,
      paymentStatus: order.paymentStatus,
      status: order.status,
      paymentReference: order.paymentReference
    }
  });
});

module.exports = {
  initiatePayment,
  paymentSuccess,
  paymentCancel,
  webhookHandler,
  getPaymentStatus
};