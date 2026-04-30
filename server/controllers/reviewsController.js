const Product = require('../models/Product');
const { asyncHandler } = require('../middleware/errorHandler');

exports.getArtisanReviews = asyncHandler(async (req, res) => {
  const artisanId = req.user._id;
  const products = await Product.find({ artisan: artisanId })
    .select('name category images reviews metrics.averageRating metrics.reviewCount')
    .lean();

  const allReviews = [];
  products.forEach(product => {
    if (product.reviews && product.reviews.length > 0) {
      product.reviews.forEach(review => {
        allReviews.push({
          ...review,
          productId: product._id,
          productName: product.name,
          productCategory: product.category,
          productImage: product.images?.[0]?.url || null
        });
      });
    }
  });

  allReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const totalReviews = allReviews.length;
  const averageRating = totalReviews > 0
    ? allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    : 0;

  const ratingDistribution = {
    5: allReviews.filter(r => r.rating === 5).length,
    4: allReviews.filter(r => r.rating === 4).length,
    3: allReviews.filter(r => r.rating === 3).length,
    2: allReviews.filter(r => r.rating === 2).length,
    1: allReviews.filter(r => r.rating === 1).length
  };

  const topRatedProducts = products
    .filter(p => p.metrics?.reviewCount > 0)
    .sort((a, b) => (b.metrics?.averageRating || 0) - (a.metrics?.averageRating || 0))
    .slice(0, 5)
    .map(p => ({
      id: p._id,
      name: p.name,
      rating: p.metrics?.averageRating || 0,
      reviewCount: p.metrics?.reviewCount || 0,
      image: p.images?.[0]?.url || null
    }));

  res.json({
    success: true,
    data: {
      reviews: allReviews,
      analytics: {
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        ratingDistribution,
        topRatedProducts
      }
    }
  });
});

exports.replyToReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const { reply } = req.body;
  const artisanId = req.user._id;

  if (!reply || reply.trim().length < 10) {
    return res.status(400).json({
      success: false,
      error: 'Reply must be at least 10 characters'
    });
  }

  const product = await Product.findOne({
    artisan: artisanId,
    'reviews._id': reviewId
  });

  if (!product) {
    return res.status(404).json({
      success: false,
      error: 'Review not found or unauthorized'
    });
  }

  const review = product.reviews.id(reviewId);
  if (!review) {
    return res.status(404).json({
      success: false,
      error: 'Review not found'
    });
  }

  review.artisanReply = {
    text: reply.trim(),
    repliedAt: new Date()
  };

  await product.save();

  res.json({
    success: true,
    message: 'Reply added successfully',
    data: {
      reviewId: review._id,
      reply: review.artisanReply
    }
  });
});

exports.flagReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const { reason } = req.body;
  const artisanId = req.user._id;

  if (!reason || reason.trim().length < 10) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a reason (at least 10 characters)'
    });
  }

  const product = await Product.findOne({
    artisan: artisanId,
    'reviews._id': reviewId
  });

  if (!product) {
    return res.status(404).json({
      success: false,
      error: 'Review not found or unauthorized'
    });
  }

  const review = product.reviews.id(reviewId);
  if (!review) {
    return res.status(404).json({
      success: false,
      error: 'Review not found'
    });
  }

  review.flagged = {
    isFlagged: true,
    reason: reason.trim(),
    flaggedBy: artisanId,
    flaggedAt: new Date()
  };

  await product.save();

  res.json({
    success: true,
    message: 'Review flagged for admin review',
    data: {
      reviewId: review._id,
      flagged: review.flagged
    }
  });
});

exports.getReviewAnalytics = asyncHandler(async (req, res) => {
  const artisanId = req.user._id;
  const products = await Product.find({ artisan: artisanId })
    .select('name reviews metrics.averageRating metrics.reviewCount createdAt')
    .lean();

  const allReviews = [];
  products.forEach(product => {
    if (product.reviews && product.reviews.length > 0) {
      allReviews.push(...product.reviews);
    }
  });

  const totalReviews = allReviews.length;
  const averageRating = totalReviews > 0
    ? allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    : 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentReviews = allReviews.filter(r => new Date(r.createdAt) >= thirtyDaysAgo);

  const positiveReviews = allReviews.filter(r => r.rating >= 4).length;
  const neutralReviews = allReviews.filter(r => r.rating === 3).length;
  const negativeReviews = allReviews.filter(r => r.rating <= 2).length;

  res.json({
    success: true,
    data: {
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      recentReviewsCount: recentReviews.length,
      sentiment: {
        positive: positiveReviews,
        neutral: neutralReviews,
        negative: negativeReviews,
        positivePercentage: totalReviews > 0 ? Math.round((positiveReviews / totalReviews) * 100) : 0
      },
      productsWithReviews: products.filter(p => p.metrics?.reviewCount > 0).length,
      totalProducts: products.length
    }
  });
});

exports.reactToReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const { type } = req.body; // 'likes', 'dislikes', 'loves'

  if (!['likes', 'dislikes', 'loves'].includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid reaction type'
    });
  }

  const product = await Product.findOne({ 'reviews._id': reviewId });

  if (!product) {
    return res.status(404).json({
      success: false,
      error: 'Review not found'
    });
  }

  const review = product.reviews.id(reviewId);
  if (!review) {
    return res.status(404).json({
      success: false,
      error: 'Review not found'
    });
  }

  // Initialize reactions if they don't exist
  if (!review.reactions) {
    review.reactions = { likes: 0, dislikes: 0, loves: 0 };
  }

  review.reactions[type] += 1;

  await product.save();

  res.json({
    success: true,
    data: {
      reviewId: review._id,
      reactions: review.reactions
    }
  });
});
