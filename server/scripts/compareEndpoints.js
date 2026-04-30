/**
 * Compare Both Endpoints Side by Side
 * This will show us exactly what's different
 */

const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

const API_BASE = 'http://localhost:5001/api';

async function compareEndpoints() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ethiocraft_global', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    const email = 'aster@gmail.com';
    
    // ============================================================
    // TEST 1: Auth endpoint (WORKING)
    // ============================================================
    console.log('='.repeat(70));
    console.log('TEST 1: /api/auth/change-password (WORKING)');
    console.log('='.repeat(70));
    
    // Set initial password
    let user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    const initialPassword1 = 'Initial123!';
    user.password = initialPassword1;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
    console.log(`✅ Set initial password: ${initialPassword1}`);
    
    // Login
    const loginResponse1 = await axios.post(`${API_BASE}/auth/login`, {
      email,
      password: initialPassword1
    });
    const token1 = loginResponse1.data.token || loginResponse1.data.tokens.accessToken;
    console.log(`✅ Logged in successfully`);
    
    // Change password via auth endpoint
    const newPassword1 = 'AuthChanged123!';
    console.log(`\n🔄 Changing password to: ${newPassword1}`);
    
    await axios.post(
      `${API_BASE}/auth/change-password`,
      {
        currentPassword: initialPassword1,
        newPassword: newPassword1
      },
      {
        headers: { 'Authorization': `Bearer ${token1}` }
      }
    );
    console.log(`✅ Password changed via auth endpoint`);
    
    // Check in database
    user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    const authMatch = await user.comparePassword(newPassword1);
    console.log(`📊 Database check: ${authMatch ? '✅ Password matches' : '❌ Password does NOT match'}`);
    
    // Try to login with new password
    try {
      await axios.post(`${API_BASE}/auth/login`, {
        email,
        password: newPassword1
      });
      console.log(`✅ Login with new password: SUCCESS\n`);
    } catch (e) {
      console.log(`❌ Login with new password: FAILED`);
      console.log(`   Error: ${e.response?.data?.message}\n`);
    }
    
    // ============================================================
    // TEST 2: Artisan settings endpoint (NOT WORKING)
    // ============================================================
    console.log('='.repeat(70));
    console.log('TEST 2: /api/artisan/settings/change-password (NOT WORKING)');
    console.log('='.repeat(70));
    
    // Set initial password
    user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    const initialPassword2 = 'Initial456!';
    user.password = initialPassword2;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
    console.log(`✅ Set initial password: ${initialPassword2}`);
    
    // Login
    const loginResponse2 = await axios.post(`${API_BASE}/auth/login`, {
      email,
      password: initialPassword2
    });
    const token2 = loginResponse2.data.token || loginResponse2.data.tokens.accessToken;
    console.log(`✅ Logged in successfully`);
    
    // Change password via artisan settings endpoint
    const newPassword2 = 'ArtisanChanged456!';
    console.log(`\n🔄 Changing password to: ${newPassword2}`);
    
    await axios.post(
      `${API_BASE}/artisan/settings/change-password`,
      {
        currentPassword: initialPassword2,
        newPassword: newPassword2
      },
      {
        headers: { 'Authorization': `Bearer ${token2}` }
      }
    );
    console.log(`✅ Password changed via artisan settings endpoint`);
    
    // Check in database
    user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    const artisanMatch = await user.comparePassword(newPassword2);
    console.log(`📊 Database check: ${artisanMatch ? '✅ Password matches' : '❌ Password does NOT match'}`);
    
    // Try to login with new password
    try {
      await axios.post(`${API_BASE}/auth/login`, {
        email,
        password: newPassword2
      });
      console.log(`✅ Login with new password: SUCCESS\n`);
    } catch (e) {
      console.log(`❌ Login with new password: FAILED`);
      console.log(`   Error: ${e.response?.data?.message}\n`);
    }
    
    // ============================================================
    // COMPARISON
    // ============================================================
    console.log('='.repeat(70));
    console.log('COMPARISON');
    console.log('='.repeat(70));
    console.log(`Auth endpoint password works: ${authMatch ? '✅ YES' : '❌ NO'}`);
    console.log(`Artisan endpoint password works: ${artisanMatch ? '✅ YES' : '❌ NO'}`);
    
    if (!artisanMatch) {
      console.log(`\n🔍 Debugging artisan endpoint issue...`);
      console.log(`   Expected password: ${newPassword2}`);
      console.log(`   Password hash in DB: ${user.password.substring(0, 40)}...`);
      
      // Try various passwords
      console.log(`\n   Testing various passwords:`);
      const testPasswords = [newPassword2, initialPassword2, 'ArtisanChanged456!', 'Initial456!'];
      for (const pwd of testPasswords) {
        const match = await user.comparePassword(pwd);
        console.log(`      '${pwd}': ${match ? '✅' : '❌'}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

compareEndpoints();
