const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    index: true ,
    unique:true,    
    
  },
  otp: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['verification', 'password_reset'], 
    default: 'verification' 
  },
  expiresAt: { 
    type: Date, 
    required: true,
    index: { expireAfterSeconds: 0 } // TTL index - auto-delete after expiry
  },
  attempts: { 
    type: Number, 
    default: 0 
  },
  isUsed: { 
    type: Boolean, 
    default: false 
  }
}, { 
  timestamps: true 
});

// Compound index for faster lookups
otpSchema.index({ email: 1, otp: 1, isUsed: 1 });

// Static method to create OTP
otpSchema.statics.createOTP = async function(email, type = 'verification') {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Delete any existing OTPs for this email
  await this.deleteMany({ email, type, isUsed: false });
  
  // Create new OTP
  const otpDoc = new this({
    email,
    otp,
    type,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    attempts: 0,
    isUsed: false
  });
  
  await otpDoc.save();
  return otp;
};

// Static method to verify OTP
otpSchema.statics.verifyOTP = async function(email, otp, type = 'verification') {
  const otpDoc = await this.findOne({
    email,
    otp,
    type,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  });
  
  if (!otpDoc) {
    return { valid: false, message: 'Invalid or expired OTP' };
  }
  
  // Mark as used
  otpDoc.isUsed = true;
  await otpDoc.save();
  
  return { valid: true, message: 'OTP verified successfully' };
};

const OTP = mongoose.model('OTP', otpSchema);

module.exports = OTP;