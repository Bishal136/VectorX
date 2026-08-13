// scripts/fixSellerProfiles.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../src/models/User.model');
const Seller = require('../src/models/Seller.model');

dotenv.config();

/**
 * This script creates seller profiles for users who have role 'seller' 
 * but don't have a corresponding seller document
 */
const fixSellerProfiles = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all users with role 'seller'
    const sellerUsers = await User.find({ role: 'seller' });
    console.log(`Found ${sellerUsers.length} users with seller role`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const user of sellerUsers) {
      // Check if seller profile exists
      const existingSeller = await Seller.findOne({ user: user._id });
      
      if (existingSeller) {
        console.log(`✅ Seller profile already exists for ${user.email}`);
        skippedCount++;
        continue;
      }

      // Create seller profile with default values
      const seller = new Seller({
        user: user._id,
        shopName: `${user.name}'s Shop`,
        shopAddress: {
          line1: 'Please update your shop address',
          city: 'Unknown',
          pincode: '000000'
        },
        location: {
          type: 'Point',
          coordinates: [0, 0] // Default coordinates
        },
        verificationStatus: 'pending',
        isVerified: false
      });

      await seller.save();
      console.log(`✅ Created seller profile for ${user.email}`);
      createdCount++;
    }

    console.log('\n=== Summary ===');
    console.log(`Total seller users: ${sellerUsers.length}`);
    console.log(`Created profiles: ${createdCount}`);
    console.log(`Skipped (already exist): ${skippedCount}`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

// Run the script
fixSellerProfiles();