// src/services/payment.service.js
const axios = require('axios');
const crypto = require('crypto');
const ApiError = require('../utils/ApiError');

/**
 * PortPos (পোর্টপস) Payment Gateway Service (v2)
 * Documentation: https://api.portpos.com/
 */
class PortPosPaymentService {
  constructor() {
    this.mode = (process.env.PORTPOS_MODE || process.env.NODE_ENV === 'production' ? 'live' : 'sandbox').toLowerCase();
    this.isSandbox = this.mode !== 'live';

    this.apiUrl = this.isSandbox
      ? (process.env.PORTPOS_API_URL || 'https://api-sandbox.portpos.com/payment/v2')
      : (process.env.PORTPOS_API_URL || 'https://api.portpos.com/payment/v2');

    this.paymentUrl = this.isSandbox
      ? 'https://payment-sandbox.portpos.com/payment'
      : 'https://payment.portpos.com/payment';

    this.appKey = process.env.PORTPOS_APP_KEY;
    this.secretKey = process.env.PORTPOS_SECRET_KEY;

    this.redirectUrl = process.env.PORTPOS_REDIRECT_URL;
    this.cancelUrl = process.env.PORTPOS_CANCEL_URL;
    this.ipnUrl = process.env.PORTPOS_IPN_URL;
  }

  /**
   * Generate PortPos Authorization Bearer Header
   * Format: Bearer base64(APPKEY:md5(SECRETKEY + TIMESTAMP))
   */
  generateAuthHeader() {
    if (!this.appKey || !this.secretKey) {
      return null;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const md5Hash = crypto
      .createHash('md5')
      .update(`${this.secretKey}${timestamp}`)
      .digest('hex');

    const authString = Buffer.from(`${this.appKey}:${md5Hash}`).toString('base64');
    return `Bearer ${authString}`;
  }

  /**
   * Initiate payment for an order via PortPos API v2
   * @param {Object} order - Order document
   * @param {Object} options - Customer / Product options
   * @returns {Promise<Object>} - { success: true, invoiceId, paymentUrl, transactionId }
   */
  async initiatePayment(order, options = {}) {
    const authHeader = this.generateAuthHeader();
    if (!authHeader) {
      throw new ApiError(500, 'PortPos credentials (PORTPOS_APP_KEY, PORTPOS_SECRET_KEY) are not configured');
    }

    const totalAmount = Number((order.totalAmount || 0).toFixed(2));
    if (totalAmount <= 0) {
      throw new ApiError(400, 'Order amount must be greater than zero');
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // PortPos v2 JSON invoice structure
    const payload = {
      order: {
        amount: totalAmount,
        currency: 'BDT',
        redirect_url: this.redirectUrl || `${backendUrl}/api/payments/success?order_id=${order._id}`,
        ipn_url: this.ipnUrl || `${backendUrl}/api/payments/ipn`,
        reference: order._id.toString()
      },
      product: {
        name: options.productName || `VectorX Order #${order._id.toString().slice(-6).toUpperCase()}`,
        description: options.description || `Order payment on VectorX for #${order._id}`
      },
      billing: {
        customer: {
          name: options.customerName || 'Customer',
          email: options.customerEmail || 'customer@example.com',
          phone: options.customerPhone || '01700000000',
          address: {
            street: order.shippingAddress?.line1 || 'Not specified',
            city: order.shippingAddress?.city || 'Dhaka',
            state: order.shippingAddress?.state || 'Dhaka',
            zipcode: order.shippingAddress?.pincode || '1000',
            country: 'BGD'
          }
        }
      }
    };

    try {
      const response = await axios.post(
        `${this.apiUrl}/invoice`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          timeout: 20000
        }
      );

      const resData = response.data;

      // PortPos API response structure
      if (resData && (resData.status === 'success' || resData.result === 'success' || resData.data)) {
        const invoiceData = resData.data || {};
        const invoiceId = invoiceData.invoice_id || invoiceData.invoiceId || invoiceData.id || resData.invoice_id;

        // Payment redirect URL
        let paymentUrl = invoiceData.url || invoiceData.action?.url || (invoiceId ? `${this.paymentUrl}/?invoice=${invoiceId}` : null);

        if (!invoiceId || !paymentUrl) {
          throw new ApiError(502, 'PortPos invoice was created but no invoice ID or payment URL was returned');
        }

        return {
          success: true,
          invoiceId,
          transactionId: invoiceId,
          paymentUrl,
          raw: resData
        };
      } else {
        throw new ApiError(400, resData.message || resData.error || 'PortPos invoice creation failed');
      }
    } catch (error) {
      console.error('PortPos payment initiation error:', error.response?.data || error.message);
      if (error instanceof ApiError) throw error;
      const apiMsg = error.response?.data?.message || error.response?.data?.error || error.message;
      throw new ApiError(502, `PortPos Gateway Error: ${apiMsg}`);
    }
  }

  /**
   * Verify payment status using PortPos IPN validation API
   * @param {string} invoiceId - Invoice ID from PortPos
   * @param {number} amount - Expected transaction amount
   * @returns {Promise<Object>} - Payment verification result
   */
  async verifyPayment(invoiceId, amount) {
    if (!invoiceId) {
      throw new ApiError(400, 'Invoice ID is required for PortPos verification');
    }

    const authHeader = this.generateAuthHeader();
    if (!authHeader) {
      throw new ApiError(500, 'PortPos credentials not configured');
    }

    const formattedAmount = amount ? Number(amount).toFixed(2) : '0.00';

    try {
      const endpoint = `${this.apiUrl}/invoice/ipn/${encodeURIComponent(invoiceId)}/${formattedAmount}`;
      
      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': authHeader
        },
        timeout: 15000
      });

