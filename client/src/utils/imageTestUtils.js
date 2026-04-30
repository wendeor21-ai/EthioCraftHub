/**
 * Image Test Utilities for EthioCraft Global
 * 
 * Utility functions to test and validate image loading
 */

/**
 * Test if an image can be loaded
 * @param {string} imagePath - Path to the image
 * @returns {Promise<boolean>} True if image loads successfully
 */
export const testImageLoad = (imagePath) => {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      console.log(`✅ Image loaded successfully: ${imagePath}`);
      resolve(true);
    };
    
    img.onerror = () => {
      console.warn(`❌ Image failed to load: ${imagePath}`);
      resolve(false);
    };
    
    img.src = imagePath;
  });
};

/**
 * Test all Ethiopian craft images
 * @returns {Promise<object>} Test results
 */
export const testAllImages = async () => {
  const imagePaths = [
    '/images/basket.svg',
    '/images/coffee-set.svg',
    '/images/cross-pendant.svg',
    '/images/gondar_drass1.jpg',
    '/images/icon-painting.svg',
    '/images/leather-bag.svg',
    '/images/metal-plate.svg',
    '/images/shawl.svg',
    '/images/wooden-stool.svg',
    '/placeholder-product.svg'
  ];

  console.log('🧪 Testing Ethiopian craft images...');
  
  const results = await Promise.all(
    imagePaths.map(async (path) => {
      const success = await testImageLoad(path);
      return { path, success };
    })
  );

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success);

  console.log(`📊 Image test results: ${successful}/${results.length} images loaded successfully`);
  
  if (failed.length > 0) {
    console.warn('❌ Failed images:', failed.map(f => f.path));
  }

  return {
    total: results.length,
    successful,
    failed: failed.length,
    failedImages: failed.map(f => f.path),
    results
  };
};

export default {
  testImageLoad,
  testAllImages
};