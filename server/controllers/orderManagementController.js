/**
 * Order Management Controller for EthioCraft Global
 * Professional order flow with status-based actions
 */

const Order = require('../models/Order');
const Earning = require('../models/Earning');
const { asyncHandler } = require('../middleware/errorHandler');
const { sendNotification } = require('../utils/notificationUtils');

// Platform fee percentage - Updated to 5% per latest request
const PLATFORM_FEE_PERCENTAGE = 5;

/**
 * Helper to find order by ID or Order Number
 */
const findOrder = async (id) => {
  console.log(`🔍 Finding order for ID/Number: ${id}`);
  const mongoose = require('mongoose');
  try {
    if (mongoose.Types.ObjectId.isValid(id)) {
      const order = await Order.findById(id);
      if (order) return order;
    }
    const order = await Order.findOne({ orderNumber: id });
    console.log(order ? `✅ Order found: ${order._id}` : `❌ Order NOT found for: ${id}`);
    return order;
  } catch (err) {
    console.error(`❌ Error in findOrder helper: ${err.message}`);
    throw err;
  }
};

/**
 * Valid status transitions
 * Path A: pending → confirmed → processing → shipped → delivered → completed
 * Path B: pending → rejected
 */
const VALID_TRANSITIONS = {
  pending: ['confirmed', 'processing', 'rejected', 'cancelled'],
  confirmed: ['processing', 'shipped', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['completed', 'cancelled'],
  completed: [],
  rejected: [],
  cancelled: [],
};

/**
 * @route   PUT /api/orders/:id/accept
 * @desc    Accept pending order (pending → confirmed)
 * @access  Private (Artisan)
 */
exports.acceptOrder = asyncHandler(async (req, res) => {
  const order = await findOrder(req.params.id);
  // Ensure populated for notifications
  if (order) await order.populate('customer', 'email profile');

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
    });
  }

  // Verify artisan owns this order
  const artisanId = req.user._id.toString();
  const hasItems = order.items.some(item => item.artisan.toString() === artisanId);
  
  if (!hasItems && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to manage this order',
    });
  }

  if (order.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: `Cannot accept order with status: ${order.status}`,
    });
  }

  // Accept order = move to 'processing' status directly per user request
  await order.updateStatus('processing', `Order accepted and moved to processing by artisan: ${req.body.reason || 'No notes provided'}`);

  // For Manual payments, mark as Paid since artisan verified receipt before accepting
  const method = order.payment?.method?.toUpperCase();
  const manualMethods = ['MANUAL', 'BANK_TRANSFER', 'TELEBIRR', 'CBE_BIRR', 'COD', 'CASH_ON_DELIVERY'];
  
  console.log(`💳 Checking payment method for auto-pay: ${method}`);
  if (method && manualMethods.includes(method)) {
    console.log(`✅ Auto-marking as Paid for manual method: ${method}`);
    order.payment.status = 'paid';
    order.payment.processedAt = new Date();
    order.payoutStatus = 'ready';
  }

  // Update individual item statuses
  order.items.forEach(item => {
    if (item.artisan.toString() === req.user._id.toString()) {
      item.status = 'processing';
    }
  });
  await order.save();

  // Send notification to customer
  try {
    await sendNotification({
      userId: order.customer._id,
      type: 'order_confirmed',
      title: 'Order Confirmed',
      message: `Your order #${order.orderNumber} has been confirmed and is being prepared.`,
      link: `/orders/${order._id}`,
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }

  res.json({
    success: true,
    message: 'Order accepted successfully',
    order: await Order.findById(order._id).populate('items.product', 'name images'),
  });
});

/**
 * @route   PUT /api/orders/:id/reject
 * @desc    Reject pending order (pending → rejected)
 * @access  Private (Artisan)
 */
exports.rejectOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const order = await findOrder(req.params.id);
  if (order) await order.populate('customer', 'email profile');

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
    });
  }

  // Verify artisan owns this order
  const artisanId = req.user._id.toString();
  const hasItems = order.items.some(item => item.artisan.toString() === artisanId);
  
  if (!hasItems && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to manage this order',
    });
  }

  if (order.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: `Cannot reject order with status: ${order.status}`,
    });
  }

  // Update status
  await order.updateStatus('rejected', reason || 'Order rejected by artisan');

  // Send notification to customer
  try {
    await sendNotification({
      userId: order.customer._id,
      type: 'order_rejected',
      title: 'Order Rejected',
      message: `Your order #${order.orderNumber} has been rejected. ${reason || ''}`,
      link: `/orders/${order._id}`,
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }

  res.json({
    success: true,
    message: 'Order rejected',
    order: await Order.findById(order._id).populate('items.product', 'name images'),
  });
});

