/**
 * Cart Controller for EthioCraft Global
 * 
 * Handles shopping cart operations:
 * - Add items to cart
 * - Update item quantities
 * - Remove items from cart
 * - Get cart with populated product details
 * - Calculate cart totals
 */

const User = require('../models/User');
const Product = require('../models/Product');

/**
 * Get user's cart with populated product details
 * @route GET /api/cart
 * @access Private
 */
exports.getCart = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'cart.productId',
        select: 'name price images category inventory artisan status features',
        populate: {
          path: 'artisan',
          select: 'profile.firstName profile.lastName'
        }
      });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Filter out any cart items where product no longer exists or is unavailable
    const validCartItems = user.cart.filter(item => {
      return item.productId && 
             item.productId.status === 'active' && 
             item.productId.inventory.quantity > 0;
    });

    // Update cart if items were filtered out
    if (validCartItems.length !== user.cart.length) {
      user.cart = validCartItems;
      await user.save();
    }

    // Transform cart items to ensure images array is properly formatted
    const transformedItems = validCartItems.map(item => ({
      _id: item._id,
      productId: {
        _id: item.productId._id,
        name: item.productId.name,
        price: item.productId.price,
        images: item.productId.images || [],
        category: item.productId.category,
        inventory: item.productId.inventory,
        artisan: item.productId.artisan,
        status: item.productId.status,
        features: item.productId.features || []
      },
      quantity: item.quantity,
      addedAt: item.addedAt
    }));

    // Calculate cart summary
    const cartSummary = calculateCartSummary(transformedItems);

    res.status(200).json({
      success: true,
      data: {
        items: transformedItems,
        summary: cartSummary
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve cart',
      error: error.message 
    });
  }
};

/**
 * Add item to cart
 * @route POST /api/cart
 * @access Private
 */
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    // Validate input
    if (!productId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Product ID is required' 
      });
    }

    if (quantity < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Quantity must be at least 1' 
      });
    }

    // Check if product exists and is available
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }

    if (product.status !== 'active') {
      return res.status(400).json({ 
        success: false, 
        message: 'Product is not available for purchase' 
      });
    }

    if (product.inventory.quantity < quantity) {
      return res.status(400).json({ 
        success: false, 
        message: `Only ${product.inventory.quantity} items available in stock` 
      });
    }

    // Add to cart
    const user = await User.findById(req.user._id);
    await user.addToCart(productId, quantity);

    // Increment cart adds metric
    await product.incrementCartAdds();

    // Get updated cart with populated products
    const updatedUser = await User.findById(req.user._id)
      .populate({
        path: 'cart.productId',
        select: 'name price images category inventory artisan features',
        populate: {
          path: 'artisan',
          select: 'profile.firstName profile.lastName'
        }
      });

    // Transform cart items to ensure images array is properly formatted
    const transformedItems = updatedUser.cart.map(item => ({
      _id: item._id,
      productId: {
        _id: item.productId._id,
        name: item.productId.name,
        price: item.productId.price,
        images: item.productId.images || [],
        category: item.productId.category,
        inventory: item.productId.inventory,
        artisan: item.productId.artisan,
        features: item.productId.features || []
      },
      quantity: item.quantity,
      addedAt: item.addedAt
    }));

    const cartSummary = calculateCartSummary(transformedItems);

    res.status(200).json({
      success: true,
      message: 'Item added to cart',
      data: {
        items: transformedItems,
        summary: cartSummary
      }
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add item to cart',
      error: error.message 
    });
  }
};

/**
 * Update cart item quantity
 * @route PUT /api/cart/:productId
 * @access Private
 */
exports.updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    // Validate input
    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid quantity is required' 
      });
    }

    // Check product availability
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }

    if (quantity > 0 && product.inventory.quantity < quantity) {
      return res.status(400).json({ 
        success: false, 
        message: `Only ${product.inventory.quantity} items available in stock` 
      });
    }

    // Update cart
    const user = await User.findById(req.user._id);
    await user.updateCartQuantity(productId, quantity);

    // Get updated cart with populated products
    const updatedUser = await User.findById(req.user._id)
      .populate({
        path: 'cart.productId',
        select: 'name price images category inventory artisan features',
        populate: {
          path: 'artisan',
          select: 'profile.firstName profile.lastName'
        }
      });

    // Transform cart items to ensure images array is properly formatted
    const transformedItems = updatedUser.cart.map(item => ({
      _id: item._id,
      productId: {
        _id: item.productId._id,
        name: item.productId.name,
        price: item.productId.price,
        images: item.productId.images || [],
        category: item.productId.category,
        inventory: item.productId.inventory,
        artisan: item.productId.artisan,
        features: item.productId.features || []
      },
      quantity: item.quantity,
      addedAt: item.addedAt
    }));

    const cartSummary = calculateCartSummary(transformedItems);

    res.status(200).json({
      success: true,
      message: quantity === 0 ? 'Item removed from cart' : 'Cart updated',
      data: {
        items: transformedItems,
        summary: cartSummary
      }
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update cart',
      error: error.message 
    });
  }
};

/**
 * Remove item from cart
 * @route DELETE /api/cart/:productId
 * @access Private
 */
exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    const user = await User.findById(req.user._id);
    await user.removeFromCart(productId);

    // Get updated cart with populated products
    const updatedUser = await User.findById(req.user._id)
      .populate({
        path: 'cart.productId',
        select: 'name price images category inventory artisan features',
        populate: {
          path: 'artisan',
          select: 'profile.firstName profile.lastName'
        }
      });

    // Transform cart items to ensure images array is properly formatted
    const transformedItems = updatedUser.cart.map(item => ({
      _id: item._id,
      productId: {
        _id: item.productId._id,
        name: item.productId.name,
        price: item.productId.price,
        images: item.productId.images || [],
        category: item.productId.category,
        inventory: item.productId.inventory,
        artisan: item.productId.artisan,
        features: item.productId.features || []
      },
      quantity: item.quantity,
      addedAt: item.addedAt
    }));

    const cartSummary = calculateCartSummary(transformedItems);

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      data: {
        items: transformedItems,
        summary: cartSummary
      }
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to remove item from cart',
      error: error.message 
    });
  }
};

/**
 * Clear entire cart
 * @route DELETE /api/cart
 * @access Private
 */
exports.clearCart = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    await user.clearCart();

    res.status(200).json({
      success: true,
      message: 'Cart cleared',
      data: {
        items: [],
        summary: {
          subtotal: 0,
          shipping: 0,
          tax: 0,
          total: 0,
          itemCount: 0
        }
      }
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to clear cart',
      error: error.message 
    });
  }
};

/**
 * Helper function to calculate cart summary
 * Includes subtotal, shipping, tax (15% VAT), and total
 */
function calculateCartSummary(cartItems) {
  // Calculate subtotal
  const subtotal = cartItems.reduce((sum, item) => {
    if (item.productId && item.productId.price) {
      return sum + (item.productId.price * item.quantity);
    }
    return sum;
  }, 0);

  // Calculate shipping (free for orders >= 1000 ETB, otherwise 50 ETB)
  const shipping = subtotal >= 1000 ? 0 : 50;

  // Calculate tax (15% VAT)
  const tax = Math.round(subtotal * 0.15 * 100) / 100;

  // Calculate total
  const total = subtotal + shipping + tax;

  // Count total items
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    shipping: Math.round(shipping * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
    itemCount,
    currency: 'ETB'
  };
}

module.exports = exports;
