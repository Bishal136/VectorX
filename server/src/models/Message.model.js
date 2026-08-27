// server/src/models/Message.model.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    senderRole: {
      type: String,
      enum: ['user', 'seller'],
      required: true
    },
    text: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String }
      }
    ],
    product: {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      name: { type: String },
      slug: { type: String },
      image: { type: String },
      price: { type: Number }
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
