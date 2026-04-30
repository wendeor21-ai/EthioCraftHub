/**
 * User Routes for EthioCraft Global
 * 
 * Handles all user-related API endpoints
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

// Debug logging middleware
router.use((req, res, next) => {
  console.log('📍 User Route Hit:', {
    method: req.method,
    path: req.path,
    baseUrl: req.baseUrl,
    fullUrl: req.baseUrl + req.path
  });
  next();
});

// Public routes
router.get('/artisan-public-details/:artisanId', userController.getArtisanPublicDetails);

// All user routes below require authentication
router.use(authenticate);

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', userController.getProfile);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', userController.updateProfile);

// @route   GET /api/users/shipping-addresses
// @desc    Get all shipping addresses
// @access  Private
router.get('/shipping-addresses', userController.getShippingAddresses);

// @route   POST /api/users/shipping-addresses
// @desc    Add new shipping address
// @access  Private
router.post('/shipping-addresses', userController.addShippingAddress);

// @route   PUT /api/users/shipping-addresses/:addressId
// @desc    Update shipping address
// @access  Private
router.put('/shipping-addresses/:addressId', userController.updateShippingAddress);

// @route   DELETE /api/users/shipping-addresses/:addressId
// @desc    Delete shipping address
// @access  Private
router.delete('/shipping-addresses/:addressId', userController.deleteShippingAddress);

// Guidelines
// @route   PATCH /api/users/accept-guidelines
// @desc    Mark guidelines as accepted
// @access  Private
router.patch('/accept-guidelines', userController.acceptGuidelines);

module.exports = router;