/**
 * @route   PUT /api/orders/:id/processing
 * @desc    Mark order as processing (confirmed → processing)
 * @access  Private (Artisan)
 */
exports.markAsProcessing = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
    });
  }

  if (order.status !== 'confirmed') {
    return res.status(400).json({
      success: false,
      message: `Cannot mark as processing. Current status: ${order.status}`,
    });
  }

  await order.updateStatus('processing', 'Order is being processed');

  res.json({
    success: true,
    message: 'Order marked as processing',
    order: await Order.findById(order._id).populate('items.product', 'name images'),
  });
});

/**
 * @route   PUT /api/orders/:id/ship
 * @desc    Mark order as shipped with tracking number (processing → shipped)
 * @access  Private (Artisan)
 */
exports.shipOrder = asyncHandler(async (req, res) => {
  const { trackingNumber, carrier, notes } = req.body;
  const order = await Order.findById(req.params.id).populate('customer', 'email profile');

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
    });
  }

  if (!['confirmed', 'processing'].includes(order.status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot ship order with status: ${order.status}`,
    });
  }

  // Business Rule: Manual payments MUST be Paid before shipping
  const method = order.payment?.method?.toUpperCase();
  const manualMethods = ['MANUAL', 'BANK_TRANSFER', 'TELEBIRR', 'CBE_BIRR', 'COD', 'CASH_ON_DELIVERY'];
  const isManual = method && manualMethods.includes(method);
  
  console.log(`🚢 Shipping check - Method: ${method}, Status: ${order.payment.status}, isManual: ${isManual}`);

  if (isManual && order.payment.status !== 'paid') {
    console.log(`⚠️ Auto-marking as Paid in shipping (likely accepted before fix)`);
    order.payment.status = 'paid';
    order.payment.processedAt = new Date();
    order.payoutStatus = 'ready';
    // No return here, let it proceed to ship
  }

  if (!trackingNumber) {
    return res.status(400).json({
      success: false,
      message: 'Tracking number is required',
    });
  }

  // Update shipping info safely avoiding Mongoose internal spread bugs
  if (!order.shipping) order.shipping = {};
  
  order.shipping.trackingNumber = trackingNumber;
  order.shipping.carrier = carrier || 'Standard Delivery';
  order.shipping.shippedAt = new Date();
  
  if (req.body.estimatedDelivery) {
    order.shipping.estimatedDelivery = new Date(req.body.estimatedDelivery);
  }

  await order.updateStatus('shipped', notes || `Order shipped with tracking: ${trackingNumber}`);

  // Send notification to customer
  try {
    await sendNotification({
      userId: order.customer._id,
      type: 'order_shipped',
      title: 'Order Shipped',
      message: `Your order #${order.orderNumber} has been shipped. Tracking: ${trackingNumber}`,
      link: `/orders/${order._id}`,
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }

  res.json({
    success: true,
    message: 'Order marked as shipped',
    order: await Order.findById(order._id).populate('items.product', 'name images'),
  });
});

/**
 * @route   PUT /api/orders/:id/tracking
 * @desc    Update tracking number for shipped order
 * @access  Private (Artisan)
 */
exports.updateTracking = asyncHandler(async (req, res) => {
  const { trackingNumber, carrier, estimatedDelivery, notes } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
    });
  }

  // Allow updating tracking for processing or shipped orders
  if (!['processing', 'shipped'].includes(order.status)) {
    return res.status(400).json({
      success: false,
      message: 'Can only update tracking for processing or shipped orders',
    });
  }

  // Safely update shipping info avoiding Mongoose subdoc object spread
  if (!order.shipping) order.shipping = {};
  
  if (trackingNumber) order.shipping.trackingNumber = trackingNumber;
  if (carrier) order.shipping.carrier = carrier;
  if (estimatedDelivery) order.shipping.estimatedDelivery = new Date(estimatedDelivery);
  if (notes !== undefined) order.shipping.notes = notes;
  
  order.markModified('shipping');

  // Add a status history entry for the tracking update
  if (!order.statusHistory) order.statusHistory = [];
  order.statusHistory.push({
    status: order.status,
    timestamp: new Date(),
    note: `Tracking information updated: ${trackingNumber || 'N/A'}`
  });

  await order.save();

  res.json({
    success: true,
    message: 'Tracking information updated',
    order: await Order.findById(order._id).populate('items.product', 'name images'),
  });
});

