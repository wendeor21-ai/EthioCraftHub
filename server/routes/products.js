/**
 * Product Routes for EthioCraft Global
 *
 * Handles product management and discovery:
 * - Product CRUD operations for artisans
 * - Product browsing and search for customers
 * - Category-based filtering
 * - AI-enhanced product recommendations
 * - Cultural story integration
 */

const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { getFeatureVector, cosineSimilarity } = require("../utils/imageVector");
const { body, query, validationResult } = require("express-validator");
const Product = require("../models/Product");
const UserInteraction = require("../models/UserInteraction");
const {
  authenticate,
  authorize,
  requireVerifiedArtisan,
  requireArtisan,
  optionalAuth,
} = require("../middleware/auth");
const {
  asyncHandler,
  createValidationError,
  createNotFoundError,
  createForbiddenError,
} = require("../middleware/errorHandler");
const { logBusinessEvent, logAIOperation } = require("../middleware/logger");
const { logActivity } = require("../utils/activityLogger");

const router = express.Router();
const uploadMem = multer({ storage: multer.memoryStorage() });

/**
 * @route   POST /api/products/search/image
 * @desc    Search products using AI Image Similarity
 * @access  Public
 */
router.post(
  "/search/image",
  uploadMem.single('searchImage'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image provided for search." });
    }
    
    // Extract feature vector using MobileNet
    let queryVector;
    try {
      queryVector = await getFeatureVector(req.file.buffer);
    } catch (err) {
      return res.status(500).json({ success: false, message: "Failed to process image.", error: err.message });
    }
    
    const products = await Product.find({
      status: "active",
      "inventory.quantity": { $gt: 0 },
      imageFeatureVector: { $exists: true, $not: { $size: 0 } }
    }).populate("artisan", "profile.firstName profile.lastName profile.storeName profile.storeLogo profile.culturalBackground profile.isVerifiedArtisan");
    
    const SIMILARITY_THRESHOLD = 0.5; // Lowered from 0.80 for better recall

    // Compare distances — collect all scores for debugging
    const allScores = [];
    const matches = [];
    console.log(`[AI Search] Comparing query vector (normalized) against ${products.length} indexed products.`);
    
    for (const product of products) {
      const score = cosineSimilarity(queryVector, product.imageFeatureVector);
      allScores.push({ name: product.name, score });
      if (score > SIMILARITY_THRESHOLD) {
        matches.push({ product, similarityScore: score });
      }
    }
    
    // --- DEBUG: Log Top 5 closest products regardless of threshold ---
    const top5 = allScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    console.log('[AI Search] ── TOP 5 CLOSEST MATCHES (Debug) ──');
    top5.forEach((item, i) => {
      const pct = (item.score * 100).toFixed(2);
      const passed = item.score > SIMILARITY_THRESHOLD ? '✅ ABOVE threshold' : '❌ below threshold';
      console.log(`  #${i + 1}  "${item.name}"  →  ${pct}%  (${passed})`);
    });
    console.log(`[AI Search] Found ${matches.length} matches above ${(SIMILARITY_THRESHOLD * 100)}% threshold.`);
    
    // Sort descending by score
    matches.sort((a, b) => b.similarityScore - a.similarityScore);
    
    // Sanitize blob images just like regular search
    const sanitizedMatches = matches.map((m) => {
      const obj = m.product.toObject();
      if (obj.images && Array.isArray(obj.images)) {
        obj.images = obj.images.filter(
          (i) => i.url && !i.url.startsWith("blob:")
        );
      }
      return { ...obj, similarityScore: m.similarityScore };
    });
    
    res.json({
      success: true,
      products: sanitizedMatches,
      count: sanitizedMatches.length,
      message: "Here are the closest matching products based on your image."
    });
  })
);

/**
 * @route   GET /api/products
 * @desc    Get products with filtering and search
 * @access  Public
 */
