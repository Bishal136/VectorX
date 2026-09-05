const mongoose = require('mongoose');

const sellerSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true 
  },
  shopName: { 
    type: String, 
    required: true 
  },
  headline: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  skills: {
    type: [String],
    default: []
  },
  socialLinks: {
    linkedin: { type: String, default: '' },
    website: { type: String, default: '' },
    github: { type: String, default: '' },
    twitter: { type: String, default: '' }
  },
  banner: {
    url: { type: String, default: null },
    publicId: { type: String, default: null },
    slogan: { 
      type: String, 
      default: '' 
    },
    subtitle: { 
      type: String, 
      default: '' 
    }
  },
  logo: {
    url: { type: String, default: null },
    publicId: { type: String, default: null }
  },
  shopAddress: {
    line1: String,
    city: String,
    pincode: String
  },
  location: {
    type: { 
      type: String, 
      enum: ['Point'], 
      default: 'Point' 
    },
    coordinates: { 
      type: [Number], 
      required: true 
    } // [longitude, latitude]
  },
  gstNumber: { 
    type: String 
  },
  panNumber: { 
    type: String 
  },
  bankDetails: {
    accountHolderName: String,
    accountNumber: { 
      type: String, 
      select: false 
    },
    ifsc: String
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  verificationStatus: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  rejectionReason: { 
    type: String 
  }
}, { 
  timestamps: true 
});

// Create 2dsphere index
sellerSchema.index({ location: '2dsphere' });

const Seller = mongoose.model('Seller', sellerSchema);
module.exports = Seller;