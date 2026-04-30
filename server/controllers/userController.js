/**
 * User Controller for EthioCraft Global
 *
 * Handles user-related operations:
 * - Get user profile
 * - Update user profile
 * - Manage shipping addresses
 */

const User = require("../models/User");

/**
 * Get user profile
 * @route GET /api/users/profile
 * @access Private
 */
exports.getProfile = async (req, res) => {
  try {
    console.log("📋 Get profile - User ID:", req.user?._id);

    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("❌ Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get profile",
      error: error.message,
    });
  }
};

/**
 * Update user profile
 * @route PUT /api/users/profile
 * @access Private
 */
exports.updateProfile = async (req, res) => {
  try {
    console.log("📝 Update profile - User ID:", req.user?._id);

    const { firstName, lastName, phone, bio, profileImage } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update profile fields
    if (firstName) user.profile.firstName = firstName;
    if (lastName) user.profile.lastName = lastName;
    if (phone) user.profile.phone = phone;
    if (bio !== undefined) user.profile.bio = bio;
    if (profileImage !== undefined) user.profile.profileImage = profileImage;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("❌ Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};

/**
 * Get shipping addresses
 * @route GET /api/users/shipping-addresses
 * @access Private
 */
exports.getShippingAddresses = async (req, res) => {
  try {
    console.log("📦 Get shipping addresses - User ID:", req.user?._id);

    const user = await User.findById(req.user._id).select("shippingAddresses");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Initialize shippingAddresses if it doesn't exist
    if (!user.shippingAddresses) {
      user.shippingAddresses = [];
      await user.save();
    }

    res.status(200).json({
      success: true,
      data: user.shippingAddresses || [],
    });
  } catch (error) {
    console.error("❌ Get shipping addresses error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get shipping addresses",
      error: error.message,
    });
  }
};

/**
 * Add shipping address
 * @route POST /api/users/shipping-addresses
 * @access Private
 */
exports.addShippingAddress = async (req, res) => {
  try {
    console.log("➕ Add shipping address - User ID:", req.user?._id);
    console.log("📦 Address data received:", req.body);

    const addressData = req.body;

    // Validate required fields
    const requiredFields = [
      "firstName",
      "lastName",
      "phone",
      "street",
      "city",
      "region",
    ];
    const missingFields = requiredFields.filter((field) => !addressData[field]);

    if (missingFields.length > 0) {
      console.log("❌ Missing fields:", missingFields);
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      console.log("❌ User not found:", req.user._id);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("✅ User found:", user.email);

    // Initialize shippingAddresses array if it doesn't exist
    if (!user.shippingAddresses) {
      console.log("📦 Initializing shippingAddresses array");
      user.shippingAddresses = [];
    }

    // Use the model method to add address
    await user.addShippingAddress(addressData);

    console.log(
      "✅ Address added successfully. Total addresses:",
      user.shippingAddresses.length,
    );

    res.status(201).json({
      success: true,
      message: "Shipping address added successfully",
      data: user.shippingAddresses,
    });
  } catch (error) {
    console.error("❌ Add shipping address error:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to add shipping address",
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

/**
 * Update shipping address
 * @route PUT /api/users/shipping-addresses/:addressId
 * @access Private
 */
exports.updateShippingAddress = async (req, res) => {
  try {
    console.log("✏️ Update shipping address - User ID:", req.user?._id);
    console.log("📦 Address ID:", req.params.addressId);

    const { addressId } = req.params;
    const addressData = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await user.updateShippingAddress(addressId, addressData);

    console.log("✅ Address updated successfully");

    res.status(200).json({
      success: true,
      message: "Shipping address updated successfully",
      data: user.shippingAddresses,
    });
  } catch (error) {
    console.error("❌ Update shipping address error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update shipping address",
      error: error.message,
    });
  }
};

/**
 * Delete shipping address
 * @route DELETE /api/users/shipping-addresses/:addressId
 * @access Private
 */
exports.deleteShippingAddress = async (req, res) => {
  try {
    console.log("🗑️ Delete shipping address - User ID:", req.user?._id);
    console.log("📦 Address ID:", req.params.addressId);

    const { addressId } = req.params;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await user.removeShippingAddress(addressId);

    console.log("✅ Address deleted successfully");

    res.status(200).json({
      success: true,
      message: "Shipping address deleted successfully",
      data: user.shippingAddresses,
    });
  } catch (error) {
    console.error("❌ Delete shipping address error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete shipping address",
      error: error.message,
    });
  }
};

/**
 * Get artisan dashboard stats
 * @route GET /api/users/artisan/dashboard-stats
 * @access Private (Artisan only)
 */
exports.getArtisanStats = async (req, res) => {
  try {
    const artisanId = req.user._id;

    // 1. የዚህን አርቲሳን ምርቶች ብቻ መቁጠር
    const Product = require("../models/Product"); // ሞዴሉን እዚህ ጋር ኢምፖርት አድርግ
    const productCount = await Product.countDocuments({ artisan: artisanId });

    // 2. ትዕዛዞችን መቁጠር (ከዚህ አርቲሳን የተገዙ ምርቶችን ብቻ)
    const Order = require("../models/Order");
    const orderCount = await Order.countDocuments({
      "items.artisan": artisanId,
    });

    // 3. Performance Insights (ከ User ሞዴል ወይም Analytics አምጣው)
    const user = await User.findById(artisanId);

    // 4. Fetch low stock products for popup notifications (Stock < 5)
    const lowStockAlerts = await Product.find({ 
      artisan: artisanId,
      status: "active",
      "inventory.quantity": { $lt: 5 } 
    }).select("name inventory.quantity").lean();

    res.status(200).json({
      success: true,
      data: {
        products: productCount,
        orders: orderCount,
        revenue: user.totalSales || 0, // በሞዴልህ ውስጥ ያለውን ተጠቀም
        lowStockAlerts: lowStockAlerts || [],
        performance: {
          storeViews: user.performance?.storeViews || 0,
          conversionRate: user.performance?.conversionRate || 0,
          customerSatisfaction: user.performance?.rating || 4.8,
        },
      },
    });
  } catch (error) {
    console.error("❌ Stats error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
};

/**
 * Get artisan public details for payment
 * @route GET /api/users/artisan-public-details/:artisanId
 * @access Public
 */
exports.getArtisanPublicDetails = async (req, res) => {
  try {
    const artisan = await User.findById(req.params.artisanId).select("bankDetails profile.firstName profile.lastName");

    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: "Artisan not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        bankName: artisan.bankDetails?.bankName,
        accountHolderName: artisan.bankDetails?.accountHolderName,
        accountNumber: artisan.bankDetails?.accountNumber,
        merchantId: artisan.bankDetails?.merchantId,
        artisanName: `${artisan.profile?.firstName} ${artisan.profile?.lastName}`
      },
    });
  } catch (error) {
    console.error("❌ Get artisan details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get artisan public details",
      error: error.message,
    });
  }
};

/**
 * Mark that the artisan has read and accepted the platform guidelines
 * @route PATCH /api/users/accept-guidelines
 * @access Private
 */
exports.acceptGuidelines = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { hasAcceptedGuidelines: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Guidelines accepted successfully",
      data: {
        hasAcceptedGuidelines: user.hasAcceptedGuidelines
      }
    });
  } catch (error) {
    console.error("❌ Accept guidelines error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to accept guidelines",
      error: error.message,
    });
  }
};

module.exports = exports;
