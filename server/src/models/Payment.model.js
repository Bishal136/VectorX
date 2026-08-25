// src/models/Payment.model.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  gateway: {
    type: String,
    enum: ['PORTPOS', 'COD'],
    default: 'PORTPOS'
  },
  invoiceId: {
    type: String,
    sparse: true,
    index: true
  },
  transactionId: {
    type: String,
    sparse: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'BDT'
  },
  method: {
    type: String, // bKash, Nagad, Rocket, Card, etc.
    default: 'PortPos'
  },
  paymentUrl: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  customerInfo: {
    name: String,
    email: String,
    phone: String
  },
  rawResponse: {
    type: mongoose.Schema.Types.Mixed
  },
  paidAt: Date,
  refundedAt: Date
}, { timestamps: true });

paymentSchema.index({ orderId: 1, status: 1 });
paymentSchema.index({ invoiceId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);