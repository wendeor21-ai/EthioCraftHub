const http = require('http');
const { Readable } = require('stream');

process.env.NODE_ENV = 'test';
process.env.PORT = '5001';

// Load express app
const app = require('../server/server');

console.log('====================================================');
console.log('🚀 EthioCraft Global - Zero-Socket Direct Dispatch Test');
console.log('====================================================\n');

function dispatch(url, options = {}) {
  return new Promise((resolve) => {
    const rawData = options.body
      ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
      : null;

    const stream = rawData ? Readable.from([Buffer.from(rawData)]) : Readable.from([]);

    // Create req with stream properties
    const req = Object.assign(stream, {
      url,
      method: options.method || 'GET',
      headers: {
        host: 'localhost',
        'user-agent': 'test-agent',
        'content-type': 'application/json',
        ...(rawData ? { 'content-length': String(Buffer.byteLength(rawData)) } : {}),
        ...(options.headers || {}),
      },
      connection: { remoteAddress: '127.0.0.1', encrypted: false },
      socket: { remoteAddress: '127.0.0.1', encrypted: false },
    });

    const res = new http.ServerResponse(req);
    let body = '';

    res.write = function (chunk, encoding) {
      if (chunk) body += chunk.toString();
      return true;
    };

    res.end = function (chunk, encoding) {
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
  const endpoints = [
    { name: 'Root Route (/)', url: '/', expected: 200 },
    { name: 'API Root (/api)', url: '/api', expected: 200 },
    { name: 'Server Health (/health)', url: '/health', expected: 200 },
    { name: 'API Health (/api/health)', url: '/api/health', expected: 200 },
    { name: 'Products Catalog (/api/products)', url: '/api/products', expected: 200 },
    { name: 'Recommendations (/api/products/recommendations)', url: '/api/products/recommendations', expected: 200 },
    { name: 'Homepage Layout (/api/settings/homepage)', url: '/api/settings/homepage', expected: 200 },
    { name: 'Broadcast Notifications (/api/notifications/broadcasts)', url: '/api/notifications/broadcasts', expected: 200 },
    { name: 'Platform Settings (/api/notifications/platform-settings)', url: '/api/notifications/platform-settings', expected: 200 },
    {
      name: 'Emergency Admin Auth (/api/auth/login)',
      url: '/api/auth/login',
      method: 'POST',
      body: { email: 'admin@ethiocraft.com', password: 'Admin123!' },
      expected: 200,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const ep of endpoints) {
    try {
      const res = await dispatch(ep.url, { method: ep.method, body: ep.body, headers: ep.headers });
      const isOk = res.status === ep.expected;
      if (isOk) {
        passed++;
        console.log(`✅ [PASS] ${ep.name} -> Status: ${res.status}`);
        const snippet = typeof res.body === 'object' ? JSON.stringify(res.body).substring(0, 110) : String(res.body).substring(0, 110);
        console.log(`         Body: ${snippet}...`);
      } else {
        failed++;
        console.log(`❌ [FAIL] ${ep.name} -> Got Status: ${res.status}, Expected: ${ep.expected}`);
        console.log(`         Body:`, res.body);
      }
    } catch (err) {
      failed++;
      console.log(`❌ [ERR]  ${ep.name} -> Error: ${err.message}`);
    }
  }

  console.log('\n====================================================');
  console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed out of ${endpoints.length} Endpoints`);
  console.log('====================================================\n');

  if (failed === 0) {
    console.log('🎉 100% END-TO-END IN-MEMORY INTEGRATION VERIFIED!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

run().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
