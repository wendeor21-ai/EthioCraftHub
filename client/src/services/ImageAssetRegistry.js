/**
 * Image Asset Registry for EthioCraft Global
 * 
 * Centralized registry for managing product image assets with:
 * - Available assets mapping
 * - Category-based fallback resolution
 * - Asset validation functions
 * - Consistent naming convention enforcement
 */

class ImageAssetRegistry {
  constructor() {
    // Available image assets in the public/images directory
    this.availableAssets = [
      '/images/basket.svg',
      '/images/coffee-set.svg',
      '/images/cross-pendant.svg',
      '/images/gondar_drass1.jpg',
      '/images/icon-painting.svg',
      '/images/leather-bag.svg',
      '/images/metal-plate.svg',
      '/images/shawl.svg',
      '/images/wooden-stool.svg'
    ];

    // Category-based fallback mapping
    this.categoryFallbacks = {
      'Textiles': '/images/shawl.svg',
      'Jewelry': '/images/cross-pendant.svg',
      'Pottery': '/images/coffee-set.svg',
      'Basketry': '/images/basket.svg',
      'Wood Crafts': '/images/wooden-stool.svg',
      'Leather Goods': '/images/leather-bag.svg',
      'Metalwork': '/images/metal-plate.svg',
      'Paintings': '/images/icon-painting.svg'
    };

    // Default fallback for unknown categories
    this.defaultFallback = '/images/gondar_drass1.jpg';

    // Placeholder fallback for complete failures
    this.placeholderFallback = '/placeholder-product.svg';
  }

  /**
   * Check if an asset path exists in the registry
   * @param {string} assetPath - The image path to validate
   * @returns {boolean} True if asset exists, false otherwise
   */
  isAssetAvailable(assetPath) {
    if (!assetPath || typeof assetPath !== 'string') {
      return false;
    }

    // Normalize path to ensure it starts with /
    const normalizedPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
    
    return this.availableAssets.includes(normalizedPath);
  }

  /**
   * Get fallback image for a specific product category
   * @param {string} category - The product category
   * @returns {string} Fallback image path for the category
   */
  getFallbackForCategory(category) {
    if (!category || typeof category !== 'string') {
      return this.defaultFallback;
    }

    const fallback = this.categoryFallbacks[category];
    return fallback || this.defaultFallback;
  }

  /**
   * Get a valid image path, with fallback resolution
   * @param {string} imagePath - The requested image path
   * @param {string} category - The product category for fallback
   * @returns {string} Valid image path or appropriate fallback
   */
  getValidImagePath(imagePath, category = null) {
    // If image path is valid, return it
    if (this.isAssetAvailable(imagePath)) {
      return imagePath;
    }

    // Try category-based fallback
    if (category) {
      const categoryFallback = this.getFallbackForCategory(category);
      if (this.isAssetAvailable(categoryFallback)) {
        return categoryFallback;
      }
    }

    // Use default fallback
    if (this.isAssetAvailable(this.defaultFallback)) {
      return this.defaultFallback;
    }

    // Last resort - placeholder
    return this.placeholderFallback;
  }

  /**
   * Validate image path format and naming convention
   * @param {string} imagePath - The image path to validate
   * @returns {object} Validation result with isValid and errors
   */
  validateImagePath(imagePath) {
    const result = {
      isValid: true,
      errors: []
    };

    if (!imagePath || typeof imagePath !== 'string') {
      result.isValid = false;
      result.errors.push('Image path must be a non-empty string');
      return result;
    }

    // Check if path starts with /images/
    if (!imagePath.startsWith('/images/')) {
      result.isValid = false;
      result.errors.push('Image path must start with /images/');
    }

    // Check file extension
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
    const hasValidExtension = validExtensions.some(ext => 
      imagePath.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      result.isValid = false;
      result.errors.push(`Image must have valid extension: ${validExtensions.join(', ')}`);
    }

    // Check naming convention (kebab-case)
    const filename = imagePath.split('/').pop().split('.')[0];
    const kebabCasePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    
    if (!kebabCasePattern.test(filename)) {
      result.isValid = false;
      result.errors.push('Filename should follow kebab-case convention (lowercase, hyphens only)');
    }

    return result;
  }

  /**
   * Get all available assets
   * @returns {string[]} Array of available asset paths
   */
  getAllAssets() {
    return [...this.availableAssets];
  }

  /**
   * Get all category fallbacks
   * @returns {object} Category fallback mapping
   */
  getCategoryFallbacks() {
    return { ...this.categoryFallbacks };
  }

  /**
   * Validate registry integrity
   * @returns {object} Validation result with any issues found
   */
  validateRegistryIntegrity() {
    const result = {
      isValid: true,
      issues: []
    };

    // Check that all category fallbacks reference existing assets
    Object.entries(this.categoryFallbacks).forEach(([category, fallbackPath]) => {
      if (!this.isAssetAvailable(fallbackPath)) {
        result.isValid = false;
        result.issues.push(`Category '${category}' fallback '${fallbackPath}' does not exist`);
      }
    });

    // Check that default fallback exists
    if (!this.isAssetAvailable(this.defaultFallback)) {
      result.isValid = false;
      result.issues.push(`Default fallback '${this.defaultFallback}' does not exist`);
    }

    // Check for duplicate assets
    const duplicates = this.availableAssets.filter((item, index) => 
      this.availableAssets.indexOf(item) !== index
    );
    
    if (duplicates.length > 0) {
      result.isValid = false;
      result.issues.push(`Duplicate assets found: ${duplicates.join(', ')}`);
    }

    return result;
  }

  /**
   * Add a new asset to the registry
   * @param {string} assetPath - The asset path to add
   * @returns {boolean} True if added successfully, false if already exists
   */
  addAsset(assetPath) {
    if (this.isAssetAvailable(assetPath)) {
      return false; // Already exists
    }

    const validation = this.validateImagePath(assetPath);
    if (!validation.isValid) {
      throw new Error(`Invalid asset path: ${validation.errors.join(', ')}`);
    }

    this.availableAssets.push(assetPath);
    return true;
  }

  /**
   * Remove an asset from the registry
   * @param {string} assetPath - The asset path to remove
   * @returns {boolean} True if removed successfully, false if not found
   */
  removeAsset(assetPath) {
    const index = this.availableAssets.indexOf(assetPath);
    if (index === -1) {
      return false; // Not found
    }

    // Check if this asset is used as a fallback
    const isUsedAsFallback = Object.values(this.categoryFallbacks).includes(assetPath) ||
                            this.defaultFallback === assetPath;

    if (isUsedAsFallback) {
      throw new Error(`Cannot remove asset '${assetPath}' as it is used as a fallback`);
    }

    this.availableAssets.splice(index, 1);
    return true;
  }
}

// Create and export singleton instance
const imageAssetRegistry = new ImageAssetRegistry();

export default imageAssetRegistry;
export { ImageAssetRegistry };