/**
 * @route   PUT /api/orders/:id/deliver
 * @desc    Mark order as delivered and record commission debt for Manual/COD (shipped → delivered)
 * @access  Private (Artisan/Admin)
 */
exports.markAsDelivered = asyncHandler(async (req, res) => {
  const User = require('../models/User'); // Import User model for debt updates
  const order = await Order.findById(req.params.id)
    .populate('customer', 'email profile')
    .populate('items.artisan');

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
    });
  }

  // idempotent: If already completed, just return success
  if (order.status === 'completed') {
    return res.json({
      success: true,
      message: 'Order was already marked as completed.',
      order: await Order.findById(order._id).populate('items.product', 'name images'),
    });
  }

  // Business Rule: Only Shipped orders can be marked as Delivered
  if (order.status !== 'shipped') {
    return res.status(400).json({
      success: false,
      message: `Cannot mark as delivered. Current status: ${order.status}. Order must be Shipped first.`,
    });
  }

  // Update delivery info
  if (!order.shipping) order.shipping = {};
  order.shipping.deliveredAt = new Date();
  order.shipping.actualDelivery = new Date();
  order.shipping.deliveryStatus = 'Delivered';

  // Payout logic for online payments
  if (order.payment.method === 'CHAPA' || order.payment.method === 'stripe') {
    order.payoutStatus = 'Ready';
  }

  // Also update payment status to completed if it was explicitly paid online or manually
  if (order.payment.status === 'paid') {
    order.payment.status = 'completed';
  }

  // Record earnings for each artisan (only if not already created)
  for (const item of order.items) {
    // Check for existing earning for this item to prevent duplicates
    const existingEarning = await Earning.findOne({ orderId: order._id, productId: item.product._id || item.product });
    if (!existingEarning) {
      const saleAmount = item.price * item.quantity;
      const platformFee = (saleAmount * PLATFORM_FEE_PERCENTAGE) / 100;
      const artisanEarning = saleAmount - platformFee;

      await Earning.create({
        artisan: item.artisan._id || item.artisan,
        transactionType: 'sale',
        amount: saleAmount,
        platformFee: platformFee,
        netAmount: artisanEarning,
        orderId: order._id,
        productId: item.product._id || item.product,
        status: 'completed',
        description: `Sale of ${item.quantity}x items from order #${order.orderNumber}`
      });
    }
  }

  // Mark as completed using the model's updateStatus method
  // This will AUTOMATICALLY trigger the commission debt recording if payment is Manual/COD
  await order.updateStatus('completed', `Order delivered and marked as completed by ${req.user.role === 'admin' ? 'Admin' : 'Artisan'}.`);


  console.log(`✅ Order #${order.orderNumber} successfully delivered and debt (if any) processed.`);

  // Send notification to customer
  try {
    await sendNotification({
      userId: order.customer._id,
      type: 'order_completed',
      title: 'Order Completed',
      message: `Your order #${order.orderNumber} has been delivered and completed. Thank you for your purchase!`,
      link: `/orders/${order._id}`,
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }

  res.json({
    success: true,
    message: 'Order delivered successfully and marked as completed.',
    order: await Order.findById(order._id).populate('items.product', 'name images'),
  });
});

/**
 * @route   PUT /api/admin/artisans/:id/clear-debt
 * @desc    Clear artisan commission debt (Admin only)
 * @access  Private (Admin)
 */
exports.clearArtisanDebt = asyncHandler(async (req, res) => {
  const User = require('../models/User');
  const artisanId = req.params.id;

  const artisan = await User.findById(artisanId);
  if (!artisan || artisan.role !== 'artisan') {
    return res.status(404).json({ success: false, message: 'Artisan not found' });
  }

  const clearedAmount = artisan.unpaidCommission || 0;
  
  // Use .save() to clearly separate Paid and Unpaid
  artisan.paidCommission = (artisan.paidCommission || 0) + clearedAmount;
  artisan.unpaidCommission = 0;
  await artisan.save();

  // Also update related orders to mark commission as Paid
  await Order.updateMany(
    { 
      artisanId: artisanId, 
      'payment.method': { $in: ['Manual', 'MANUAL', 'COD'] },
      commissionStatus: 'Pending',
      status: { $in: ['Delivered', 'completed', 'Completed'] }
    },
    { $set: { commissionStatus: 'Paid' } }
  );

  res.json({ 
    success: true, 
    message: `Commission debt of ${clearedAmount.toFixed(2)} ETB cleared for ${artisan.fullName}`,
    clearedAmount
  });
});

