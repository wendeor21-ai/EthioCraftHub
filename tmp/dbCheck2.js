require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const Product = require('../server/models/Product');
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const count = await Product.countDocuments({});
  const vecCount = await Product.countDocuments({ imageFeatureVector: { $exists: true, $not: { $size: 0 } } });
  console.log('Total:', count, 'Vectors:', vecCount);
  process.exit(0);
}
run();
