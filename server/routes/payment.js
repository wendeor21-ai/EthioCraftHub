/**
 * Payment Routes for EthioCraft Global
 * 
 * Handles all payment-related API endpoints
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

// @route   POST /api/payment/initialize
// @desc    Initialize payment with Chapa
// @access  Private
router.post('/initialize', authenticate, paymentController.initializePayment);

// @route   POST /api/payment/custom-initialize
// @desc    Initialize payment for Custom Orders
// @access  Private
router.post('/custom-initialize', authenticate, paymentController.initializeCustomPayment);

// @route   GET /api/payment/verify/:txRef
// @desc    Verify payment and create order
// @access  Private
router.get('/verify/:txRef', authenticate, paymentController.verifyPayment);

// @route   GET /api/payment/callback
// @desc    Handle payment callback (when user returns from Chapa)
// @access  Public
router.get('/callback', paymentController.handleCallback);

// @route   POST /api/payment/webhook
// @desc    Handle Chapa webhook callbacks
// @access  Public (verified with signature)
router.post('/webhook', paymentController.handleWebhook);

// @route   GET /api/payment/status/:txRef
// @desc    Get payment status
// @access  Private
router.get('/status/:txRef', authenticate, paymentController.getPaymentStatus);

module.exports = router;