router.get(
  "/",
  [
    query("category")
      .optional()
      .isIn([
        "Textiles",
        "Jewelry",
        "Pottery",
        "Basketry",
        "Wood Crafts",
        "Leather Goods",
        "Metalwork",
        "Paintings",
      ])
      .withMessage("Invalid category"),
    query("region")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Region name too long"),
    query("zone")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Zone name too long"),
    query("search")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Search query too long"),
    query("minPrice")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Minimum price must be a positive number"),
    query("maxPrice")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Maximum price must be a positive number"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Limit must be between 1 and 50"),
  ],
  optionalAuth,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Invalid query parameters",
        code: "VALIDATION_ERROR",
        details: errors.array(),
      });
    }

    const {
      category,
      region,
      zone,
      search,
      artisan,
      minPrice,
      maxPrice,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter object
    // Allow client to request out-of-stock products by passing includeOutOfStock=true
    const includeOutOfStock = req.query.includeOutOfStock === "true";

    const filters = {
      status: "active",
    };

    if (!includeOutOfStock) {
      // Default behavior: only return products with quantity > 0
      filters["inventory.quantity"] = { $gt: 0 };
    }

    if (category) {
      filters.category = category;
    }

    if (region) {
      filters.originRegion = region;
    }

    if (zone) {
      filters.originZone = zone;
    }

    if (artisan) {
      filters.artisan = artisan;
    }

    if (minPrice || maxPrice) {
      filters.price = {};
      if (minPrice) filters.price.$gte = parseFloat(minPrice);
      if (maxPrice) filters.price.$lte = parseFloat(maxPrice);
    }

    // Build sort object
    const sort = {};
    const sortField = sortBy === "salesCount" ? "metrics.purchases" : sortBy;
    sort[sortField] = sortOrder === "desc" ? -1 : 1;

    let query;

    if (search) {
      // Use advanced multi-field regex for partial text matching
      const regexSearch = new RegExp(search, 'i');
      
      const searchCriteria = [
        { name: regexSearch },
        { description: regexSearch },
        { shortDescription: regexSearch },
        { category: regexSearch },
        { story: regexSearch },
        { materials: regexSearch },
        { tags: regexSearch },
        { culturalTags: regexSearch },
        { originRegion: regexSearch },
        { originZone: regexSearch }
      ];

      query = Product.find({
        ...filters,
        $or: searchCriteria,
      }).sort(sort);
    } else {
      query = Product.find(filters).sort(sort);
    }

    // Apply pagination
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(parseInt(limit));

    // Populate artisan information
    query = query
      .populate(
        "artisan",
        "profile.firstName profile.lastName profile.storeName profile.storeLogo profile.culturalBackground profile.address.region profile.isVerifiedArtisan",
      )
      .populate("promotionId");

    const products = await query;

    // Filter out orphaned products whose artisan account has been deleted.
    // After populate(), artisan is null when the referenced user no longer exists.
    const activeProducts = products.filter((p) => p.artisan !== null);

    let totalMatchQuery = filters;
    if (search) {
      // Apply the same search criteria to the total count query
      const regexSearch = RegExp(search, 'i');
      totalMatchQuery = {
        ...filters,
        $or: [
          { name: regexSearch },
          { description: regexSearch },
          { shortDescription: regexSearch },
          { category: regexSearch },
          { story: regexSearch },
          { materials: regexSearch },
          { tags: regexSearch },
          { culturalTags: regexSearch },
          { originRegion: regexSearch },
          { originZone: regexSearch }
        ]
      }
    }
    const total = await Product.countDocuments(totalMatchQuery);

    // Track search interaction if user is authenticated
    if (req.user && search) {
      const searchInteraction = {
        user: req.user._id,
        product: products[0]?._id, // Track first result if available
        interactionType: "view",
        metadata: {
          source: "search",
          searchQuery: search,
          category: category || "all",
        },
        sessionId: req.sessionID || "anonymous",
      };

      // Don't await to avoid slowing down response
      UserInteraction.trackInteraction(searchInteraction).catch(console.error);
    }

    // sanitize each product's images before returning
    const sanitizedProducts = activeProducts.map((p) => {
      const obj = p.toObject();
      if (obj.images && Array.isArray(obj.images)) {
        obj.images = obj.images.filter(
          (i) => i.url && !i.url.startsWith("blob:"),
        );
      }
      return obj;
    });

    res.json({
      products: sanitizedProducts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      filters: {
        category,
        region,
        zone,
        search,
        minPrice,
        maxPrice,
      },
    });
  }),
);

/**
 * @route   GET /api/products/featured
 * @desc    Get featured products
 * @access  Public
 */
router.get(
  "/featured",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;

    const products = await Product.getFeatured(limit);

    res.json({
      products,
      message: "Featured Ethiopian artisan crafts",
    });
  }),
);

