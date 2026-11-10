/**
 * Prisma Client singleton for EthioCraft Global
 */
const { PrismaClient } = require('@prisma/client');

const globalForPrisma = global;

const prisma =
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

async function connectDB() {
  await prisma.$connect();
  const url = process.env.DATABASE_URL || '';
  const dbType = url.startsWith('mysql:') ? 'MySQL' : url.startsWith('postgresql:') ? 'PostgreSQL' : 'Database';
  console.log(`✅ ${dbType} Connected via Prisma`);
  const dbName = url.split('/').pop()?.split('?')[0] || 'ethiocraft_global';
  console.log(`📊 Database: ${dbName}`);
}

async function disconnectDB() {
  await prisma.$disconnect();
}

module.exports = { prisma, connectDB, disconnectDB };
