/**
 * Tracking Utilities for EthioCraft Global
 * 
 * Helper functions to track user behavior for personalized recommendations
 */

/**
 * Track search query
 * @param {string} query - Search query string
 */
export const trackSearch = async (query) => {
  try {
    const token = localStorage.getItem('authToken');
    
    if (!token || !query || query.trim().length === 0) {
      return;
    }

    await fetch('/api/recommendations/track-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ query: query.trim() })
    });

    console.log('🔍 Search tracked:', query);
  } catch (error) {
    console.error('Failed to track search:', error);
    // Fail silently - don't disrupt user experience
  }
};

/**
 * Track product view
 * @param {string} productId - Product ID
 */
export const trackProductView = async (productId) => {
  try {
    const token = localStorage.getItem('authToken');
    
    if (!token || !productId) {
      return;
    }

    await fetch('/api/recommendations/track-view', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ productId })
    });

    console.log('👁️ Product view tracked:', productId);
  } catch (error) {
    console.error('Failed to track product view:', error);
    // Fail silently - don't disrupt user experience
  }
};

/**
 * Update category weight (called when user comments/reviews)
 * @param {string} category - Product category
 * @param {number} weight - Weight to add (default: 1)
 */
export const updateCategoryWeight = async (category, weight = 1) => {
  try {
    const token = localStorage.getItem('authToken');
    
    if (!token || !category) {
      return;
    }

    await fetch('/api/recommendations/update-category-weight', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ category, weight })
    });

    console.log('⚖️ Category weight updated:', category, weight);
  } catch (error) {
    console.error('Failed to update category weight:', error);
    // Fail silently - don't disrupt user experience
  }
};

/**
 * Debounce function to limit API calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};
