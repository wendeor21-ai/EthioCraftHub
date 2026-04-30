/**
 * AI Routes for EthioCraft Global
 * 
 * Handles AI-powered features:
 * - Product recommendations
 * - Search enhancement
 * - Cultural context analysis
 * - User preference learning
 */

const express = require('express');
const { query, validationResult } = require('express-validator');
const Product = require('../models/Product');
const UserInteraction = require('../models/UserInteraction');
const { 
  authenticate, 
  optionalAuth 
} = require('../middleware/auth');
const { 
  asyncHandler 
} = require('../middleware/errorHandler');
const { logAIOperation } = require('../middleware/logger');

const router = express.Router();

/**
 * @route   GET /api/ai/recommendations
 * @desc    Get AI-powered product recommendations
 * @access  Public (enhanced with authentication)
 */
router.get('/recommendations', optionalAuth, [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('category')
    .optional()
    .isIn(['Textiles', 'Leather', 'Basketry', 'Jewelry'])
    .withMessage('Invalid category'),
  query('excludeViewed')
    .optional()
    .isBoolean()
    .withMessage('excludeViewed must be a boolean')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Invalid recommendation parameters',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }

  const startTime = Date.now();
  const { 
    limit = 10, 
    category, 
    excludeViewed = false 
  } = req.query;
  
  const userId = req.user?._id;
  let recommendations = [];
  let strategy = 'popular'; // Default strategy

  try {
    if (userId) {
      // Personalized recommendations for authenticated users
      const userPreferences = await UserInteraction.getUserPreferences(userId);
      
      if (userPreferences.length > 0) {
        strategy = 'personalized';
        
        // Get user's viewed products if excluding them
        let excludedProductIds = [];
        if (excludeViewed) {
          const viewedProducts = await UserInteraction.find({
            user: userId,
            interactionType: 'view'
          }).distinct('product');
          excludedProductIds = viewedProducts;
        }

        // Build recommendation query based on user preferences
        const preferredCategories = userPreferences
          .slice(0, 3) // Top 3 preferred categories
          .map(p => p._id);

        const recommendationQuery = {
          status: 'active',
          'inventory.quantity': { $gt: 0 }
        };

        if (category) {
          recommendationQuery.category = category;
        } else if (preferredCategories.length > 0) {
          recommendationQuery.category = { $in: preferredCategories };
        }

        if (excludedProductIds.length > 0) {
          recommendationQuery._id = { $nin: excludedProductIds };
        }

        recommendations = await Product.find(recommendationQuery)
          .populate('artisan', 'profile.firstName profile.lastName profile.culturalBackground')
          .sort({ 
            'metrics.views': -1, 
            'metrics.likes': -1,
            createdAt: -1 
          })
          .limit(parseInt(limit));

        // If not enough personalized recommendations, supplement with popular products
        if (recommendations.length < limit) {
          const remainingLimit = limit - recommendations.length;
          const existingIds = recommendations.map(r => r._id);
          
          const supplementQuery = {
            status: 'active',
            'inventory.quantity': { $gt: 0 },
            _id: { $nin: [...existingIds, ...excludedProductIds] }
          };

          if (category) {
            supplementQuery.category = category;
          }

          const supplementProducts = await Product.find(supplementQuery)
            .populate('artisan', 'profile.firstName profile.lastName profile.culturalBackground')
            .sort({ 'metrics.views': -1, featured: -1 })
            .limit(remainingLimit);

          recommendations = [...recommendations, ...supplementProducts];
        }
      }
    }

    // Fallback to popular products if no personalized recommendations
    if (recommendations.length === 0) {
      strategy = 'popular';
      
      const popularQuery = {
        status: 'active',
        'inventory.quantity': { $gt: 0 }
      };

      if (category) {
        popularQuery.category = category;
      }

      recommendations = await Product.find(popularQuery)
        .populate('artisan', 'profile.firstName profile.lastName profile.culturalBackground')
        .sort({ 
          featured: -1,
          'metrics.views': -1, 
          'metrics.purchases': -1,
          createdAt: -1 
        })
        .limit(parseInt(limit));
    }

    // Add recommendation scores and reasons
    const enrichedRecommendations = recommendations.map((product, index) => ({
      ...product.toObject(),
      recommendationScore: Math.max(0.9 - (index * 0.1), 0.1),
      recommendationReason: generateRecommendationReason(product, strategy, userId)
    }));

    const duration = Date.now() - startTime;

    // Log AI operation
    if (userId) {
      logAIOperation('recommendations', userId, null, {
        strategy,
        count: recommendations.length,
        category: category || 'all'
      }, duration);
    }

    res.json({
      recommendations: enrichedRecommendations,
      metadata: {
        strategy,
        count: recommendations.length,
        category: category || 'all',
        personalized: !!userId,
        processingTime: `${duration}ms`
      }
    });

  } catch (error) {
    console.error('AI Recommendation Error:', error);
    
    // Fallback to simple product listing
    const fallbackProducts = await Product.find({
      status: 'active',
      'inventory.quantity': { $gt: 0 },
      ...(category && { category })
    })
    .populate('artisan', 'profile.firstName profile.lastName')
    .sort({ featured: -1, createdAt: -1 })
    .limit(parseInt(limit));

    res.json({
      recommendations: fallbackProducts,
      metadata: {
        strategy: 'fallback',
        count: fallbackProducts.length,
        category: category || 'all',
        personalized: false,
        error: 'AI service temporarily unavailable'
      }
    });
  }
}));

