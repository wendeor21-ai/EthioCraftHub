/**
 * User Model for EthioCraft Global
 *
 * Represents all platform users with role-based access:
 * - Customers: Browse and purchase products
 * - Artisans: Create and manage product listings
 * - Admins: Platform management and moderation
 *
 * Features:
 * - Secure password hashing with bcrypt
 * - Role-based field validation
 * - Artisan verification workflow
 * - Cultural background integration
 * - User preference tracking for AI recommendations
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Address schema for user location information
const addressSchema = new mongoose.Schema(
  {
    street: {
      type: String,
      trim: true,
      maxlength: [200, "Street address cannot exceed 200 characters"],
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, "City name cannot exceed 100 characters"],
    },
    region: {
      type: String,
      trim: true,
      maxlength: [100, "Region name cannot exceed 100 characters"],
    },
    country: {
      type: String,
      trim: true,
      default: "Ethiopia",
      maxlength: [100, "Country name cannot exceed 100 characters"],
    },
    postalCode: {
      type: String,
      trim: true,
      maxlength: [20, "Postal code cannot exceed 20 characters"],
    },
  },
  { _id: false },
);

// Profile schema with cultural integration
const profileSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [2, "First name must be at least 2 characters"],
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: [2, "Last name must be at least 2 characters"],
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          // Ethiopian phone number format validation
          return !v || /^(\+251|0)?[97]\d{8}$/.test(v.replace(/\s/g, ""));
        },
        message: "Please enter a valid Ethiopian phone number",
      },
    },
    address: addressSchema,
    // Cultural fields for artisans
    culturalBackground: {
      type: String,
      trim: true,
      maxlength: [500, "Cultural background cannot exceed 500 characters"],
      validate: {
        validator: function (v) {
          // Required for artisans, optional for others
          return this.parent().role !== "artisan" || (v && v.length > 0);
        },
        message: "Cultural background is required for artisans",
      },
    },
    specialties: [
      {
        type: String,
        enum: [
          "Textiles",
          "Leather",
          "Basketry",
          "Jewelry",
          "Traditional Weaving",
          "Weaving",
          "Traditional Cotton",
          "Textile Art",
          "Pottery",
          "Wood Carving",
        ],
        validate: {
          validator: function (v) {
            // At least one specialty required for artisans
            return this.parent().role !== "artisan" || (v && v.length > 0);
          },
          message: "At least one specialty is required for artisans",
        },
      },
    ],
    bio: {
      type: String,
      trim: true,
      maxlength: [1000, "Bio cannot exceed 1000 characters"],
    },
    profileImage: {
      type: String,
      validate: {
        validator: function (v) {
          return !v || /\.(jpg|jpeg|png|webp)$/i.test(v) || v.startsWith('http');
        },
        message:
          "Profile image must be a valid image file (jpg, jpeg, png, webp)",
      },
    },
    // Avatar URL from social providers (Google profile picture, etc.)
    avatar: {
      type: String,
    },
    // Store branding for artisans
    storeName: String,
    storeLogo: String,
    coverBanner: String,
    phoneNumber: String,
    socialLinks: {
      instagram: String,
      facebook: String,
      twitter: String,
      website: String,
    },
    // Business information for artisan verification
    businessInfo: {
      businessName: String,
      tinNumber: String,
      tradeLicenseNumber: String,
    },
  },
  { _id: false },
);

// Artisan verification schema
const verificationSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["none", "not_submitted", "pending", "under_review", "approved", "rejected"],
      default: "none",
    },
    // Main documents (ID, License, TIN)
    identityCard: { type: String },
    tradeLicense: { type: String },
    tinCertificate: String,
    
    // Portfolio / Proof of work
    productPhotos: [String],
    workVideos: [String],
    
    // Legal
    termsAccepted: {
      type: Boolean,
      default: false
    },
    
    // Legacy support (to avoid breaking existing data)
    documents: [
      {
        type: String, // File paths to uploaded documents
        validate: {
          validator: function (v) {
            return !v || /\.(pdf|jpg|jpeg|png|mp4)$/i.test(v);
          },
          message: "Document must be a valid file format (pdf, jpg, jpeg, png, mp4)",
        },
      },
    ],
    submittedAt: {
      type: Date,
    },
    reviewedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    feedback: {
      type: String,
      trim: true,
      maxlength: [500, "Feedback cannot exceed 500 characters"],
    },
    // Deadline for artisan to resubmit after rejection
    resubmitBy: Date,
  },
  { _id: false },
);

// User preferences for AI recommendations
const preferencesSchema = new mongoose.Schema(
  {
    categories: [
      {
        type: String,
        enum: ["Textiles", "Leather", "Basketry", "Jewelry"],
      },
    ],
    priceRange: {
      min: {
        type: Number,
        min: [0, "Minimum price cannot be negative"],
        default: 0,
      },
      max: {
        type: Number,
        min: [0, "Maximum price cannot be negative"],
        default: 10000,
      },
    },
    culturalInterests: [
      {
        type: String,
        trim: true,
        maxlength: [100, "Cultural interest cannot exceed 100 characters"],
      },
    ],
    // Search history for recommendations
    searchHistory: [
      {
        query: {
          type: String,
          trim: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Recently viewed products
    viewedProducts: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Category weights based on interactions
    categoryWeights: {
      type: Map,
      of: Number,
      default: new Map(),
    },
  },
  { _id: false },
);

// Administrative flags for suspicious activity or manual notes
const flagSchema = new mongoose.Schema(
  {
    reason: { type: String, trim: true, required: true, maxlength: 1000 },
    flaggedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    flaggedAt: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolvedAt: Date,
    notes: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: false },
);

// Cart item schema for shopping cart
const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
      default: 1,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

// Shipping address schema for checkout
const shippingAddressSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    street: {
      type: String,
      trim: true,
      maxlength: [200, "Street address cannot exceed 200 characters"],
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, "City cannot exceed 100 characters"],
    },
    region: {
      type: String,
      trim: true,
      maxlength: [100, "Region cannot exceed 100 characters"],
    },
    country: {
      type: String,
      trim: true,
      default: "Ethiopia",
      maxlength: [100, "Country cannot exceed 100 characters"],
    },
    postalCode: {
      type: String,
      trim: true,
      maxlength: [20, "Postal code cannot exceed 20 characters"],
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true; // Optional field
          // Ethiopian phone number format validation
          return /^(\+251|0)?[97]\d{8}$/.test(v.replace(/\s/g, ""));
        },
        message: "Please enter a valid Ethiopian phone number",
      },
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true },
);

// Main User schema
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Please enter a valid email address",
      },
    },
    password: {
      type: String,
      // Not required for OAuth users (Google/Apple sign-in)
      required: function () {
        return !this.googleId && this.authProvider === 'local';
      },
      minlength: [8, "Password must be at least 8 characters long"],
      select: false,
    },

    // OAuth provider fields
    googleId: {
      type: String,
      sparse: true,
      index: true,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google', 'apple'],
      default: 'local',
    },
    role: {
      type: String,
      enum: {
        values: ["customer", "artisan", "admin"],
        message: "Role must be either customer, artisan, or admin",
      },
      required: [true, "User role is required"],
      default: "customer",
    },
    profile: {
      type: profileSchema,
      required: true,
    },
    verification: {
      type: verificationSchema,
      required: function () {
        return this.role === "artisan";
      },
    },
    // Discovery & Personalization
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    preferences: {
      type: preferencesSchema,
      default: () => ({}),
    },
    cart: {
      type: [cartItemSchema],
      default: [],
    },
    shippingAddresses: {
      type: [shippingAddressSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    // Quick lookup flag for UI to show a flagged user
    isFlagged: {
      type: Boolean,
      default: false,
    },
    // Temporary enforcement to require user to change password on next login
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    // Whether the artisan has read and accepted the platform guidelines
    hasAcceptedGuidelines: {
      type: Boolean,
      default: false,
    },
    // When admin resets password, this stores expiry for the temporary password
    tempPasswordExpiry: Date,
    // Admin flags for suspicious activity or manual investigation
    flags: {
      type: [flagSchema],
      default: [],
    },
    // Simple in-app alerts for users (admin messages, verification requests)
    alerts: {
      type: [
        {
          message: { type: String, trim: true },
          read: { type: Boolean, default: false },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
    // Bank and payment details for artisans
    bankDetails: {
      bankName: String,
      accountHolderName: String,
      accountNumber: String,
      telebirrNumber: String,
      merchantId: String, // Added for direct artisan payouts
      paymentMethod: {
        type: String,
        enum: ["bank_transfer", "telebirr", "mobile_money"],
        default: "bank_transfer",
      },
      updatedAt: Date,
    },
    // Notification preferences
    notificationPreferences: {
      emailOnNewOrder: { type: Boolean, default: true },
      emailOnLowStock: { type: Boolean, default: true },
      emailOnNewReview: { type: Boolean, default: true },
      emailOnWithdrawal: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
    },
    // Store settings
    storeSettings: {
      vacationMode: { type: Boolean, default: false },
      vacationMessage: String,
    },
    // Shipping settings for artisans
    shippingSettings: {
      methods: [
        {
          name: {
            type: String,
            enum: ["Standard Delivery", "Express Delivery", "Store Pickup"],
            required: true,
          },
          enabled: { type: Boolean, default: true },
          basePrice: { type: Number, default: 0, min: 0 },
          estimatedDays: { type: Number, default: 3, min: 1 },
          description: String,
        },
      ],
      regionalPricing: [
        {
          region: {
            type: String,
            enum: [
              "Addis Ababa",
              "Oromia",
              "Amhara",
              "Tigray",
              "SNNPR",
              "Somali",
              "Afar",
              "Benishangul-Gumuz",
              "Gambela",
              "Harari",
              "Dire Dawa",
              "Sidama",
            ],
            required: true,
          },
          additionalCost: { type: Number, default: 0, min: 0 },
        },
      ],
      freeShippingThreshold: { type: Number, default: 0, min: 0 },
      weightBasedPricing: {
        enabled: { type: Boolean, default: false },
        pricePerKg: { type: Number, default: 0, min: 0 },
      },
    },
    // Security
    twoFactorEnabled: { type: Boolean, default: false },
    lastPasswordChange: Date,
    tokenVersion: { type: Number, default: 0 },

    // Password reset token (for forgot-password flow)
    passwordResetToken: String,
    passwordResetExpires: Date,

    // Commission/Debt tracking for artisans (COD/Manual payments)
    unpaidCommission: {
      type: Number,
      default: 0,
      min: [0, "Unpaid commission cannot be negative"],
    },
    paidCommission: {
      type: Number,
      default: 0,
      min: [0, "Paid commission cannot be negative"],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  },
);

// Virtual for full name
userSchema.virtual("fullName").get(function () {
  return `${this.profile.firstName} ${this.profile.lastName}`;
});

// Virtual for account lock status
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre("save", async function (next) {
  // Only hash password if it's modified
  if (!this.isModified("password")) return next();

  try {
    // Hash password with salt rounds from environment
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error("Password comparison failed");
  }
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }

  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
  });
};

// Generate a password reset token and save hashed token/expiry on user
userSchema.methods.createPasswordResetToken = function () {
  const crypto = require("crypto");
  const rawToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");
  // token valid for 1 hour
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000;
  return rawToken; // send the raw token via email
};

// Static method to find user by email with case insensitive search
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to get artisans by verification status
userSchema.statics.getArtisansByStatus = function (status) {
  return this.find({
    role: "artisan",
    "verification.status": status,
  }).select("-password");
};

// Method to add item to cart
userSchema.methods.addToCart = function (productId, quantity = 1) {
  const existingItem = this.cart.find(
    (item) => item.productId.toString() === productId.toString(),
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    this.cart.push({ productId, quantity });
  }

  return this.save();
};

// Method to update cart item quantity
userSchema.methods.updateCartQuantity = function (productId, quantity) {
  const item = this.cart.find(
    (item) => item.productId.toString() === productId.toString(),
  );

  if (item) {
    if (quantity <= 0) {
      // Remove item if quantity is 0 or negative
      this.cart = this.cart.filter(
        (item) => item.productId.toString() !== productId.toString(),
      );
    } else {
      item.quantity = quantity;
    }
  }

  return this.save();
};

// Method to remove item from cart
userSchema.methods.removeFromCart = function (productId) {
  this.cart = this.cart.filter(
    (item) => item.productId.toString() !== productId.toString(),
  );
  return this.save();
};

// Method to clear cart
userSchema.methods.clearCart = function () {
  this.cart = [];
  return this.save();
};

// Method to get cart with populated product details
userSchema.methods.getPopulatedCart = function () {
  return this.populate({
    path: "cart.productId",
    select: "name price images category inventory artisan",
    populate: {
      path: "artisan",
      select: "profile.firstName profile.lastName",
    },
  });
};

// Method to add shipping address
userSchema.methods.addShippingAddress = function (addressData) {
  // If this is set as default, unset other defaults
  if (addressData.isDefault) {
    this.shippingAddresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }

  this.shippingAddresses.push(addressData);
  return this.save();
};

// Method to update shipping address
userSchema.methods.updateShippingAddress = function (addressId, addressData) {
  const address = this.shippingAddresses.id(addressId);

  if (!address) {
    throw new Error("Shipping address not found");
  }

  // If this is set as default, unset other defaults
  if (addressData.isDefault) {
    this.shippingAddresses.forEach((addr) => {
      if (addr._id.toString() !== addressId.toString()) {
        addr.isDefault = false;
      }
    });
  }

  Object.assign(address, addressData);
  return this.save();
};

// Method to remove shipping address
userSchema.methods.removeShippingAddress = function (addressId) {
  this.shippingAddresses = this.shippingAddresses.filter(
    (addr) => addr._id.toString() !== addressId.toString(),
  );
  return this.save();
};

// Method to get default shipping address
userSchema.methods.getDefaultShippingAddress = function () {
  return (
    this.shippingAddresses.find((addr) => addr.isDefault) ||
    this.shippingAddresses[0]
  );
};

// Index for performance optimization
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ "verification.status": 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ googleId: 1 }, { sparse: true });

module.exports = mongoose.model("User", userSchema);
