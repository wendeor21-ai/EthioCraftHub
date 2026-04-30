/**
 * Image Utility Functions for EthioCraft Global
 *
 * Handles image URL construction and fallbacks
 */

const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const API_BASE_URL = apiUrl.replace(/\/api\/?$/, "");

/**
 * Get full image URL from backend
 * @param {string} imagePath - Image path from database
 * @returns {string} Full image URL
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;

  // If already a full URL, return as is
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  // If starts with /images, it's stored in the client public folder – return the path directly
  // (the browser will load from /images/… relative to the app).
  if (imagePath.startsWith("/images")) {
    return imagePath;
  }

  // If starts with /placeholder, it's also a public path – return as is
  if (imagePath.startsWith("/placeholder")) {
    return imagePath;
  }

  // If starts with /uploads, prepend API base URL (these are files stored by our backend)
  if (imagePath.startsWith("/uploads")) {
    return `${API_BASE_URL}${imagePath}`;
  }

  // If starts with uploads (no slash), add slash and prepend
  if (imagePath.startsWith("uploads")) {
    return `${API_BASE_URL}/${imagePath}`;
  }

  // For any other path, assume it's in uploads folder on backend
  return `${API_BASE_URL}/uploads/${imagePath}`;
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
