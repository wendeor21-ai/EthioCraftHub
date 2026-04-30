/**
 * Script to Unlock User Account and Reset Password
 * 
 * Usage: node server/scripts/unlockAccount.js <email> [newPassword]
 * 
 * This script:
 * 1. Unlocks the account by resetting loginAttempts and lockUntil
 * 2. Optionally sets a new password (properly hashed)
 * 3. Clears any password change enforcement flags
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import User model
const User = require('../models/User');

// Get command line arguments
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email) {
  console.error('❌ Error: Email address is required');
  console.log('Usage: node server/scripts/unlockAccount.js <email> [newPassword]');
  console.log('Example: node server/scripts/unlockAccount.js aster@gmail.com Temp123!');
  process.exit(1);
}

async function unlockAccount() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ethiocraft', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find user
    console.log(`🔍 Looking for user: ${email}`);
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.email} (ID: ${user._id})`);
    console.log(`📊 Current status:`);
    console.log(`   - Login Attempts: ${user.loginAttempts || 0}`);
    console.log(`   - Lock Until: ${user.lockUntil || 'Not locked'}`);
    console.log(`   - Is Locked: ${user.isLocked ? 'YES' : 'NO'}`);

    // Unlock account
    console.log('\n🔓 Unlocking account...');
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    // Set new password if provided
    if (newPassword) {
      console.log('🔐 Setting new password...');
      
      // Validate password strength
      if (newPassword.length < 8) {
        console.error('❌ Password must be at least 8 characters long');
        process.exit(1);
      }
      
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
        console.error('❌ Password must contain at least one uppercase letter, one lowercase letter, and one number');
        process.exit(1);
      }

      // Password will be automatically hashed by the pre-save middleware
      user.password = newPassword;
      user.mustChangePassword = false;
      user.tempPasswordExpiry = undefined;
      user.lastPasswordChange = new Date();
      
      console.log('✅ New password set (will be hashed automatically)');
    }

    // Save changes
    await user.save();

    console.log('\n✅ Account unlocked successfully!');
    console.log(`📊 Updated status:`);
    console.log(`   - Login Attempts: ${user.loginAttempts}`);
    console.log(`   - Lock Until: ${user.lockUntil || 'Not locked'}`);
    console.log(`   - Is Locked: ${user.isLocked ? 'YES' : 'NO'}`);
    
    if (newPassword) {
      console.log(`\n🔑 New credentials:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${newPassword}`);
      console.log(`\n⚠️  Please change this password after logging in!`);
    }

    console.log('\n✅ Done! User can now login.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the script
unlockAccount();
