/**
 * User Routes for EthioCraft Global
 *
 * Handles user management and profiles:
 * - User profile management
 * - Artisan verification submission
 * - User preferences and settings
 * - Public artisan profiles
 */

const express = require("express");
const { body, validationResult } = require("express-validator");
const fs = require("fs");
const path = require("path");
const User = require("../models/User");
const {
  authenticate,
  authorize,
  requireOwnership,
} = require("../middleware/auth");
const {
  asyncHandler,
  createNotFoundError,
  createForbiddenError,
} = require("../middleware/errorHandler");
const { logBusinessEvent } = require("../middleware/logger");

const router = express.Router();

/**
 * @route   GET /api/users/artisans
 * @desc    Get verified artisans (public profiles)
 * @access  Public
 */
router.get(
  "/artisans",
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, specialty } = req.query;
    const skip = (page - 1) * limit;

    const filter = {
      role: "artisan",
      "verification.status": "approved",
      isActive: true,
    };

    if (specialty) {
      filter["profile.specialties"] = specialty;
    }

    const artisans = await User.find(filter)
      .select("profile verification createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      artisans,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalArtisans: total,
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  }),
);

/**
 * @route   GET /api/users/artisan/:id
 * @desc    Get single artisan profile
 * @access  Public
 */
router.get(
  "/artisan/:id",
  asyncHandler(async (req, res, next) => {
    // Placeholder moved earlier — pass through to next route so specific
    // artisan endpoints like '/artisan/dashboard-stats' are matched below.
    return next();
  }),
);

/**
 * @route   POST /api/users/verification
 * @desc    Submit artisan verification documents
 * @access  Private (Artisans only)
 */
router.post(
  "/verification",
  authenticate,
  authorize("artisan"),
  [
    body("culturalBackground")
      .trim()
      .isLength({ min: 50, max: 500 })
      .withMessage("Cultural background must be between 50 and 500 characters"),
    body("specialties")
      .isArray({ min: 1 })
      .withMessage("At least one specialty is required"),
    body("documents")
      .isArray({ min: 1, max: 5 })
      .withMessage("Please upload 1-5 verification documents"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Please check your verification information",
        code: "VALIDATION_ERROR",
        details: errors.array(),
      });
    }

    const user = await User.findById(req.user._id);

    // Check if already verified
    if (user.verification.status === "approved") {
      return res.status(409).json({
        error: "Already verified",
        message: "Your artisan account is already verified",
        code: "ALREADY_VERIFIED",
      });
    }

    // Duplicate prevention: ensure no other user has the same document filename,
    // or matching business license / id numbers if provided
    const docs = req.body.documents || [];
    const businessLicense = req.body.businessLicenseNumber || null;
    const idNumber = req.body.idNumber || null;

    const duplicateQueryOr = [];
    if (docs.length > 0)
      duplicateQueryOr.push({ "verification.documents": { $in: docs } });
    if (businessLicense)
      duplicateQueryOr.push({
        "profile.businessInfo.businessLicenseNumber": businessLicense,
      });
    if (idNumber)
      duplicateQueryOr.push({ "profile.businessInfo.idNumber": idNumber });

    if (duplicateQueryOr.length > 0) {
      const dup = await User.findOne({
        _id: { $ne: user._id },
        $or: duplicateQueryOr,
      }).select("email profile verification");
      if (dup) {
        return res.status(409).json({
          error: "Duplicate application",
          message:
            "A verification with matching documents or business/ID number already exists",
          code: "DUPLICATE_VERIFICATION",
          duplicate: { userId: dup._id, email: dup.email },
        });
      }
    }

    // Update profile and verification info
    user.profile.culturalBackground = req.body.culturalBackground;
    user.profile.specialties = req.body.specialties;
    user.profile.bio = req.body.bio;

    // Store provided business/id numbers if supplied
    if (req.body.businessLicenseNumber) {
      user.profile.businessInfo = user.profile.businessInfo || {};
      user.profile.businessInfo.businessLicenseNumber =
        req.body.businessLicenseNumber;
    }
    if (req.body.idNumber) {
      user.profile.businessInfo = user.profile.businessInfo || {};
      user.profile.businessInfo.idNumber = req.body.idNumber;
    }

    user.verification = {
      status: "pending",
      documents: req.body.documents,
      submittedAt: new Date(),
      feedback: null,
    };

    await user.save();

    // Log business event
    logBusinessEvent("verification_submitted", user._id, {
      specialties: req.body.specialties,
      documentCount: req.body.documents.length,
    });

    res.json({
      message: "Verification documents submitted successfully",
      verification: user.verification,
    });
  }),
);

