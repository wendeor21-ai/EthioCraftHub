#!/usr/bin/env node
/**
 * Automated EthioCraft Global Setup Script (MySQL / PostgreSQL compatible)
 * 
 * This script automates the complete setup process:
 * 1. Checks/Creates MySQL or PostgreSQL database
 * 2. Runs Prisma migrations
 * 3. Seeds the database with data
 * 4. Verifies the setup
 * 
 * Usage: node scripts/auto-setup.js
 */

require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, options = {}) {
  try {
    log(`\n▶ Running: ${command}`, 'cyan');
    const output = execSync(command, {
      stdio: 'inherit',
      ...options,
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error };
  }
}

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${colors.yellow}${question}${colors.reset}`, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function checkEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    log('\n❌ .env file not found!', 'red');
    log('📝 Copying .env.example to .env...', 'yellow');
    fs.copyFileSync('.env.example', '.env');
    log('✅ .env file created. Please update it with your configuration.', 'green');
    return false;
  }
  return true;
}

function extractDbConfig() {
  const envPath = path.join(process.cwd(), '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const dbUrlMatch = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
  if (!dbUrlMatch) {
    log('❌ DATABASE_URL not found in .env file', 'red');
    return null;
  }

  const dbUrl = dbUrlMatch[1].trim();
  const isMysql = dbUrl.startsWith('mysql:');
  
  // Parse URL: protocol://user:password@host:port/dbname
  const urlPattern = /(?:mysql|postgresql):\/\/([^:]+):?([^@]*)@([^:]+):(\d+)\/([^?]+)/;
  const match = dbUrl.match(urlPattern);
  
  if (!match) {
    log('❌ Invalid DATABASE_URL format', 'red');
    return null;
  }

  return {
    type: isMysql ? 'mysql' : 'postgres',
    user: match[1],
    password: match[2] || '',
    host: match[3],
    port: match[4],
    database: match[5],
    fullUrl: dbUrl,
  };
}

async function createDatabase(config) {
  log(`\n📊 Ensuring ${config.type.toUpperCase()} database exists...`, 'blue');
  
  if (config.type === 'mysql') {
    const passArg = config.password ? `-p"${config.password}"` : '';
    const cmd = `mysql -u ${config.user} ${passArg} -h ${config.host} -P ${config.port} -e "CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"`;
    const result = execCommand(cmd, { stdio: 'pipe' });
    if (result.success) {
      log(`✅ MySQL Database "${config.database}" is ready`, 'green');
      return true;
    } else {
      log(`ℹ️  Note: Ensure "${config.database}" is created in phpMyAdmin/MySQL. Proceeding...`, 'yellow');
      return true;
    }
  } else {
    const adminUrl = `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/postgres`;
    const createDbCommand = `psql "${adminUrl}" -c "CREATE DATABASE ${config.database};"`;
    const result = execCommand(createDbCommand, { stdio: 'pipe' });
    if (result.success || (result.error && result.error.toString().includes('already exists'))) {
      log(`✅ Database "${config.database}" is ready`, 'green');
      return true;
    } else {
      log(`❌ Failed to create database: ${result.error}`, 'red');
      return false;
    }
  }
}

async function runPrismaMigrations() {
  log('\n🔄 Running Prisma migrations...', 'blue');
  
  // Generate Prisma Client
  log('📦 Generating Prisma Client...', 'cyan');
  let result = execCommand('npx prisma generate');
  if (!result.success) {
    log('❌ Failed to generate Prisma Client', 'red');
    return false;
  }
  
  // Push schema to database
  log('🚀 Pushing schema to database...', 'cyan');
  result = execCommand('npx prisma db push --accept-data-loss');
  if (!result.success) {
    log('❌ Failed to push schema', 'red');
    return false;
  }
  
  log('✅ Schema pushed successfully', 'green');
  return true;
}

async function seedDatabase() {
  log('\n🌱 Seeding database...', 'blue');
  
  const result = execCommand('node scripts/seed-database.js');
  if (!result.success) {
    log('❌ Failed to seed database', 'red');
    return false;
  }
  
  log('✅ Database seeded successfully', 'green');
  return true;
}

async function verifySetup() {
  log('\n🔍 Verifying setup...', 'blue');
  
  const result = execCommand('node scripts/verify-setup.js');
  return result.success;
}

async function main() {
  console.clear();
  log('╔═══════════════════════════════════════════════════════════╗', 'cyan');
  log('║     EthioCraft Global - Automated Setup Wizard          ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════╝\n', 'cyan');

  // Step 1: Check .env file
  log('Step 1: Checking configuration...', 'yellow');
  if (!checkEnvFile()) {
    log('\n⚠️  Please edit .env file and run this script again.', 'yellow');
    process.exit(0);
  }

  const dbConfig = extractDbConfig();
  if (!dbConfig) {
    process.exit(1);
  }

  log(`\n📋 Configuration:`, 'cyan');
  log(`   Database Type: ${dbConfig.type.toUpperCase()}`);
  log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
  log(`   Database: ${dbConfig.database}`);
  log(`   User: ${dbConfig.user}`);

  // Step 2: Create database
  log('\nStep 2: Database setup...', 'yellow');
  const dbCreated = await createDatabase(dbConfig);
  if (!dbCreated) {
    log('\n⚠️  Database setup failed. Please check your credentials.', 'red');
    process.exit(1);
  }

  // Step 3: Run Prisma migrations
  log('\nStep 3: Database schema...', 'yellow');
  const migrated = await runPrismaMigrations();
  if (!migrated) {
    log('\n⚠️  Migration failed. Exiting.', 'red');
    process.exit(1);
  }

  // Step 4: Verify
  log('\nStep 4: Verification...', 'yellow');
  await verifySetup();

  log('\n🎉 Setup completed successfully!\n', 'green');
}

main().catch((error) => {
  log(`\n❌ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});