/**
 * @route   PUT /api/orders/:id/complete
 * @desc    Mark order as completed and record earnings (delivered → completed)
 * @access  Private (System/Customer) - DEPRECATED: Now handled automatically in markAsDelivered
 * @note    This endpoint is kept for backward compatibility but is no longer used
 */
exports.completeOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('items.product items.artisan');

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
    });
  }

  if (order.status === 'completed') {
    return res.json({
      success: true,
      message: 'Order already completed',
      order: await Order.findById(order._id).populate('items.product', 'name images'),
    });
  }

  if (order.status !== 'delivered') {
    return res.status(400).json({
      success: false,
      message: `Cannot complete order. Current status: ${order.status}`,
    });
  }

  await order.updateStatus('completed', 'Order completed');

  // Record earnings for each artisan
  for (const item of order.items) {
    const saleAmount = item.price * item.quantity;
    const platformFee = (saleAmount * PLATFORM_FEE_PERCENTAGE) / 100;
    const netAmount = saleAmount - platformFee;

    await Earning.create({
      artisan: item.artisan._id,
      transactionType: 'sale',
      amount: saleAmount,
      platformFee,
      netAmount,
      orderId: order._id,
      productId: item.product._id,
      status: 'completed',
      description: `Sale: ${item.product.name}`,
    });
  }

  res.json({
    success: true,
    message: 'Order completed and earnings recorded',
    order: await Order.findById(order._id).populate('items.product', 'name images'),
  });
});

/**
 * @route   PUT /api/orders/:id/cancel
 * @desc    Cancel order (confirmed/processing → cancelled)
 * @access  Private (Artisan)
 */
exports.cancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const order = await Order.findById(req.params.id).populate('customer', 'email profile');

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
    });
  }

  if (!['confirmed', 'processing'].includes(order.status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot cancel order with status: ${order.status}`,
    });
  }

  await order.updateStatus('cancelled', reason || 'Order cancelled by artisan');

  // Send notification to customer
  try {
    await sendNotification({
      userId: order.customer._id,
      type: 'order_cancelled',
      title: 'Order Cancelled',
      message: `Your order #${order.orderNumber} has been cancelled. ${reason || ''}`,
      link: `/orders/${order._id}`,
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }

  res.json({
    success: true,
    message: 'Order cancelled',
    order: await Order.findById(order._id).populate('items.product', 'name images'),
  });
});

/**
 * @route   PUT /api/orders/:id/flag
 * @desc    Flag/Unflag an order (Admin only)
 * @access  Private (Admin)
 */
exports.flagOrder = asyncHandler(async (req, res) => {
  const order = await findOrder(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  const { isDisputed, reason } = req.body;
  order.isDisputed = isDisputed !== undefined ? isDisputed : !order.isDisputed;
  
  if (reason) {
    order.notes = (order.notes || '') + `\n[FLAG] ${new Date().toLocaleDateString()}: ${reason}`;
  }

  await order.save();
  res.json({ success: true, isDisputed: order.isDisputed, message: `Order ${order.isDisputed ? 'flagged' : 'unflagged'} successfully` });
});

/**
 * @route   DELETE /api/orders/:id
 * @desc    Permanently delete order (only rejected/cancelled orders)
 * @access  Private (Artisan/Admin)
 */
exports.deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
    });
  }

  // Verify artisan owns this order
  const artisanId = req.user._id.toString();
  const hasItems = order.items.some(item => item.artisan.toString() === artisanId);
  
  if (!hasItems && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to delete this order',
    });
  }

  // Only allow deletion of rejected or cancelled orders
  if (!['rejected', 'cancelled'].includes(order.status)) {
    return res.status(400).json({
      success: false,
      message: 'Only rejected or cancelled orders can be deleted',
    });
  }

  // Permanently delete the order
  await Order.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Order deleted permanently',
  });
});

/**
 * @route   POST /api/orders/bulk-delete
 * @desc    Bulk delete multiple orders (only rejected/cancelled)
 * @access  Private (Artisan/Admin)
 */
