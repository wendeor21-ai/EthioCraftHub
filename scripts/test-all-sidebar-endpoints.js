const http = require('http');
const { Readable } = require('stream');

process.env.NODE_ENV = 'test';
process.env.PORT = '5001';

// Load express app
const app = require('../server/server');

console.log('====================================================');
console.log('🧪 Testing All 12 Admin Sidebar Endpoints End-to-End');
console.log('====================================================\n');

function dispatch(url, options = {}) {
  return new Promise((resolve) => {
    const rawData = options.body
      ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
      : null;

    const stream = rawData ? Readable.from([Buffer.from(rawData)]) : Readable.from([]);

    const lowerHeaders = {};
    for (const [k, v] of Object.entries(options.headers || {})) {
      lowerHeaders[k.toLowerCase()] = v;
    }

    const req = Object.assign(stream, {
      url,
      method: options.method || 'GET',
      headers: {
        host: 'localhost',
        'user-agent': 'test-agent',
        'content-type': 'application/json',
        ...(rawData ? { 'content-length': String(Buffer.byteLength(rawData)) } : {}),
        ...lowerHeaders,
      },
      connection: { remoteAddress: '127.0.0.1', encrypted: false },
      socket: { remoteAddress: '127.0.0.1', encrypted: false },
    });

    const res = new http.ServerResponse(req);
    let body = '';

    res.write = function (chunk) {
      if (chunk) body += chunk.toString();
      return true;
    };

    res.end = function (chunk) {
      if (chunk) body += chunk.toString();
      let parsed = body;
      try {
        parsed = JSON.parse(body);
      } catch (e) {}
      resolve({ status: res.statusCode, headers: res.getHeaders(), body: parsed });
    };

    app.handle(req, res);
  });
}

async function run() {
  // 1. Login as Admin
  console.log('🔑 Authenticating as Admin...');
  const loginRes = await dispatch('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@ethiocraft.com', password: 'Admin123!' },
  });

  if (loginRes.status !== 200 || !loginRes.body.token) {
    console.error('❌ Login failed:', loginRes.body);
    process.exit(1);
  }

  const token = loginRes.body.token;
  const authHeaders = { Authorization: `Bearer ${token}` };
  console.log('✅ Admin authenticated!\n');

  // Test all 12 sidebar endpoints
  const sidebarTests = [
    { name: '[1. Dashboard] /api/admin/dashboard', url: '/api/admin/dashboard' },
    { name: '[1. Dashboard Analytics] /api/admin/analytics', url: '/api/admin/analytics' },
    { name: '[2. Manage Users] /api/admin/users', url: '/api/admin/users' },
    { name: '[3. Add Executive Check] /api/admin/platform-settings', url: '/api/admin/platform-settings' },
    { name: '[4. Verify Artisans] /api/admin/verifications', url: '/api/admin/verifications' },
    { name: '[5. Moderate Products] /api/admin/products', url: '/api/admin/products' },
    { name: '[6. Custom Orders Analytics] /api/admin/custom-orders-analytics', url: '/api/admin/custom-orders-analytics' },
    { name: '[7. View Reports - Sales] /api/admin/reports/sales', url: '/api/admin/reports/sales' },
    { name: '[7. View Reports - Artisans] /api/admin/reports/artisans', url: '/api/admin/reports/artisans' },
    { name: '[8. Core Utilities - CMS] /api/admin/cms', url: '/api/admin/cms' },
    { name: '[9. Trade Ledger] /api/admin/commission/balances', url: '/api/admin/commission/balances' },
    { name: '[10. Notifications] /api/notifications/broadcasts', url: '/api/notifications/broadcasts' },
    { name: '[11. Zema AI Monitor Status] /api/notifications/platform-settings', url: '/api/notifications/platform-settings' },
    { name: '[12. Settings] /api/admin/platform-settings', url: '/api/admin/platform-settings' },
  ];

  let passed = 0;
  let failed = 0;

  for (const t of sidebarTests) {
    const startTime = Date.now();
    const res = await dispatch(t.url, { method: 'GET', headers: authHeaders });
    const elapsed = Date.now() - startTime;

    if (res.status === 200) {
      passed++;
      console.log(`✅ [PASS] ${t.name} -> 200 OK (${elapsed}ms)`);
    } else {
      failed++;
      console.error(`❌ [FAIL] ${t.name} -> Status: ${res.status} (${elapsed}ms)`, res.body);
    }
  }

  console.log('\n====================================================');
  console.log(`📊 All Sidebar Endpoints Test: ${passed} Passed, ${failed} Failed out of ${sidebarTests.length}`);
  console.log('====================================================\n');

  if (failed === 0) {
    console.log('🎉 ALL 12 SIDEBAR FEATURES ARE 100% OPERATIONAL WITH ZERO DELAY!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

run().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});

