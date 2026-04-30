/**
 * Shipping Routes
 * Routes for managing shipping and delivery
 */

const express = require('express');
const router = express.Router();
const shippingController = require('../controllers/shippingController');
const { authenticate, requireArtisan } = require('../middleware/auth');

// Artisan shipping settings
router.get('/artisan/shipping-settings', authenticate, requireArtisan, shippingController.getShippingSettings);
router.patch('/artisan/shipping-settings', authenticate, requireArtisan, shippingController.updateShippingSettings);

// Active orders for shipping
router.get('/artisan/shipping/active-orders', authenticate, requireArtisan, shippingController.getActiveOrders);

// Order shipping management
router.patch('/orders/:id/shipping', authenticate, requireArtisan, shippingController.updateOrderShipping);
router.get('/orders/:id/shipping-label', authenticate, requireArtisan, shippingController.getShippingLabel);
router.post('/orders/:id/delivery-proof', authenticate, requireArtisan, shippingController.uploadDeliveryProof);

module.exports = router;
