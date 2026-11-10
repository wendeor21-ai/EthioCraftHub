require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const DATA_DIR = path.join(__dirname, '..', 'pg_backup_data');

// Identify date fields across models to ensure proper Date objects
const DATE_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'lastLogin',
  'lockUntil',
  'tempPasswordExpiry',
  'lastPasswordChange',
  'passwordResetExpires',
  'startDate',
  'endDate',
  'processedAt',
  'reviewedAt',
  'lastNotifiedAt'
]);

function parseDates(item) {
  const result = { ...item };
  for (const [k, v] of Object.entries(result)) {
    if (DATE_FIELDS.has(k) && v !== null && v !== undefined) {
      result[k] = new Date(v);
    }
  }
  return result;
}

async function importModel(modelName, fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`[SKIP] File not found: ${fileName}`);
    return 0;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const items = JSON.parse(raw);
  if (!Array.isArray(items) || items.length === 0) {
    console.log(`[INFO] No data to import for ${modelName}`);
    return 0;
  }

  console.log(`[IMPORTING] ${modelName}: ${items.length} records...`);
  let successCount = 0;

  for (const item of items) {
    const formatted = parseDates(item);
    try {
      if (item.id) {
        await prisma[modelName].upsert({
          where: { id: item.id },
          create: formatted,
          update: formatted
        });
      } else {
        await prisma[modelName].create({ data: formatted });
      }
      successCount++;
    } catch (err) {
      console.error(`  [ERROR] on ${modelName} id=${item.id || 'N/A'}:`, err.message);
    }
  }

  console.log(`  ✔ Successfully imported ${successCount}/${items.length} for ${modelName}`);
  return successCount;
}

async function main() {
  console.log('=============================================');
  console.log('   MIGRATING POSTGRESQL DATA TO MYSQL DB     ');
  console.log('=============================================\n');

  try {
    // Disable FK checks temporarily during data load
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');

    // 1. Users first (foundational for all relations)
    await importModel('user', 'user.json');

    // 2. Site configs & Alert logs
    await importModel('siteConfig', 'siteConfig.json');
    await importModel('alertLog', 'alertLog.json');

    // 3. Products & Promotions
    await importModel('product', 'product.json');
    await importModel('promotion', 'promotion.json');
    await importModel('promotionProduct', 'promotionProduct.json');

    // 4. Orders & Custom Orders
    await importModel('order', 'order.json');
    await importModel('customOrder', 'customOrder.json');

    // 5. Messages
    await importModel('message', 'message.json');

    // 6. Financials (Earnings & Commissions)
    await importModel('earning', 'earning.json');
    await importModel('withdrawalAuditLog', 'withdrawalAuditLog.json');
    await importModel('commissionPayment', 'commissionPayment.json');
    await importModel('commissionPaymentOrder', 'commissionPaymentOrder.json');

    // 7. Interactions, AI Chats, Notifications
    await importModel('userInteraction', 'userInteraction.json');
    await importModel('aIChatLog', 'aIChatLog.json');
    await importModel('notificationSetting', 'notificationSetting.json');

    // Re-enable FK checks
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('\n=============================================');
    console.log('   DATA MIGRATION TO MYSQL FINISHED!         ');
    console.log('=============================================\n');
  } catch (e) {
    console.error('Fatal error during migration:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
