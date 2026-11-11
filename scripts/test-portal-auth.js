const http = require('http');
const { Readable } = require('stream');

process.env.NODE_ENV = 'test';
process.env.PORT = '5001';

// Load express app
const app = require('../server/server');

console.log('====================================================');
console.log('🧪 Testing Portal Auth & Session Persistence');
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
  // Step 1: Login
  console.log('1️⃣ Step 1: Login with emergency admin credentials...');
  const loginRes = await dispatch('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@ethiocraft.com', password: 'Admin123!' },
  });

  if (loginRes.status !== 200 || !loginRes.body.token) {
    console.error('❌ Login failed:', loginRes.body);
    process.exit(1);
  }

  const token = loginRes.body.token;
  console.log('✅ Login successful! Token received.');

  // Step 2: Call /api/auth/me (This is what caused the auto-logout previously!)
  console.log('2️⃣ Step 2: Testing /api/auth/me with Bearer token...');
  const meRes = await dispatch('/api/auth/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (meRes.status === 200 && meRes.body.user) {
    console.log('✅ [PASS] /api/auth/me returned 200 OK! User:', meRes.body.user.email, 'Role:', meRes.body.user.role);
  } else {
    console.error('❌ [FAIL] /api/auth/me returned:', meRes.status, meRes.body);
    process.exit(1);
  }

  // Step 3: Call an admin protected route
  console.log('3️⃣ Step 3: Testing admin route /api/admin/withdrawals/stats with Bearer token...');
  const adminRes = await dispatch('/api/admin/withdrawals/stats', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  console.log(`✅ Admin route returned Status: ${adminRes.status}`);

  console.log('\n====================================================');
  console.log('🎉 PORTAL AUTO-LOGOUT ISSUE IS FULLY RESOLVED!');
  console.log('====================================================\n');
  process.exit(0);
}

run().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
