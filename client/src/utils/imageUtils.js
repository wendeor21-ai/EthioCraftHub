/**
 * Image Utility Functions for EthioCraft Global
 *
 * Handles image URL construction and fallbacks
 */

/**
 * Get clean image URL from backend
 * @param {string} imagePath - Image path from database
 * @returns {string} Full image URL or relative path
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  let path = String(imagePath).trim();

  // Strip localhost / 127.0.0.1 origins completely to avoid Mixed Content errors
  if (/^https?:\/\/localhost(:\d+)?/i.test(path)) {
    path = path.replace(/^https?:\/\/localhost(:\d+)?/i, "");
  }
  if (/^https?:\/\/127\.0\.0\.1(:\d+)?/i.test(path)) {
    path = path.replace(/^https?:\/\/127\.0\.0\.1(:\d+)?/i, "");
  }

  // If already an external absolute URL (https://...)
  if (path.startsWith("https://") || (path.startsWith("http://") && !path.includes("localhost"))) {
    return path;
  }

  // Public asset paths
  if (path.startsWith("/images") || path.startsWith("/placeholder") || path.startsWith("/logo")) {
    return path;
  }

  // Uploaded backend files - clean relative path works both in dev (via proxy) and prod (/uploads/...)
  if (path.startsWith("/uploads/")) {
    return path;
  }
  if (path.startsWith("uploads/")) {
    return `/${path}`;
  }

  return `/uploads/${path}`;
};

/**
 * Get product image URL with fallback logic
 * @param {object} product - Product object
 * @param {number} index - Image index (default 0 for primary)
 * @returns {string} Image URL or fallback
 */
export const getProductImageUrl = (product, index = 0) => {
  if (!product) return null;

  // 1. Try to get image from images array
  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    const image = product.images[index] || product.images[0];
    
    if (typeof image === 'string') return getImageUrl(image);
    if (typeof image === 'object' && image !== null) {
      if (image.url) return getImageUrl(image.url);
      // Secondary check for common properties
      if (image.path) return getImageUrl(image.path);
      if (image.src) return getImageUrl(image.src);
    }
  }

  // 2. Try to get image from single image property
  if (product.image) {
    if (typeof product.image === 'string') return getImageUrl(product.image);
    if (typeof product.image === 'object' && product.image.url) {
      return getImageUrl(product.image.url);
    }
  }

  // 3. Try primaryImage virtual (if it was serialized)
  if (product.primaryImage) {
    return getImageUrl(product.primaryImage);
  }

  return null;
};

/**
 * Category-based fallback images
 */
export const categoryFallbacks = {
  Textiles: "/images/shawl.svg",
  Jewelry: "/images/cross-pendant.svg",
  Pottery: "/images/coffee-set.svg",
  Basketry: "/images/basket.svg",
  "Wood Crafts": "/images/wooden-stool.svg",
  "Leather Goods": "/images/leather-bag.svg",
  Leather: "/images/leather-bag.svg",
  Metalwork: "/images/metal-plate.svg",
  Paintings: "/images/icon-painting.svg",
};

/**
 * Get fallback image for a product
 * @param {object} product - Product object
 * @returns {string} Fallback image path
 */
export const getFallbackImage = (product) => {
  if (!product) return "/placeholder-product.svg";

  // Try category-specific fallback
  if (product.category && categoryFallbacks[product.category]) {
    return categoryFallbacks[product.category];
  }

  // Default fallback
  return "/images/gondar_drass1.jpg";
};

/**
 * Get best available image for a product
 * @param {object} product - Product object
 * @returns {string} Best available image URL
 */
export const getBestProductImage = (product) => {
  // Try to get product image from backend
  const productImage = getProductImageUrl(product);
  if (productImage) return productImage;

  // Fall back to category image
  return getFallbackImage(product);
};

export default {
  getImageUrl,
  getProductImageUrl,
  getFallbackImage,
  getBestProductImage,
  categoryFallbacks,
};
