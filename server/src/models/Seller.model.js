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