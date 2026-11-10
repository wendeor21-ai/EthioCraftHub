#!/usr/bin/env node
/**
 * Verification Script - Check if setup is complete
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function verifySetup() {
  log('\n╔═══════════════════════════════════════════════════════════╗', 'cyan');
  log('║     EthioCraft Global - Setup Verification              ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════╝\n', 'cyan');
  
  let allPassed = true;

  // Check 1: Node.js version
  log('1. Checking Node.js version...', 'cyan');
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion >= 18) {
    log(`   ✅ Node.js ${nodeVersion} (OK)`, 'green');
  } else {
    log(`   ❌ Node.js ${nodeVersion} (Need v18+)`, 'red');
    allPassed = false;
  }

  // Check 2: .env file
  log('\n2. Checking .env configuration...', 'cyan');
  if (fs.existsSync('.env')) {
    const envContent = fs.readFileSync('.env', 'utf8');
    if (envContent.includes('DATABASE_URL')) {
      log('   ✅ .env file exists with DATABASE_URL', 'green');
    } else {
      log('   ❌ .env file missing DATABASE_URL', 'red');
      allPassed = false;
    }
  } else {
    log('   ❌ .env file not found', 'red');
    allPassed = false;
  }

  // Check 3: Dependencies
  log('\n3. Checking dependencies...', 'cyan');
  if (fs.existsSync('node_modules')) {
    log('   ✅ Server dependencies installed', 'green');
  } else {
    log('   ❌ Server dependencies not installed (run: npm install)', 'red');
    allPassed = false;
  }
  
  if (fs.existsSync('client/node_modules')) {
    log('   ✅ Client dependencies installed', 'green');
  } else {
    log('   ⚠️  Client dependencies not installed (run: cd client && npm install)', 'yellow');
  }

  // Check 4: Prisma Client
  log('\n4. Checking Prisma Client...', 'cyan');
  try {
    require('@prisma/client');
    log('   ✅ Prisma Client generated', 'green');
  } catch (error) {
    log('   ❌ Prisma Client not generated (run: npx prisma generate)', 'red');
    allPassed = false;
  }

  // Check 5: Database connection
  log('\n5. Checking database connection...', 'cyan');
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    await prisma.$connect();
    log('   ✅ Database connection successful', 'green');
    
    // Check for data
    const userCount = await prisma.user.count();
    const productCount = await prisma.product.count();
    
    log(`   ℹ️  Found ${userCount} users, ${productCount} products`, 'cyan');
    
    if (userCount === 0 && productCount === 0) {
      log('   ⚠️  Database is empty (run: npm run db:seed)', 'yellow');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    log(`   ❌ Database connection failed: ${error.message}`, 'red');
    allPassed = false;
  }

  // Summary
  log('\n' + '═'.repeat(60), 'cyan');
  if (allPassed) {
    log('\n✅ All checks passed! You\'re ready to start the application.', 'green');
    log('\nNext steps:', 'cyan');
    log('  1. Start backend: npm run dev', 'cyan');
    log('  2. Start frontend: npm run client', 'cyan');
    log('  3. Open browser: http://localhost:3000\n', 'cyan');
  } else {
    log('\n❌ Some checks failed. Please fix the issues above.', 'red');
    log('\nFor help, see SETUP_GUIDE.md\n', 'yellow');
  }
}

verifySetup().catch((error) => {
  log(`\n❌ Verification error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