/**
 * @route   GET /api/products/categories
 * @desc    Get product categories with counts
 * @access  Public
 */
router.get(
  "/categories",
  asyncHandler(async (req, res) => {
    const categories = await Product.aggregate([
      { $match: { status: "active", "inventory.quantity": { $gt: 0 } } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          avgPrice: { $avg: "$price" },
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const categoryInfo = {
      Textiles: {
        description:
          "Traditional Ethiopian textiles including handwoven fabrics, scarves, and clothing",
        culturalSignificance:
          "Ethiopian textiles represent centuries of weaving traditions and cultural identity",
      },
      Leather: {
        description:
          "Handcrafted leather goods including bags, shoes, and decorative items",
        culturalSignificance:
          "Ethiopian leather craftsmanship is renowned for its quality and traditional techniques",
      },
      Basketry: {
        description:
          "Traditional baskets and woven items for storage and decoration",
        culturalSignificance:
          "Basketry is an ancient Ethiopian art form passed down through generations",
      },
      Jewelry: {
        description:
          "Handmade jewelry featuring traditional Ethiopian designs and materials",
        culturalSignificance:
          "Ethiopian jewelry reflects the rich cultural heritage and artistic traditions",
      },
    };

    const enrichedCategories = categories.map((cat) => ({
      ...cat,
      ...categoryInfo[cat._id],
    }));

    res.json({
      categories: enrichedCategories,
      totalCategories: categories.length,
    });
  }),
);

/**
 * @route   GET /api/products/recommendations/:userId?
 * @desc    Get AI-powered product recommendations
 * @access  Public (optional auth for personalization)
 */
router.get(
  "/recommendations/:userId?",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const userId = req.user?._id || req.params.userId;
    const limit = parseInt(req.query.limit) || 10;
    const requestedCategory = req.query.category;

    let recommendations = [];
    let personalizationLevel = 'none';

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      personalizationLevel = 'basic';
      // Get personalized preferences based on weighted interactions (purchase, cart, view)
      const userPreferences = await UserInteraction.getUserPreferences(userId);

      if (userPreferences.length > 0) {
        personalizationLevel = 'high';
        
        // 1. Identify favorite categories from purchase/interaction history
        const preferredCategories = userPreferences
          .slice(0, 3) 
          .map((p) => p._id);

        // 2. Identify categories from recent search intent
        const searchCategories = new Set();
        userPreferences.forEach(pref => {
          if (pref.recentSearches) {
            pref.recentSearches.filter(Boolean).forEach(query => {
              // Simple keyword mapping for search intent (Ethiopian specific)
              const q = query.toLowerCase();
              if (q.includes('cloth') || q.includes('textile') || q.includes('gabi') || q.includes('dress')) searchCategories.add('Textiles');
              if (q.includes('cross') || q.includes('silver') || q.includes('gold') || q.includes('jewelry')) searchCategories.add('Jewelry');
              if (q.includes('basket') || q.includes('mesob') || q.includes('agalgil')) searchCategories.add('Basketry');
              if (q.includes('leather') || q.includes('bag') || q.includes('shoe')) searchCategories.add('Leather Goods');
              if (q.includes('pot') || q.includes('clay') || q.includes('jebena')) searchCategories.add('Pottery');
            });
          }
        });

        const combinedCategories = [...new Set([...preferredCategories, ...Array.from(searchCategories)])];

        // Fetch products aligned with preferences and search intent
        recommendations = await Product.find({
          status: "active",
          "inventory.quantity": { $gt: 0 },
          category: { $in: combinedCategories.length > 0 ? combinedCategories : undefined },
        })
          .populate("artisan", "profile.firstName profile.lastName profile.culturalBackground")
          .sort({ "metrics.purchases": -1, "metrics.averageRating": -1, createdAt: -1 })
          .limit(limit);
      }
    }

    // 3. Fallback/Cold Start: Trending Now (Sales) & Most Liked (Ratings)
    if (recommendations.length < limit) {
      const remainingLimit = limit - recommendations.length;
      const popularProducts = await UserInteraction.getPopularProducts(
        requestedCategory,
        remainingLimit * 2 // Fetch more to mix and filter
      );

      const popularProductIds = popularProducts.map((p) => p._id);
      const existingIds = recommendations.map((r) => r._id.toString());

      const newPopularIds = popularProductIds.filter(
        (id) => !existingIds.includes(id.toString())
      );

      if (newPopularIds.length > 0) {
        const additionalProducts = await Product.find({
          _id: { $in: newPopularIds.slice(0, remainingLimit) },
          status: "active"
        }).populate("artisan", "profile.firstName profile.lastName profile.storeName profile.storeLogo profile.culturalBackground profile.isVerifiedArtisan");

        recommendations = [...recommendations, ...additionalProducts];
      }
    }

    // 4. Final Fallback: Featured Artisan selections
    if (recommendations.length < limit) {
      const remainingLimit = limit - recommendations.length;
      const featuredProducts = await Product.getFeatured(remainingLimit);

      const existingIds = recommendations.map((r) => r._id.toString());
      const newFeatured = featuredProducts.filter(
        (p) => !existingIds.includes(p._id.toString())
      );

      recommendations = [...recommendations, ...newFeatured];
    }

    const duration = Date.now() - startTime;
    if (userId) {
      logAIOperation("product_recommendations", userId, null, {
        count: recommendations.length,
        personalizationLevel,
        category: requestedCategory
      }, duration);
    }

    res.json({
      success: true,
      recommendations,
      metadata: {
        personalizationLevel,
        count: recommendations.length,
        processingTime: `${duration}ms`
      }
    });
  }),
);

