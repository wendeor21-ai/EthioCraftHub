/**
 * Wishlist Routes for EthioCraft Global
 * 
 * Handles wishlist-related API endpoints
 */

const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { authenticate } = require('../middleware/auth');

// All wishlist routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/wishlist
 * @desc    Get user's wishlist
 * @access  Private
 */
router.get('/', wishlistController.getWishlist);

/**
 * @route   POST /api/wishlist/toggle
 * @desc    Toggle product in wishlist
 * @access  Private
 */
router.post('/toggle', wishlistController.toggleWishlist);

module.exports = router;