/**
 * @route   GET /api/ai/similar/:productId
 * @desc    Get similar products using AI analysis
 * @access  Public
 */
router.get('/similar/:productId', [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Invalid similarity parameters',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }

  const startTime = Date.now();
  const { productId } = req.params;
  const { limit = 8 } = req.query;

  const baseProduct = await Product.findById(productId);
  
  if (!baseProduct) {
    return res.status(404).json({
      error: 'Product not found',
      message: 'The specified product does not exist',
      code: 'PRODUCT_NOT_FOUND'
    });
  }

  // Find similar products using multiple criteria
  const similarityQuery = {
    _id: { $ne: baseProduct._id },
    status: 'active',
    'inventory.quantity': { $gt: 0 },
    $or: [
      // Same category
      { category: baseProduct.category },
      // Similar price range (±30%)
      { 
        price: { 
          $gte: baseProduct.price * 0.7, 
          $lte: baseProduct.price * 1.3 
        } 
      },
      // Similar AI tags
      { aiTags: { $in: baseProduct.aiTags } },
      // Same artisan
      { artisan: baseProduct.artisan }
    ]
  };

  let similarProducts = await Product.find(similarityQuery)
    .populate('artisan', 'profile.firstName profile.lastName profile.culturalBackground')
    .limit(parseInt(limit) * 2); // Get more to allow for scoring

  // Calculate similarity scores
  const scoredProducts = similarProducts.map(product => {
    let score = 0;
    
    // Category match (highest weight)
    if (product.category === baseProduct.category) score += 40;
    
    // Price similarity
    const priceDiff = Math.abs(product.price - baseProduct.price) / baseProduct.price;
    if (priceDiff <= 0.2) score += 20;
    else if (priceDiff <= 0.5) score += 10;
    
    // AI tags overlap
    const commonTags = product.aiTags.filter(tag => baseProduct.aiTags.includes(tag));
    score += Math.min(commonTags.length * 5, 25);
    
    // Same artisan
    if (product.artisan._id.toString() === baseProduct.artisan.toString()) score += 15;
    
    // Cultural story similarity (basic keyword matching)
    if (product.culturalStory && baseProduct.culturalStory) {
      const productKeywords = product.culturalStory.significance?.toLowerCase().split(' ') || [];
      const baseKeywords = baseProduct.culturalStory.significance?.toLowerCase().split(' ') || [];
      const commonKeywords = productKeywords.filter(word => 
        baseKeywords.includes(word) && word.length > 3
      );
      score += Math.min(commonKeywords.length * 2, 10);
    }

    return {
      ...product.toObject(),
      similarityScore: score,
      similarityReasons: generateSimilarityReasons(product, baseProduct, score)
    };
  });

  // Sort by similarity score and take top results
  const topSimilar = scoredProducts
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, parseInt(limit));

  const duration = Date.now() - startTime;

  // Log AI operation
  logAIOperation('similarity_search', req.user?._id, productId, {
    count: topSimilar.length,
    avgScore: topSimilar.reduce((sum, p) => sum + p.similarityScore, 0) / topSimilar.length
  }, duration);

  res.json({
    baseProduct: {
      id: baseProduct._id,
      name: baseProduct.name,
      category: baseProduct.category
    },
    similarProducts: topSimilar,
    metadata: {
      count: topSimilar.length,
      processingTime: `${duration}ms`,
      algorithm: 'multi-criteria-similarity'
    }
  });
}));

/**
 * @route   POST /api/ai/search-enhance
 * @desc    Enhance search query with AI
 * @access  Public
 */
