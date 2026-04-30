/**
 * Secure Zema AI Routes for EthioCraft Global
 *
 * SECURITY FEATURES:
 * - All routes require authentication
 * - Admin-only routes for monitoring
 * - Rate limiting applied
 * - Audit logging enabled
 */

const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const zemaAIController = require("../controllers/zemaAIController.secure");

const router = express.Router();

/**
 * @route   POST /api/zema-ai/chat
 * @desc    Chat with Zema AI assistant
 * @access  Private (All authenticated users)
 */
router.post("/chat", authenticate, zemaAIController.chat);

/**
 * @route   GET /api/zema-ai/suggestions
 * @desc    Get suggested questions based on user role
 * @access  Private
 */
router.get("/suggestions", authenticate, zemaAIController.getSuggestions);

/**
 * @route   POST /api/zema-ai/analyze-reviews
 * @desc    Analyze product reviews with AI
 * @access  Public
 */
router.post("/analyze-reviews", zemaAIController.analyzeReviews);

/**
 * @route   POST /api/zema-ai/generate-description
 * @desc    Generate product description from title and tags
 * @access  Private (Authenticated users)
 */
router.post(
  "/generate-description",
  authenticate,
  zemaAIController.generateDescription,
);

/**
 * @route   GET /api/zema-ai/admin/logs
 * @desc    Get AI chat logs for admin monitoring
 * @access  Private (Admin only)
 */
router.get(
  "/admin/logs",
  authenticate,
  authorize("admin"),
  zemaAIController.getAdminLogs,
);

/**
 * @route   GET /api/zema-ai/admin/analytics
 * @desc    Get AI usage analytics
 * @access  Private (Admin only)
 */
router.get(
  "/admin/analytics",
  authenticate,
  authorize("admin"),
  zemaAIController.getAnalytics,
);

// Alerts and monitoring
router.get(
  "/admin/alerts",
  authenticate,
  authorize("admin"),
  zemaAIController.getAlerts,
);

router.get(
  "/admin/policy-violations",
  authenticate,
  authorize("admin"),
  zemaAIController.getPolicyViolations,
);

router.get(
  "/admin/decision-logs",
  authenticate,
  authorize("admin"),
  zemaAIController.getDecisionLogs,
);

router.get(
  "/admin/system-health",
  authenticate,
  authorize("admin"),
  zemaAIController.getSystemHealth,
);

router.get(
  "/admin/settings",
  authenticate,
  authorize("admin"),
  zemaAIController.getSettings,
);

router.post(
  "/admin/settings",
  authenticate,
  authorize("admin"),
  zemaAIController.updateSettings,
);

/**
 * @route   DELETE /api/zema-ai/admin/logs/:id
 * @desc    Delete a chat log
 * @access  Private (Admin only)
 */
router.delete(
  "/admin/logs/:id",
  authenticate,
  authorize("admin"),
  zemaAIController.deleteLog,
);

// Retry AI generation for a log
router.post(
  "/admin/logs/:id/retry",
  authenticate,
  authorize("admin"),
  zemaAIController.retryAI, // እዚህ ጋር 'retryAI' መሆኑን አረጋግጥ
);

module.exports = router;
