/**
 * Admin User Creation Script for EthioCraft Global
 * 
 * Creates an admin user for testing and platform management
 * Run with: node scripts/createAdmin.js
 */

const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// Admin user credentials
const ADMIN_CREDENTIALS = {
  email: 'admin@ethiocraft.com',
  password: 'Admin123!',
  role: 'admin',
  profile: {
    firstName: 'EthioCraft',
    lastName: 'Administrator',
    phone: '+251911234567',
    bio: 'Platform administrator for EthioCraft Global marketplace'
  }
};

async function createAdminUser() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ethiocraft-global';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findByEmail(ADMIN_CREDENTIALS.email);
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists with email:', ADMIN_CREDENTIALS.email);
      console.log('📧 Email:', ADMIN_CREDENTIALS.email);
      console.log('🔑 Password: Admin123!');
      process.exit(0);
    }

    // Create admin user
    const adminUser = new User(ADMIN_CREDENTIALS);
    await adminUser.save();

    console.log('🎉 Admin user created successfully!');
    console.log('');
    console.log('=== ADMIN CREDENTIALS ===');
    console.log('📧 Email:', ADMIN_CREDENTIALS.email);
    console.log('🔑 Password:', ADMIN_CREDENTIALS.password);
    console.log('👤 Role: admin');
    console.log('');
    console.log('🚀 You can now login to the admin dashboard at:');
    console.log('   http://localhost:3000/login');
    console.log('');
    console.log('After login, you will be redirected to:');
    console.log('   http://localhost:3000/admin/dashboard');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    
    if (error.code === 11000) {
      console.log('⚠️  Admin user already exists');
    }
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

// Also create sample artisan and customer users for testing
async function createSampleUsers() {
  try {
    // Sample Customer
    const customerData = {
      email: 'customer@test.com',
      password: 'Customer123!',
      role: 'customer',
      profile: {
        firstName: 'Test',
        lastName: 'Customer',
        phone: '+251911111111',
        bio: 'Sample customer for testing'
      }
    };

    const existingCustomer = await User.findByEmail(customerData.email);
    if (!existingCustomer) {
      const customer = new User(customerData);
      await customer.save();
      console.log('✅ Sample customer created:', customerData.email);
    }

    // Sample Artisan
    const artisanData = {
      email: 'artisan@test.com',
      password: 'Artisan123!',
      role: 'artisan',
      profile: {
        firstName: 'Test',
        lastName: 'Artisan',
        phone: '+251922222222',
        bio: 'Sample artisan for testing',
        culturalBackground: 'Traditional Ethiopian textile weaving from Addis Ababa region',
        specialties: ['Textiles', 'Traditional Weaving']
      },
      verification: {
        status: 'approved',
        submittedAt: new Date(),
        reviewedAt: new Date()
      }
    };

    const existingArtisan = await User.findByEmail(artisanData.email);
    if (!existingArtisan) {
      const artisan = new User(artisanData);
      await artisan.save();
      console.log('✅ Sample artisan created:', artisanData.email);
    }

  } catch (error) {
    console.error('❌ Error creating sample users:', error.message);
  }
}

// Run the script
async function main() {
  console.log('🚀 Creating admin user for EthioCraft Global...');
  console.log('');
  
  await createAdminUser();
  await createSampleUsers();
}

main();