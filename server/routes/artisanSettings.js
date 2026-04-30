/**
 * Artisan Settings Routes
 */

const express = require('express');
const router = express.Router();
const artisanSettingsController = require('../controllers/artisanSettingsController');
const { authenticate, requireArtisan } = require('../middleware/auth');

// Get settings
router.get('/', authenticate, requireArtisan, artisanSettingsController.getSettings);

// Update profile
router.patch('/profile', authenticate, requireArtisan, artisanSettingsController.updateProfile);

// Update bank details
router.patch('/bank', authenticate, requireArtisan, artisanSettingsController.updateBankDetails);

// Update notifications
router.patch('/notifications', authenticate, requireArtisan, artisanSettingsController.updateNotifications);

// Change password
router.post('/change-password', authenticate, requireArtisan, artisanSettingsController.changePassword);

// Toggle vacation mode
router.patch('/vacation-mode', authenticate, requireArtisan, artisanSettingsController.toggleVacationMode);

// Update social links
router.patch('/social-links', authenticate, requireArtisan, artisanSettingsController.updateSocialLinks);

module.exports = router;
