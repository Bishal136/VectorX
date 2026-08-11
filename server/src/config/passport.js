const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User.model');

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
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

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      
      // Check if user exists
      let user = await User.findOne({ email });
      
      if (user) {
        // User exists - update Google ID if not set
        if (!user.googleId) {
          user.googleId = profile.id;
          await user.save();
        }
        return done(null, user);
      }
      
      // Create new user
      const name = profile.displayName || profile.name?.givenName || 'User';
      const [firstName, ...lastNameParts] = name.split(' ');
      
      user = await User.create({
        name: name,
        email: email,
        password: await require('bcryptjs').hash(Math.random().toString(36), 10),
        googleId: profile.id,
        isVerified: true, // Google accounts are automatically verified
        role: 'user' // Default role
      });
      
      return done(null, user);
      
    } catch (error) {
      return done(error, null);
    }
  }
));

module.exports = passport;