const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User.model');

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.id || user._id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google Strategy - Login ONLY (No Register)
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(null, false, { message: 'No email found in Google profile' });
      }

      const normalizedEmail = email.toLowerCase().trim();
      
      // Check if user exists with this email (case-insensitive) - supports user, seller, admin
      let user = await User.findOne({ email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') } });
      
      if (!user) {
        // DO NOT REGISTER NEW USERS VIA GOOGLE AUTH!
        // Google auth is strictly for login of registered users (user, seller, admin).
        return done(null, false, { 
          message: 'Account not found with this Google email. Please register first with your email and password before using Google Login.' 
        });
      }

      // Check if user is blocked
      if (user.isBlocked) {
        return done(null, false, { message: 'Your account has been blocked. Please contact support.' });
      }
      
      // Update Google ID if not set
      if (!user.googleId) {
        user.googleId = profile.id;
      }

      // Google verifies email ownership, so mark user as verified
      if (!user.isVerified) {
        user.isVerified = true;
      }

      await user.save();
      
      return done(null, user);
      
    } catch (error) {
      console.error('Google Auth Error:', error);
      return done(error, null);
    }
  }
));

module.exports = passport;