/**
 * Recommendation Controller for EthioCraft Global
 * 
 * Provides personalized product recommendations based on:
 * - Search history
 * - Viewed products
 * - Comment/review interactions
 * - Category preferences
 * - User behavior patterns
 */

const User = require('../models/User');
const Product = require('../models/Product');

/**
 * Get personalized recommendations for user
 * @route GET /api/products/recommendations
 * @access Private
 */
exports.getRecommendations = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 12;

    console.log('🎯 Getting recommendations for user:', userId);

    // Get user with preferences
    const user = await User.findById(userId).select('preferences');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize recommendation scoring
    const productScores = new Map();
    const categoryWeights = user.preferences?.categoryWeights || new Map();
    const searchHistory = user.preferences?.searchHistory || [];
    const viewedProducts = user.preferences?.viewedProducts || [];

    console.log('📊 User data:', {
      searchHistoryCount: searchHistory.length,
      viewedProductsCount: viewedProducts.length,
      categoryWeights: Object.fromEntries(categoryWeights)
    });

    // Strategy 1: Search-based recommendations
    if (searchHistory.length > 0) {
      // Get recent searches (last 10)
      const recentSearches = searchHistory
        .slice(-10)
        .map(s => s.query)
        .filter(q => q && q.length > 0);

      console.log('🔍 Recent searches:', recentSearches);

      if (recentSearches.length > 0) {
        // Build search query
        const searchRegex = recentSearches.map(q => new RegExp(q, 'i'));
        
        const searchBasedProducts = await Product.find({
          status: 'active',
          $or: [
            { name: { $in: searchRegex } },
            { description: { $in: searchRegex } },
            { category: { $in: searchRegex } },
            { tags: { $in: recentSearches } }
          ]
        }).limit(20);

        console.log('📦 Search-based products found:', searchBasedProducts.length);

        // Score search-based products
        searchBasedProducts.forEach(product => {
          const score = productScores.get(product._id.toString()) || 0;
          productScores.set(product._id.toString(), score + 3); // High weight for search matches
        });
      }
    }

    // Strategy 2: View history-based recommendations
    if (viewedProducts.length > 0) {
      // Get recently viewed product IDs
      const viewedProductIds = viewedProducts
        .slice(-10)
        .map(v => v.product)
        .filter(id => id);

      console.log('👁️ Recently viewed products:', viewedProductIds.length);

      if (viewedProductIds.length > 0) {
        // Get viewed products to extract categories and tags
        const viewedProductDetails = await Product.find({
          _id: { $in: viewedProductIds }
        }).select('category tags');

        const categories = [...new Set(viewedProductDetails.map(p => p.category))];
        const tags = [...new Set(viewedProductDetails.flatMap(p => p.tags || []))];

        console.log('📂 Extracted categories:', categories);
        console.log('🏷️ Extracted tags:', tags);

        // Find similar products
        const similarProducts = await Product.find({
          status: 'active',
          _id: { $nin: viewedProductIds }, // Exclude already viewed
          $or: [
            { category: { $in: categories } },
            { tags: { $in: tags } }
          ]
        }).limit(20);

        console.log('📦 Similar products found:', similarProducts.length);

        // Score similar products
        similarProducts.forEach(product => {
          const score = productScores.get(product._id.toString()) || 0;
          productScores.set(product._id.toString(), score + 2); // Medium weight for similar products
        });
      }
    }

    // Strategy 3: Category weight-based recommendations
    if (categoryWeights.size > 0) {
      console.log('⚖️ Using category weights');

      // Get top weighted categories
      const topCategories = Array.from(categoryWeights.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category]) => category);

      console.log('🎯 Top categories:', topCategories);

      if (topCategories.length > 0) {
        const categoryBasedProducts = await Product.find({
          status: 'active',
          category: { $in: topCategories }
        }).limit(20);

        console.log('📦 Category-based products found:', categoryBasedProducts.length);

        // Score category-based products with weight
        categoryBasedProducts.forEach(product => {
          const score = productScores.get(product._id.toString()) || 0;
          const categoryWeight = categoryWeights.get(product.category) || 1;
          productScores.set(product._id.toString(), score + categoryWeight);
        });
      }
    }

    // Strategy 4: Fallback to popular products if no personalization data
    if (productScores.size === 0) {
      console.log('📊 No personalization data, using popular products');

      const popularProducts = await Product.find({
        status: 'active'
      })
        .sort({ 'metrics.purchases': -1, 'metrics.views': -1 })
        .limit(limit);

      console.log('📦 Popular products found:', popularProducts.length);

      return res.status(200).json({
        success: true,
        data: popularProducts,
        message: 'Showing popular products'
      });
    }

    // Get top scored products
    const topProductIds = Array.from(productScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    console.log('🏆 Top product IDs:', topProductIds.length);

    // Fetch full product details
    const recommendations = await Product.find({
      _id: { $in: topProductIds }
    })
      .populate('artisan', 'profile.firstName profile.lastName')
      .lean();

    // Sort by score
    recommendations.sort((a, b) => {
      const scoreA = productScores.get(a._id.toString()) || 0;
      const scoreB = productScores.get(b._id.toString()) || 0;
      return scoreB - scoreA;
    });

    console.log('✅ Recommendations generated:', recommendations.length);

    res.status(200).json({
      success: true,
      data: recommendations,
      message: 'Personalized recommendations'
    });

  } catch (error) {
    console.error('❌ Get recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendations',
      error: error.message
    });
  }
};