      const resData = response.data;
      const data = resData?.data || resData || {};
      const statusRaw = (data.status || resData.status || '').toString().toUpperCase();

      // Accepted success status values in PortPos
      const isPaid = ['ACCEPTED', 'VALID', 'PAID', 'SUCCESS', 'COMPLETED', '200'].includes(statusRaw);

      return {
        success: true,
        isPaid,
        status: isPaid ? 'paid' : (statusRaw === 'CANCELLED' || statusRaw === 'CANCEL' ? 'cancelled' : 'failed'),
        amount: data.amount || amount,
        currency: data.currency || 'BDT',
        invoiceId: data.invoice_id || invoiceId,
        paymentMethod: data.method || data.payment_method || 'PortPos',
        raw: resData
      };
    } catch (error) {
      console.error('PortPos payment verification error:', error.response?.data || error.message);
      
      // Fallback: If verification endpoint has connectivity issue, handle gracefully
      return {
        success: false,
        isPaid: false,
        status: 'failed',
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Handle incoming IPN payload from PortPos webhook
   * @param {Object} payload - Webhook / IPN body
   * @returns {Object} - Parsed IPN data
   */
  async handleIpn(payload = {}) {
    const invoiceId = payload.invoice_id || payload.invoice || payload.data?.invoice_id;
    const amount = payload.amount || payload.data?.amount;
    const orderId = payload.reference || payload.order_id || payload.data?.reference;
    const statusRaw = (payload.status || payload.data?.status || '').toString().toUpperCase();

    let isPaid = ['ACCEPTED', 'VALID', 'PAID', 'SUCCESS', 'COMPLETED', '200'].includes(statusRaw);

    // If status is present or we have invoiceId, we can cross-verify
    if (invoiceId && amount) {
      const verification = await this.verifyPayment(invoiceId, amount);
      if (verification.success) {
        isPaid = verification.isPaid;
      }
    }

    return {
      orderId,
      invoiceId,
      transactionId: invoiceId,
      amount: Number(amount) || 0,
      status: isPaid ? 'paid' : 'failed',
      raw: payload
    };
  }
}

module.exports = new PortPosPaymentService();