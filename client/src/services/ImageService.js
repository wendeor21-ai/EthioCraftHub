/**
 * Image Service for EthioCraft Global
 * 
 * Centralized service for handling all image-related operations:
 * - Image validation and fallback resolution
 * - Preloading functionality for performance
 * - Timeout handling for failed loads
 * - Integration with ImageAssetRegistry
 */

import imageAssetRegistry from './ImageAssetRegistry';

class ImageService {
  constructor() {
    this.preloadCache = new Map();
    this.loadingPromises = new Map();
    this.defaultTimeout = 5000; // 5 seconds
  }

  /**
   * Validate if an image path exists and is accessible
   * @param {string} imagePath - The image path to validate
   * @returns {Promise<boolean>} True if image is valid and accessible
   */
  async validateImagePath(imagePath) {
    if (!imagePath || typeof imagePath !== 'string') {
      return false;
    }

    // First check if it's in our asset registry
    if (imageAssetRegistry.isAssetAvailable(imagePath)) {
      return true;
    }

    // For external URLs, try to load the image
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      try {
        return await this.preloadImage(imagePath);
      } catch (error) {
        console.warn(`External image validation failed for ${imagePath}:`, error);
        return false;
      }
    }

    return false;
  }

  /**
   * Get a valid image path with fallback resolution
   * @param {string} imagePath - The requested image path
   * @param {string} category - The product category for fallback
   * @returns {string} Valid image path or appropriate fallback
   */
  getValidImagePath(imagePath, category = null) {
    return imageAssetRegistry.getValidImagePath(imagePath, category);
  }

  /**
   * Get fallback image for a specific category
   * @param {string} category - The product category
   * @returns {string} Fallback image path
   */
  getFallbackImage(category) {
    return imageAssetRegistry.getFallbackForCategory(category);
  }

  /**
   * Preload an image for performance optimization
   * @param {string} imagePath - The image path to preload
   * @param {number} timeout - Timeout in milliseconds (default: 5000)
   * @returns {Promise<boolean>} True if image loaded successfully
   */
  async preloadImage(imagePath, timeout = this.defaultTimeout) {
    if (!imagePath) {
      return false;
    }

    // Check cache first
    if (this.preloadCache.has(imagePath)) {
      return this.preloadCache.get(imagePath);
    }

    // Check if already loading
    if (this.loadingPromises.has(imagePath)) {
      return this.loadingPromises.get(imagePath);
    }

    // Create loading promise
    const loadingPromise = new Promise((resolve, reject) => {
      const img = new Image();
      let timeoutId;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        this.loadingPromises.delete(imagePath);
      };

      const onLoad = () => {
        cleanup();
        this.preloadCache.set(imagePath, true);
        resolve(true);
      };

      const onError = () => {
        cleanup();
        this.preloadCache.set(imagePath, false);
        resolve(false);
      };

      const onTimeout = () => {
        cleanup();
        this.preloadCache.set(imagePath, false);
        resolve(false);
      };

      // Set up timeout
      timeoutId = setTimeout(onTimeout, timeout);

      // Set up image loading
      img.onload = onLoad;
      img.onerror = onError;
      img.src = imagePath;
    });

    this.loadingPromises.set(imagePath, loadingPromise);
    return loadingPromise;
  }

  /**
   * Preload multiple images concurrently
   * @param {string[]} imagePaths - Array of image paths to preload
   * @param {number} timeout - Timeout per image in milliseconds
   * @returns {Promise<object>} Object with success/failure counts and results
   */
  async preloadImages(imagePaths, timeout = this.defaultTimeout) {
    if (!Array.isArray(imagePaths) || imagePaths.length === 0) {
      return { successful: 0, failed: 0, results: [] };
    }

    const promises = imagePaths.map(async (path) => {
      try {
        const success = await this.preloadImage(path, timeout);
        return { path, success };
      } catch (error) {
        return { path, success: false, error: error.message };
      }
    });

    const results = await Promise.all(promises);
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    return { successful, failed, results };
  }

  /**
   * Get the best image path for a product with comprehensive fallback logic
   * @param {object} product - The product object
   * @returns {string} Best available image path
   */
  getBestImagePath(product) {
    if (!product) {
      return imageAssetRegistry.defaultFallback;
    }

    // Try to get primary image
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      // Handle array of image objects with url and isPrimary properties
      if (typeof product.images[0] === 'object' && product.images[0].url) {
        // Find primary image first
        const primaryImg = product.images.find(img => img.isPrimary === true);
        const imageUrl = primaryImg ? primaryImg.url : product.images[0].url;
        
        // Validate and return if good
        const validPath = this.getValidImagePath(imageUrl, product.category);
        if (validPath !== imageAssetRegistry.placeholderFallback) {
          return validPath;
        }
      }
      
      // Handle legacy array of strings format
      if (typeof product.images[0] === 'string') {
        const validPath = this.getValidImagePath(product.images[0], product.category);
        if (validPath !== imageAssetRegistry.placeholderFallback) {
          return validPath;
        }
      }
    }

    // Fallback to category-based image
    return this.getFallbackImage(product.category);
  }

  /**
   * Create an optimized image loading configuration
   * @param {string} imagePath - The image path
   * @param {object} options - Loading options
   * @returns {object} Image loading configuration
   */
  createImageConfig(imagePath, options = {}) {
    const {
      lazy = true,
      timeout = this.defaultTimeout,
      fallbackCategory = null,
      alt = '',
      className = ''
    } = options;

    const validPath = this.getValidImagePath(imagePath, fallbackCategory);

    return {
      src: validPath,
      alt: alt || 'Product image',
      className: className,
      loading: lazy ? 'lazy' : 'eager',
      timeout: timeout,
      fallbackSrc: fallbackCategory ? this.getFallbackImage(fallbackCategory) : imageAssetRegistry.defaultFallback,
      isValidPath: imageAssetRegistry.isAssetAvailable(imagePath)
    };
  }

  /**
   * Clear preload cache (useful for memory management)
   * @param {string[]} specificPaths - Optional array of specific paths to clear
   */
  clearPreloadCache(specificPaths = null) {
    if (specificPaths && Array.isArray(specificPaths)) {
      specificPaths.forEach(path => {
        this.preloadCache.delete(path);
        this.loadingPromises.delete(path);
      });
    } else {
      this.preloadCache.clear();
      this.loadingPromises.clear();
    }
  }

  /**
   * Get cache statistics
   * @returns {object} Cache statistics
   */
  getCacheStats() {
    const cacheEntries = Array.from(this.preloadCache.entries());
    const successful = cacheEntries.filter(([, success]) => success).length;
    const failed = cacheEntries.length - successful;

    return {
      totalCached: this.preloadCache.size,
      successful,
      failed,
      currentlyLoading: this.loadingPromises.size
    };
  }

  /**
   * Validate a product's image configuration
   * @param {object} product - The product to validate
   * @returns {object} Validation result
   */
  validateProductImages(product) {
    const result = {
      isValid: true,
      issues: [],
      recommendations: []
    };

    if (!product) {
      result.isValid = false;
      result.issues.push('Product object is required');
      return result;
    }

    if (!product.images || !Array.isArray(product.images) || product.images.length === 0) {
      result.isValid = false;
      result.issues.push('Product must have at least one image');
      result.recommendations.push(`Use category fallback: ${this.getFallbackImage(product.category)}`);
      return result;
    }

    // Validate each image
    product.images.forEach((image, index) => {
      let imagePath;
      
      if (typeof image === 'object' && image.url) {
        imagePath = image.url;
      } else if (typeof image === 'string') {
        imagePath = image;
      } else {
        result.isValid = false;
        result.issues.push(`Image at index ${index} has invalid format`);
        return;
      }

      if (!imageAssetRegistry.isAssetAvailable(imagePath)) {
        result.issues.push(`Image '${imagePath}' at index ${index} does not exist`);
        result.recommendations.push(`Replace with: ${this.getValidImagePath(imagePath, product.category)}`);
      }
    });

    // Check for primary image
    const hasObjectImages = product.images.some(img => typeof img === 'object' && img.url);
    if (hasObjectImages) {
      const primaryImages = product.images.filter(img => img.isPrimary === true);
      if (primaryImages.length === 0) {
        result.recommendations.push('Consider marking one image as primary (isPrimary: true)');
      } else if (primaryImages.length > 1) {
        result.issues.push('Multiple images marked as primary - only one should be primary');
      }
    }

    return result;
  }
}

// Create and export singleton instance
const imageService = new ImageService();

export default imageService;
export { ImageService };