/**
 * UserInteraction Model for EthioCraft Global
 * 
 * Tracks user behavior for AI recommendation engine:
 * - Product views and engagement duration
 * - Cart additions and purchases
 * - Like/favorite actions
 * - Search queries and results
 * - Session-based interaction patterns
 * 
 * Data is used for:
 * - Personalized product recommendations
 * - Popular product identification
 * - User preference profiling
 * - Cultural interest analysis
 */

const mongoose = require('mongoose');

// Metadata schema for additional interaction context
const metadataSchema = new mongoose.Schema({
  source: {
    type: String,
    enum: ['search', 'recommendation', 'category', 'featured', 'artisan_profile', 'direct'],
    default: 'direct'
  },
  searchQuery: {
    type: String,
    trim: true,
    maxlength: [200, 'Search query cannot exceed 200 characters']
  },
  category: {
    type: String,
    enum: ['Textiles', 'Leather', 'Basketry', 'Jewelry']
  },
  deviceType: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet'],
    default: 'desktop'
  },
  referrer: {
    type: String,
    trim: true,
    maxlength: [500, 'Referrer URL cannot exceed 500 characters']
  }
}, { _id: false });

// Main UserInteraction schema
const userInteractionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    index: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product reference is required'],
    index: true
  },
  interactionType: {
    type: String,
    enum: {
      values: ['view', 'like', 'cart_add', 'cart_remove', 'purchase', 'share', 'review'],
      message: 'Invalid interaction type'
    },
    required: [true, 'Interaction type is required']
  },
  duration: {
    type: Number, // Duration in seconds for view interactions
    min: [0, 'Duration cannot be negative'],
    validate: {
      validator: function(v) {
        // Duration is required for view interactions
        return this.interactionType !== 'view' || (v !== undefined && v >= 0);
      },
      message: 'Duration is required for view interactions'
    }
  },
  quantity: {
    type: Number, // Quantity for cart_add and purchase interactions
    min: [1, 'Quantity must be at least 1'],
    validate: {
      validator: function(v) {
        // Quantity is required for cart and purchase interactions
        return !['cart_add', 'purchase'].includes(this.interactionType) || (v && v > 0);
      },
      message: 'Quantity is required for cart and purchase interactions'
    }
  },
  metadata: {
    type: metadataSchema,
    default: () => ({})
  },
  sessionId: {
    type: String,
    required: [true, 'Session ID is required'],
    trim: true,
    maxlength: [100, 'Session ID cannot exceed 100 characters']
  },
  ipAddress: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        // Basic IP address validation (IPv4 and IPv6)
        return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(v) ||
               /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(v);
      },
      message: 'Invalid IP address format'
    }
  },
  userAgent: {
    type: String,
    trim: true,
    maxlength: [500, 'User agent cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  // TTL index to automatically delete old interactions after 90 days
  index: { createdAt: 1 },
  expireAfterSeconds: 7776000 // 90 days in seconds
});

// Compound indexes for efficient querying
userInteractionSchema.index({ user: 1, createdAt: -1 });
userInteractionSchema.index({ product: 1, interactionType: 1 });
userInteractionSchema.index({ user: 1, interactionType: 1, createdAt: -1 });
userInteractionSchema.index({ sessionId: 1, createdAt: -1 });
userInteractionSchema.index({ 'metadata.category': 1, interactionType: 1 });

// Virtual for interaction score (used in recommendation algorithms)
userInteractionSchema.virtual('score').get(function() {
  const scores = {
    'view': 1,
    'like': 3,
    'cart_add': 5,
    'share': 4,
    'purchase': 10,
    'review': 8,
    'cart_remove': -2
  };
  
  let baseScore = scores[this.interactionType] || 1;
  
  // Boost score for longer view durations
  if (this.interactionType === 'view' && this.duration) {
    if (this.duration > 60) baseScore *= 2; // Viewed for more than 1 minute
    else if (this.duration > 30) baseScore *= 1.5; // Viewed for more than 30 seconds
  }
  
  // Boost score for multiple quantity purchases
  if (this.interactionType === 'purchase' && this.quantity > 1) {
    baseScore *= Math.min(this.quantity, 3); // Cap at 3x boost
  }
  
  return baseScore;
});

// Static method to track user interaction
userInteractionSchema.statics.trackInteraction = async function(data) {
  try {
    // Prevent duplicate interactions within a short time frame
    if (data.interactionType === 'view') {
      const recentView = await this.findOne({
        user: data.user,
        product: data.product,
        interactionType: 'view',
        createdAt: { $gte: new Date(Date.now() - 30000) } // Within last 30 seconds
      });
      
      if (recentView) {
        // Update duration instead of creating new record
        recentView.duration = Math.max(recentView.duration || 0, data.duration || 0);
        return await recentView.save();
      }
    }
    
    const interaction = new this(data);
    return await interaction.save();
  } catch (error) {
    console.error('Error tracking user interaction:', error);
    throw error;
  }
};

