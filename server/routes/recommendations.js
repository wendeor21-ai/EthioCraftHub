/**
 * Recommendation Routes for EthioCraft Global
 * 
 * Handles personalized product recommendations and user behavior tracking
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getRecommendations,
  trackSearch,
  trackView,
  updateCategoryWeight
} = require('../controllers/recommendationController');

// Get personalized recommendations
router.get('/recommendations', protect, getRecommendations);

// Track user behavior
router.post('/track-search', protect, trackSearch);
router.post('/track-view', protect, trackView);
router.post('/update-category-weight', protect, updateCategoryWeight);

module.exports = router;
