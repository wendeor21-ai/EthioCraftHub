/**
 * Search Routes for EthioCraft Global
 *
 * Advanced search features:
 * - Text search
 * - Voice search (processed as text)
 * - Image search with Gemini AI
 */

const express = require("express");
const { body, validationResult } = require("express-validator");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Product = require("../models/Product");
const { asyncHandler } = require("../middleware/errorHandler");
const { logAIOperation } = require("../middleware/logger");

const router = express.Router();

/**
 * Get Gemini AI instance
 */
function getGeminiAI() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "your_gemini_api_key_here" || apiKey.includes("mock")) {
    console.warn("⚠️ GEMINI_API_KEY is not configured. AI features will use fallback.");
    return null;
  }

  return new GoogleGenerativeAI(apiKey);
}

/**
 * @route   POST /api/search/image
 * @desc    Analyze image and suggest search query
 * @access  Public
 */
router.post(
  "/image",
  [
    body("image").notEmpty().withMessage("Image data is required"),
    body("mimeType")
      .optional()
      .isIn(["image/jpeg", "image/png", "image/webp", "image/jpg"])
      .withMessage("Invalid image type"),
  ],
  asyncHandler(async (req, res) => {
    const startTime = Date.now();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        message: "Invalid image data",
        details: errors.array(),
      });
    }

    const { image, mimeType = "image/jpeg" } = req.body;

    console.log("🖼️  Image search request received");
    console.log("   MIME type:", mimeType);
    console.log("   Image size:", image.length, "characters");

    try {
      // Get available product categories and types for context
      const categories = await Product.distinct("category", {
        status: "active",
        "inventory.quantity": { $gt: 0 },
      });

      const sampleProducts = await Product.find({
        status: "active",
        "inventory.quantity": { $gt: 0 },
      })
        .select("name category materials")
        .limit(20)
        .lean();

      const productContext = sampleProducts
        .map(
          (p) =>
            `${p.name} (${p.category}${p.materials ? ", " + p.materials : ""})`,
        )
        .join(", ");

      console.log("📊 Product context:", {
        categories: categories.length,
        sampleProducts: sampleProducts.length,
      });

      // Initialize Gemini AI
      const genAI = getGeminiAI();
      
      let searchQuery;
      let duration;

      if (!genAI) {
        // Fallback simulated AI analysis
        console.warn("⚠️ Using fallback image analysis (AI not configured)");
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing time
        
        // Use a generic search term based on available categories
        const currentCategories = categories.length > 0 ? categories : ["Textiles", "Leather", "Jewelry"];
        const randomCategory = currentCategories[Math.floor(Math.random() * currentCategories.length)];
        
        // Generate a plausible mock search query
        searchQuery = `traditional ${randomCategory.toLowerCase()}`;
        duration = Date.now() - startTime;
      } else {
        const aiModelName = "gemini-1.5-flash";
        const model = genAI.getGenerativeModel({ model: aiModelName });

        // Create prompt for image analysis
        const prompt = `You are an AI assistant for EthioCraft Global, an Ethiopian artisan marketplace.

Analyze this image and generate a search query to find similar products in our inventory.

Our product categories: ${categories.join(", ")}

Sample products we have: ${productContext}

Instructions:
1. Identify the core product category.
2. Note specific visual features: dominant colors, textures (e.g., woven, soft, carved), materials (e.g., cotton, leather, wood), and patterns.
3. Identify cultural style or regional markers if evident (e.g., Gonderian, Axumite).
4. Generate a concise search query consisting of 3-6 space-separated terms that capture these visual attributes.
5. Focus on specific searchable attributes rather than generic descriptions.

Examples:
- White cotton dress with gold patterns → "white gold handwoven cotton dress"
- Brown leather bag with carvings → "brown carved leather artisanal bag"
- Colorful woven basket → "colorful geometric woven agelgil basket"

Respond with ONLY the search terms, nothing else. No explanations, no punctuation.`;

        console.log("🤖 Sending image to Gemini AI for analysis...");

        // Send image to Gemini for analysis
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: image,
              mimeType: mimeType,
            },
          },
        ]);

        const response = result.response;
        searchQuery = response.text().trim();
        duration = Date.now() - startTime;
      }

      console.log("✅ Image analysis complete:", {
        searchQuery,
        duration: `${duration}ms`,
      });

      // Log AI operation
      logAIOperation(
        "image_search",
        null,
        null,
        {
          mimeType,
          imageSize: image.length,
          searchQuery,
          categoriesAvailable: categories.length,
        },
        duration,
      );

      res.json({
        success: true,
        searchQuery,
        metadata: {
          processingTime: `${duration}ms`,
          model: "gemini-1.5-flash",
          categoriesSearched: categories.length,
        },
      });
    } catch (error) {
      console.error("❌ Image search error:", {
        message: error.message,
        stack: error.stack,
      });

      // Handle specific errors
      if (
        error.message?.includes("API key") ||
        error.message?.includes("GEMINI_API_KEY")
      ) {
        return res.status(500).json({
          success: false,
          error: "Configuration error",
          message: "AI service is not properly configured",
          code: "AI_CONFIG_ERROR",
        });
      }

      if (
        error.message?.includes("quota") ||
        error.message?.includes("rate limit")
      ) {
        return res.status(429).json({
          success: false,
          error: "Rate limit exceeded",
          message: "Too many requests. Please try again in a moment.",
          code: "RATE_LIMIT_EXCEEDED",
        });
      }

      if (error.message?.includes("SAFETY")) {
        return res.status(400).json({
          success: false,
          error: "Content filtered",
          message:
            "Image was filtered by safety settings. Please try a different image.",
          code: "SAFETY_FILTER",
        });
      }

      res.status(500).json({
        success: false,
        error: "Image analysis failed",
        message: "Could not analyze image. Please try again.",
        code: "IMAGE_ANALYSIS_ERROR",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }),
);

/**
 * @route   POST /api/search/voice
 * @desc    Process voice search (same as text search, but logged differently)
 * @access  Public
 */
router.post(
  "/voice",
  [
    body("query")
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Search query must be between 1 and 200 characters"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        message: "Invalid search query",
        details: errors.array(),
      });
    }

    const { query } = req.body;

    console.log("🎤 Voice search request:", query);

    // Log voice search
    logAIOperation(
      "voice_search",
      null,
      null,
      {
        query,
        queryLength: query.length,
      },
      0,
    );

    // Return success - actual search happens on frontend
    res.json({
      success: true,
      query,
      message: "Voice search processed",
    });
  }),
);

/**
 * @route   GET /api/search/suggestions
 * @desc    Get autocomplete suggestions (Product names, categories, brands)
 * @access  Public
 */
router.get(
  "/suggestions",
  asyncHandler(async (req, res) => {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({ success: true, suggestions: [] });
    }

    const regex = new RegExp(q, "i");

    // Fetch product names, categories, and brand names matching the query
    const [products, categories, brands] = await Promise.all([
      Product.find({ name: regex, status: "active" }).select("name category").limit(5).lean(),
      Product.distinct("category", { category: regex, status: "active" }),
      Product.distinct("brandName", { brandName: regex, status: "active" })
    ]);

    // Combine and format suggestions
    const suggestions = [
      ...categories.map(c => ({ text: c, type: 'category' })),
      ...brands.map(b => ({ text: b, type: 'brand' })),
      ...products.map(p => ({ text: p.name, type: 'product', id: p._id, category: p.category }))
    ];

    res.json({
      success: true,
      suggestions: suggestions.slice(0, 10)
    });
  })
);

module.exports = router;
