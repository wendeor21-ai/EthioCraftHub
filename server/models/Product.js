/**
 * Product Model for EthioCraft Global
 *
 * Represents handcrafted items created by Ethiopian artisans with:
 * - Cultural storytelling and heritage documentation
 * - AI-generated tags for enhanced discoverability
 * - Category-based organization (Textiles, Leather, Basketry, Jewelry)
 * - Image management and inventory tracking
 * - Performance metrics for recommendations
 */

const mongoose = require("mongoose");

// Cultural story schema for heritage preservation
const culturalStorySchema = new mongoose.Schema(
  {
    origin: {
      type: String,
      trim: true,
      maxlength: [300, "Origin description cannot exceed 300 characters"],
    },
    techniques: [
      {
        type: String,
        trim: true,
        maxlength: [100, "Technique description cannot exceed 100 characters"],
      },
    ],
    materials: [
      {
        type: String,
        trim: true,
        maxlength: [50, "Material name cannot exceed 50 characters"],
      },
    ],
    significance: {
      type: String,
      trim: true,
      maxlength: [500, "Cultural significance cannot exceed 500 characters"],
    },
    history: {
      type: String,
      trim: true,
      maxlength: [1000, "Historical context cannot exceed 1000 characters"],
    },
  },
  { _id: false },
);

// Product image schema
const imageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, "Image URL is required"],
      validate: {
        validator: function (v) {
          // Allow local paths (/images or /uploads) or any http(s) URL
          if (typeof v !== "string") return false;
          if (/^\/(images|uploads)\/.+/i.test(v)) {
            // path may or may not include extension, trust public folder
            return true;
          }
          // allow absolute URLs (including Cloudinary, which may include query strings)
          if (/^https?:\/\//i.test(v)) {
            return true;
          }
          return false;
        },
        message: "Image must be a valid URL or relative path",
      },
    },
    alt: {
      type: String,
      trim: true,
      maxlength: [200, "Alt text cannot exceed 200 characters"],
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    viewType: {
      type: String,
      enum: ["front", "back", "side", "detail", "general"],
      default: "general",
    },
  },
  { _id: false },
);

// Product specifications schema
const specificationsSchema = new mongoose.Schema(
  {
    dimensions: {
      type: String,
      trim: true,
      maxlength: [100, "Dimensions cannot exceed 100 characters"],
    },
    weight: {
      type: Number,
      min: [0, "Weight cannot be negative"],
      default: 0,
    },
    materials: [
      {
        type: String,
        trim: true,
        maxlength: [50, "Material name cannot exceed 50 characters"],
      },
    ],
    colors: [
      {
        type: String,
        trim: true,
        maxlength: [30, "Color name cannot exceed 30 characters"],
      },
    ],
    customizable: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

// Inventory management schema
const inventorySchema = new mongoose.Schema(
  {
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0, "Quantity cannot be negative"],
      default: 1,
    },
    isUnique: {
      type: Boolean,
      default: true, // Most artisan products are unique pieces
    },
    restockable: {
      type: Boolean,
      default: false, // Most artisan products are one-of-a-kind
    },
  },
  { _id: false },
);

// Variation sub-schema (size/color/quantity) - used when artisans need multiple options
const variationSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      trim: true,
      required: [true, "Size is required"],
    },
    color: {
      type: String,
      trim: true,
      maxlength: [30, "Color name cannot exceed 30 characters"],
      default: "",
    },
    colorHex: {
      type: String,
      trim: true,
      match: [/^#([0-9A-F]{3}){1,2}$/i, "Invalid hex color"],
    },
    quantity: {
      type: Number,
      min: [0, "Quantity cannot be negative"],
      default: 1,
    },
    sku: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    price: {
      type: Number,
      min: [0, "Variant price cannot be negative"],
    },
    image: {
      type: String,
      trim: true,
    },
  },
  { _id: true },
);

