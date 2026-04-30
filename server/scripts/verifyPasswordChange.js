/**
 * Verify Password Change Functionality
 * Tests that password changes are properly hashed
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');

async function verifyPasswordChange() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ethiocraft_global', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    const email = 'aster@gmail.com';
    console.log(`🔍 Testing password change for: ${email}`);
    
    // Find user
    let user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.email}`);
    console.log(`📊 Current state:`);
    console.log(`   - Login Attempts: ${user.loginAttempts || 0}`);
    console.log(`   - Is Locked: ${user.isLocked ? 'YES' : 'NO'}`);
    console.log(`   - Password hash: ${user.password.substring(0, 20)}...`);

    // Set a test password
    const testPassword = 'TestPassword123!';
    console.log(`\n🔐 Setting test password: ${testPassword}`);
    
    user.password = testPassword;
    user.lastPasswordChange = new Date();
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    
    await user.save();
    console.log('✅ Password saved');

    // Reload user from database
    user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    console.log(`\n📊 After save:`);
    console.log(`   - Password hash: ${user.password.substring(0, 20)}...`);
    console.log(`   - Is bcrypt hash: ${user.password.startsWith('$2') ? '✅ YES' : '❌ NO'}`);
    console.log(`   - Login Attempts: ${user.loginAttempts || 0}`);
    console.log(`   - Is Locked: ${user.isLocked ? 'YES' : 'NO'}`);

    // Test password verification
    console.log(`\n🔍 Testing password verification...`);
    const isMatch = await user.comparePassword(testPassword);
    console.log(`   - Password matches: ${isMatch ? '✅ YES' : '❌ NO'}`);

    // Test wrong password
    const wrongMatch = await user.comparePassword('WrongPassword123!');
    console.log(`   - Wrong password rejected: ${!wrongMatch ? '✅ YES' : '❌ NO'}`);

    if (isMatch && !wrongMatch && user.password.startsWith('$2')) {
      console.log('\n✅ Password change functionality is working correctly!');
      console.log(`\n🔑 Test credentials:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${testPassword}`);
      console.log(`\n⚠️  You can now test login with these credentials`);
    } else {
      console.log('\n❌ Password change functionality has issues!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

verifyPasswordChange();
