// src/services/payment.service.js
const axios = require('axios');
const crypto = require('crypto');
const ApiError = require('../utils/ApiError');

/**
 * Walletmix Payment Gateway Service
 * Documentation: https://walletmix.com/docs (example)
 */
class WalletmixPaymentService {
  constructor() {
    this.apiUrl = process.env.WALLETMIX_API_URL || 'https://api.walletmix.com/v1';
    this.apiKey = process.env.WALLETMIX_API_KEY;
    this.secretKey = process.env.WALLETMIX_SECRET_KEY;
    this.merchantId = process.env.WALLETMIX_MERCHANT_ID;
    this.redirectUrl = process.env.WALLETMIX_REDIRECT_URL;
    this.webhookUrl = process.env.WALLETMIX_WEBHOOK_URL;
  }

  /**
   * Generate signature for API request
   */
  generateSignature(payload) {
    const sortedKeys = Object.keys(payload).sort();
    const stringToSign = sortedKeys.map(key => `${key}=${payload[key]}`).join('&');
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(stringToSign)
      .digest('hex');
  }

  /**
   * Initiate payment for an order
   * @param {Object} order - Order document
   * @param {Object} options - Additional options (customer info, etc.)
   * @returns {Promise<Object>} - Payment initiation response
   */
  async initiatePayment(order, options = {}) {
    if (!this.apiKey || !this.secretKey || !this.merchantId) {
      throw new ApiError(500, 'Walletmix credentials not configured');
    }

    // Prepare payload according to Walletmix API
    const payload = {
      merchant_id: this.merchantId,
      order_id: order._id.toString(),
      amount: order.totalAmount,
      currency: 'BDT',
      customer_name: options.customerName || 'Customer',
      customer_email: options.customerEmail || '',
      customer_phone: options.customerPhone || '',
      redirect_url: this.redirectUrl || `${process.env.FRONTEND_URL}/payment/success`,
      cancel_url: this.cancelUrl || `${process.env.FRONTEND_URL}/payment/cancel`,
      webhook_url: this.webhookUrl || `${process.env.BACKEND_URL}/api/payments/webhook`,
      description: `Order ${order._id}`,
      // Additional fields
      ...options
    };

    // Generate signature
    payload.signature = this.generateSignature(payload);

    try {
      const response = await axios.post(
        `${this.apiUrl}/payment/initiate`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey
          }
        }
      );

      if (response.data.status === 'success') {
        return {
          success: true,
          paymentUrl: response.data.data.payment_url,
          transactionId: response.data.data.transaction_id,
          paymentId: response.data.data.payment_id
        };
      } else {
        throw new ApiError(400, response.data.message || 'Payment initiation failed');
      }
    } catch (error) {
      console.error('Walletmix payment initiation error:', error.response?.data || error.message);
      throw new ApiError(500, 'Payment gateway error');
    }
  }

  /**
   * Verify payment status
   * @param {string} transactionId - Transaction ID from Walletmix
   * @returns {Promise<Object>} - Payment status
   */
  async verifyPayment(transactionId) {
    const payload = {
      merchant_id: this.merchantId,
      transaction_id: transactionId
    };
    payload.signature = this.generateSignature(payload);

    try {
      const response = await axios.post(
        `${this.apiUrl}/payment/verify`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey
          }
        }
      );

      if (response.data.status === 'success') {
        return {
          success: true,
          status: response.data.data.status, // 'paid', 'pending', 'failed'
          amount: response.data.data.amount,
          paymentMethod: response.data.data.method,
          transactionId: response.data.data.transaction_id
        };
      } else {
        throw new ApiError(400, response.data.message || 'Payment verification failed');
      }
    } catch (error) {
      console.error('Walletmix payment verification error:', error.response?.data || error.message);
      throw new ApiError(500, 'Payment verification error');
    }
  }

  /**
   * Handle webhook payload from Walletmix
   * @param {Object} payload - Webhook payload
   * @param {string} signature - Signature header for verification
   * @returns {Object} - Parsed webhook data
   */
  handleWebhook(payload, signature) {
    // Verify signature
    const computedSignature = this.generateSignature(payload);
    if (computedSignature !== signature) {
      throw new ApiError(401, 'Invalid webhook signature');
    }

    // Extract data
    const { order_id, transaction_id, status, amount, method } = payload;

    return {
      orderId: order_id,
      transactionId: transaction_id,
      status: status, // 'paid', 'pending', 'failed'
      amount: parseFloat(amount),
      paymentMethod: method,
      raw: payload
    };
  }

  /**
   * Refund payment (optional)
   * @param {string} transactionId - Transaction ID
   * @param {number} amount - Amount to refund
   * @param {string} reason - Refund reason
   */
  async refundPayment(transactionId, amount, reason = '') {
    const payload = {
      merchant_id: this.merchantId,
      transaction_id: transactionId,
      amount: amount,
      reason: reason
    };
    payload.signature = this.generateSignature(payload);

    try {
      const response = await axios.post(
        `${this.apiUrl}/payment/refund`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey
          }
        }
      );

      if (response.data.status === 'success') {
        return {
          success: true,
          refundId: response.data.data.refund_id
        };
      } else {
        throw new ApiError(400, response.data.message || 'Refund failed');
      }
    } catch (error) {
      console.error('Walletmix refund error:', error.response?.data || error.message);
      throw new ApiError(500, 'Refund error');
    }
  }
}

module.exports = new WalletmixPaymentService();