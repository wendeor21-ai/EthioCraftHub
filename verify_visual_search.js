const fs = require('fs');
const path = require('path');
const { getFeatureVector } = require('./server/utils/imageVector');

async function testProcessing() {
  const imageDir = path.join(__dirname, 'server', 'public', 'images');
  const samples = [
    'Artisan_Leather_Messenger_Bag.jpg',
    'Colorful_Decorative_Mesob.jpg'
  ];

  console.log('🧪 Starting Visual Search Verification...');

  for (const sample of samples) {
    const filePath = path.join(imageDir, sample);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Sample not found: ${sample}`);
      continue;
    }

    const buffer = fs.readFileSync(filePath);
    console.log(`📸 Processing ${sample} (${buffer.length} bytes)...`);

    try {
      const startTime = Date.now();
      const vector = await getFeatureVector(buffer);
      const duration = Date.now() - startTime;
      
      console.log(`✅ Success! Vector length: ${vector.length}, Time: ${duration}ms`);
      if (vector.length !== 1024) {
        console.warn(`⚠️  Unexpected vector length: ${vector.length} (Expected 1024 for MobileNet V2)`);
      }
    } catch (err) {
      console.error(`❌ Failed processing ${sample}:`, err.message);
    }
  }

  process.exit(0);
}

testProcessing();
