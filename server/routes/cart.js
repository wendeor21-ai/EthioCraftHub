/**
 * Cart Routes for EthioCraft Global
 * 
 * Handles all cart-related API endpoints
 */

const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticate } = require('../middleware/auth');

// All cart routes require authentication
router.use(authenticate);

// @route   GET /api/cart
// @desc    Get user's cart with populated product details
// @access  Private
router.get('/', cartController.getCart);

// @route   POST /api/cart
// @desc    Add item to cart
// @access  Private
router.post('/', cartController.addToCart);

// @route   PUT /api/cart/:productId
// @desc    Update cart item quantity
// @access  Private
router.put('/:productId', cartController.updateCartItem);

// @route   DELETE /api/cart/:productId
// @desc    Remove item from cart
// @access  Private
router.delete('/:productId', cartController.removeFromCart);

// @route   DELETE /api/cart
// @desc    Clear entire cart
// @access  Private
router.delete('/', cartController.clearCart);

module.exports = router;
