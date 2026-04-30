/**
 * Admin Account Unlock Script for EthioCraft Global
 * 
 * Unlocks the admin account and resets login attempts
 * Run with: node scripts/unlockAdmin.js
 */

const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function unlockAdminAccount() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ethiocraft-global';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find the admin user
    const adminUser = await User.findByEmail('admin@ethiocraft.com');
    
    if (!adminUser) {
      console.log('❌ Admin user not found!');
      console.log('🔧 Run: node scripts/createAdmin.js to create admin user');
      return;
    }

    console.log('📋 Current admin account status:');
    console.log('   Email:', adminUser.email);
    console.log('   Role:', adminUser.role);
    console.log('   Login Attempts:', adminUser.loginAttempts || 0);
    console.log('   Is Locked:', adminUser.isLocked);
    console.log('   Lock Until:', adminUser.lockUntil || 'Not locked');
    console.log('   Is Active:', adminUser.isActive);

    // Reset login attempts and unlock account
    await adminUser.resetLoginAttempts();
    
    // Ensure account is active
    adminUser.isActive = true;
    await adminUser.save();

    console.log('');
    console.log('🎉 Admin account unlocked successfully!');
    console.log('');
    console.log('=== ADMIN CREDENTIALS ===');
    console.log('📧 Email: admin@ethiocraft.com');
    console.log('🔑 Password: Admin123!');
    console.log('👤 Role: admin');
    console.log('');
    console.log('🚀 You can now login at:');
    console.log('   http://localhost:3000/login');
    console.log('');
    console.log('✅ Account Status: UNLOCKED & ACTIVE');

  } catch (error) {
    console.error('❌ Error unlocking admin account:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

// Also provide option to reset password if needed
async function resetAdminPassword() {
  try {
    const adminUser = await User.findByEmail('admin@ethiocraft.com');
    
    if (!adminUser) {
      console.log('❌ Admin user not found!');
      return;
    }

    // Reset password to default
    adminUser.password = 'Admin123!';
    await adminUser.save();
    
    console.log('🔑 Admin password reset to: Admin123!');
    
  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
  }
}

// Main function
async function main() {
  console.log('🔓 Unlocking admin account for EthioCraft Global...');
  console.log('');
  
  await unlockAdminAccount();
  
  // Uncomment the line below if you also want to reset the password
  // await resetAdminPassword();
}

main();