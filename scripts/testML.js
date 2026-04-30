const { getFeatureVector } = require('./server/utils/imageVector');
const fs = require('fs');
const path = require('path');

async function test() {
  try {
    const imgPath = path.join(__dirname, 'client', 'public', 'images', 'jewelery.jpg');
    if (!fs.existsSync(imgPath)) {
      console.error('Image not found:', imgPath);
      process.exit(1);
    }
    const buffer = fs.readFileSync(imgPath);
    console.log('Extracting vector for jewelery.jpg...');
    const vector = await getFeatureVector(buffer);
    console.log('Vector length:', vector.length);
    console.log('Sample (first 10):', vector.slice(0, 10));
    
    // Check if it's all zeros
    const nonZero = vector.some(v => v !== 0);
    console.log('Has non-zero values:', nonZero);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();