/**
 * Track search query
 * @route POST /api/users/track-search
 * @access Private
 */
exports.trackSearch = async (req, res) => {
  try {
    const userId = req.user._id;
    const { query } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    console.log('🔍 Tracking search:', query, 'for user:', userId);

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize preferences if not exists
    if (!user.preferences) {
      user.preferences = {};
    }
    if (!user.preferences.searchHistory) {
      user.preferences.searchHistory = [];
    }

    // Add search to history (keep last 50)
    user.preferences.searchHistory.push({
      query: query.trim(),
      timestamp: new Date()
    });

    // Keep only last 50 searches
    if (user.preferences.searchHistory.length > 50) {
      user.preferences.searchHistory = user.preferences.searchHistory.slice(-50);
    }

    await user.save();

    console.log('✅ Search tracked successfully');

    res.status(200).json({
      success: true,
      message: 'Search tracked successfully'
    });

  } catch (error) {
    console.error('❌ Track search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track search',
      error: error.message
    });
  }
};

/**
 * Track product view
 * @route POST /api/users/track-view
 * @access Private
 */
exports.trackView = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    console.log('👁️ Tracking view:', productId, 'for user:', userId);

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize preferences if not exists
    if (!user.preferences) {
      user.preferences = {};
    }
    if (!user.preferences.viewedProducts) {
      user.preferences.viewedProducts = [];
    }

    // Remove if already viewed (to update timestamp)
    user.preferences.viewedProducts = user.preferences.viewedProducts.filter(
      v => v.product.toString() !== productId
    );

    // Add to viewed products
    user.preferences.viewedProducts.push({
      product: productId,
      viewedAt: new Date()
    });

    // Keep only last 50 viewed products
    if (user.preferences.viewedProducts.length > 50) {
      user.preferences.viewedProducts = user.preferences.viewedProducts.slice(-50);
    }

    await user.save();

    console.log('✅ View tracked successfully');

    res.status(200).json({
      success: true,
      message: 'View tracked successfully'
    });

  } catch (error) {
    console.error('❌ Track view error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track view',
      error: error.message
    });
  }
};

/**
 * Update category weight (called when user comments/reviews)
 * @route POST /api/users/update-category-weight
 * @access Private
 */
exports.updateCategoryWeight = async (req, res) => {
  try {
    const userId = req.user._id;
    const { category, weight = 1 } = req.body;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }

    console.log('⚖️ Updating category weight:', category, weight, 'for user:', userId);

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize preferences if not exists
    if (!user.preferences) {
      user.preferences = {};
    }
    if (!user.preferences.categoryWeights) {
      user.preferences.categoryWeights = new Map();
    }

    // Update category weight
    const currentWeight = user.preferences.categoryWeights.get(category) || 0;
    user.preferences.categoryWeights.set(category, currentWeight + weight);

    await user.save();

    console.log('✅ Category weight updated successfully');

    res.status(200).json({
      success: true,
      message: 'Category weight updated successfully'
    });

  } catch (error) {
    console.error('❌ Update category weight error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category weight',
      error: error.message
    });
  }
};

module.exports = exports;
