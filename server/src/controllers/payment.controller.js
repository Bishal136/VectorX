// src/controllers/payment.controller.js
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Order, ORDER_STATUS, PAYMENT_STATUS } = require('../models/Order.model');
const Payment = require('../models/Payment.model');
const paymentService = require('../services/payment.service');

/**
 * Initiate payment for an order via PortPos
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

  // Check if order is in a valid state
  if (order.status === ORDER_STATUS.CANCELLED || order.status === ORDER_STATUS.REFUNDED) {
    throw new ApiError(400, 'Cannot initiate payment for a cancelled or refunded order');
  }

  // Get customer info from user or order
  const user = req.user;
  const customerName = user.name || 'Customer';
  const customerEmail = user.email || 'customer@example.com';
  const customerPhone = order.shippingAddress?.phone || user.phone || '01700000000';

  // Initiate payment via PortPos service
  const paymentResult = await paymentService.initiatePayment(order, {
    customerName,
    customerEmail,
    customerPhone,
    productName: `VectorX Order #${order._id.toString().slice(-6).toUpperCase()}`
  });

  const invoiceId = paymentResult.invoiceId || paymentResult.transactionId;

  // Save payment reference to order
  order.paymentReference = invoiceId;
  order.paymentMethod = 'PORTPOS';
  order.paymentStatus = PAYMENT_STATUS.PENDING;
  await order.save();

  // Create or update Payment record
  await Payment.findOneAndUpdate(
    { orderId: order._id },
    {
      orderId: order._id,
      userId: order.userId,
      gateway: 'PORTPOS',
      invoiceId: invoiceId,
      transactionId: invoiceId,
      amount: order.totalAmount,
      currency: 'BDT',
      method: 'PortPos',
      paymentUrl: paymentResult.paymentUrl,
      status: 'pending',
      customerInfo: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone
      },
      rawResponse: paymentResult.raw
    },
    { upsert: true, new: true }
  );

  res.json({
    success: true,
    data: {
      orderId: order._id,
      paymentUrl: paymentResult.paymentUrl,
      invoiceId: invoiceId,
      transactionId: invoiceId
    },
    message: 'PortPos payment session initiated successfully'
  });
});

/**
 * Payment success callback (redirect from PortPos gateway)
 * GET /api/payments/success
 * POST /api/payments/success
 */
const paymentSuccess = asyncHandler(async (req, res) => {
  const queryParams = { ...req.query, ...req.body };
  const orderId = queryParams.order_id || queryParams.orderId || queryParams.reference;
  const invoiceId = queryParams.invoice_id || queryParams.invoice || queryParams.transaction_id;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  // Find order by ID or paymentReference
  let order = null;
  if (orderId) {
    order = await Order.findById(orderId);
  }
  if (!order && invoiceId) {
    order = await Order.findOne({ paymentReference: invoiceId });
  }

  if (!order) {
    return res.redirect(`${frontendUrl}/payment/failed?error=order_not_found`);
  }

  // If already marked as paid (e.g., by IPN webhook earlier)
  if (order.paymentStatus === PAYMENT_STATUS.PAID) {
    return res.redirect(`${frontendUrl}/payment/success?orderId=${order._id}&invoice=${invoiceId || order.paymentReference}`);
  }

  // Verify payment status with PortPos IPN validation API
  try {
    const checkInvoiceId = invoiceId || order.paymentReference;
    const verification = await paymentService.verifyPayment(checkInvoiceId, order.totalAmount);
    
    if (verification.isPaid || verification.status === 'paid') {
      // Update order
      order.paymentStatus = PAYMENT_STATUS.PAID;
      order.paymentReference = checkInvoiceId;
      order.status = ORDER_STATUS.PROCESSING; // Move to processing
      await order.save();

      // Update payment record
      await Payment.findOneAndUpdate(
        { orderId: order._id },
        {
          status: 'paid',
          paidAt: new Date(),
          rawResponse: verification.raw
        }
      );

      return res.redirect(`${frontendUrl}/payment/success?orderId=${order._id}&invoice=${checkInvoiceId}`);
    } else if (verification.status === 'cancelled') {
      order.paymentStatus = PAYMENT_STATUS.FAILED;
      await order.save();
      return res.redirect(`${frontendUrl}/payment/cancel?orderId=${order._id}`);
    } else {
      order.paymentStatus = PAYMENT_STATUS.FAILED;
      await order.save();
      return res.redirect(`${frontendUrl}/payment/failed?orderId=${order._id}&reason=verification_failed`);
    }
  } catch (error) {
    console.error('PortPos payment verification error:', error);
    return res.redirect(`${frontendUrl}/payment/failed?orderId=${order._id}&error=${encodeURIComponent(error.message || 'verification_error')}`);
  }
});

