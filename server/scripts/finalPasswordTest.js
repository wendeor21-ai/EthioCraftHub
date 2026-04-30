/**
 * Final Password Change Test
 * Sets a known password for testing
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function finalTest() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ethiocraft_global', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    const email = 'aster@gmail.com';
    const testPassword = 'TestPassword123!';
    
    console.log('Setting test password for:', email);
    console.log('Password:', testPassword);
    
    let user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      console.error('❌ User not found');
      process.exit(1);
    }
    
    // Set password using the same method as controller
    user.password = testPassword;
    user.mustChangePassword = false;
    user.tempPasswordExpiry = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastPasswordChange = new Date();
    await user.save();
    
    // Verify
    user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    const match = await user.comparePassword(testPassword);
    
    if (match) {
      console.log('\n✅ Password set successfully!');
      console.log('\n🔑 Test credentials:');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${testPassword}`);
      console.log('\n📝 Now test:');
      console.log('   1. Login at http://localhost:3000/login');
      console.log('   2. Go to http://localhost:3000/artisan/settings');
      console.log('   3. Change password in the Security tab');
      console.log('   4. Logout and login with the new password');
    } else {
      console.log('\n❌ Password verification failed!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

finalTest();
