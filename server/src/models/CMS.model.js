// server/src/models/CMS.model.js
const mongoose = require('mongoose');

const cmsSchema = new mongoose.Schema(
  {
    announcement: {
      enabled: {
        type: Boolean,
        default: true
      },
      text: {
        type: String,
        default: '⚡ Special Deal: Free delivery on orders over ৳1,000! Use coupon code DEALPORT'
      },
      link: {
        type: String,
        default: '/products'
      },
      badge: {
        type: String,
        default: 'LIMITED TIME'
      },
      bgColor: {
        type: String,
        default: '#124B38'
      },
      textColor: {
        type: String,
        default: '#ffffff'
      }
    },
    heroSettings: {
      autoPlayInterval: {
        type: Number,
        default: 6000
      },
      showDots: {
        type: Boolean,
        default: true
      },
      showArrows: {
        type: Boolean,
        default: true
      }
    },
    promoSection: {
      enabled: {
        type: Boolean,
        default: true
      },
      title: {
        type: String,
        default: 'Featured Collections'
      },
      tagline: {
        type: String,
        default: 'Handpicked best-sellers and top categories'
      }
    }
  },
  {
    timestamps: true
  }
);

// Singleton helper
cmsSchema.statics.getConfig = async function () {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({});
  }
  return config;
};

module.exports = mongoose.model('CMS', cmsSchema);