exports.bulkDeleteOrders = asyncHandler(async (req, res) => {
  const { orderIds } = req.body;

  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide an array of order IDs',
    });
  }

  const artisanId = req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  // Fetch all orders to validate
  const orders = await Order.find({ _id: { $in: orderIds } });

  if (orders.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'No orders found',
    });
  }

  // Validate permissions and status
  const invalidOrders = [];
  const validOrderIds = [];

  for (const order of orders) {
    // Check permission
    const hasItems = order.items.some(item => item.artisan.toString() === artisanId);
    if (!hasItems && !isAdmin) {
      invalidOrders.push({
        id: order._id,
        reason: 'No permission',
      });
      continue;
    }

    // Check status
    if (!['rejected', 'cancelled'].includes(order.status)) {
      invalidOrders.push({
        id: order._id,
        reason: `Invalid status: ${order.status}`,
      });
      continue;
    }

    validOrderIds.push(order._id);
  }

  // Delete valid orders
  const result = await Order.deleteMany({ _id: { $in: validOrderIds } });

  res.json({
    success: true,
    message: `Successfully deleted ${result.deletedCount} order(s)`,
    deletedCount: result.deletedCount,
    invalidOrders: invalidOrders.length > 0 ? invalidOrders : undefined,
  });
});

/**
 * Format order response for public tracking (safe fields only)
 */
exports.formatOrderResponse = (order) => {
  const obj = order.toObject ? order.toObject() : order;
  return {
    _id: obj._id,
    orderNumber: obj.orderNumber,
    status: obj.status,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    items: (obj.items || []).map(item => ({
      product: item.product,
      quantity: item.quantity,
      price: item.price,
      status: item.status,
    })),
    totals: obj.totals,
    payment: {
      method: obj.payment?.method,
      status: obj.payment?.status,
    },
    shipping: obj.shipping,
    // Only expose address if it is marked visible (escrow logic)
    shippingAddress: obj.shippingAddress?.isAddressVisible
      ? obj.shippingAddress
      : {
          firstName: obj.shippingAddress?.firstName,
          city: obj.shippingAddress?.city,
          region: obj.shippingAddress?.region,
        },
  };
};

/**
 * @route   PUT /api/orders/:id/approve-payment
 * @desc    Approve manual payment (Pending → Paid)
 * @access  Private (Admin)
 */
exports.approvePayment = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  if (order.payment.status !== 'pending') {
    return res.status(400).json({ success: false, message: 'Only Pending payments can be approved' });
  }

  order.payment.status = 'paid';
  order.payment.processedAt = new Date();
  order.payment.processedBy = req.user._id;
  
  // ESCROW LOGIC: Reveal address to artisan upon payment approval
  order.shippingAddress.isAddressVisible = true;
  
  // Automatically set payoutStatus to "Ready" per request
  order.payoutStatus = 'ready';

  await order.save();
  res.json({ success: true, message: 'Payment approved, address now visible to artisan', order });
});

/**
 * @route   PUT /api/orders/:id/reject-payment
 * @desc    Reject manual payment (Pending → Rejected)
 * @access  Private (Admin)
 */
exports.rejectPayment = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  order.payment.status = 'rejected';
  order.notes = (order.notes || '') + ` | Payment Rejected: ${reason || 'Invalid receipt'}`;
  
  await order.save();
  res.json({ success: true, message: 'Payment rejected', order });
});

/**
 * @route   PUT /api/orders/:id/mark-cod-paid
 * @desc    Mark COD order as paid (Unpaid → Paid)
 * @access  Private (Admin)
 */
exports.markCodPaid = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  if (order.payment.method !== 'COD') {
    return res.status(400).json({ success: false, message: 'Only COD orders can be marked as COD Paid' });
  }

  order.payment.status = 'paid';
  order.payment.processedAt = new Date();
  
  // For COD, the artisan already has the cash. No Payout is needed from platform.
  order.payoutStatus = 'n/a';

  await order.save();
  res.json({ success: true, message: 'COD payment confirmed', order });
});

/**
 * @route   PUT /api/orders/:id/pay-artisan
 * @desc    Trigger payout (Ready → Paid)
 * @access  Private (Admin)
 */
exports.payArtisan = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('items.artisan');
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  if (order.payoutStatus !== 'ready') {
    return res.status(400).json({ success: false, message: 'Artisan payout is not ready' });
  }

  // Double Check: Online orders only
  if (['Manual', 'MANUAL', 'COD'].includes(order.payment.method)) {
    return res.status(400).json({ success: false, message: 'Payout not required for Manual/COD orders (Artisan holds cash)' });
  }

  // Process actual payout (Create Earning records)
  for (const item of order.items) {
    const saleAmount = item.price * item.quantity;
    const platformFee = order.totals.platformCommission || (saleAmount * 0.15);
    const netAmount = order.totals.artisanEarning || (saleAmount - platformFee);

    await Earning.create({
      artisan: item.artisan._id,
      transactionType: 'sale',
      amount: saleAmount,
      platformFee,
      netAmount,
      orderId: order._id,
      productId: item.product,
      status: 'completed',
      description: `Artisan Payout for Order #${order.orderNumber}`,
      processedBy: req.user._id,
      processedAt: new Date()
    });
  }

  order.payoutStatus = 'paid';
  await order.save();

  res.json({ success: true, message: 'Artisan paid successfully', order });
});