/**
 * @route   GET /api/users/profile
 * @desc    Get current user's full profile
 * @access  Private
 */
router.get(
  "/profile",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate(
      "verification.reviewedBy",
      "profile.firstName profile.lastName",
    );

    res.json({
      profile: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        verification: user.verification,
        preferences: user.preferences,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
    });
  }),
);

/**
 * @route   PUT /api/users/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put(
  "/preferences",
  authenticate,
  [
    body("categories")
      .optional()
      .isArray()
      .withMessage("Categories must be an array"),
    body("categories.*")
      .optional()
      .isIn(["Textiles", "Leather", "Basketry", "Jewelry"])
      .withMessage("Invalid category"),
    body("priceRange.min")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Minimum price must be a positive number"),
    body("priceRange.max")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Maximum price must be a positive number"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Please check your preferences",
        code: "VALIDATION_ERROR",
        details: errors.array(),
      });
    }

    const user = await User.findById(req.user._id);

    // Update preferences
    if (req.body.categories !== undefined) {
      user.preferences.categories = req.body.categories;
    }

    if (req.body.priceRange) {
      if (req.body.priceRange.min !== undefined) {
        user.preferences.priceRange.min = req.body.priceRange.min;
      }
      if (req.body.priceRange.max !== undefined) {
        user.preferences.priceRange.max = req.body.priceRange.max;
      }
    }

    if (req.body.culturalInterests) {
      user.preferences.culturalInterests = req.body.culturalInterests;
    }

    await user.save();

    res.json({
      message: "Preferences updated successfully",
      preferences: user.preferences,
    });
  }),
);

module.exports = router;

/**
 * Public: GET /api/artisan/stats
 * Provide artisan dashboard stats at a short path used by the client.
 * Access: Private (artisan)
 */
router.get(
  "/artisan/stats",
  authenticate,
  authorize("artisan"),
  asyncHandler(async (req, res) => {
    // Re-use existing dashboard aggregation logic
    const artisanId = req.user._id;
    const Product = require("../models/Product");
    const Order = require("../models/Order");
    const mongoose = require("../lib/mongoose");

    try {
      const totalProducts = await Product.countDocuments({
        artisan: artisanId,
      });
      const activeProducts = await Product.countDocuments({
        artisan: artisanId,
        status: "active",
      });

      const productMetrics = await Product.aggregate([
        { $match: { artisan: mongoose.Types.ObjectId(artisanId) } },
        {
          $group: {
            _id: null,
            totalViews: { $sum: "$metrics.views" },
            totalLikes: { $sum: "$metrics.likes" },
          },
        },
      ]);

      const orderStats = await Order.aggregate([
        {
          $match: {
            "items.artisan": mongoose.Types.ObjectId(artisanId),
            status: { $in: ["pending", "processing", "shipped", "delivered"] },
          },
        },
        { $unwind: "$items" },
        { $match: { "items.artisan": mongoose.Types.ObjectId(artisanId) } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: {
              $sum: { $multiply: ["$items.price", "$items.quantity"] },
            },
            completedOrders: {
              $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
            },
            pendingOrders: {
              $sum: {
                $cond: [{ $in: ["$status", ["pending", "processing"]] }, 1, 0],
              },
            },
            newOrders: {
              $sum: {
                $cond: [{ $in: ["$status", ["pending", "confirmed"]] }, 1, 0],
              },
            },
          },
        },
      ]);

      const ratingStats = await Product.aggregate([
        { $match: { artisan: mongoose.Types.ObjectId(artisanId) } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$metrics.averageRating" },
            totalReviews: { $sum: "$metrics.reviewCount" },
          },
        },
      ]);

      const recentOrders = await Order.find({ "items.artisan": artisanId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("orderNumber status totals createdAt items");

      const stats = {
        products: {
          totalProducts: totalProducts || 0,
          activeProducts: activeProducts || 0,
          totalViews: productMetrics[0]?.totalViews || 0,
          totalLikes: productMetrics[0]?.totalLikes || 0,
        },
        orders: {
          totalOrders: orderStats[0]?.totalOrders || 0,
          totalRevenue: orderStats[0]?.totalRevenue || 0,
          completedOrders: orderStats[0]?.completedOrders || 0,
          pendingOrders: orderStats[0]?.pendingOrders || 0,
          newOrders: orderStats[0]?.newOrders || 0,
        },
        rating: {
          averageRating: ratingStats[0]?.averageRating || 0,
          totalReviews: ratingStats[0]?.totalReviews || 0,
        },
        recentOrders: recentOrders.map((o) => ({
          orderNumber: o.orderNumber,
          status: o.status,
          total: o.totals || o.totalAmount || 0,
          createdAt: o.createdAt,
        })),
      };

      res.json({ success: true, stats });
    } catch (err) {
      console.error("artisan/stats error", err);
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch artisan stats" });
    }
  }),
);

