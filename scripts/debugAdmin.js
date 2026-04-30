/**
 * Admin Debug Script for EthioCraft Global
 * 
 * Comprehensive debugging for admin login issues
 * Run with: node scripts/debugAdmin.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

async function debugAdminAccount() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ethiocraft-global';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    console.log('🔗 Database:', mongoUri);
    console.log('');

    // Find admin user
    console.log('🔍 Searching for admin user...');
    const adminUser = await User.findByEmail('admin@ethiocraft.com').select('+password');
    
    if (!adminUser) {
      console.log('❌ ADMIN USER NOT FOUND!');
      console.log('');
      console.log('🔧 Creating admin user now...');
      await createFreshAdmin();
      return;
    }

    console.log('✅ Admin user found!');
    console.log('');
    
    // Display admin details
    console.log('📋 ADMIN USER DETAILS:');
    console.log('======================');
    console.log('📧 Email:', adminUser.email);
    console.log('👤 Role:', adminUser.role);
    console.log('🔢 Login Attempts:', adminUser.loginAttempts || 0);
    console.log('🔒 Is Locked:', adminUser.isLocked ? 'YES' : 'NO');
    console.log('⏰ Lock Until:', adminUser.lockUntil || 'Not locked');
    console.log('✅ Is Active:', adminUser.isActive ? 'YES' : 'NO');
    console.log('🔑 Has Password:', adminUser.password ? 'YES' : 'NO');
    console.log('📅 Created:', adminUser.createdAt);
    console.log('🕐 Last Login:', adminUser.lastLogin || 'Never');
    console.log('');

    // Test password verification
    console.log('🔐 TESTING PASSWORD VERIFICATION:');
    console.log('==================================');
    
    const testPasswords = ['Admin123!', 'admin123!', 'Admin123', 'admin@ethiocraft.com'];
    
    for (const testPassword of testPasswords) {
      try {
        const isValid = await adminUser.comparePassword(testPassword);
        console.log(`🔑 "${testPassword}": ${isValid ? '✅ VALID' : '❌ INVALID'}`);
        
        if (isValid) {
          console.log('');
          console.log('🎉 CORRECT PASSWORD FOUND!');
          console.log('📧 Email: admin@ethiocraft.com');
          console.log('🔑 Password:', testPassword);
          break;
        }
      } catch (error) {
        console.log(`🔑 "${testPassword}": ❌ ERROR -`, error.message);
      }
    }
    
    console.log('');
    
    // Check if we need to fix the admin
    if (adminUser.isLocked || adminUser.loginAttempts > 0 || !adminUser.isActive) {
      console.log('🔧 FIXING ADMIN ACCOUNT...');
      await adminUser.resetLoginAttempts();
      adminUser.isActive = true;
      await adminUser.save();
      console.log('✅ Admin account fixed!');
      console.log('');
    }

    // Test manual password hash
    console.log('🧪 TESTING MANUAL PASSWORD HASH:');
    console.log('=================================');
    const manualHash = await bcrypt.hash('Admin123!', 12);
    const manualTest = await bcrypt.compare('Admin123!', manualHash);
    console.log('🔑 Manual hash test:', manualTest ? '✅ WORKING' : '❌ BROKEN');
    console.log('');

    // Final recommendations
    console.log('💡 RECOMMENDATIONS:');
    console.log('===================');
    
    if (adminUser.isLocked) {
      console.log('🔓 Run: node scripts/adminManager.js unlock');
    }
    
    console.log('🔄 Try: node scripts/debugAdmin.js reset');
    console.log('🆕 Or: node scripts/debugAdmin.js fresh');
    console.log('');

  } catch (error) {
    console.error('❌ Error during debug:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

async function createFreshAdmin() {
  try {
    // Delete existing admin if any
    await User.deleteOne({ email: 'admin@ethiocraft.com' });
    console.log('🗑️  Deleted existing admin user');

    const adminData = {
      email: 'admin@ethiocraft.com',
      password: 'Admin123!',
      role: 'admin',
      profile: {
        firstName: 'EthioCraft',
        lastName: 'Administrator',
        phone: '+251911234567',
        bio: 'Platform administrator for EthioCraft Global marketplace'
      },
      isActive: true
    };

    const admin = new User(adminData);
    await admin.save();

    console.log('🎉 Fresh admin user created!');
    console.log('📧 Email: admin@ethiocraft.com');
    console.log('🔑 Password: Admin123!');
    console.log('');

    // Verify the new admin
    const newAdmin = await User.findByEmail('admin@ethiocraft.com').select('+password');
    const passwordTest = await newAdmin.comparePassword('Admin123!');
    console.log('✅ Password verification test:', passwordTest ? 'PASSED' : 'FAILED');

  } catch (error) {
    console.error('❌ Error creating fresh admin:', error.message);
  }
}

async function resetAdminPassword() {
  try {
    const adminUser = await User.findByEmail('admin@ethiocraft.com');
    
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    // Manually set password and save
    adminUser.password = 'Admin123!';
    adminUser.isActive = true;
    await adminUser.resetLoginAttempts();
    await adminUser.save();

    console.log('🔑 Admin password reset completed');
    
    // Test the reset
    const updatedAdmin = await User.findByEmail('admin@ethiocraft.com').select('+password');
    const testResult = await updatedAdmin.comparePassword('Admin123!');
    console.log('✅ Password test after reset:', testResult ? 'PASSED' : 'FAILED');

  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
  }
}

// Main function
async function main() {
  const action = process.argv[2] || 'debug';
  
  console.log('🐛 EthioCraft Global - Admin Debug Tool');
  console.log('=======================================');
  console.log('');

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ethiocraft-global';
    await mongoose.connect(mongoUri);

    switch (action.toLowerCase()) {
      case 'debug':
        await debugAdminAccount();
        break;
      case 'reset':
        await resetAdminPassword();
        break;
      case 'fresh':
        await createFreshAdmin();
        break;
      default:
        console.log('Usage: node scripts/debugAdmin.js [debug|reset|fresh]');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();