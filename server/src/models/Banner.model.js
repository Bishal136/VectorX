// server/src/models/Banner.model.js
const mongoose = require('mongoose');

const BANNER_SLOTS = {
  HERO_SLIDER: 'hero_slider',
  PROMO_TOP: 'promo_top',
  PROMO_MIDDLE: 'promo_middle',
  FLASH_SALE: 'flash_sale',
  FOOTER_BANNER: 'footer_banner'
};

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Banner title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters']
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: [160, 'Subtitle cannot exceed 160 characters'],
      default: ''
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters'],
      default: ''
    },
    image: {
      url: {
        type: String,
        required: [true, 'Banner image URL is required']
      },
      publicId: {
        type: String,
        default: null
      }
    },
    mobileImage: {
      url: {
        type: String,
        default: null
      },
      publicId: {
        type: String,
        default: null
      }
    },
    link: {
      type: String,
      trim: true,
      default: '/products'
    },
    ctaText: {
      type: String,
      trim: true,
      default: 'Shop Now',
      maxlength: [30, 'CTA text cannot exceed 30 characters']
    },
    slot: {
      type: String,
      enum: Object.values(BANNER_SLOTS),
      default: BANNER_SLOTS.HERO_SLIDER,
      index: true
    },
    badgeText: {
      type: String,
      trim: true,
      default: '',
      maxlength: [40, 'Badge text cannot exceed 40 characters']
    },
    bgColor: {
      type: String,
      trim: true,
      default: '#0f172a'
    },
    textColor: {
      type: String,
      trim: true,
      default: '#ffffff'
    },
    order: {
      type: Number,
      default: 0,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    },
    clicks: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for performant public queries
bannerSchema.index({ slot: 1, isActive: 1, order: 1 });
bannerSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

/**
 * Static method to fetch currently active banners for storefront
 */
bannerSchema.statics.getActiveBanners = async function (slot = null) {
  const now = new Date();
  const query = {
    isActive: true,
    $and: [
      {
        $or: [{ startDate: null }, { startDate: { $lte: now } }]
      },
      {
        $or: [{ endDate: null }, { endDate: { $gte: now } }]
      }
    ]
  };

  if (slot) {
    query.slot = slot;
  }

  return this.find(query).sort({ order: 1, createdAt: -1 });
};

module.exports = {
  Banner: mongoose.model('Banner', bannerSchema),
  BANNER_SLOTS
};