/**
 * GET /api/users/audit-logs
 * Return audit/security logs filtered to the current user (artisan)
 */
router.get(
  "/audit-logs",
  authenticate,
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit || "10", 10);
    try {
      const dataPath = path.join(__dirname, "..", "data", "audit-logs.json");
      let logs = [];
      if (fs.existsSync(dataPath)) {
        try {
          logs = JSON.parse(fs.readFileSync(dataPath));
        } catch (e) {
          logs = [];
        }
      }

      const uid = String(req.user._id);
      const filtered = (logs || [])
        .filter((l) => {
          if (!l) return false;
          if (String(l.userId || l.user || l.actor || "") === uid) return true;
          if (l.adminEmail && String(req.user.email) === String(l.adminEmail))
            return true;
          if (l.details && String(l.details).includes(uid)) return true;
          if (
            l.target &&
            (String(l.target) === uid || String(l.target) === req.user.email)
          )
            return true;
          return false;
        })
        .slice(0, limit);

      res.json({ logs: filtered });
    } catch (err) {
      console.error("audit-logs read error", err);
      res.status(500).json({ error: "Failed to read audit logs" });
    }
  }),
);

/**
 * @route   GET /api/users/artisan/dashboard-stats
 * @desc    Get real-time dashboard statistics and low stock alerts for artisan
 * @access  Private (Artisan only)
 */
