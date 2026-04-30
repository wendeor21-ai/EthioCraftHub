require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const axios = require('axios');
const Product = require('../server/models/Product');
const { getFeatureVector } = require('../server/utils/imageVector');

async function indexProductVectors() {
  try {
    // Determine the environment URI
    const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ethiocraft";
    await mongoose.connect(uri);
    console.log('[Indexer] Connected to MongoDB');

    // Fetch ALL products - we force re-index to ensure vectors are normalized
    const products = await Product.find({});
    console.log(`[Indexer] Found ${products.length} total products. Force re-indexing ALL to ensure normalized vectors.`);

    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    for (const product of products) {
      const imageUrl = product.images && product.images[0] && product.images[0].url;
      if (!imageUrl || imageUrl.startsWith('blob:')) {
        console.log(`[Indexer] ⚠️  Skipping "${product.name}" — no valid image URL.`);
        skipCount++;
        continue;
      }

      console.log(`[Indexer] Processing "${product.name}" ...`);
      try {
        let imageBuffer;
        if (imageUrl.startsWith('http')) {
          // Download the image
          const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
          imageBuffer = Buffer.from(response.data);
        } else {
          // Resolve local path relative to client/public
          const fs = require('fs');
          const path = require('path');
          const cleanPath = imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl;
          const localPath = path.join(__dirname, '..', 'client', 'public', cleanPath);
          
          if (fs.existsSync(localPath)) {
            imageBuffer = fs.readFileSync(localPath);
            console.log(`[Indexer]   ↳ Loaded local image: ${localPath}`);
          } else {
            // Try uploads directory as fallback
            const uploadsPath = path.join(__dirname, '..', 'uploads', cleanPath.replace(/^uploads[\\/]/, ''));
            if (fs.existsSync(uploadsPath)) {
              imageBuffer = fs.readFileSync(uploadsPath);
              console.log(`[Indexer]   ↳ Loaded from uploads: ${uploadsPath}`);
            } else {
              console.log(`[Indexer] ⚠️  Skipping "${product.name}" — local image not found: ${localPath}`);
              skipCount++;
              continue;
            }
          }
        }

        // getFeatureVector now returns a normalized vector
        const vector = await getFeatureVector(imageBuffer);
        const vectorArray = Array.from(vector);
        
        await Product.updateOne(
          { _id: product._id },
          { $set: { imageFeatureVector: vectorArray } }
        );
        console.log(`[Indexer] ✅ Indexed "${product.name}" — vector length: ${vectorArray.length}`);
        successCount++;
      } catch (err) {
        console.error(`[Indexer] ❌ Failed to process "${product.name}":`, err.message);
        failCount++;
      }
    }

    const finalCount = await Product.countDocuments({
      imageFeatureVector: { $exists: true, $not: { $size: 0 } }
    });
    
    console.log('\n[Indexer] ═══════════════════════════════════════');
    console.log(`[Indexer] Indexing complete!`);
    console.log(`[Indexer]   ✅ Indexed:  ${successCount}`);
    console.log(`[Indexer]   ⚠️  Skipped:  ${skipCount}`);
    console.log(`[Indexer]   ❌ Failed:   ${failCount}`);
    console.log(`[Indexer]   📊 Total products with vectors in DB: ${finalCount}`);
    console.log('[Indexer] ═══════════════════════════════════════\n');
    process.exit(0);
  } catch (e) {
    console.error('[Indexer] Fatal error:', e);
    process.exit(1);
  }
}

indexProductVectors();
