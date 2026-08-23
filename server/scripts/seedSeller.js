const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' });

const User = require('../src/models/User.model');
const Seller = require('../src/models/Seller.model');

const seedSeller = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB...');

    // Check if demo seller already exists
    let sellerUser = await User.findOne({ email: 'seller@vectorx.com' });
    if (sellerUser) {
      console.log('Seller user already exists: seller@vectorx.com');
      // Ensure isVerified is true
      if (!sellerUser.isVerified) {
        sellerUser.isVerified = true;
        await sellerUser.save();
        console.log('✓ Updated isVerified = true for seller');
      }
    } else {
      sellerUser = await User.create({
        name: 'Demo Merchant',
        email: 'seller@vectorx.com',
        password: 'Password123!',
        phone: '01700000002',
        role: 'seller',
        isVerified: true
      });
      console.log('✓ Created seller user: seller@vectorx.com / Password123!');
    }

    // Check seller profile
    let sellerProfile = await Seller.findOne({ user: sellerUser._id });
    if (!sellerProfile) {
      sellerProfile = await Seller.create({
        user: sellerUser._id,
        shopName: 'VectorX Demo Store',
        shopAddress: {
          line1: '123 Market Street, Dhanmondi',
          city: 'Dhaka',
          pincode: '1209'
        },
        location: {
          type: 'Point',
          coordinates: [90.3750, 23.7465] // Dhaka coordinates
        },
        verificationStatus: 'approved',
        isVerified: true
      });
      console.log('✓ Created verified seller profile: VectorX Demo Store');
    } else {
      sellerProfile.verificationStatus = 'approved';
      sellerProfile.isVerified = true;
      await sellerProfile.save();
      console.log('✓ Seller profile exists and is marked approved/verified');
    }

    console.log('✓ Seller credentials:');
    console.log('  Email:    seller@vectorx.com');
    console.log('  Password: Password123!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding seller:', error);
    process.exit(1);
  }
};

seedSeller();