router.get(
  "/artisan/dashboard-stats",
  authenticate,
  authorize("artisan"),
  asyncHandler(async (req, res) => {
    const artisanId = req.user._id;
    const Product = require("../models/Product");
    const Order = require("../models/Order");
    const mongoose = require("../lib/mongoose");

    try {
      // 1. Product Statistics & Low Stock Alerts
      const products = await Product.find({ artisan: artisanId });
      
      const totalProducts = products.length;
      const activeProducts = products.filter(p => p.status === 'active').length;
      
      const lowStockAlerts = products.filter(p => {
        const qty = p.inventory?.quantity ?? 0;
        const threshold = p.shipping?.lowStockThreshold || 5;
        // Only alert on non-negative quantities that are at or below the threshold.
        // A threshold >= the product's typical max stock means it was misconfigured;
        // cap it at 50 to avoid permanent false alerts on unique/handmade items.
        const effectiveThreshold = Math.min(threshold, 50);
        return qty >= 0 && qty <= effectiveThreshold;
      }).map(p => ({
        id: p._id,
        name: p.name,
        quantity: p.inventory?.quantity ?? 0,
        threshold: Math.min(p.shipping?.lowStockThreshold || 5, 50),
      }));

      const productMetrics = await Product.aggregate([
        { $match: { artisan: new mongoose.Types.ObjectId(artisanId) } },
        {
          $group: {
            _id: null,
            totalViews: { $sum: "$metrics.views" },
            totalLikes: { $sum: "$metrics.likes" },
            averageRating: { $avg: "$metrics.averageRating" },
            totalReviews: { $sum: "$metrics.reviewCount" },
          },
        },
      ]);

      // 2. Order Statistics & Revenue (Compatible with MySQL JSON containment)
      const aid = String(artisanId);
      const { prisma } = require("../lib/prisma");

      let artisanOrders = [];
      try {
        artisanOrders = await prisma.$queryRawUnsafe(
          `SELECT id, orderNumber, status, totals, items, createdAt FROM orders WHERE artisanId = ? OR JSON_CONTAINS(items, ?) OR JSON_CONTAINS(items, ?) ORDER BY createdAt DESC`,
          aid,
          JSON.stringify({ artisan: aid }),
          JSON.stringify({ artisan: { _id: aid } })
        );
      } catch (e) {
        artisanOrders = await prisma.order.findMany({
          where: { artisanId: aid },
          select: { id: true, orderNumber: true, status: true, totals: true, items: true, createdAt: true },
          orderBy: { createdAt: 'desc' }
        });
      }

      const totalOrders = (artisanOrders || []).length;
      const pendingOrdersList = (artisanOrders || []).filter(o =>
        ['pending', 'pending verification'].includes((o.status || '').toLowerCase())
      );
      const pendingOrdersCount = pendingOrdersList.length;

      // Compute total revenue earned by this artisan
      let totalRevenue = 0;
      for (const order of (artisanOrders || [])) {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
        const myItems = Array.isArray(items) ? items.filter(i => {
          const art = i.artisan?._id || i.artisan?.id || i.artisan;
          return String(art) === aid;
        }) : [];
        const orderRev = myItems.reduce((sum, i) => sum + ((Number(i.price) || 0) * (Number(i.quantity) || 1)), 0);
        totalRevenue += orderRev;
      }

      // 3. Recent Orders — only surface items belonging to this artisan
      const recentOrders = pendingOrdersList.slice(0, 10).map(order => {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
        const myItems = Array.isArray(items) ? items.filter(i => {
          const art = i.artisan?._id || i.artisan?.id || i.artisan;
          return String(art) === aid;
        }) : [];
        const myTotal = myItems.reduce((sum, i) => sum + ((Number(i.price) || 0) * (Number(i.quantity) || 1)), 0);
        return {
          id: String(order.id),
          orderNumber: order.orderNumber,
          total: myTotal,
          status: order.status,
          date: order.createdAt,
          createdAt: order.createdAt
        };
      });

      // Canonical response object — all fields are scoped to artisanId
      const stats = {
        products: totalProducts,
        totalProducts,
        activeProducts,
        orders: totalOrders,
        totalOrders,
        revenue: totalRevenue,
        totalRevenue,
        pendingOrders: pendingOrdersCount,
        pendingOrdersCount,
        newOrders: pendingOrdersCount,
        rating: productMetrics[0]?.averageRating || 4.8,
        reviews: productMetrics[0]?.totalReviews || 0,
        views: productMetrics[0]?.totalViews || 0,
        likes: productMetrics[0]?.totalLikes || 0,
        lowStockAlerts,
        recentOrders,
      };

      res.json({ 
        success: true, 
        stats,
        data: stats // Compatibility with both shapes
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch dashboard statistics",
        error: error.message,
      });
    }
  }),
);


/**
 * @route   GET /api/users/artisan/:id
 * @desc    Get single artisan profile (moved below other artisan routes to avoid collisions)
 * @access  Public
 */
router.get(
  "/artisan/:id",
  asyncHandler(async (req, res) => {
    const artisan = await User.findOne({
      _id: req.params.id,
      role: "artisan",
      "verification.status": "approved",
      isActive: true,
    }).select("profile verification createdAt");

    if (!artisan) {
      throw createNotFoundError("Artisan profile");
    }

    res.json({
      artisan: {
        id: artisan._id,
        name: artisan.fullName,
        profile: artisan.profile,
        verification: {
          status: artisan.verification.status,
          reviewedAt: artisan.verification.reviewedAt,
        },
        memberSince: artisan.createdAt,
      },
    });
  }),
);
