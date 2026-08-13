const nodemailer = require('nodemailer');
const OTP = require('../models/Otp.model');

// Configure email transporter
const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Send OTP via email
const sendOTP = async (email, type = 'verification') => {
  try {
    // Generate and save OTP
    const otp = await OTP.createOTP(email, type);
    
    // Send email
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: type === 'verification' 
        ? 'VectorX - Email Verification OTP' 
        : 'VectorX - Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563EB;">VectorX</h2>
          <h3>${type === 'verification' ? 'Verify Your Email' : 'Reset Your Password'}</h3>
          <p>Your OTP code is:</p>
          <h1 style="font-size: 32px; letter-spacing: 4px; background: #f3f4f6; padding: 12px; text-align: center; border-radius: 8px;">
            ${otp}
          </h1>
          <p>This OTP is valid for <strong>10 minutes</strong>.</p>
          <p style="color: #6b7280; font-size: 14px;">
            If you didn't request this, please ignore this email.
          </p>
        </div>
      `
    });
    
    return { success: true, message: 'OTP sent successfully' };
  } catch (error) {
    console.error('Error sending OTP:', error);
    return { success: false, message: 'Failed to send OTP' };
  }
};

// Verify OTP
const verifyOTP = async (email, otp, type = 'verification') => {
  return await OTP.verifyOTP(email, otp, type);
};

// Clean up expired OTPs (can be run as a cron job)
const cleanupExpiredOTPs = async () => {
  await OTP.deleteMany({
    expiresAt: { $lt: new Date() },
    isUsed: false
  });
  console.log('Expired OTPs cleaned up');
};

module.exports = {
  sendOTP,
  verifyOTP,
  cleanupExpiredOTPs
};