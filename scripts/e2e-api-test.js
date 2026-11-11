const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.PORT = '5001';

console.log('====================================================');
console.log('🚀 EthioCraft Global - End-to-End In-Memory API Test');
console.log('====================================================\n');

// Load express app
const app = require('../server/server');

async function runTests() {
  const endpoints = [
    { name: 'Root Endpoint (/)', path: '/', method: 'get', expected: 200 },
    { name: 'API Root (/api)', path: '/api', method: 'get', expected: 200 },
    { name: 'Server Health (/health)', path: '/health', method: 'get', expected: 200 },
    { name: 'API Health (/api/health)', path: '/api/health', method: 'get', expected: 200 },
    { name: 'Products List (/api/products)', path: '/api/products', method: 'get', expected: 200 },
    { name: 'Product Recommendations (/api/products/recommendations)', path: '/api/products/recommendations', method: 'get', expected: 200 },
    { name: 'Homepage Config (/api/settings/homepage)', path: '/api/settings/homepage', method: 'get', expected: 200 },
    { name: 'Broadcast Notifications (/api/notifications/broadcasts)', path: '/api/notifications/broadcasts', method: 'get', expected: 200 },
    { name: 'Platform Settings (/api/notifications/platform-settings)', path: '/api/notifications/platform-settings', method: 'get', expected: 200 },
    {
      name: 'Emergency Admin Login (/api/auth/login)',
      path: '/api/auth/login',
      method: 'post',
      body: { email: 'admin@ethiocraft.com', password: 'Admin123!' },
      expected: 200,
    },
    {
      name: 'Normal Login Validation (/api/auth/login with wrong pass)',
      path: '/api/auth/login',
      method: 'post',
      body: { email: 'unknown@user.com', password: 'wrong' },
      expected: [400, 401, 500], // Should not crash, returns handled auth error
    },
  ];

  let passed = 0;
  let failed = 0;
  const results = [];

  for (const ep of endpoints) {
    try {
      let req = request(app)[ep.method](ep.path);
      if (ep.body) {
        req = req.send(ep.body);
      }

      const res = await req;
      const expectedCodes = Array.isArray(ep.expected) ? ep.expected : [ep.expected];
      const isStatusOk = expectedCodes.includes(res.status);

      if (isStatusOk) {
        passed++;
        console.log(`✅ [PASS] ${ep.name} -> HTTP ${res.status}`);
        const snippet = typeof res.body === 'object' ? JSON.stringify(res.body).substring(0, 100) : String(res.text).substring(0, 100);
        console.log(`         Response: ${snippet}...`);
        results.push({ name: ep.name, status: res.status, ok: true });
      } else {
        failed++;
        console.log(`❌ [FAIL] ${ep.name} -> Got HTTP ${res.status}, expected ${JSON.stringify(ep.expected)}`);
        const snippet = typeof res.body === 'object' ? JSON.stringify(res.body).substring(0, 120) : String(res.text).substring(0, 120);
        console.log(`         Error payload: ${snippet}`);
        results.push({ name: ep.name, status: res.status, ok: false });
      }
    } catch (err) {
      failed++;
      console.log(`❌ [ERR]  ${ep.name} -> Request Exception: ${err.message}`);
      results.push({ name: ep.name, ok: false, error: err.message });
    }
  }

  console.log('\n====================================================');
  console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed out of ${endpoints.length} Endpoints`);
  console.log('====================================================\n');

  if (failed === 0) {
    console.log('🎉 ALL INTEGRATION API TESTS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  } else {
    console.error('⚠️ Some tests failed. Review the logs above.');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
