/**
 * ZemaAI Routes for EthioCraft Global
 *
 * AI-powered assistant endpoints
 */

const express = require("express");
const { body, query } = require("express-validator");
const { authenticate } = require("../middleware/auth");
const zemaAIController = require("../controllers/zemaAIController");

const router = express.Router();

/**
 * @route   GET /api/zema-ai/test
 * @desc    Test if Gemini API is configured correctly
 * @access  Public (for testing)
 */
router.get("/test", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      return res.status(500).json({
        success: false,
        error: "API Key Not Configured",
        message: "GEMINI_API_KEY is not set in your .env file",
        instructions: [
          "1. Get your API key from https://makersuite.google.com/app/apikey",
          "2. Add to .env: GEMINI_API_KEY=AIzaSy...",
          "3. Restart the server",
          "4. Test again at /api/zema-ai/test",
        ],
      });
    }

    console.log("🧪 Testing Gemini API...");
    console.log("   API Key:", apiKey.substring(0, 10) + "...");

    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);

    // Use Gemini 1.5 Flash model explicitly to avoid SDK model mismatches
    const aiModelName = "gemini-1.5-flash";
    const model = genAI.getGenerativeModel({ model: aiModelName });

    console.log("   Sending test request...");
    const result = await model.generateContent(
      'Say "Hello from ZemaAI!" in one sentence.',
    );
    const response = result.response.text();

    console.log("✅ Test successful!");

    res.json({
      success: true,
      message: "ZemaAI is configured correctly! ✅",
      testResponse: response,
      apiKeyStatus: "Valid",
      model: aiModelName,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ ZemaAI Test Error:", {
      message: error.message,
      name: error.name,
      code: error.code,
      status: error.status,
    });

    let errorResponse = {
      success: false,
      error: "API Test Failed",
      message: error.message,
      possibleCauses: [],
      instructions: [],
    };

    if (
      error.message?.includes("API key") ||
      error.message?.includes("API_KEY")
    ) {
      errorResponse.possibleCauses.push("Invalid API key format");
      errorResponse.possibleCauses.push("API key not activated");
      errorResponse.instructions.push(
        "Verify your API key at https://makersuite.google.com/app/apikey",
      );
      errorResponse.instructions.push('Ensure the key starts with "AIza"');
    } else if (
      error.message?.includes("404") ||
      error.message?.includes("not found")
    ) {
      errorResponse.possibleCauses.push("Model not available in your region");
      errorResponse.possibleCauses.push("SDK version incompatibility");
      errorResponse.instructions.push(
        "Try updating SDK: npm install @google/generative-ai@latest",
      );
      errorResponse.instructions.push(
        "Check API key permissions at https://makersuite.google.com",
      );
    } else if (
      error.message?.includes("quota") ||
      error.message?.includes("rate limit")
    ) {
      errorResponse.possibleCauses.push("API quota exceeded");
      errorResponse.instructions.push("Wait a few minutes and try again");
      errorResponse.instructions.push(
        "Check your quota at https://makersuite.google.com",
      );
    } else {
      errorResponse.possibleCauses.push("Network connectivity issue");
      errorResponse.possibleCauses.push("Gemini API service unavailable");
      errorResponse.instructions.push("Check your internet connection");
      errorResponse.instructions.push("Restart the server after updating .env");
    }

    res.status(500).json(errorResponse);
  }
});

/**
 * @route   POST /api/zema-ai/chat
 * @desc    Send message to ZemaAI (MOVED TO SECURE ROUTES)
 * @access  Private
 * 
 * NOTE: This endpoint has been moved to zemaAI.secure.js
 * to ensure proper audit logging and security features.
 * Keeping this comment for reference.
 */
// router.post("/chat", authenticate, [...], zemaAIController.sendMessage);
// ⬆️ DISABLED - Use secure routes instead

/**
 * @route   GET /api/zema-ai/suggestions
 * @desc    Get suggested questions based on user role
 * @access  Private
 */
router.get(
  "/suggestions",
  authenticate,
  [
    query("type")
      .optional()
      .isIn(["general", "artisan", "customer", "admin"])
      .withMessage("Invalid suggestion type"),
  ],
  zemaAIController.getSuggestions,
);

/**
 * @route   POST /api/zema-ai/analyze-product
 * @desc    Get AI analysis for a specific product
 * @access  Private (Artisan/Admin)
 */
router.post(
  "/analyze-product",
  authenticate,
  [body("productId").isMongoId().withMessage("Invalid product ID")],
  zemaAIController.analyzeProduct,
);

/**
 * @route   POST /api/zema-ai/generate-description
 * @desc    Generate a catchy product description given title and optional tags
 * @access  Private
 */
router.post(
  "/generate-description",
  authenticate,
  [
    body("title")
      .trim()
      .isLength({ min: 3 })
      .withMessage("Title must be at least 3 characters"),
    body("tags")
      .optional()
      .isArray()
      .withMessage("Tags must be an array of strings"),
  ],
  zemaAIController.generateDescription,
);

/**
 * @route   POST /api/zema-ai/analyze-reviews
 * @desc    Analyze product reviews and generate sentiment summary
 * @access  Public
 */
router.post(
  "/analyze-reviews",
  [body("productId").isMongoId().withMessage("Invalid product ID")],
  zemaAIController.analyzeReviews,
);

module.exports = router;
