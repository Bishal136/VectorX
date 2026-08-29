const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

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
      email: 'bishalbiswas2026@gmail.com',
      password: '12345678',
      role: 'admin',
      isVerified: true
    });

    console.log('✓ Admin user created successfully:');
    console.log(`Email: ${admin.email}`);
    console.log(`Password: ${admin.password} `);
    console.log(`ID: ${admin._id}`);
    console.log(`Role: ${admin.role}`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();