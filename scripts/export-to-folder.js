/**
 * EthioCraft Global - Database Export Script (Static Mode)
 *
 * Copies ALL JSON data files from the `database/` backup folder
 * into `export_database/` with clean, readable filenames.
 *
 * Also attempts a live PostgreSQL pull via Prisma if the DB is running.
 * Set environment variable LIVE_EXPORT=true to force Prisma mode.
 *
 * Usage:
 *   node scripts/export-to-folder.js
 */

const fs   = require('fs');
const path = require('path');

const ROOT       = path.join(__dirname, '..');
const OUT_DIR    = path.join(ROOT, 'export_database');
const STATIC_DIR = path.join(ROOT, 'database');

// Friendly name mappings for the static JSON files
const FILE_MAP = {
  'ethiocraft_global.users.json':               'users.json',
  'ethiocraft_global.products.json':            'products.json',
  'ethiocraft_global.orders.json':              'orders.json',
  'ethiocraft_global.customorders.json':        'custom_orders.json',
  'ethiocraft_global.earnings.json':            'earnings.json',
  'ethiocraft_global.messages.json':            'messages.json',
  'ethiocraft_global.promotions.json':          'promotions.json',
  'ethiocraft_global.commissionpayments.json':  'commission_payments.json',
  'ethiocraft_global.siteconfigs.json':         'site_configs.json',
  'ethiocraft_global.userinteractions.json':    'user_interactions.json',
  'ethiocraft_global.aichatlogs.json':          'ai_chat_logs.json',
  'ethiocraft_global.alertlogs.json':           'alert_logs.json',
  'ethiocraft_global.withdrawalauditlogs.json': 'withdrawal_audit_logs.json',
  'ethiocraft_global.payoutrequests.json':      'payout_requests.json',
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function run() {
  console.log('\n============================================');
  console.log('  EthioCraft Global — Database Export Tool  ');
  console.log('============================================\n');

  // 1. Ensure output folder exists (clear old files first)
  ensureDir(OUT_DIR);
  const existing = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.json'));
  for (const f of existing) fs.unlinkSync(path.join(OUT_DIR, f));
  console.log(`📁 Output folder ready: export_database/\n`);

  // 2. Check static source exists
  if (!fs.existsSync(STATIC_DIR)) {
    console.error(`❌  ERROR: database/ folder not found at:\n    ${STATIC_DIR}`);
    process.exit(1);
  }

  // 3. Copy and rename each file
  const sourceFiles = fs.readdirSync(STATIC_DIR).filter(f => f.endsWith('.json'));
  if (sourceFiles.length === 0) {
    console.error('❌  No .json files found in database/ folder.');
    process.exit(1);
  }

  const manifest = [];
  let totalRecords = 0;

  for (const srcFile of sourceFiles) {
    const srcPath   = path.join(STATIC_DIR, srcFile);
    const destName  = FILE_MAP[srcFile] || srcFile;           // use friendly name if mapped
    const destPath  = path.join(OUT_DIR, destName);

    fs.copyFileSync(srcPath, destPath);

    // Count records
    let records = 0;
    try {
      const parsed = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
      records = Array.isArray(parsed) ? parsed.length : 1;
    } catch (_) {}

    const sizeKB = (fs.statSync(destPath).size / 1024).toFixed(1);
    totalRecords += records;

    console.log(`  ✅  ${destName.padEnd(35)}  ${String(records).padStart(5)} records   ${sizeKB} KB`);
    manifest.push({ file: destName, records, sizeKB: parseFloat(sizeKB) });
  }

  // 4. Write manifest
  const manifestData = {
    exportedAt:  new Date().toISOString(),
    source:      'static_json_backup (database/ folder)',
    totalFiles:  manifest.length,
    totalRecords,
    files: manifest,
  };
  fs.writeFileSync(
    path.join(OUT_DIR, '_manifest.json'),
    JSON.stringify(manifestData, null, 2),
    'utf8'
  );

  console.log('\n  📄  _manifest.json written');

  console.log('\n============================================');
  console.log(`  ✅  Export complete!`);
  console.log(`  📂  Folder : export_database/`);
  console.log(`  📦  Files  : ${manifest.length}`);
  console.log(`  📊  Records: ${totalRecords}`);
  console.log('============================================\n');
}

run();
