// server/src/models/Conversation.model.js
const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    ],
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller',
      required: true
    },
    sellerUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    lastMessage: {
      text: { type: String, default: '' },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date, default: Date.now },
      isRead: { type: Boolean, default: false }
    },
    unreadCount: {
      customer: { type: Number, default: 0 },
      seller: { type: Number, default: 0 }
    },
    productContext: {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      name: { type: String },
      slug: { type: String },
      image: { type: String },
      price: { type: Number }
    }
  },
  {
    timestamps: true
  }
);

// Indexes
conversationSchema.index({ customer: 1, seller: 1, 'productContext.productId': 1 });
conversationSchema.index({ customer: 1, seller: 1 });
conversationSchema.index({ participants: 1 });
conversationSchema.index({ sellerUser: 1 });
conversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
