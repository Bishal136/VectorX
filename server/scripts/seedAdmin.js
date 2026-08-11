const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' });

const User = require('../src/models/User.model');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB...');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      console.log(`Email: ${existingAdmin.email}`);
      console.log(`ID: ${existingAdmin._id}`);
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      name: 'System Administrator',
      email: 'admin@vectorx.com',
      password: 'admin123',
      role: 'admin',
      isVerified: true
    });

    console.log('✓ Admin user created successfully:');
    console.log(`Email: admin@vectorx.com`);
    console.log(`Password: admin123`);
    console.log(`ID: ${admin._id}`);
    console.log(`Role: ${admin.role}`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();