/**
 * @route   GET /api/products/:id
 * @desc    Get single product by ID
 * @access  Public
 */
router.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    let query;

    if (mongoose.Types.ObjectId.isValid(id)) {
      query = Product.findById(id);
    } else {
      query = Product.findOne({ slug: id });
    }

    const product = await query.populate(
      "artisan",
      "profile.firstName profile.lastName profile.storeName profile.storeLogo profile.coverBanner profile.culturalBackground profile.specialties profile.bio profile.experienceYears profile.totalProducts profile.traditionsPreserved profile.workshopGallery profile.isVerifiedArtisan",
    );

    if (!product) {
      throw createNotFoundError("Product");
    }

    // Increment view count
    await product.incrementViews();

    // Track user interaction if authenticated
    if (req.user) {
      const interaction = {
        user: req.user._id,
        product: product._id,
        interactionType: "view",
        duration: 0, // Will be updated by frontend
        metadata: {
          source: "direct",
          category: product.category,
        },
        sessionId: req.sessionID || "anonymous",
      };

      // Don't await to avoid slowing down response
      UserInteraction.trackInteraction(interaction).catch(console.error);
    }

    // Get similar products
    const similarProducts = await Product.find({
      _id: { $ne: product._id },
      category: product.category,
      status: "active",
      "inventory.quantity": { $gt: 0 },
    })
      .populate("artisan", "profile.firstName profile.lastName")
      .limit(4)
      .sort({ "metrics.views": -1 });

    // strip any bad blob URLs that might be stored in the database
    const safeProduct = product.toObject();
    if (safeProduct.images && Array.isArray(safeProduct.images)) {
      safeProduct.images = safeProduct.images.filter(
        (img) => img.url && !img.url.startsWith("blob:"),
      );
    }

    // also sanitize similarProducts so their gallery thumbnails don't link to blobs
    const safeSimilar = similarProducts.map((p) => {
      const obj = p.toObject();
      if (obj.images && Array.isArray(obj.images)) {
        obj.images = obj.images.filter(
          (i) => i.url && !i.url.startsWith("blob:"),
        );
      }
      return obj;
    });

    res.json({
      product: safeProduct,
      similarProducts: safeSimilar,
      artisan: {
        id: product.artisan._id,
        name: product.artisan.fullName || `${product.artisan.profile.firstName} ${product.artisan.profile.lastName}`,
        storeName: product.artisan.profile.storeName,
        storeLogo: product.artisan.profile.storeLogo,
        coverBanner: product.artisan.profile.coverBanner,
        culturalBackground: product.artisan.profile.culturalBackground,
        specialties: product.artisan.profile.specialties,
        bio: product.artisan.profile.bio,
        experienceYears: product.artisan.profile.experienceYears,
        totalProducts: product.artisan.profile.totalProducts,
        traditionsPreserved: product.artisan.profile.traditionsPreserved,
        workshopGallery: product.artisan.profile.workshopGallery,
        isVerifiedArtisan: product.artisan.profile.isVerifiedArtisan,
      },
    });
  }),
);

/**
 * @route   POST /api/products
 * @desc    Create new product (Artisans only - verification optional)
 * @access  Private (Artisans)
 */
