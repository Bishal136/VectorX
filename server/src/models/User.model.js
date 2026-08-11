const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true 
  },
  phone: { 
    type: String, 
    unique: true, 
    sparse: true 
  },
  password: { 
    type: String, 
    required: true, 
    select: false 
  },
  googleId: { 
    type: String, 
    sparse: true,
    unique: true 
  },
  role: { 
    type: String, 
    enum: ['user', 'seller', 'admin'], 
    default: 'user' 
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  location: {
    type: { 
      type: String, 
      enum: ['Point'], 
      default: 'Point' 
    },
    coordinates: { 
      type: [Number], 
      default: [0, 0] 
    } // [longitude, latitude]
  },
  addresses: [{
    label: String,
    line1: String,
    city: String,
    pincode: String,
    coordinates: [Number],
    isDefault: { type: Boolean, default: false }
  }],
  wishlist: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product' 
  }],
  isBlocked: { 
    type: Boolean, 
    default: false 
  },
  refreshTokens: [{
    token: String,
    expiresAt: Date
  }]
}, { 
  timestamps: true 
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Create 2dsphere index
userSchema.index({ location: '2dsphere' });

const User = mongoose.model('User', userSchema);
module.exports = User;