router.post('/search-enhance', [
  query('q')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Search query must be between 1 and 200 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Invalid search query',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }

  const startTime = Date.now();
  const { q: query } = req.query;

  // Enhanced search with cultural context and synonyms
  const enhancedQuery = enhanceSearchQuery(query);
  
  // Search products using enhanced query
  const searchResults = await Product.find({
    status: 'active',
    'inventory.quantity': { $gt: 0 },
    $or: [
      { $text: { $search: enhancedQuery.enhanced } },
      { name: { $regex: enhancedQuery.enhanced, $options: 'i' } },
      { description: { $regex: enhancedQuery.enhanced, $options: 'i' } },
      { aiTags: { $in: enhancedQuery.tags } },
      { 'culturalStory.significance': { $regex: enhancedQuery.enhanced, $options: 'i' } }
    ]
  })
  .populate('artisan', 'profile.firstName profile.lastName profile.culturalBackground')
  .sort({ score: { $meta: 'textScore' }, 'metrics.views': -1 })
  .limit(20);

  const duration = Date.now() - startTime;

  // Log AI operation
  logAIOperation('search_enhancement', req.user?._id, null, {
    originalQuery: query,
    enhancedQuery: enhancedQuery.enhanced,
    resultCount: searchResults.length
  }, duration);

  res.json({
    originalQuery: query,
    enhancedQuery: enhancedQuery.enhanced,
    suggestions: enhancedQuery.suggestions,
    results: searchResults,
    metadata: {
      count: searchResults.length,
      processingTime: `${duration}ms`,
      enhancements: enhancedQuery.enhancements
    }
  });
}));

/**
 * Helper function to generate recommendation reasons
 */
function generateRecommendationReason(product, strategy, userId) {
  const reasons = [];
  
  if (strategy === 'personalized') {
    reasons.push('Based on your browsing history');
    if (product.category) {
      reasons.push(`You've shown interest in ${product.category}`);
    }
  } else if (strategy === 'popular') {
    reasons.push('Popular among customers');
  }
  
  if (product.featured) {
    reasons.push('Featured product');
  }
  
  if (product.metrics.views > 100) {
    reasons.push('Highly viewed');
  }
  
  if (product.culturalStory?.significance) {
    reasons.push('Rich cultural heritage');
  }

  return reasons.slice(0, 2); // Return top 2 reasons
}

/**
 * Helper function to generate similarity reasons
 */
function generateSimilarityReasons(product, baseProduct, score) {
  const reasons = [];
  
  if (product.category === baseProduct.category) {
    reasons.push(`Same category: ${product.category}`);
  }
  
  const priceDiff = Math.abs(product.price - baseProduct.price) / baseProduct.price;
  if (priceDiff <= 0.3) {
    reasons.push('Similar price range');
  }
  
  if (product.artisan._id.toString() === baseProduct.artisan.toString()) {
    reasons.push('Same artisan');
  }
  
  const commonTags = product.aiTags.filter(tag => baseProduct.aiTags.includes(tag));
  if (commonTags.length > 0) {
    reasons.push(`Similar style: ${commonTags.slice(0, 2).join(', ')}`);
  }

  return reasons.slice(0, 3); // Return top 3 reasons
}

/**
 * Helper function to enhance search queries
 */
function enhanceSearchQuery(query) {
  const originalQuery = query.toLowerCase();
  let enhanced = originalQuery;
  const tags = [];
  const suggestions = [];
  const enhancements = [];

  // Ethiopian craft synonyms and related terms
  const synonymMap = {
    'basket': ['basketry', 'woven', 'traditional basket', 'storage'],
    'jewelry': ['ornament', 'necklace', 'bracelet', 'traditional jewelry'],
    'leather': ['hide', 'skin', 'leather goods', 'traditional leather'],
    'textile': ['fabric', 'cloth', 'weaving', 'traditional textile'],
    'traditional': ['authentic', 'heritage', 'cultural', 'handmade'],
    'handmade': ['artisan', 'crafted', 'traditional', 'authentic'],
    'ethiopian': ['ethiopia', 'african', 'traditional', 'cultural']
  };

  // Add synonyms to enhance search
  Object.keys(synonymMap).forEach(key => {
    if (originalQuery.includes(key)) {
      enhanced += ' ' + synonymMap[key].join(' ');
      tags.push(...synonymMap[key]);
      enhancements.push(`Added synonyms for "${key}"`);
    }
  });

  // Add cultural context suggestions
  if (originalQuery.includes('traditional') || originalQuery.includes('cultural')) {
    suggestions.push('Ethiopian heritage crafts', 'Authentic artisan products', 'Cultural significance');
  }

  return {
    original: query,
    enhanced: enhanced.trim(),
    tags: [...new Set(tags)], // Remove duplicates
    suggestions,
    enhancements
  };
}

module.exports = router;