router.post(
  "/",
  authenticate,
  requireVerifiedArtisan,
  [
    body("name")
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage("Product name must be between 3 and 100 characters"),
    body("description")
      .trim()
      .isLength({ min: 20, max: 2000 })
      .withMessage("Description must be between 20 and 2000 characters"),
    body("category")
      .isIn([
        "Textiles",
        "Jewelry",
        "Pottery",
        "Basketry",
        "Wood Crafts",
        "Leather Goods",
        "Metalwork",
        "Paintings",
      ])
      .withMessage("Invalid category"),
    body("price")
      .isFloat({ min: 0.01 })
      .withMessage("Price must be a positive number"),
    body("materials")
      .trim()
      .notEmpty()
      .withMessage("Materials description is required"),
    body("story").trim().notEmpty().withMessage("Product story is required"),
    body("images")
      .optional()
      .isArray({ min: 1, max: 10 })
      .withMessage("Product must have between 1 and 10 images"),
  ],
  asyncHandler(async (req, res) => {
    console.log("🚀 POST /api/products - Creating new product...");
    console.log("🚀 Request body:", JSON.stringify(req.body, null, 2));
    console.log("🚀 User info:", {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role,
      verification: req.user.verification?.status || "not_submitted",
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("❌ Validation errors:", errors.array());
      return res.status(400).json({
        error: "Validation failed",
        message: "Please check your product information",
        code: "VALIDATION_ERROR",
        details: errors.array(),
      });
    }

    try {
      // Prepare product data with proper structure
      // enforce minimum requirements for publishing
      const requestedStatus = req.body.status || "active";
      // guard against client sending temporary blob URLs
      if (
        req.body.images &&
        req.body.images.some((img) => img.url && img.url.startsWith("blob:"))
      ) {
        return res.status(400).json({
          error: "Validation failed",
          message: "Some images have not been uploaded yet",
          code: "VALIDATION_ERROR",
          details: [
            {
              field: "images",
              message: "Image URLs must be permanent file paths or URLs",
            },
          ],
        });
      }
      if (requestedStatus === "active") {
        if (!req.body.price || req.body.price <= 0) {
          return res.status(400).json({
            error: "Validation failed",
            message: "Price must be greater than 0 to publish",
            code: "VALIDATION_ERROR",
          });
        }
        if (!req.body.category) {
          return res.status(400).json({
            error: "Validation failed",
            message: "Category is required to publish",
            code: "VALIDATION_ERROR",
          });
        }
        if (!req.body.images || req.body.images.length === 0) {
          return res.status(400).json({
            error: "Validation failed",
            message: "At least one image is required to publish",
            code: "VALIDATION_ERROR",
          });
        }
      }

      // sanitize video URL: drop if invalid so product still saves
      const videoCandidate = req.body.videoUrl || "";
      const validVideo = (url) => {
        if (!url) return true;
        return (
          /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com|facebook\.com)(\/(watch|videos)\/|\/).+/i.test(
            url,
          ) || /\.mp4($|\?)/i.test(url)
        );
      };
      const videoUrl = validVideo(videoCandidate) ? videoCandidate : "";
      if (videoCandidate && !videoUrl) {
        console.warn("Ignoring invalid video URL:", videoCandidate);
      }

      const productData = {
        name: (req.body.name || "").trim(),
        description: (req.body.description || "").trim(),
        shortDescription: (req.body.shortDescription || "").trim(),
        slug: req.body.slug || (req.body.name || "product").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now(),
        originRegion: (req.body.originRegion || "").trim(),
        price: req.body.price,
        category: req.body.category,
        materials: req.body.materials || "",
        dimensions: req.body.dimensions || "",
        craftingTime: Number(req.body.craftingTime) || 0,
        story: req.body.story || "",
        careInstructions: req.body.careInstructions || "",
        weight: req.body.weight || 0,
        videoUrl,
        images: req.body.images || [],
        customizable: req.body.customizable || false,
        tags: req.body.tags || [],
        culturalTags: req.body.culturalTags || [],
        variations: (req.body.variations || []).map(v => ({
          size: v.size,
          color: v.color,
          colorHex: v.colorHex,
          quantity: Number(v.quantity) || 0,
          sku: v.sku || "",
          price: v.price ? Number(v.price) : undefined,
          image: v.image || ""
        })),
        seo: {
          title: req.body.seo?.title || "",
          description: req.body.seo?.description || "",
          keywords: req.body.seo?.keywords || []
        },
        shipping: {
          weight: req.body.shipping?.weight || req.body.weight || 0,
          shippingClass: req.body.shipping?.shippingClass || "",
          estimatedDelivery: req.body.shipping?.estimatedDelivery || "",
          lowStockThreshold: req.body.shipping?.lowStockThreshold || 5
        },
        artisan: req.user._id,
        status: requestedStatus,
        isAvailable: requestedStatus === "active",
        inventory: {
          // quantity will be corrected by pre-save hook if variations provided
          quantity: 1,
          reserved: 0,
        },
        metrics: {
          views: 0,
          likes: 0,
          purchases: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log(
        "📦 Prepared product data:",
        JSON.stringify(productData, null, 2),
      );

      // Create and save product
      const product = new Product(productData);
      console.log("💾 Saving product to MongoDB...");

      const savedProduct = await product.save();
      console.log("✅ Product saved successfully:", {
        id: savedProduct._id,
        name: savedProduct.name,
        artisan: savedProduct.artisan,
        status: savedProduct.status,
      });

      // Log business event
      logBusinessEvent("product_created", req.user._id, {
        productId: savedProduct._id,
        category: savedProduct.category,
        price: savedProduct.price,
        status: savedProduct.status,
      });

      // Activity logging depending on status
      try {
        if (savedProduct.status === "draft") {
          await logActivity({
            userId: req.user._id.toString(),
            action: "product_draft_saved",
            details: {
              productId: savedProduct._id.toString(),
              productName: savedProduct.name,
            },
            message: `Saved draft product: ${savedProduct.name}`,
          });
        } else if (savedProduct.status === "active") {
          await logActivity({
            userId: req.user._id.toString(),
            action: "product_published",
            details: {
              productId: savedProduct._id.toString(),
              productName: savedProduct.name,
              category: savedProduct.category,
              price: savedProduct.price,
            },
            message: `Published product: ${savedProduct.name}`,
          });
        }
      } catch (logError) {
        console.error(
          "[Activity Logger] Failed to log product status event:",
          logError.message,
        );
      }

      // Populate artisan info for response
      const populatedProduct = await Product.findById(
        savedProduct._id,
      ).populate("artisan", "profile.firstName profile.lastName email");

      console.log("✅ Product creation completed successfully");

      res.status(201).json({
        success: true,
        message: "Product created successfully",
        product: populatedProduct,
      });
    } catch (error) {
      console.error("❌ Error creating product:", error);
      console.error("❌ Error stack:", error.stack);

      if (error.name === "ValidationError") {
        console.log("❌ MongoDB validation error:", error.errors);
        // customize message for commonly missing required fields
        const fields = Object.keys(error.errors || {});
        let message = "Product data does not meet requirements";
        if (fields.includes("materials") && fields.includes("story")) {
          message = "Materials and Story are required";
        } else if (fields.includes("materials")) {
          message = "Materials description is required";
        } else if (fields.includes("story")) {
          message = "Product story is required";
        }
        return res.status(400).json({
          error: "Database validation failed",
          message,
          code: "DB_VALIDATION_ERROR",
          details: Object.keys(error.errors).map((key) => ({
            field: key,
            message: error.errors[key].message,
          })),
        });
      }

      if (error.code === 11000) {
        console.log("❌ Duplicate key error:", error.keyPattern);
        let message = "A product with this information already exists";
        
        // Identify which field caused the duplicate error
        if (error.keyPattern) {
          if (error.keyPattern.name) {
            message = "A product with this name already exists. Please choose a unique name.";
          } else if (error.keyPattern.slug) {
            message = "A product with this URL slug already exists (duplicate name/slug).";
          } else if (error.keyPattern.sku || JSON.stringify(error.keyPattern).includes('sku')) {
            message = "This SKU is already in use. Each product/variant must have a unique SKU.";
          }
        }

        return res.status(400).json({
          error: "Duplicate product",
          message,
          code: "DUPLICATE_PRODUCT",
          field: error.keyPattern ? Object.keys(error.keyPattern)[0] : null
        });
      }

      res.status(500).json({
        error: "Server error",
        message: "Failed to create product. Please try again.",
        code: "INTERNAL_ERROR",
      });
    }
  }),
);

/**
 * @route   PUT /api/products/:id
 * @desc    Update product (Artisan owner only)
 * @access  Private (Artisan owner)
 */
router.put(
  "/:id",
  authenticate,
  requireArtisan,
  [
    body("name")
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage("Product name must be between 3 and 100 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ min: 20, max: 2000 })
      .withMessage("Description must be between 20 and 2000 characters"),
    body("price")
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage("Price must be a positive number"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: errors.array(),
      });
    }

    const { id } = req.params;
    const updateData = { ...req.body };

    // Sanitization for description and names
    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.description) updateData.description = updateData.description.trim();
    if (updateData.shortDescription) updateData.shortDescription = updateData.shortDescription.trim();

    // Protection: Prevent overwriting protected fields
    delete updateData._id;
    delete updateData.slug;
    delete updateData.artisan;
    delete updateData.metrics;

    // Support 'stock' from frontend as 'inventory.quantity'
    if (updateData.stock !== undefined && (!updateData.inventory || updateData.inventory.quantity === undefined)) {
      updateData.inventory = updateData.inventory || {};
      updateData.inventory.quantity = Number(updateData.stock);
    }

    // Handle nested variations if price is missing (default to base price)
    if (Array.isArray(updateData.variations)) {
      const basePrice = updateData.price || 0;
      updateData.variations = updateData.variations.map(v => ({
        ...v,
        price: v.price ? Number(v.price) : basePrice,
        quantity: Number(v.quantity) || 0
      }));
    }

    // Check ownership query
    const query = { _id: id };
    if (req.user.role !== "admin") {
      query.artisan = req.user._id;
    }

    // Use findOneAndUpdate for atomic update + ownership check
    const product = await Product.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate("artisan", "profile.firstName profile.lastName email");

    if (!product) {
      throw createForbiddenError("Product not found or you do not have permission to edit it");
    }

    console.log("✅ Product updated successfully:", {
      productId: product._id,
      name: product.name,
      status: product.status
    });

    // Log business event
    logBusinessEvent("product_updated", req.user._id, {
      productId: product._id,
      changes: Object.keys(req.body),
    });

    // Activity logging
    try {
      await logActivity({
        userId: req.user._id.toString(),
        action: "product_updated",
        details: {
          productId: product._id.toString(),
          productName: product.name,
          changedFields: Object.keys(req.body),
        },
        message: `Updated product: ${product.name}`,
      });
    } catch (logError) {
      console.error("[Activity Logger] Failed to log product update:", logError.message);
    }

    res.json({
      message: "Product updated successfully",
      product
    });
  }),
);

