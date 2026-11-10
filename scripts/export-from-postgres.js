const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const OUT_DIR = path.join(__dirname, '..', 'pg_backup_data');

async function exportAll() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const models = [
    'user',
    'product',
    'order',
    'customOrder',
    'promotion',
    'promotionProduct',
    'message',
    'earning',
    'commissionPayment',
    'commissionPaymentOrder',
    'withdrawalAuditLog',
    'userInteraction',
    'aIChatLog',
    'alertLog',
    'siteConfig',
    'notificationSetting'
  ];

  const summary = {};

  for (const model of models) {
    try {
      if (prisma[model] && typeof prisma[model].findMany === 'function') {
        const data = await prisma[model].findMany();
        const filePath = path.join(OUT_DIR, `${model}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        summary[model] = data.length;
        console.log(`[EXPORT] ${model}: ${data.length} records exported.`);
      } else {
        console.warn(`[SKIP] ${model} not found on prisma client.`);
      }
    } catch (err) {
      console.error(`[EXPORT ERROR] ${model}:`, err.message);
      summary[model] = `ERROR: ${err.message}`;
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  console.log('\n--- EXPORT COMPLETED ---');
  console.log(JSON.stringify(summary, null, 2));

  await prisma.$disconnect();
}

exportAll().catch(async (e) => {
  console.error('Fatal export error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
