/**
 * Frontend API Test Script
 * Tests the API calls from the frontend
 */

import { authAPI } from './utils/api';

export const testFrontendAPI = async () => {
  console.log('🧪 Testing Frontend API calls...\n');

  try {
    // Test 1: Register a test user
    console.log('1️⃣ Testing registration API call...');
    const registerData = {
      email: 'frontend-test@example.com',
      password: 'TestPass123!',
      role: 'customer',
      profile: {
        firstName: 'Frontend',
        lastName: 'Test',
        phone: '+251911234567'
      }
    };

    try {
      const registerResponse = await authAPI.register(registerData);
      console.log('✅ Registration API successful:', registerResponse.data);
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('ℹ️ User already exists, continuing with login test...');
      } else {
        console.error('❌ Registration API failed:', error.response?.data);
      }
    }

    // Test 2: Login with the test user
    console.log('\n2️⃣ Testing login API call...');
    const loginData = {
      email: 'frontend-test@example.com',
      password: 'TestPass123!'
    };

    try {
      const loginResponse = await authAPI.login(loginData);
      console.log('✅ Login API successful:', loginResponse.data);
    } catch (error) {
      console.error('❌ Login API failed:', error.response?.data);
    }

    // Test 3: Test admin login
    console.log('\n3️⃣ Testing admin login API call...');
    const adminLoginData = {
      email: 'admin@ethiocraft.com',
      password: 'Admin123!'
    };

    try {
      const adminLoginResponse = await authAPI.login(adminLoginData);
      console.log('✅ Admin login API successful:', adminLoginResponse.data);
    } catch (error) {
      console.error('❌ Admin login API failed:', error.response?.data);
    }

    console.log('\n🎉 Frontend API tests completed!');

  } catch (error) {
    console.error('❌ Frontend API test failed:', error);
  }
};

// You can call this function from the browser console:
// import { testFrontendAPI } from './test-api.js'; testFrontendAPI();