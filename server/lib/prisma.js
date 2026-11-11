/**
 * Prisma Client singleton for EthioCraft Global
 */
let prisma;
try {
  const { PrismaClient } = require('@prisma/client');
  const globalForPrisma = global;
  prisma =
    globalForPrisma.__ethiocraftPrisma ||
    new PrismaClient({
      log:
        process.env.NODE_ENV === 'development'
          ? ['warn', 'error']
          : ['error'],
    });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.__ethiocraftPrisma = prisma;
  }
} catch (err) {
  console.error("⚠️ PrismaClient initialization error:", err.message);
  prisma = new Proxy({}, {
    get: () => new Proxy({}, { get: () => () => Promise.resolve([]) })
  });
}

async function connectDB() {
  try {
    if (prisma && typeof prisma.$connect === 'function') {
      await prisma.$connect();
      const url = process.env.DATABASE_URL || '';
      const dbType = url.startsWith('mysql:') ? 'MySQL' : url.startsWith('postgresql:') ? 'PostgreSQL' : 'Database';
      console.log(`✅ ${dbType} Connected via Prisma`);
      const dbName = url.split('/').pop()?.split('?')[0] || 'ethiocraft_global';
      console.log(`📊 Database: ${dbName}`);
    }
  } catch (err) {
    console.error("⚠️ Prisma connect error (will retry):", err.message);
  }
}

async function disconnectDB() {
  try {
    if (prisma && typeof prisma.$disconnect === 'function') {
      await prisma.$disconnect();
    }
  } catch (err) {
    // Ignore disconnect error
  }
}

module.exports = { prisma, connectDB, disconnectDB };
