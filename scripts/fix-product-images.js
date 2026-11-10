require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const CLIENT_IMAGES_DIR = path.join(__dirname, '..', 'client', 'public', 'images');
const SERVER_UPLOADS_DIR = path.join(__dirname, '..', 'server', 'uploads');

if (!fs.existsSync(SERVER_UPLOADS_DIR)) {
  fs.mkdirSync(SERVER_UPLOADS_DIR, { recursive: true });
}

// Map each product ID to its clean images array
const PRODUCT_IMAGE_MAPPINGS = {
  '6984d07e3fde5570a4137059': [
    { url: '/images/jewelery.jpg', isPrimary: true }
  ],
  '6985ef7ab48db5a16687553c': [
    { url: '/images/Lalibela_Cross_Pendant.jpg', isPrimary: true }
  ],
  '698602fef0cc2558ff6a15f7': [
    { url: '/images/Colorful_Decorative_Mesob.jpg', isPrimary: true }
  ],
  '698605f5f0cc2558ff6a1606': [
    { url: '/images/Handwove_Basket.jpg', isPrimary: true }
  ],
  '6997c4a20a0ac0c6c3e29031': [
    { url: '/images/Premium Hand-Woven Ethiopian Dress (ጥበብ).jpg', isPrimary: true }
  ],
  '69b36dde8845b1293c3712b2': [
    { url: '/images/የንግስት ሳባ ጥበብ ቀሚስ.png', isPrimary: true }
  ],
  '69b3731270da081915d643d5': [
    { url: '/images/የሐረር ቅርጫት.jpg', isPrimary: true }
  ],
  '69b3755e99b3f0ab5a678936': [
    { url: '/images/የአክሱም መስቀል ሀብል.jpg', isPrimary: true }
  ],
  '69b37748f49fcffb59c0a889': [
    { url: '/images/የቆዳ ላፕቶፕ ኬዝ.jpg', isPrimary: true }
  ],
  '69b7c519ca79b023a1bbf007': [
    { url: '/images/በባህላዊ ጥበብ የተሰራ የቆዳ ጫማ.jpg', isPrimary: true }
  ],
  '69d77f5cddbab7c73b474871': [
    { url: "images/Men's Cotton Shirt.jpg".startsWith('/') ? "images/Men's Cotton Shirt.jpg" : "/images/Men's Cotton Shirt.jpg", isPrimary: true }
  ],
  '69f25665d4249c49299bedbf': [
    { url: '/images/c46b2b31-0706-4997-ae0a-410456a5c2ff.png', isPrimary: true, viewType: 'general' },
    { url: '/images/backT.png', isPrimary: false, viewType: 'general' }
  ],
  '7e07caa2dc14f056c7bd7298': [
    { url: '/images/Gondar_Style_Embroidered_Dress.jpg', isPrimary: true }
  ]
};

// Also create aliases in server/uploads/ for legacy upload paths
const LEGACY_ALIASES = {
  '1771553954830_Premium_Hand-Woven_Ethiopian_Dress____________.jpg': 'Premium Hand-Woven Ethiopian Dress (ጥበብ).jpg',
  '1773366749900___________________________________________.png': 'የንግስት ሳባ ጥበብ ቀሚስ.png',
  '1773368082203__________________________.jpg': 'የሐረር ቅርጫት.jpg',
  '1773368669929_______________________________________.jpg': 'የአክሱም መስቀል ሀብል.jpg',
  '1773369095295______________________________.jpg': 'የቆዳ ላፕቶፕ ኬዝ.jpg',
  '1773651225296________________________________________________________.jpg': 'በባህላዊ ጥበብ የተሰራ የቆዳ ጫማ.jpg',
  '1775730524270_Men_s_Cotton_Shirt.jpg': "Men's Cotton Shirt.jpg",
  '1777489509803_c46b2b31-0706-4997-ae0a-410456a5c2ff.png': 'c46b2b31-0706-4997-ae0a-410456a5c2ff.png',
  '1777489509841_backT.png': 'backT.png',
  '1785369434650_FB_IMG_1677321575596.jpg': 'Gondar_Style_Embroidered_Dress.jpg',
  '1785369434659_FB_IMG_1677321575596.jpg': 'Gondar_Style_Embroidered_Dress.jpg'
};

async function fixImages() {
  console.log('1. Copying images and setting up aliases in server/uploads...');
  
  // Copy all files from client/public/images into server/uploads
  if (fs.existsSync(CLIENT_IMAGES_DIR)) {
    const files = fs.readdirSync(CLIENT_IMAGES_DIR);
    for (const file of files) {
      const src = path.join(CLIENT_IMAGES_DIR, file);
      const dest = path.join(SERVER_UPLOADS_DIR, file);
      if (fs.statSync(src).isFile()) {
        fs.copyFileSync(src, dest);
      }
    }
    console.log(`  ✔ Copied ${files.length} image files to server/uploads/`);
  }

  // Create legacy upload alias files
  for (const [aliasName, originalName] of Object.entries(LEGACY_ALIASES)) {
    const src = path.join(CLIENT_IMAGES_DIR, originalName);
    const dest = path.join(SERVER_UPLOADS_DIR, aliasName);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`  ✔ Created alias: ${aliasName} -> ${originalName}`);
    } else {
      console.warn(`  ⚠️ Source not found: ${src}`);
    }
  }

  console.log('\n2. Updating Product images in MySQL database...');
  for (const [productId, images] of Object.entries(PRODUCT_IMAGE_MAPPINGS)) {
    try {
      const updated = await prisma.product.update({
        where: { id: productId },
        data: { images }
      });
      console.log(`  ✔ Updated product "${updated.name}" with images:`, images.map(i => i.url));
    } catch (e) {
      console.error(`  ❌ Error updating product ${productId}:`, e.message);
    }
  }

  console.log('\n3. Verifying that all images exist on disk...');
  for (const [productId, images] of Object.entries(PRODUCT_IMAGE_MAPPINGS)) {
    for (const img of images) {
      const filename = img.url.replace('/images/', '');
      const clientPath = path.join(CLIENT_IMAGES_DIR, filename);
      const serverPath = path.join(SERVER_UPLOADS_DIR, filename);
      const existsClient = fs.existsSync(clientPath);
      const existsServer = fs.existsSync(serverPath);
      console.log(`  [${existsClient && existsServer ? 'OK' : 'MISSING'}] ${filename} (Client: ${existsClient}, Server: ${existsServer})`);
    }
  }

  await prisma.$disconnect();
  console.log('\n✅ All product image mappings fixed successfully!');
}

fixImages().catch(async (e) => {
  console.error('Fatal error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
