require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const Product = require('../server/models/Product');
async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ethiocraft');
  const products = await Product.find({ imageFeatureVector: { $exists: true } }).limit(5);
  for(const p of products) {
    console.log(p.name, p.category, p.imageFeatureVector.slice(0, 5));
  }
  process.exit(0);
}
run();
