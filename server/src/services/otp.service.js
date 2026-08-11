const crypto = require('crypto');
const nodemailer = require('nodemailer');

// In-memory OTP store (in production, use Redis or database)
const otpStore = new Map();

// Generate OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Send OTP via email
const sendOTP = async (email) => {
  const otp = generateOTP();
  
  // Store OTP with expiry (10 minutes)
  otpStore.set(email, {
    otp,
    expiresAt: Date.now() + 10 * 60 * 1000
  });
  
  // Configure email transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  
  // Send email
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: 'VectorX - OTP Verification',
    html: `
      <h1>Welcome to VectorX!</h1>
      <p>Your OTP for verification is: <strong>${otp}</strong></p>
      <p>This OTP is valid for 10 minutes.</p>
    `
  });
  
  return { message: 'OTP sent successfully' };
};

// Verify OTP
const verifyOTP = (email, otp) => {
  const stored = otpStore.get(email);
  
  if (!stored) {
    return { valid: false, message: 'No OTP found for this email' };
  }
  
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email);
    return { valid: false, message: 'OTP has expired' };
  }
  
  if (stored.otp !== otp) {
    return { valid: false, message: 'Invalid OTP' };
  }
  
  // OTP is valid - clear it
  otpStore.delete(email);
  return { valid: true, message: 'OTP verified successfully' };
};

module.exports = {
  generateOTP,
  sendOTP,
  verifyOTP
};