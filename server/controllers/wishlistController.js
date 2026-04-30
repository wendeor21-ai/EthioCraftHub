/**
 * Wishlist Controller for EthioCraft Global
 * 
 * Handles user wishlist operations:
 * - Toggle product in wishlist (add/remove)
 * - Get user's wishlist
 */

const User = require("../models/User");
const Product = require("../models/Product");

/**
 * Toggle product in user's wishlist
 * @route POST /api/wishlist/toggle
 * @access Private
 */
exports.toggleWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required"
      });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Initialize wishlist if it doesn't exist
    if (!user.wishlist) {
      user.wishlist = [];
    }

    const index = user.wishlist.indexOf(productId);
    let isAdded = false;

    if (index === -1) {
      // Add to wishlist
      user.wishlist.push(productId);
      isAdded = true;
    } else {
      // Remove from wishlist
      user.wishlist.splice(index, 1);
      isAdded = false;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: isAdded ? "Added to wishlist" : "Removed from wishlist",
      isAdded,
      wishlistCount: user.wishlist.length
    });
  } catch (error) {
    console.error("❌ Toggle wishlist error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle wishlist",
      error: error.message
    });
  }
};

/**
 * Get user's wishlist
 * @route GET /api/wishlist
 * @access Private
 */
exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: "wishlist",
      populate: {
        path: "artisan",
        select: "profile.firstName profile.lastName"
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      data: user.wishlist || []
    });
  } catch (error) {
    console.error("❌ Get wishlist error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get wishlist",
      error: error.message
    });
  }
};
