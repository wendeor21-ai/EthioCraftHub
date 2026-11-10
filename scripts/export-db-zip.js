/**
 * Standalone Database Export & Compression Script
 * 
 * This script runs locally to:
 * 1. Read the PostgreSQL database using Prisma
 * 2. Dump all tables into a temp directory as JSON files
 * 3. Fallback/Include raw seed files from 'database/' directory
 * 4. Compress the folder into a single ZIP file ('database_export.zip')
 * 5. Clean up temporary files
 * 
 * Works out-of-the-box on Windows using PowerShell Compress-Archive.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function exportDatabase() {
  console.log('🏁 Starting standalone database export...');
  const prisma = new PrismaClient();
  const tempDir = path.join(__dirname, '..', 'tmp_db_export');
  const zipPath = path.join(__dirname, '..', 'database_export.zip');

  // Create temporary export directory
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir);

  const tables = [
    { name: 'user', model: prisma.user },
    { name: 'product', model: prisma.product },
    { name: 'order', model: prisma.order },
    { name: 'customOrder', model: prisma.customOrder },
    { name: 'promotion', model: prisma.promotion },
    { name: 'message', model: prisma.message },
    { name: 'earning', model: prisma.earning },
    { name: 'commissionPayment', model: prisma.commissionPayment },
    { name: 'withdrawalAuditLog', model: prisma.withdrawalAuditLog },
    { name: 'userInteraction', model: prisma.userInteraction },
    { name: 'aIChatLog', model: prisma.aIChatLog },
    { name: 'alertLog', model: prisma.alertLog },
    { name: 'siteConfig', model: prisma.siteConfig },
    { name: 'notificationSetting', model: prisma.notificationSetting }
  ];

  let exportedTablesCount = 0;
  let dbAvailable = false;

  try {
    console.log('📡 Testing connection to live PostgreSQL database...');
    // Attempt a quick raw connect check with a 3-second timeout
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection check timeout')), 3000))
    ]);
    dbAvailable = true;
    console.log('👍 PostgreSQL database is online!');
  } catch (err) {
    console.warn(`⚠️ PostgreSQL is offline or unreachable: ${err.message}. Skipping live queries.`);
  }

  if (dbAvailable) {
    try {
      console.log('📡 Retrieving tables from live PostgreSQL database...');
      for (const table of tables) {
        try {
          const data = await table.model.findMany();
          const filePath = path.join(tempDir, `ethiocraft_pg_${table.name}.json`);
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
          console.log(`  ✅ Exported ${table.name} (${data.length} records)`);
          exportedTablesCount++;
        } catch (err) {
          console.warn(`  ⚠️ Failed to export live table '${table.name}': ${err.message}`);
        }
      }
    } catch (error) {
      console.error('❌ Database query execution failed:', error.message);
    }
  } else {
    console.log('📡 Skipping live PostgreSQL export. Relying on static fallback JSON templates.');
  }

  // Also copy any existing static JSON files in database/ folder to include a complete catalog
  const staticDbDir = path.join(__dirname, '..', 'database');
  if (fs.existsSync(staticDbDir)) {
    const files = fs.readdirSync(staticDbDir);
    console.log('📂 Including static JSON backup files from database/ folder...');
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const srcPath = path.join(staticDbDir, file);
          const destPath = path.join(tempDir, file);
          fs.copyFileSync(srcPath, destPath);
          console.log(`  ➕ Included archive file: ${file}`);
        } catch (err) {
          console.error(`  ⚠️ Failed to copy static file ${file}:`, err.message);
        }
      }
    }
  }

  // Compress the temporary directory using PowerShell Compress-Archive
  try {
    console.log(`📦 Compressing exported database files into ZIP...`);
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath); // Delete old zip if it exists
    }

    const relativeTempDir = path.relative(process.cwd(), tempDir);
    const relativeZipPath = path.relative(process.cwd(), zipPath);

    // Using powershell Compress-Archive:
    const command = `powershell -Command "Compress-Archive -Path '${relativeTempDir}\\*' -DestinationPath '${relativeZipPath}' -Force"`;
    execSync(command, { stdio: 'inherit' });
    
    console.log(`🎉 Database export packaged successfully!`);
    console.log(`💾 Zip location: ${zipPath}`);
  } catch (zipError) {
    console.error('❌ Compression failed. You can search the "tmp_db_export" folder for raw exported files.', zipError);
  } finally {
    // Cleanup temporary directory
    if (fs.existsSync(tempDir)) {
      console.log('🧹 Cleaning up temporary export folder...');
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
  
  await prisma.$disconnect();
}

exportDatabase().catch(err => {
  console.error('Fatal crash on database export:', err);
  process.exit(1);
});