/**
 * @route   DELETE /api/products/:id
 * @desc    Permanently delete a product from the database (Artisan owner only)
 *          Also cleans up any uploaded image files associated with the product.
 * @access  Private (Artisan owner)
 */
router.delete(
  "/:id",
  authenticate,
  requireArtisan,
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
      throw createNotFoundError("Product");
    }

    // Check ownership (admins can delete any product)
    if (
      req.user.role !== "admin" &&
      product.artisan.toString() !== req.user._id.toString()
    ) {
      throw createForbiddenError("You can only delete your own products");
    }

    // Remove uploaded images from disk if they use the local uploads directory
    try {
      if (Array.isArray(product.images)) {
        product.images.forEach((img) => {
          if (img.url && img.url.startsWith("/uploads/")) {
            const filePath = path.join(
              __dirname,
              "..",
              img.url.replace(/^\//, ""),
            );
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
        });
      }
    } catch (cleanupErr) {
      // just log and continue – we still delete the product
      console.warn("failed to clean up product image files", cleanupErr);
    }

    // Permanently remove product document
    await Product.findByIdAndDelete(req.params.id);

    // Log business event (category may be undefined once doc removed so grab before)
    logBusinessEvent("product_deleted", req.user._id, {
      productId: product._id,
      category: product.category,
      hardDelete: true,
    });

    res.json({
      message: "Product permanently deleted",
      code: "PRODUCT_DELETED",
    });
  }),
);

