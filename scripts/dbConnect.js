/**
 * Shared database connection for utility scripts (PostgreSQL/Prisma)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { prisma, connectDB, disconnectDB } = require('../server/lib/prisma');

module.exports = { prisma, connectDB, disconnectDB };
