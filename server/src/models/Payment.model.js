// src/models/Payment.model.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
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
    type: String // bKash, Nagad, etc.
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  rawResponse: {
    type: mongoose.Schema.Types.Mixed
  },
  paidAt: Date,
  refundedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);