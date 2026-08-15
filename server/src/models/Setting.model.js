// src/models/Setting.model.js
const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    deliveryCharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    commissionRate: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
    couponCodes: [
      {
        code: { type: String, uppercase: true, trim: true },
        discount: { type: Number, min: 0 }, // percentage or fixed amount
        discountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
        minOrderAmount: { type: Number, default: 0 },
        expiresAt: { type: Date },
        isActive: { type: Boolean, default: true },
        usageLimit: { type: Number, default: null }, // null = unlimited
        usedCount: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

// Singleton: ensure only one settings document exists
settingSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('Setting', settingSchema);