// Review schema for customer feedback
const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    userName: {
      type: String,
      required: [true, "User name is required"],
      trim: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    comment: {
      type: String,
      required: [true, "Comment is required"],
      trim: true,
      minlength: [10, "Comment must be at least 10 characters"],
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
    },
    artisanReply: {
      text: {
        type: String,
        trim: true,
        maxlength: [500, "Reply cannot exceed 500 characters"],
      },
      repliedAt: {
        type: Date,
      },
    },
    flagged: {
      isFlagged: {
        type: Boolean,
        default: false,
      },
      reason: {
        type: String,
        trim: true,
      },
      flaggedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      flaggedAt: {
        type: Date,
      },
    },
    reactions: {
      likes: { type: Number, default: 0 },
      dislikes: { type: Number, default: 0 },
      loves: { type: Number, default: 0 }
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

// Performance metrics for AI recommendations
const metricsSchema = new mongoose.Schema(
  {
    views: {
      type: Number,
      default: 0,
      min: [0, "Views cannot be negative"],
    },
    likes: {
      type: Number,
      default: 0,
      min: [0, "Likes cannot be negative"],
    },
    purchases: {
      type: Number,
      default: 0,
      min: [0, "Purchases cannot be negative"],
    },
    cartAdds: {
      type: Number,
      default: 0,
      min: [0, "Cart additions cannot be negative"],
    },
    averageRating: {
      type: Number,
      min: [0, "Rating cannot be less than 0"],
      max: [5, "Rating cannot be more than 5"],
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: [0, "Review count cannot be negative"],
    },
  },
  { _id: false },
);

// Main Product schema
const productSchema = new mongoose.Schema(
  {
    brandName: {
      type: String,
      trim: true,
      maxlength: [100, "Brand name cannot exceed 100 characters"],
      default: "",
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [3, "Product name must be at least 3 characters"],
      maxlength: [100, "Product name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
      minlength: [20, "Description must be at least 20 characters"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [200, "Short description cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },
    originRegion: {
      type: String,
      trim: true,
      maxlength: [100, "Origin region name is too long"],
    },
    originZone: {
      type: String,
      trim: true,
      maxlength: [100, "Origin zone name is too long"],
    },
    category: {
      type: String,
      required: [true, "Product category is required"],
      enum: {
        values: [
          "Textiles",
          "Jewelry",
          "Pottery",
          "Basketry",
          "Wood Crafts",
          "Leather Goods",
          "Metalwork",
          "Paintings",
        ],
        message:
          "Category must be one of: Textiles, Jewelry, Pottery, Basketry, Wood Crafts, Leather Goods, Metalwork, Paintings",
      },
    },
    // frontend-maintained simple fields
    materials: {
      type: String,
      trim: true,
      maxlength: [200, "Materials description cannot exceed 200 characters"],
      default: "",
    },
    dimensions: {
      type: String,
      trim: true,
      maxlength: [100, "Dimensions cannot exceed 100 characters"],
      default: "",
    },
    craftingTime: {
      type: Number,
      min: [0, "Crafting time cannot be negative"],
      default: 0,
    },
    story: {
      type: String,
      trim: true,
      maxlength: [2000, "Product story cannot exceed 2000 characters"],
      default: "",
    },
    careInstructions: {
      type: String,
      trim: true,
      maxlength: [2000, "Care instructions cannot exceed 2000 characters"],
      default: "",
    },
    weight: {
      type: Number,
      min: [0, "Weight cannot be negative"],
      default: 0,
    },
    videoUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          // allow youtube/vimeo URLs or direct mp4 links (or hosts that provide mp4)
          // accept YouTube, Vimeo, Facebook (watch/videos) or any mp4 link
          if (
            /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com|facebook\.com)(\/(watch|videos)\/|\/).+/i.test(
              v,
            )
          )
            return true;
          if (/\.mp4($|\?)/i.test(v)) return true;
          return false;
        },
        message:
          "Video URL must be a valid YouTube, Vimeo, Facebook video or direct MP4 link",
      },
    },
    subcategory: {
      type: String,
      trim: true,
      maxlength: [50, "Subcategory cannot exceed 50 characters"],
      validate: {
        validator: function (v) {
          if (!v) return true; // Optional field

          const subcategories = {
            Textiles: [
              "Traditional Clothing",
              "Scarves",
              "Blankets",
              "Table Runners",
              "Wall Hangings",
            ],
            Jewelry: [
              "Necklaces",
              "Bracelets",
              "Earrings",
              "Rings",
              "Traditional Ornaments",
            ],
            Pottery: [
              "Bowls",
              "Vases",
              "Plates",
              "Ceremonial Items",
              "Decorative Pieces",
            ],
            Basketry: [
              "Storage Baskets",
              "Decorative Baskets",
              "Trays",
              "Containers",
              "Art Pieces",
            ],
            "Wood Crafts": [
              "Furniture",
              "Utensils",
              "Sculptures",
              "Decorative Items",
              "Tools",
            ],
            "Leather Goods": [
              "Bags",
              "Shoes",
              "Belts",
              "Wallets",
              "Decorative Items",
            ],
            Metalwork: [
              "Jewelry",
              "Tools",
              "Decorative Items",
              "Ceremonial Objects",
              "Utensils",
            ],
            Paintings: [
              "Religious Icons",
              "Cultural Scenes",
              "Portraits",
              "Abstract Art",
              "Traditional Art",
            ],
          };

          return subcategories[this.category]?.includes(v);
        },
        message: "Invalid subcategory for the selected category",
      },
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
      validate: {
        validator: function (v) {
          return v > 0;
        },
        message: "Price must be greater than 0",
      },
    },
    currency: {
      type: String,
      default: "ETB",
      enum: ["ETB", "USD", "EUR"],
      uppercase: true,
    },
    artisan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Artisan reference is required"],
      // Removed verification requirement to allow unverified artisans
    },
    images: {
      type: [imageSchema],
      default: [],
      validate: {
        validator: function (v) {
          return !v || v.length <= 10; // Allow empty array or up to 10 images
        },
        message: "Product cannot have more than 10 images",
      },
    },
    culturalStory: {
      type: culturalStorySchema,
      default: () => ({}), // Make it optional with default empty object
    },
    specifications: {
      type: specificationsSchema,
      default: () => ({}),
    },
    inventory: {
      type: inventorySchema,
      default: () => ({}),
    },
    aiTags: [
      {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: [30, "AI tag cannot exceed 30 characters"],
      },
    ],
    // additional cultural tags for internal filtering (e.g. Gojjam, Wolayta etc.)
    culturalTags: [
      {
        type: String,
        trim: true,
        maxlength: [50, "Cultural tag cannot exceed 50 characters"],
      },
    ],
    // product variations (size/color combos) with separate quantities
    variations: {
      type: [variationSchema],
      default: [],
    },
    // dynamic custom specifications/options
    options: [{
      name: { type: String, trim: true, required: true },
      values: [{ type: String, trim: true }]
    }],
    metrics: {
      type: metricsSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: {
        values: ["draft", "active", "sold", "inactive"],
        message: "Status must be one of: draft, active, sold, inactive",
      },
      default: "draft",
    },
    featured: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: [30, "Tag cannot exceed 30 characters"],
      },
    ],
    reviews: {
      type: [reviewSchema],
      default: [],
    },
    promotionActive: {
      type: Boolean,
      default: false,
    },
    promotionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Promotion",
      default: null,
    },
    discountPrice: {
      type: Number,
      min: [0, "Discount price cannot be negative"],
      default: null,
    },
    seo: {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
      keywords: [{ type: String, trim: true }],
    },
    shipping: {
      weight: { type: Number, min: 0, default: 0 },
      shippingClass: { type: String, trim: true },
      estimatedDelivery: { type: String, trim: true },
      lowStockThreshold: { type: Number, default: 5 },
    },
    // Used for AI Image Similarity Search
    imageFeatureVector: {
      type: [Number],
      default: undefined
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// compute total quantity taking variations into account
productSchema.virtual("totalQuantity").get(function () {
  if (this.variations && this.variations.length > 0) {
    return this.variations.reduce((sum, v) => sum + (v.quantity || 0), 0);
  }
  const inv = this.inventory || {};
  return inv.quantity || 0;
});

// Virtual for availability status (updated to use totalQuantity)
productSchema.virtual("isAvailable").get(function () {
  return this.status === "active" && this.totalQuantity > 0;
});

// Virtual for primary image
productSchema.virtual("primaryImage").get(function () {
  const imgs = this.images || [];
  const primary = imgs.find((img) => img && img.isPrimary);
  return primary ? primary.url : imgs[0] ? imgs[0].url : null;
});

// Virtual for backward compatibility - single image URL
productSchema.virtual("image").get(function () {
  return this.primaryImage;
});

// Virtual for additional images (all non-primary images)
productSchema.virtual("additionalImages").get(function () {
  const imgs = this.images || [];
  return imgs.filter((img) => img && !img.isPrimary).map((img) => img.url);
});

// Virtual for price in USD (approximate conversion)
productSchema.virtual("priceUSD").get(function () {
  if (this.currency === "USD") return this.price;
  if (this.currency === "ETB") return Math.round((this.price / 55) * 100) / 100; // Approximate ETB to USD
  if (this.currency === "EUR") return Math.round(this.price * 1.1 * 100) / 100; // Approximate EUR to USD
  return this.price;
});

// Pre-save middleware to generate AI tags
productSchema.pre("save", function (next) {
  if (
    this.isModified("name") ||
    this.isModified("description") ||
    this.isModified("category")
  ) {
    this.generateAITags();
  }

  // If variations are defined, compute inventory.quantity as total
  if (this.variations && this.variations.length > 0) {
    const total = this.variations.reduce(
      (sum, v) => sum + (v.quantity || 0),
      0,
    );
    this.inventory = this.inventory || {};
    this.inventory.quantity = total;
  }

  // Ensure only one primary image
  if (this.images && this.images.length > 0) {
    const primaryImages = this.images.filter((img) => img.isPrimary);
    if (primaryImages.length === 0) {
      this.images[0].isPrimary = true;
    } else if (primaryImages.length > 1) {
      this.images.forEach((img, index) => {
        img.isPrimary = index === 0;
      });
    }
  }

  next();
});

// Method to generate AI tags based on product content
productSchema.methods.generateAITags = function () {
  const tags = new Set();

  // Add category-based tags
  tags.add(this.category.toLowerCase());
  if (this.subcategory) {
    tags.add(this.subcategory.toLowerCase().replace(/\s+/g, "-"));
  }

  // Extract keywords from name and description
  const text = `${this.name} ${this.description}`.toLowerCase();
  const keywords = text.match(/\b\w{3,}\b/g) || [];

  // Add relevant keywords
  const relevantKeywords = keywords.filter(
    (word) =>
      ![
        "the",
        "and",
        "for",
        "with",
        "this",
        "that",
        "from",
        "made",
        "hand",
        "craft",
      ].includes(word),
  );

  relevantKeywords.slice(0, 10).forEach((keyword) => tags.add(keyword));

  // Add cultural context tags
  if (this.culturalStory) {
    if (this.culturalStory.materials) {
      this.culturalStory.materials.forEach((material) =>
        tags.add(material.toLowerCase().replace(/\s+/g, "-")),
      );
    }
    if (this.culturalStory.techniques) {
      this.culturalStory.techniques.forEach((technique) =>
        tags.add(technique.toLowerCase().replace(/\s+/g, "-")),
      );
    }
  }

  // Add specification tags
  if (this.specifications.colors) {
    this.specifications.colors.forEach((color) =>
      tags.add(color.toLowerCase()),
    );
  }

  // Convert to array and limit to 20 tags
  this.aiTags = Array.from(tags).slice(0, 20);
};

// Method to increment view count
productSchema.methods.incrementViews = function () {
  this.metrics.views += 1;
  // Avoid running full validation here so negative inventory values don't block view increments
  return this.save({ validateBeforeSave: false });
};

// Method to add to cart tracking
productSchema.methods.incrementCartAdds = function () {
  this.metrics.cartAdds += 1;
  // Avoid validation on metrics-only updates
  return this.save({ validateBeforeSave: false });
};

// Method to record purchase
productSchema.methods.recordPurchase = function (quantity = 1) {
  this.metrics.purchases += quantity;
  this.inventory.quantity = Math.max(0, this.inventory.quantity - quantity);

  // Mark as sold if no inventory left and not restockable
  if (this.inventory.quantity === 0 && !this.inventory.restockable) {
    this.status = "sold";
  }

  return this.save();
};

// Method to add review and update metrics
productSchema.methods.addReview = function (userId, userName, rating, comment) {
  this.reviews.push({
    userId,
    userName,
    rating,
    comment,
    createdAt: new Date(),
  });

  // Recalculate average rating
  const totalRating = this.reviews.reduce(
    (sum, review) => sum + review.rating,
    0,
  );
  this.metrics.averageRating = totalRating / this.reviews.length;
  this.metrics.reviewCount = this.reviews.length;

  return this.save();
};

// Method to get cultural story as formatted string
productSchema.methods.getCulturalStoryText = function () {
  if (!this.culturalStory) return "";

  const parts = [];

  if (this.culturalStory.origin) {
    parts.push(`Origin: ${this.culturalStory.origin}`);
  }

  if (this.culturalStory.significance) {
    parts.push(`Cultural Significance: ${this.culturalStory.significance}`);
  }

  if (this.culturalStory.history) {
    parts.push(`History: ${this.culturalStory.history}`);
  }

  if (
    this.culturalStory.techniques &&
    this.culturalStory.techniques.length > 0
  ) {
    parts.push(`Techniques: ${this.culturalStory.techniques.join(", ")}`);
  }

  if (this.culturalStory.materials && this.culturalStory.materials.length > 0) {
    parts.push(`Materials: ${this.culturalStory.materials.join(", ")}`);
  }

  return parts.join("\n\n");
};

// Static method to get products by category
productSchema.statics.getByCategory = function (category, limit = 20) {
  return this.find({
    category,
    status: "active",
    "inventory.quantity": { $gt: 0 },
  })
    .populate(
      "artisan",
      "profile.firstName profile.lastName profile.culturalBackground",
    )
    .limit(limit)
    .sort({ createdAt: -1 });
};

// Static method to search products with AI enhancement
productSchema.statics.searchProducts = function (query, filters = {}) {
  const searchQuery = {
    status: "active",
    "inventory.quantity": { $gt: 0 },
    ...filters,
  };

  if (query) {
    searchQuery.$or = [
      { brandName: { $regex: query, $options: "i" } },
      { name: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
      { materials: { $regex: query, $options: "i" } },
      { culturalTags: { $in: [new RegExp(query, "i")] } },
      { originRegion: { $regex: query, $options: "i" } },
      { originZone: { $regex: query, $options: "i" } },
      { aiTags: { $in: [new RegExp(query, "i")] } },
      { "culturalStory.significance": { $regex: query, $options: "i" } },
    ];
  }

  return this.find(searchQuery)
    .populate(
      "artisan",
      "profile.firstName profile.lastName profile.culturalBackground",
    )
    .sort({ "metrics.views": -1, createdAt: -1 });
};

// Static method to get featured products
productSchema.statics.getFeatured = function (limit = 10) {
  return this.find({
    featured: true,
    status: "active",
    "inventory.quantity": { $gt: 0 },
  })
    .populate("artisan", "profile.firstName profile.lastName")
    .limit(limit)
    .sort({ "metrics.views": -1 });
};

// Indexes for performance optimization
productSchema.index({ category: 1, status: 1 });
productSchema.index({ artisan: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ status: 1, "inventory.quantity": 1 });
productSchema.index({ featured: 1, status: 1 });
productSchema.index({
  brandName: "text",
  name: "text",
  description: "text",
  materials: "text",
  culturalTags: "text",
  originRegion: "text",
  originZone: "text",
  story: "text",
  aiTags: "text",
  "culturalStory.significance": "text",
});

module.exports = mongoose.model("Product", productSchema);
