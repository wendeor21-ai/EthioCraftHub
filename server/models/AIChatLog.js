/**
 * AIChatLog Model for EthioCraft Global
 *
 * Audit trail for all Zema AI interactions
 * - Tracks every conversation with Gemini AI
 * - Enables admin monitoring and compliance
 * - Stores sanitized queries and responses
 * - Provides security audit capabilities
 */

const mongoose = require("mongoose");

const aiChatLogSchema = new mongoose.Schema(
  {
    // User information
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Allow anonymous users
      index: true,
    },
    userEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    userRole: {
      type: String,
      enum: ["customer", "artisan", "admin", "anonymous"],
      default: "anonymous",
    },

    // Conversation data
    userQuery: {
      type: String,
      required: [true, "User query is required"],
      trim: true,
      maxlength: [2000, "Query cannot exceed 2000 characters"],
    },
    sanitizedQuery: {
      type: String,
      required: true,
      trim: true,
    },
    aiResponse: {
      type: String,
      required: false,
      trim: true,
      default: "",
      maxlength: [10000, "Response cannot exceed 10000 characters"],
    },

    // Context and metadata
    conversationContext: {
      type: String,
      enum: [
        "general",
        "product",
        "order",
        "error",
        "general_query",
        "analytics",
        "product_search",
        "product_recommendation",
        "cultural_info",
        "review_analysis",
      ],
      default: "general",
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: false,
    },

    // Security flags
    containsSensitiveData: {
      type: Boolean,
      default: false,
    },
    sanitizationApplied: {
      type: Boolean,
      default: false,
    },
    flaggedForReview: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Performance metrics
    responseTime: {
      type: Number, // milliseconds
      min: 0,
    },
    tokenCount: {
      type: Number,
      min: 0,
    },

    // Session tracking
    sessionId: {
      type: String,
      index: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },

    // Admin review
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    reviewNotes: {
      type: String,
      trim: true,
      maxlength: [500, "Review notes cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for efficient querying
aiChatLogSchema.index({ createdAt: -1 });
aiChatLogSchema.index({ userId: 1, createdAt: -1 });
aiChatLogSchema.index({ flaggedForReview: 1, createdAt: -1 });
aiChatLogSchema.index({ conversationContext: 1, createdAt: -1 });

// Virtual for formatted timestamp
aiChatLogSchema.virtual("formattedDate").get(function () {
  return this.createdAt.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
});

// Static method to get logs for admin dashboard
aiChatLogSchema.statics.getRecentLogs = function (limit = 50, filters = {}) {
  return this.find(filters)
    .populate("userId", "email profile.firstName profile.lastName role")
    .populate("productId", "name category")
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get flagged logs
aiChatLogSchema.statics.getFlaggedLogs = function (limit = 20) {
  return this.find({ flaggedForReview: true })
    .populate("userId", "email profile.firstName profile.lastName role")
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get user conversation history
aiChatLogSchema.statics.getUserHistory = function (userId, limit = 20) {
  return this.find({ userId }).sort({ createdAt: -1 }).limit(limit);
};

// Static method to get analytics
aiChatLogSchema.statics.getAnalytics = async function (startDate, endDate) {
  const match = {};
  if (startDate) match.createdAt = { $gte: new Date(startDate) };
  if (endDate)
    match.createdAt = { ...match.createdAt, $lte: new Date(endDate) };

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalQueries: { $sum: 1 },
        avgResponseTime: { $avg: "$responseTime" },
        totalTokens: { $sum: "$tokenCount" },
        flaggedCount: {
          $sum: { $cond: ["$flaggedForReview", 1, 0] },
        },
        contextBreakdown: {
          $push: "$conversationContext",
        },
      },
    },
  ]);
};

module.exports = mongoose.model("AIChatLog", aiChatLogSchema);