/**
 * @route   POST /api/products/:id/like
 * @desc    Like/unlike a product
 * @access  Private
 */
router.post(
  "/:id/like",
  authenticate,
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) {
      throw createNotFoundError("Product");
    }

    // Check if user already liked this product
    const existingInteraction = await UserInteraction.findOne({
      user: req.user._id,
      product: product._id,
      interactionType: "like",
    });

    if (existingInteraction) {
      // Unlike - remove the interaction
      await UserInteraction.deleteOne({ _id: existingInteraction._id });
      product.metrics.likes = Math.max(0, product.metrics.likes - 1);
      await product.save();

      return res.json({
        message: "Product unliked",
        liked: false,
        likes: product.metrics.likes,
      });
    }

    // Like - create interaction
    await UserInteraction.trackInteraction({
      user: req.user._id,
      product: product._id,
      interactionType: "like",
      sessionId: req.sessionID || "anonymous",
    });

    product.metrics.likes += 1;
    await product.save();

    res.json({
      message: "Product liked",
      liked: true,
      likes: product.metrics.likes,
    });
  }),
);

/**
 * @route   POST /api/products/:id/reviews
 * @desc    Add a review to a product
 * @access  Private
 */
router.post(
  "/:id/reviews",
  authenticate,
  [
    body("rating")
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    body("comment")
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage("Comment must be between 10 and 1000 characters"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Please check your review information",
        code: "VALIDATION_ERROR",
        details: errors.array(),
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      throw createNotFoundError("Product");
    }

    // Check if user already reviewed this product
    const existingReview = product.reviews.find(
      (review) => review.userId.toString() === req.user._id.toString(),
    );

    if (existingReview) {
      return res.status(400).json({
        error: "Review already exists",
        message: "You have already reviewed this product",
        code: "DUPLICATE_REVIEW",
      });
    }

    const { rating, comment } = req.body;
    const userName =
      `${req.user.profile?.firstName || ""} ${req.user.profile?.lastName || ""}`.trim() ||
      req.user.email;

    await product.addReview(req.user._id, userName, rating, comment);

    // Log business event
    logBusinessEvent("review_added", req.user._id, {
      productId: product._id,
      rating,
      reviewCount: product.reviews.length,
    });

    res.status(201).json({
      message: "Review added successfully",
      review: product.reviews[product.reviews.length - 1],
      averageRating: product.metrics.averageRating,
      reviewCount: product.metrics.reviewCount,
    });
  }),
);

