/**
 * Shipping Controller
 * Handles shipping and delivery management for artisans
 */

const Order = require('../models/Order');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/artisan/shipping-settings
 * @desc    Get artisan's shipping settings
 * @access  Private (Artisan)
 */
exports.getShippingSettings = asyncHandler(async (req, res) => {
  const artisan = await User.findById(req.user._id).select('shippingSettings');

  if (!artisan) {
    return res.status(404).json({
      success: false,
      error: 'Artisan not found'
    });
  }

  // Initialize default shipping settings if not exists
  if (!artisan.shippingSettings || !artisan.shippingSettings.methods || artisan.shippingSettings.methods.length === 0) {
    artisan.shippingSettings = {
      methods: [
        {
          name: 'Standard Delivery',
          enabled: true,
          basePrice: 50,
          estimatedDays: 5,
          description: 'Standard delivery within 3-5 business days'
        },
        {
          name: 'Express Delivery',
          enabled: false,
          basePrice: 150,
          estimatedDays: 2,
          description: 'Fast delivery within 1-2 business days'
        },
        {
          name: 'Store Pickup',
          enabled: true,
          basePrice: 0,
          estimatedDays: 1,
          description: 'Pick up from store location'
        }
      ],
      regionalPricing: [],
      freeShippingThreshold: 1000,
      weightBasedPricing: {
        enabled: false,
        pricePerKg: 20
      }
    };
    await artisan.save();
  }

  res.json({
    success: true,
    data: artisan.shippingSettings
  });
});

/**
 * @route   PATCH /api/artisan/shipping-settings
 * @desc    Update artisan's shipping settings
 * @access  Private (Artisan)
 */
exports.updateShippingSettings = asyncHandler(async (req, res) => {
  const { methods, regionalPricing, freeShippingThreshold, weightBasedPricing } = req.body;

  const artisan = await User.findById(req.user._id);

  if (!artisan) {
    return res.status(404).json({
      success: false,
      error: 'Artisan not found'
    });
  }

  // Validate and update shipping methods
  if (methods) {
    const validMethods = ['Standard Delivery', 'Express Delivery', 'Store Pickup'];
    for (const method of methods) {
      if (!validMethods.includes(method.name)) {
        return res.status(400).json({
          success: false,
          error: `Invalid shipping method: ${method.name}`
        });
      }
      if (method.basePrice < 0) {
        return res.status(400).json({
          success: false,
          error: 'Base price cannot be negative'
        });
      }
      if (method.estimatedDays < 1) {
        return res.status(400).json({
          success: false,
          error: 'Estimated days must be at least 1'
        });
      }
    }
    artisan.shippingSettings.methods = methods;
  }

  // Update regional pricing
  if (regionalPricing) {
    artisan.shippingSettings.regionalPricing = regionalPricing;
  }

  // Update free shipping threshold
  if (freeShippingThreshold !== undefined) {
    if (freeShippingThreshold < 0) {
      return res.status(400).json({
        success: false,
        error: 'Free shipping threshold cannot be negative'
      });
    }
    artisan.shippingSettings.freeShippingThreshold = freeShippingThreshold;
  }

  // Update weight-based pricing
  if (weightBasedPricing) {
    artisan.shippingSettings.weightBasedPricing = weightBasedPricing;
  }

  await artisan.save();

  res.json({
    success: true,
    message: 'Shipping settings updated successfully',
    data: artisan.shippingSettings
  });
});

/**
 * @route   PATCH /api/orders/:id/shipping
 * @desc    Update order shipping information
 * @access  Private (Artisan)
 */
exports.updateOrderShipping = asyncHandler(async (req, res) => {
  const { trackingNumber, courierName, deliveryStatus, notes, estimatedDelivery, deliveryProofPhoto } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      error: 'Order not found'
    });
  }

  // Check if artisan owns any items in this order
  const artisanItems = order.items.filter(item => 
    item.artisan.toString() === req.user._id.toString()
  );

  if (artisanItems.length === 0) {
    return res.status(403).json({
      success: false,
      error: 'You do not have permission to update this order'
    });
  }

  // Validation: If status is "Shipped", tracking number is required
  if (deliveryStatus === 'Shipped' && !trackingNumber && !order.shipping?.trackingNumber) {
    return res.status(400).json({
      success: false,
      error: 'Tracking number is required when status is set to Shipped'
    });
  }

  // Validate tracking number format
  if (trackingNumber && !/^[a-zA-Z0-9\-_]+$/.test(trackingNumber)) {
    return res.status(400).json({
      success: false,
      error: 'Tracking number must be alphanumeric'
    });
  }

  // Initialize shipping object if it doesn't exist
  if (!order.shipping) {
    order.shipping = {};
  }

  // Update shipping information
  if (trackingNumber) order.shipping.trackingNumber = trackingNumber;
  if (courierName) order.shipping.courierName = courierName;
  if (notes) order.shipping.notes = notes;
  if (estimatedDelivery) order.shipping.estimatedDelivery = estimatedDelivery;
  if (deliveryProofPhoto) order.shipping.deliveryProofPhoto = deliveryProofPhoto;

  // Update delivery status and timestamps
  if (deliveryStatus) {
    const oldStatus = order.shipping.deliveryStatus;
    order.shipping.deliveryStatus = deliveryStatus;

    // Set timestamps based on status
    if (deliveryStatus === 'Shipped' && oldStatus !== 'Shipped') {
      order.shipping.shippedAt = new Date();
    }
    if (deliveryStatus === 'Delivered' && oldStatus !== 'Delivered') {
      order.shipping.deliveredAt = new Date();
      order.shipping.actualDelivery = new Date();
    }

    // Update order status history
    order.statusHistory.push({
      status: deliveryStatus.toLowerCase(),
      timestamp: new Date(),
      note: `Shipping status updated to ${deliveryStatus}`
    });

    // Update overall order status if all items are delivered
    if (deliveryStatus === 'Delivered') {
      const allDelivered = order.items.every(item => 
        item.status === 'delivered' || item.artisan.toString() === req.user._id.toString()
      );
      if (allDelivered) {
        order.status = 'delivered';
      }
    }
  }

  await order.save();

  // TODO: Send notification to customer about shipping update
  // This would trigger an email/SMS notification

  res.json({
    success: true,
    message: 'Shipping information updated successfully',
    data: {
      shipping: order.shipping,
      orderNumber: order.orderNumber
    }
  });
});

