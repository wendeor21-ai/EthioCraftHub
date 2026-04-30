const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const analyticsController = require("../controllers/analyticsController");

/**
 * GET /api/analytics/artisan/:artisanId
 * Returns analytics data for a specific artisan (requires auth).
 */
router.get(
  "/artisan/:artisanId",
  authenticate,
  analyticsController.getArtisanAnalytics,
);

module.exports = router;
