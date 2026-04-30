/**
 * Reviews Routes for EthioCraft Global
 * Handles review management for artisans
 */

const express = require('express');
const router = express.Router();
const reviewsController = require('../controllers/reviewsController');
const { authenticate, requireArtisan } = require('../middleware/auth');

/**
 * @route   GET /api/reviews/artisan
 * @desc    Get all reviews for artisan's products
 * @access  Private (Artisan)
 */
router.get('/artisan', authenticate, requireArtisan, reviewsController.getArtisanReviews);

/**
 * @route   GET /api/reviews/analytics
 * @desc    Get review analytics for artisan
 * @access  Private (Artisan)
 */
router.get('/analytics', authenticate, requireArtisan, reviewsController.getReviewAnalytics);

/**
 * @route   POST /api/reviews/:reviewId/reply
 * @desc    Reply to a customer review
 * @access  Private (Artisan)
 */
router.post('/:reviewId/reply', authenticate, requireArtisan, reviewsController.replyToReview);

/**
 * @route   POST /api/reviews/:reviewId/flag
 * @desc    Flag a review as inappropriate
 * @access  Private (Artisan)
 */
router.post('/:reviewId/flag', authenticate, requireArtisan, reviewsController.flagReview);

/**
 * @route   POST /api/reviews/:reviewId/react
 * @desc    React to a review (Like, Dislike, Love)
 * @access  Public
 */
router.post('/:reviewId/react', reviewsController.reactToReview);

module.exports = router;