/**
 * @route   GET /api/orders/:id/shipping-label
 * @desc    Generate shipping label data for printing
 * @access  Private (Artisan)
 */
exports.getShippingLabel = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('customer', 'profile email')
    .populate('items.product', 'name');

  if (!order) {
    return res.status(404).json({
      success: false,
      error: 'Order not found'
    });
  }

  // Check if artisan owns any items in this order
  const artisanItems = order.items.filter(item => 
    item.artisan.toString() === req.user._id.toString()
  );

  if (artisanItems.length === 0) {
    return res.status(403).json({
      success: false,
      error: 'You do not have permission to access this order'
    });
  }

  // Prepare shipping label data
  const labelData = {
    orderNumber: order.orderNumber,
    orderDate: order.createdAt,
    customer: {
      name: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
      phone: order.shippingAddress.phone,
      email: order.customer.email,
      address: {
        street: order.shippingAddress.street,
        city: order.shippingAddress.city,
        region: order.shippingAddress.region,
        country: order.shippingAddress.country,
        postalCode: order.shippingAddress.postalCode
      }
    },
    items: artisanItems.map(item => ({
      name: item.product.name,
      quantity: item.quantity,
      price: item.price
    })),
    shipping: {
      method: order.shipping?.shippingMethod || 'Standard Delivery',
      trackingNumber: order.shipping?.trackingNumber,
      courierName: order.shipping?.courierName,
      estimatedDelivery: order.shipping?.estimatedDelivery
    },
    totals: {
      subtotal: artisanItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      shipping: order.shipping?.shippingCost || 0
    }
  };

  res.json({
    success: true,
    data: labelData
  });
});

/**
 * @route   POST /api/orders/:id/delivery-proof
 * @desc    Upload delivery proof photo
 * @access  Private (Artisan)
 */
exports.uploadDeliveryProof = asyncHandler(async (req, res) => {
  const { photoUrl } = req.body;

  if (!photoUrl) {
    return res.status(400).json({
      success: false,
      error: 'Photo URL is required'
    });
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      error: 'Order not found'
    });
  }

  // Check if artisan owns any items in this order
  const artisanItems = order.items.filter(item => 
    item.artisan.toString() === req.user._id.toString()
  );

  if (artisanItems.length === 0) {
    return res.status(403).json({
      success: false,
      error: 'You do not have permission to update this order'
    });
  }

  // Initialize shipping object if it doesn't exist
  if (!order.shipping) {
    order.shipping = {};
  }

  order.shipping.deliveryProofPhoto = photoUrl;
  await order.save();

  res.json({
    success: true,
    message: 'Delivery proof uploaded successfully',
    data: {
      photoUrl: order.shipping.deliveryProofPhoto
    }
  });
});

/**
 * @route   GET /api/artisan/shipping/active-orders
 * @desc    Get artisan's active orders (paid but not delivered)
 * @access  Private (Artisan)
 */
exports.getActiveOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({
    'items.artisan': req.user._id,
    'payment.status': 'completed',
    $or: [
      { 'shipping.deliveryStatus': { $ne: 'Delivered' } },
      { 'shipping.deliveryStatus': { $exists: false } }
    ]
  })
    .populate('customer', 'profile email')
    .populate('items.product', 'name images price')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: orders
  });
});

module.exports = exports;

/**
 * @route   GET /api/artisan/shipping/active-orders
 * @desc    Get artisan's active orders (paid but not delivered)
 * @access  Private (Artisan)
 */
exports.getActiveOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({
    'items.artisan': req.user._id,
    'payment.status': 'completed',
    $or: [
      { 'shipping.deliveryStatus': { $ne: 'Delivered' } },
      { 'shipping.deliveryStatus': { $exists: false } }
    ]
  })
    .populate('customer', 'profile email')
    .populate('items.product', 'name images price')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: orders
  });
});

