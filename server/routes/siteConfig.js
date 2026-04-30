const express = require('express');
const router = express.Router();
const { 
  getHomepageConfig, 
  updateHomepageConfig, 
  uploadLogo, 
  resetHomepageConfig 
} = require('../controllers/siteConfigController');
const { protect, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Public route to fetch configuration (used by Home.jsx)
router.get('/settings/homepage', getHomepageConfig);

// Admin-only route to update configuration
router.put('/admin/settings/homepage', protect, authorize('admin'), updateHomepageConfig);

// Admin-only route to upload logos for site config
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => cb(null, `site-${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

router.post('/admin/settings/upload-logo', protect, authorize('admin'), upload.single('logo'), uploadLogo);
router.post('/admin/settings/homepage/reset', protect, authorize('admin'), resetHomepageConfig);

module.exports = router;