/**
 * @route   GET /api/products/artisan/:artisanId
 * @desc    Get products by artisan
 * @access  Public
 */
router.get(
  "/artisan/:artisanId",
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 5000 })
      .withMessage("Limit must be between 1 and 5000"),
    query("includeOutOfStock")
      .optional()
      .isBoolean()
      .withMessage("includeOutOfStock must be boolean"),
    query("includeAll")
      .optional()
      .isBoolean()
      .withMessage("includeAll must be boolean"),
  ],
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      includeOutOfStock = "false",
      includeAll = "false",
    } = req.query;
    const { artisanId } = req.params;

    // Normalize flags
    const includeOOS =
      includeOutOfStock === "true" || includeOutOfStock === true;
    const includeEverything = includeAll === "true" || includeAll === true;

    // Build filters - if includeAll is requested, return all products for the artisan
    const filters = { artisan: artisanId };

    if (!includeEverything) {
      // Default dashboard listing shows only active products; but when includeEverything is false
      // we keep the status filter. If includeEverything is true, we intentionally omit status filter
      filters.status = "active";
    }

    if (!includeOOS && !includeEverything) {
      // By default exclude out-of-stock items. includeOutOfStock or includeAll will bypass this.
      filters["inventory.quantity"] = { $gt: 0 };
    }

    // If includeEverything is true we return the full set and do not paginate (useful for dashboards)
    let productsQuery = Product.find(filters)
      .populate(
        "artisan",
        "profile.firstName profile.lastName profile.culturalBackground",
      )
      .populate("promotionId")
      .sort({ createdAt: -1 });

    let products;
    let total;

    if (includeEverything) {
      products = await productsQuery.exec();
      total = products.length;
    } else {
      const skip = (page - 1) * limit;
      products = await productsQuery.skip(skip).limit(parseInt(limit)).exec();
      total = await Product.countDocuments(filters);
    }

    res.json({
      products,
      pagination: {
        currentPage: includeEverything ? 1 : parseInt(page),
        totalPages: includeEverything ? 1 : Math.ceil(total / limit),
        totalProducts: total,
        hasNext: includeEverything ? false : page * limit < total,
        hasPrev: includeEverything ? false : page > 1,
      },
    });
  }),
);

module.exports = router;