// Static method to get user interaction history
userInteractionSchema.statics.getUserHistory = function(userId, limit = 100) {
  return this.find({ user: userId })
    .populate('product', 'name category price images')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get product interaction stats
userInteractionSchema.statics.getProductStats = function(productId) {
  return this.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: '$interactionType',
        count: { $sum: 1 },
        totalDuration: { $sum: '$duration' },
        totalQuantity: { $sum: '$quantity' }
      }
    }
  ]);
};

// Static method to get user preferences based on interactions
userInteractionSchema.statics.getUserPreferences = async function(userId) {
  const scores = {
    'view': 1,
    'like': 3,
    'cart_add': 5,
    'share': 4,
    'purchase': 10,
    'review': 8,
    'cart_remove': -2
  };

  const preferences = await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $lookup: {
        from: 'products',
        localField: 'product',
        foreignField: '_id',
        as: 'productInfo'
      }
    },
    { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        category: { $ifNull: ['$productInfo.category', '$metadata.category'] },
        interactionType: 1,
        quantity: { $ifNull: ['$quantity', 1] },
        searchQuery: '$metadata.searchQuery',
        score: {
          $switch: {
            branches: [
              { case: { $eq: ['$interactionType', 'purchase'] }, then: scores.purchase },
              { case: { $eq: ['$interactionType', 'cart_add'] }, then: scores.cart_add },
              { case: { $eq: ['$interactionType', 'like'] }, then: scores.like },
              { case: { $eq: ['$interactionType', 'review'] }, then: scores.review },
              { case: { $eq: ['$interactionType', 'share'] }, then: scores.share },
              { case: { $eq: ['$interactionType', 'view'] }, then: scores.view },
              { case: { $eq: ['$interactionType', 'cart_remove'] }, then: scores.cart_remove }
            ],
            default: 1
          }
        }
      }
    },
    {
      $group: {
        _id: '$category',
        totalScore: { $sum: { $multiply: ['$score', '$quantity'] } },
        recentSearches: { $push: '$searchQuery' },
        interactionCount: { $sum: 1 }
      }
    },
    { $match: { _id: { $ne: null } } }, // Filter out null categories
    { $sort: { totalScore: -1 } }
  ]);
  
  return preferences;
};

// Static method to get popular products based on interactions
userInteractionSchema.statics.getPopularProducts = function(category = null, limit = 20) {
  const matchStage = category 
    ? { 'productInfo.category': category }
    : {};
  
  return this.aggregate([
    {
      $lookup: {
        from: 'products',
        localField: 'product',
        foreignField: '_id',
        as: 'productInfo'
      }
    },
    { $unwind: '$productInfo' },
    { $match: { ...matchStage, 'productInfo.status': 'active' } },
    {
      $group: {
        _id: '$product',
        viewCount: {
          $sum: { $cond: [{ $eq: ['$interactionType', 'view'] }, 1, 0] }
        },
        likeCount: {
          $sum: { $cond: [{ $eq: ['$interactionType', 'like'] }, 1, 0] }
        },
        cartAddCount: {
          $sum: { $cond: [{ $eq: ['$interactionType', 'cart_add'] }, 1, 0] }
        },
        purchaseCount: {
          $sum: { $cond: [{ $eq: ['$interactionType', 'purchase'] }, 1, 0] }
        },
        totalScore: {
          $sum: {
            $switch: {
              branches: [
                { case: { $eq: ['$interactionType', 'view'] }, then: 1 },
                { case: { $eq: ['$interactionType', 'like'] }, then: 3 },
                { case: { $eq: ['$interactionType', 'cart_add'] }, then: 5 },
                { case: { $eq: ['$interactionType', 'purchase'] }, then: 10 }
              ],
              default: 1
            }
          }
        }
      }
    },
    { $sort: { totalScore: -1, viewCount: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' }
  ]);
};

// Static method to get similar users based on interaction patterns
userInteractionSchema.statics.getSimilarUsers = function(userId, limit = 10) {
  return this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: '$product', interactions: { $sum: 1 } } },
    {
      $lookup: {
        from: 'userinteractions',
        localField: '_id',
        foreignField: 'product',
        as: 'otherInteractions'
      }
    },
    { $unwind: '$otherInteractions' },
    { $match: { 'otherInteractions.user': { $ne: new mongoose.Types.ObjectId(userId) } } },
    {
      $group: {
        _id: '$otherInteractions.user',
        commonProducts: { $sum: 1 },
        similarity: { $sum: '$interactions' }
      }
    },
    { $sort: { similarity: -1, commonProducts: -1 } },
    { $limit: limit }
  ]);
};

module.exports = mongoose.model('UserInteraction', userInteractionSchema);