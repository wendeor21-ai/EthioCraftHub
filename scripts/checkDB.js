require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./server/models/Product');

async function check() {
  try {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/ethiocraft_global";
    console.log('Connecting to:', uri);
    await mongoose.connect(uri);
    
    const count = await Product.countDocuments({});
    console.log('Total products:', count);
    
    const withVectors = await Product.countDocuments({ 
      imageFeatureVector: { $exists: true, $not: { $size: 0 } } 
    });
    console.log('Products with vectors:', withVectors);
    
    if (withVectors > 0) {
      const p = await Product.findOne({ imageFeatureVector: { $exists: true, $not: { $size: 0 } } });
      console.log('Sample product:', p.name);
      console.log('Vector length:', p.imageFeatureVector.length);
      console.log('Sample values:', p.imageFeatureVector.slice(0, 5));
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
