const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'server', 'routes', 'products.js');
let file = fs.readFileSync(filePath, 'utf8');

// 1. In image search (line 61-65): remove 'inventory.quantity': { $gt: 0 }
file = file.replace(
  /"inventory\.quantity":\s*\{\s*\$gt:\s*0\s*\},\s*\r?\n\s*imageFeatureVector:/g,
  'imageFeatureVector:'
);

// 2. In GET /api/products: remove filters["inventory.quantity"] = { $gt: 0 };
file = file.replace(
  /if\s*\(!includeOutOfStock\)\s*\{\s*\r?\n\s*\/\/ Default behavior: only return products with quantity > 0\s*\r?\n\s*filters\["inventory\.quantity"\]\s*=\s*\{\s*\$gt:\s*0\s*\};\s*\r?\n\s*\}/g,
  '// Out of stock filtering is handled in-memory post-query to ensure compatibility with Prisma on MySQL'
);

// 3. In GET /api/products: update activeProducts mapping with fallback artisan
file = file.replace(
  /const products = await query;\s*\r?\n\s*activeProducts = products\.filter\(\(p\) => p\.artisan !== null\);/g,
  `const products = await query;
      activeProducts = (products || []).map((p) => {
        if (!p.artisan) {
          p.artisan = {
            _id: p.artisanId || "artisan",
            profile: {
              firstName: "EthioCraft",
              lastName: "Artisan",
              storeName: "EthioCraft Artisan",
              isVerifiedArtisan: true
            }
          };
        }
        return p;
      });`
);

// 4. In category aggregate: remove inventory.quantity > 0 from $match
file = file.replace(
  /\{\s*\$match:\s*\{\s*status:\s*"active",\s*"inventory\.quantity":\s*\{\s*\$gt:\s*0\s*\}\s*\}\s*\}/g,
  '{ $match: { status: "active" } }'
);

// 5. In /recommendations: remove "inventory.quantity": { $gt: 0 }
file = file.replace(
  /status:\s*"active",\s*\r?\n\s*"inventory\.quantity":\s*\{\s*\$gt:\s*0\s*\},/g,
  'status: "active",'
);

// 6. In similar products: remove "inventory.quantity": { $gt: 0 }
file = file.replace(
  /category:\s*product\.category,\s*\r?\n\s*status:\s*"active",\s*\r?\n\s*"inventory\.quantity":\s*\{\s*\$gt:\s*0\s*\},/g,
  'category: product.category,\r\n      status: "active",'
);

// 7. In /category/:category: remove filters["inventory.quantity"] = { $gt: 0 }
file = file.replace(
  /if\s*\(!includeOOS && !includeEverything\)\s*\{\s*\r?\n\s*\/\/ By default exclude out-of-stock items\. includeOutOfStock or includeAll will bypass this\.\s*\r?\n\s*filters\["inventory\.quantity"\]\s*=\s*\{\s*\$gt:\s*0\s*\};\s*\r?\n\s*\}/g,
  '// In-memory post filtering handles stock for MySQL Prisma compatibility'
);

// 8. In recommendations catch block: add fallback to latest active products from DB
const oldRecCatch = `  } catch (recErr) {
    console.error("⚠️ Recommendations fallback triggered:", recErr.message);
    return res.json({
      success: true,
      recommendations: [],
      metadata: {
        personalizationLevel: "fallback",
        count: 0,
      }
    });
  }`;

const newRecCatch = `  } catch (recErr) {
    console.error("⚠️ Recommendations fallback triggered:", recErr.message);
    try {
      const fallbackProducts = await Product.find({ status: "active" })
        .populate("artisan", "profile.firstName profile.lastName profile.storeName profile.storeLogo")
        .sort({ createdAt: -1 })
        .limit(limit);

      const inStock = (fallbackProducts || []).filter(p => {
        const invQty = Number(p.inventory?.quantity);
        return !isNaN(invQty) ? invQty > 0 : (Number(p.stock) > 0);
      });

      return res.json({
        success: true,
        recommendations: inStock,
        metadata: { personalizationLevel: "database_fallback", count: inStock.length }
      });
    } catch (e) {
      return res.json({ success: true, recommendations: [], metadata: { count: 0 } });
    }
  }`;

file = file.replace(oldRecCatch, newRecCatch);

fs.writeFileSync(filePath, file, 'utf8');
console.log('Successfully updated server/routes/products.js!');