/**
 * @desc    Mark platform commission as Paid
 * @route   PUT /api/orders/:id/mark-commission-paid
 * @access  Private (Admin)
 */
exports.markCommissionPaid = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  order.commissionStatus = 'Paid';
  await order.save();
  res.json({ success: true, message: 'Commission marked as paid', order });
});

/**
 * @desc    Auto-cancel manual orders that stay unpaid after expiry
 * @route   POST /api/orders/cleanup-external
 * @access  Private (Admin)
 */
exports.cleanupUnpaidManualOrders = asyncHandler(async (req, res) => {
  const now = new Date();

  const result = await Order.updateMany(
    {
      'payment.status': 'pending',
      status: 'pending',
      'payment.expiry': { $lt: now }
    },
    {
      $set: { 
        'payment.status': 'rejected', // Set payment to rejected per requirement
        status: 'cancelled',
        notes: 'Auto-cancelled: Payment expired after 24 hours'
      }
    }
  );

  res.json({ 
    success: true, 
    message: `Expired ${result.modifiedCount} pending orders.`,
    count: result.modifiedCount 
  });
});

/**
 * @desc    Upload payment receipt (Customer)
 * @route   PUT /api/orders/:id/upload-receipt
 * @access  Private (Customer)
 */
exports.uploadReceipt = asyncHandler(async (req, res) => {
  console.log(`📁 Processing receipt upload for order: ${req.params.id}`);
  const order = await findOrder(req.params.id);

  if (!order) {
    console.log(`❌ Order not found: ${req.params.id}`);
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  // Check if it's the right customer
  if (order.customer.toString() !== req.user._id.toString()) {
    console.log(`❌ Unauthorized: Order customer ${order.customer} !== User ${req.user._id}`);
    return res.status(403).json({ success: false, message: "Unauthorized" });
  }

  if (!req.file) {
    console.log(`❌ No file uploaded`);
    return res.status(400).json({ success: false, message: "Please upload a receipt image" });
  }

  console.log(`✅ File received: ${req.file.filename}`);
  // Update order status and receipt
  order.payment.receipt = `/uploads/${req.file.filename}`;
  order.payment.status = "pending verification";
  
  await order.save();
  console.log(`✅ Order ${order.orderNumber} updated with receipt`);

  res.json({
    success: true,
    message: "Receipt uploaded and awaiting verification",
    data: order
  });
});

/**
 * @desc    Artisan approve manual payment
 * @route   PUT /api/orders/:id/artisan-approve-payment
 * @access  Private (Artisan)
 */
exports.artisanApprovePayment = asyncHandler(async (req, res) => {
  const order = await findOrder(req.params.id);

  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  // Verify artisan ownership - logic updated to check items array
  const artisanId = req.user._id.toString();
  const hasItems = order.items.some(item => item.artisan.toString() === artisanId);
  
  if (!hasItems && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: "Unauthorized" });
  }

  order.payment.status = "paid";
  order.shippingAddress.isAddressVisible = true;
  order.status = "processing";
  order.payoutStatus = "ready";

  await order.save();

  res.json({
    success: true,
    message: "Payment approved and address unmasked",
    data: order
  });
});

/**
 * @desc    Artisan reject manual payment
 * @route   PUT /api/orders/:id/artisan-reject-payment
 * @access  Private (Artisan)
 */
exports.artisanRejectPayment = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const order = await findOrder(req.params.id);

  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  // Verify artisan ownership - logic updated to check items array
  const artisanId = req.user._id.toString();
  const hasItems = order.items.some(item => item.artisan.toString() === artisanId);
  
  if (!hasItems && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: "Unauthorized" });
  }

  order.payment.status = "rejected";
  order.status = "cancelled";
  order.cancellationReason = reason || "Payment verification failed by artisan";

  await order.save();

  res.json({
    success: true,
    message: "Payment rejected and order cancelled",
    data: order
  });
});

module.exports = exports;