/**
 * Payment cancel callback (redirect from PortPos gateway)
 * GET /api/payments/cancel
 * POST /api/payments/cancel
 */
const paymentCancel = asyncHandler(async (req, res) => {
  const queryParams = { ...req.query, ...req.body };
  const orderId = queryParams.order_id || queryParams.orderId || queryParams.reference;
  const invoiceId = queryParams.invoice_id || queryParams.invoice;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  let order = null;
  if (orderId) {
    order = await Order.findById(orderId);
  }
  if (!order && invoiceId) {
    order = await Order.findOne({ paymentReference: invoiceId });
  }

  if (order && order.paymentStatus !== PAYMENT_STATUS.PAID) {
    order.paymentStatus = PAYMENT_STATUS.FAILED;
    await order.save();

    await Payment.findOneAndUpdate(
      { orderId: order._id },
      { status: 'cancelled' }
    );
  }

  const redirectOrderId = order ? order._id : (orderId || '');
  res.redirect(`${frontendUrl}/payment/cancel?orderId=${redirectOrderId}`);
});

/**
 * IPN / Webhook handler for PortPos instant status updates
 * POST /api/payments/webhook
 * POST /api/payments/ipn
 */
const webhookHandler = asyncHandler(async (req, res) => {
  const payload = req.body || {};

  let ipnData;
  try {
    ipnData = await paymentService.handleIpn(payload);
  } catch (error) {
    console.error('PortPos IPN error:', error.message);
    throw new ApiError(400, 'Invalid IPN payload');
  }

  const { orderId, invoiceId, status } = ipnData;

  // Find order
  let order = null;
  if (orderId) {
    order = await Order.findById(orderId);
  }
  if (!order && invoiceId) {
    order = await Order.findOne({ paymentReference: invoiceId });
  }

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found for IPN' });
  }

  // Update order based on status
  if (status === 'paid') {
    order.paymentStatus = PAYMENT_STATUS.PAID;
    order.paymentReference = invoiceId || order.paymentReference;
    order.status = ORDER_STATUS.PROCESSING;
    await order.save();

    await Payment.findOneAndUpdate(
      { orderId: order._id },
      {
        status: 'paid',
        paidAt: new Date(),
        rawResponse: payload
      }
    );
  } else if (status === 'failed' || status === 'cancelled') {
    if (order.paymentStatus !== PAYMENT_STATUS.PAID) {
      order.paymentStatus = PAYMENT_STATUS.FAILED;
      await order.save();

      await Payment.findOneAndUpdate(
        { orderId: order._id },
        { status: 'failed', rawResponse: payload }
      );
    }
  }

  res.json({ success: true, message: 'PortPos IPN processed successfully' });
});

/**
 * Get payment status for an order
 * GET /api/payments/status/:orderId
 */
const getPaymentStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id;

  const order = await Order.findOne({ _id: orderId, userId })
    .populate('items.productId', 'name images price');

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  const payment = await Payment.findOne({ orderId: order._id });

  res.json({
    success: true,
    data: {
      orderId: order._id,
      paymentStatus: order.paymentStatus,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentReference: order.paymentReference,
      totalAmount: order.totalAmount,
      currency: 'BDT',
      invoiceId: payment?.invoiceId || order.paymentReference,
      paymentUrl: payment?.paymentUrl
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