/**
 * Prisma Client singleton for EthioCraft Global
 * Resilient multi-host connection manager for local, cPanel, and cloud deployments
 */
const path = require('path');
const fs = require('fs');

// Ensure environment variables are loaded across all deployment structures
const candidateEnvPaths = [
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), '.env.production'),
  path.join(__dirname, '.env'),
  path.join(__dirname, '.env.production'),
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', '.env.production'),
  path.join(__dirname, '..', '..', '.env'),
  path.join(__dirname, '..', '..', '.env.production'),
];

for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    try {
      require('dotenv').config({ path: envPath });
    } catch (e) {}
  }
}

const { PrismaClient } = require('@prisma/client');

// Fallback production credentials
const PROD_URLS = [
  process.env.DATABASE_URL,
  'mysql://ethiocaq_userdb:Ethiocraft%40%261%2F03%2F2019@127.0.0.1:3306/ethiocaq_ethiocraft?connect_timeout=3',
  'mysql://ethiocaq_userdb:Ethiocraft%40%261%2F03%2F2019@localhost:3306/ethiocaq_ethiocraft?connect_timeout=3',
  'mysql://ethiocaq_userdb:Ethiocraft%40%261%2F03%2F2019@localhost/ethiocaq_ethiocraft?socket=/var/lib/mysql/mysql.sock&connect_timeout=3',
  'mysql://ethiocaq_userdb:Ethiocraft%40%261%2F03%2F2019@localhost/ethiocaq_ethiocraft?socket=/tmp/mysql.sock&connect_timeout=3',
].filter(Boolean);

const DEV_URLS = [
  process.env.DATABASE_URL,
  'mysql://root:@127.0.0.1:3306/ethiocraft_global?connect_timeout=3',
  'mysql://root:@localhost:3306/ethiocraft_global?connect_timeout=3',
].filter(Boolean);

let activePrisma = null;
let lastDbError = null;
let activeConnectionUrl = null;

// Initial eager client creation
try {
  const initialUrl = process.env.DATABASE_URL || (process.env.NODE_ENV === 'production' ? PROD_URLS[1] : DEV_URLS[1]);
  activePrisma = new PrismaClient({
    datasources: { db: { url: initialUrl } },
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
  activeConnectionUrl = initialUrl;
} catch (err) {
  console.warn("⚠️ Initial PrismaClient creation deferred:", err.message);
}

// Resilient Dynamic Proxy: always dispatches to the latest connected Prisma instance
const prisma = new Proxy({}, {
  get(target, prop) {
    if (activePrisma && activePrisma[prop] !== undefined) {
      const val = activePrisma[prop];
      if (typeof val === 'function') {
        return val.bind(activePrisma);
      }
      return val;
    }
    // Return empty array / 0 / null fallback if not connected yet
    return new Proxy({}, {
      get: () => () => Promise.resolve([])
    });
  }
});

async function connectDB() {
  const candidates = process.env.NODE_ENV === 'production' ? PROD_URLS : [...DEV_URLS, ...PROD_URLS];
  const uniqueCandidates = [...new Set(candidates)];

  for (const candidateUrl of uniqueCandidates) {
    try {
      const maskedUrl = candidateUrl.replace(/:[^:@]+@/, ':****@');
      console.log(`🔌 Attempting MySQL connection to: ${maskedUrl}`);

      const client = new PrismaClient({
        datasources: { db: { url: candidateUrl } },
        log: ['error'],
      });

      await client.$connect();
      const count = await client.user.count();

      // Successfully connected and verified user query!
      activePrisma = client;
      activeConnectionUrl = candidateUrl;
      process.env.DATABASE_URL = candidateUrl;
      lastDbError = null;

      console.log(`✅ MySQL Connected successfully! Found ${count} platform users.`);
      return client;
    } catch (err) {
      lastDbError = err.message;
      console.warn(`⚠️ Candidate failed: ${candidateUrl.split('@')[1] || candidateUrl} - ${err.message}`);
    }
  }

  console.error("❌ All MySQL connection candidates failed. Last error:", lastDbError);
}

async function disconnectDB() {
  try {
    if (activePrisma && typeof activePrisma.$disconnect === 'function') {
      await activePrisma.$disconnect();
    }
  } catch (err) {}
}

function getDatabaseStatus() {
  return {
    connected: !!activePrisma && !lastDbError,
    activeUrl: activeConnectionUrl ? activeConnectionUrl.replace(/:[^:@]+@/, ':****@') : 'none',
    error: lastDbError,
  };
}

module.exports = { prisma, connectDB, disconnectDB, getDatabaseStatus };
