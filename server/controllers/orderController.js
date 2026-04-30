/**
 * Order Controller for EthioCraft Global
 * 
 * Handles order creation, management, and tracking
 * Automatically generates order numbers and captures artisan IDs
 * 
 * Note: Main order logic is implemented in routes/orders.js
 * This controller file provides utility functions
 */

const Order = require('../models/Order');
const Product = require('../models/Product');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Generate unique order number
 * Format: ECG-XXXXXX (6 random digits)
 */
function generateOrderNumber() {
  const randomDigits = Math.floor(100000 + Math.random() * 900000);
  return `ECG-${randomDigits}`;
}

/**
 * Calculate order totals
 * @param {Array} items - Array of order items with price and quantity
 * @returns {Object} - Object with subtotal, tax, shipping, and total
 */
function calculateOrderTotals(items) {
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
  
  // Ethiopian VAT is 15%
  const tax = subtotal * 0.15;
  
  // Free shipping for orders over 1000 ETB
  const shipping = subtotal >= 1000 ? 0 : 50;
  
  const total = subtotal + tax + shipping;
  
  // Calculate 5% platform commission and 95% artisan payout on the subtotal
  const platformCommission = subtotal * 0.05;
  const artisanEarning = subtotal * 0.95;
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    shipping: Math.round(shipping * 100) / 100,
    total: Math.round(total * 100) / 100,
    platformCommission: Math.round(platformCommission * 100) / 100,
    artisanEarning: Math.round(artisanEarning * 100) / 100
  };
}

/**
 * Validate order items
 * @param {Array} items - Array of items to validate
 * @returns {Object} - Validation result with isValid and errors
 */
async function validateOrderItems(items) {
  const errors = [];
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return {
      isValid: false,
      errors: ['Order must contain at least one item']
    };
  }
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    // Check if product exists
    if (!item.product) {
      errors.push(`Item ${i + 1}: Product ID is required`);
      continue;
    }
    
    try {
      const product = await Product.findById(item.product);
      
      if (!product) {
        errors.push(`Item ${i + 1}: Product not found`);
        continue;
      }
      
      if (product.status !== 'active') {
        errors.push(`Item ${i + 1}: Product "${product.name}" is not available`);
      }
      
      if (!item.quantity || item.quantity < 1) {
        errors.push(`Item ${i + 1}: Quantity must be at least 1`);
      }
      
      if (product.inventory.quantity < item.quantity) {
        errors.push(`Item ${i + 1}: Only ${product.inventory.quantity} units of "${product.name}" available`);
      }
    } catch (error) {
      errors.push(`Item ${i + 1}: Error validating product - ${error.message}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get order statistics for a user
 * @param {String} userId - User ID
 * @param {String} userRole - User role (customer, artisan, admin)
 * @returns {Object} - Order statistics
 */
async function getOrderStats(userId, userRole) {
  try {
    let query = {};
    
    if (userRole === 'customer') {
      query.customer = userId;
    } else if (userRole === 'artisan') {
      query['items.artisan'] = userId;
    }
    // Admin gets all orders (no filter)
    
    const orders = await Order.find(query);
    
    const stats = {
      totalOrders: orders.length,
      totalRevenue: 0,
      averageOrderValue: 0,
      statusBreakdown: {
        pending: 0,
        confirmed: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0
      },
      recentOrders: []
    };
    
    orders.forEach(order => {
      stats.totalRevenue += order.totals.total;
      stats.statusBreakdown[order.status] = (stats.statusBreakdown[order.status] || 0) + 1;
    });
    
    if (orders.length > 0) {
      stats.averageOrderValue = stats.totalRevenue / orders.length;
    }
    
    // Get 5 most recent orders
    stats.recentOrders = orders
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5)
      .map(order => ({
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.totals.total,
        createdAt: order.createdAt
      }));
    
    return stats;
  } catch (error) {
    console.error('Error getting order stats:', error);
    throw error;
  }
}

/**
 * Format order for response
 * @param {Object} order - Order document
 * @returns {Object} - Formatted order
 */
function formatOrderResponse(order) {
  return {
    id: order._id,
    orderNumber: order.orderNumber,
    customer: order.customer,
    items: order.items,
    totals: order.totals,
    status: order.status,
    shippingAddress: order.shippingAddress,
    payment: order.payment,
    tracking: order.tracking,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}

/**
 * Check if user can access order
 * @param {Object} order - Order document
 * @param {Object} user - User object
 * @returns {Boolean} - True if user can access order
 */
function canAccessOrder(order, user) {
  // Customer can access their own orders
  if (order.customer.toString() === user._id.toString()) {
    return true;
  }
  
  // Artisan can access orders containing their products
  if (user.role === 'artisan') {
    return order.items.some(item => 
      item.artisan.toString() === user._id.toString()
    );
  }
  
  // Admin can access all orders
  if (user.role === 'admin') {
    return true;
  }
  
  return false;
}

/**
 * Get order status message
 * @param {String} status - Order status
 * @returns {String} - User-friendly status message
 */
function getStatusMessage(status) {
  const messages = {
    pending: 'Your order has been received and is awaiting confirmation',
    confirmed: 'Your order has been confirmed and is being prepared',
    processing: 'Your order is currently being processed',
    shipped: 'Your order has been shipped and is on its way',
    delivered: 'Your order has been delivered',
    cancelled: 'Your order has been cancelled'
  };
  
  return messages[status] || 'Order status unknown';
}

/**
 * Validate shipping address
 * @param {Object} address - Shipping address object
 * @returns {Object} - Validation result
 */
function validateShippingAddress(address) {
  const errors = [];
  
  if (!address) {
    return {
      isValid: false,
      errors: ['Shipping address is required']
    };
  }
  
  const requiredFields = ['firstName', 'lastName', 'street', 'city', 'region', 'phone'];
  
  requiredFields.forEach(field => {
    if (!address[field] || address[field].trim().length === 0) {
      errors.push(`${field} is required`);
    }
  });
  
  // Validate Ethiopian phone number
  if (address.phone) {
    const phoneRegex = /^(\+251|0)?[97]\d{8}$/;
    if (!phoneRegex.test(address.phone.replace(/\s/g, ''))) {
      errors.push('Please provide a valid Ethiopian phone number');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get estimated delivery date
 * @param {String} region - Ethiopian region
 * @returns {Date} - Estimated delivery date
 */
function getEstimatedDelivery(region) {
  const now = new Date();
  let daysToAdd = 3; // Default 3 days
  
  // Addis Ababa - fastest delivery
  if (region === 'Addis Ababa') {
    daysToAdd = 1;
  }
  // Major cities - 2 days
  else if (['Dire Dawa', 'Bahir Dar', 'Mekelle', 'Hawassa'].includes(region)) {
    daysToAdd = 2;
  }
  // Remote regions - 5-7 days
  else if (['Gambela', 'Afar', 'Somali'].includes(region)) {
    daysToAdd = 7;
  }
  
  const deliveryDate = new Date(now);
  deliveryDate.setDate(deliveryDate.getDate() + daysToAdd);
  
  return deliveryDate;
}

/**
 * Utility functions for order processing
 * Main order routes are in routes/orders.js
 */
module.exports = {
  generateOrderNumber,
  calculateOrderTotals,
  validateOrderItems,
  getOrderStats,
  formatOrderResponse,
  canAccessOrder,
  getStatusMessage,
  validateShippingAddress,
  getEstimatedDelivery
};
