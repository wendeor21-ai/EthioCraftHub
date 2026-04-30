/**
 * Order Model for EthioCraft Global
 * 
 * Manages the complete order lifecycle from cart to delivery:
 * - Order creation and tracking
 * - Payment processing integration
 * - Multi-artisan order support
 * - Delivery coordination
 * - Communication between customers and artisans
 */

const mongoose = require('mongoose');

// Order item schema for individual products in an order
const orderItemSchema = new mongoose.Schema({
    product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: false
  },
  isCustomOrder: {
    type: Boolean,
    default: false
  },
  customOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomOrder'
  },
  artisan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Artisan reference is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: [true, 'Item price is required'],
    min: [0, 'Price cannot be negative']
  },
  originalPrice: {
    type: Number,
    min: [0, 'Original price cannot be negative']
  },
  promotionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Promotion'
  },
  promotionDiscount: {
    type: Number,
    default: 0,
    min: [0, 'Promotion discount cannot be negative']
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      message: 'Invalid item status'
    },
    default: 'pending'
  },
  selectedOptions: [{
    name: { type: String, trim: true },
    value: { type: String, trim: true }
  }],
  color: {
    type: String,
    trim: true
  },
  size: {
    type: String,
    trim: true
  },
  artisanNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'Artisan notes cannot exceed 500 characters']
  }
}, { _id: true });

// Order totals schema
const totalsSchema = new mongoose.Schema({
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative']
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative']
  },
  shipping: {
    type: Number,
    default: 0,
    min: [0, 'Shipping cost cannot be negative']
  },
  total: {
    type: Number,
    required: [true, 'Total is required'],
    min: [0, 'Total cannot be negative']
  },
  platformCommission: {
    type: Number,
    default: 0,
    min: [0, 'Commission cannot be negative']
  },
  artisanEarning: {
    type: Number,
    default: 0,
    min: [0, 'Earnings cannot be negative']
  }
}, { _id: false });

// Shipping address schema
const shippingAddressSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  street: {
    type: String,
    required: [true, 'Street address is required'],
    trim: true,
    maxlength: [200, 'Street address cannot exceed 200 characters']
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
    maxlength: [100, 'City cannot exceed 100 characters']
  },
  region: {
    type: String,
    required: [true, 'Region is required'],
    trim: true,
    maxlength: [100, 'Region cannot exceed 100 characters']
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
    default: 'Ethiopia',
    maxlength: [100, 'Country cannot exceed 100 characters']
  },
  postalCode: {
    type: String,
    trim: true,
    maxlength: [20, 'Postal code cannot exceed 20 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    validate: {
      validator: function(v) {
        return /^(\+251|0)?[97]\d{8}$/.test(v.replace(/\s/g, ''));
      },
      message: 'Please enter a valid Ethiopian phone number'
    }
  },
  isAddressVisible: {
    type: Boolean,
    default: false
  }
}, { _id: false });

// Payment information schema
const paymentSchema = new mongoose.Schema({
  method: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['Online', 'Manual', 'MANUAL', 'COD', 'CHAPA', 'stripe', 'paypal', 'bank_transfer', 'BANK_TRANSFER', 'cash_on_delivery', 'CASH_ON_DELIVERY', 'chapa', 'telebirr']
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'paid', 'escrow', 'failed', 'rejected', 'unpaid', 'pending verification', 'completed', 'refunded', 'partially_refunded'],
      message: 'Invalid payment status'
    },
    default: 'pending',
    lowercase: true
  },
  receipt: {
    type: String, // For MANUAL payments
    trim: true
  },
  transactionId: {
    type: String,
    trim: true,
    sparse: true // Allow multiple null values but unique non-null values
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Payment amount cannot be negative']
  },
  currency: {
    type: String,
    default: 'ETB',
    enum: ['ETB', 'USD', 'EUR'],
    uppercase: true
  },
  processedAt: Date,
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  refundAmount: {
    type: Number,
    default: 0,
    min: [0, 'Refund amount cannot be negative']
  },
  refundReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Refund reason cannot exceed 500 characters']
  },
  expiry: {
    type: Date,
    default: function() {
      const now = new Date();
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    }
  }
}, { _id: false });

// Tracking information schema
const trackingSchema = new mongoose.Schema({
  carrier: {
    type: String,
    trim: true,
    maxlength: [100, 'Carrier name cannot exceed 100 characters']
  },
  trackingNumber: {
    type: String,
    trim: true,
    maxlength: [100, 'Tracking number cannot exceed 100 characters'],
    validate: {
      validator: function(v) {
        // If tracking number is provided, it must be alphanumeric
        return !v || /^[a-zA-Z0-9\-_]+$/.test(v);
      },
      message: 'Tracking number must be alphanumeric'
    }
  },
  courierName: {
    type: String,
    trim: true,
    enum: ['DHL', 'FedEx', 'Anbessa Bus', 'Ethiopian Postal Service', 'Local Courier', 'Store Pickup', 'Other'],
    maxlength: [100, 'Courier name cannot exceed 100 characters']
  },
  shippingMethod: {
    type: String,
    enum: ['Standard Delivery', 'Express Delivery', 'Store Pickup'],
    default: 'Standard Delivery'
  },
  estimatedDelivery: Date,
  actualDelivery: Date,
  shippedAt: Date,
  deliveredAt: Date,
  deliveryStatus: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'in transit', 'out for delivery', 'delivered', 'failed', 'returned'],
    default: 'pending',
    lowercase: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Shipping notes cannot exceed 500 characters']
  },
  deliveryNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'Delivery notes cannot exceed 500 characters']
  },
  deliveryProofPhoto: {
    type: String, // URL to uploaded photo
    trim: true
  },
  shippingCost: {
    type: Number,
    default: 0,
    min: [0, 'Shipping cost cannot be negative']
  }
}, { _id: false });

// Status history schema for tracking order status changes
const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'rejected', 'cancelled']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  note: {
    type: String,
    trim: true,
    maxlength: [500, 'Status note cannot exceed 500 characters']
  }
}, { _id: false });

// Communication schema for order-related messages
const communicationSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Message sender is required']
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Message recipient is required']
  },
  message: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  type: {
    type: String,
    enum: {
      values: ['status_update', 'customer_inquiry', 'artisan_response', 'admin_notification'],
      message: 'Invalid communication type'
    },
    required: [true, 'Communication type is required']
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, { 
  timestamps: true,
  _id: true 
});

// Main Order schema
const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    uppercase: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer reference is required']
  },
  artisanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  cartId: {
    type: String,
    index: true
  },
  items: {
    type: [orderItemSchema],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Order must contain at least one item'
    }
  },
  totals: {
    type: totalsSchema,
    required: true
  },
  shippingAddress: {
    type: shippingAddressSchema,
    required: true
  },
  payment: {
    type: paymentSchema,
    required: true
  },
  shipping: trackingSchema,
  communication: [communicationSchema],
  status: {
    type: String,
    enum: {
      values: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'rejected', 'cancelled', 'refunded'],
      message: 'Invalid order status'
    },
    default: 'pending',
    lowercase: true
  },
  payoutStatus: {
    type: String,
    enum: ['pending', 'ready', 'paid', 'n/a'],
    default: 'pending',
    lowercase: true
  },
  commissionStatus: {
    type: String,
    enum: ['pending', 'approved', 'paid'],
    default: 'pending',
    lowercase: true
  },
  statusHistory: [statusHistorySchema],
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Order notes cannot exceed 1000 characters']
  },
  cancelReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Cancel reason cannot exceed 500 characters']
  },
  isDisputed: {
    type: Boolean,
    default: false
  },
  isCustom: {
    type: Boolean,
    default: false
  },
  photos: {
    front: String,
    back: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full shipping address
orderSchema.virtual('fullShippingAddress').get(function() {
  const addr = this.shippingAddress;
  return `${addr.firstName} ${addr.lastName}, ${addr.street}, ${addr.city}, ${addr.region}, ${addr.country}`;
});

// Virtual for order summary
orderSchema.virtual('summary').get(function() {
  return {
    orderNumber: this.orderNumber,
    itemCount: this.items.length,
    total: this.totals.total,
    status: this.status,
    createdAt: this.createdAt
  };
});

// Virtual for unique artisans in order
orderSchema.virtual('artisans').get(function() {
  const artisanIds = [...new Set(this.items.map(item => item.artisan.toString()))];
  return artisanIds;
});

// Pre-save middleware to generate order number
orderSchema.pre('save', function(next) {
  if (!this.orderNumber) {
    // Generate order number: EC-YYYYMMDD-XXXXX
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
    this.orderNumber = `EC-${dateStr}-${random}`;
  }
  next();
});

// Pre-validate middleware to ensure order number is set before validation
orderSchema.pre('validate', function(next) {
  if (!this.orderNumber) {
    // Generate order number: EC-YYYYMMDD-XXXXX
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
    this.orderNumber = `EC-${dateStr}-${random}`;
  }
  next();
});

// Pre-save middleware to calculate totals
orderSchema.pre('save', function(next) {
  if (this.isModified('items') && !this.isCustom) {
    this.totals.subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Calculate tax (15% VAT for Ethiopian orders)
    if (this.shippingAddress.country === 'Ethiopia') {
      this.totals.tax = Math.round(this.totals.subtotal * 0.15 * 100) / 100;
    }
    
    // Calculate shipping (free for orders over 1000 ETB)
    if (this.totals.subtotal < 1000 && this.shippingAddress.country === 'Ethiopia') {
      this.totals.shipping = 50; // 50 ETB shipping fee
    } else if (this.shippingAddress.country !== 'Ethiopia') {
      this.totals.shipping = 200; // International shipping
    }
    
    this.totals.total = this.totals.subtotal + this.totals.tax + this.totals.shipping;
    
    // Calculate Commission (5%) and Artisan Earnings (95%) - Per latest request
    this.totals.platformCommission = Math.round(this.totals.total * 0.05 * 100) / 100;
    this.totals.artisanEarning = Math.round((this.totals.total - this.totals.platformCommission) * 100) / 100;
    
    // CRITICAL FIX: Update payment amount to match total
    if (this.payment) {
      this.payment.amount = this.totals.total;
    }
  }
  next();
});

// Method to add communication message
orderSchema.methods.addMessage = function(from, to, message, type) {
  this.communication.push({
    from,
    to,
    message,
    type
  });
  return this.save();
};

// Method to update order status
orderSchema.methods.updateStatus = function(newStatus, notes = '') {
  const oldStatus = this.status;
  this.status = newStatus;
  
  // Add to status history
  if (!this.statusHistory) {
    this.statusHistory = [];
  }
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    note: notes
  });
  
  if (notes) {
    this.notes = notes;
  }
  
  // Update payment status based on order status
  if ((newStatus === 'confirmed' || newStatus === 'processing') && 
      (this.payment.status === 'pending' || this.payment.status === 'unpaid')) {
    // For Chapa/Stripe this might be auto-set, for COD/Manual it stays Pending/Unpaid until Admin action
    if (this.payment.method === 'CHAPA' || this.payment.method === 'stripe') {
      this.payment.status = 'paid';
      this.payment.processedAt = new Date();
    }
  } else if (newStatus === 'cancelled' || newStatus === 'rejected') {
    this.payment.status = 'failed';
  } else if (newStatus === 'refunded') {
    this.payment.status = 'refunded';
  }

  // Auto-set payoutStatus to "Ready" if Paid and Delivered
  if ((newStatus === 'delivered' || newStatus === 'completed') && 
      (this.payment.status === 'paid' || this.payment.status === 'completed')) {
    this.payoutStatus = 'Ready';
  }
  
  // Update item statuses
  this.items.forEach(item => {
    if (item.status === 'pending' && newStatus === 'confirmed') {
      item.status = 'confirmed';
    } else if (newStatus === 'cancelled') {
      item.status = 'cancelled';
    }
  });
  
  return this.save();
};

// Method to update item status
orderSchema.methods.updateItemStatus = function(itemId, newStatus, artisanNotes = '') {
  const item = this.items.id(itemId);
  if (!item) {
    throw new Error('Order item not found');
  }
  
  item.status = newStatus;
  if (artisanNotes) {
    item.artisanNotes = artisanNotes;
  }
  
  // Update overall order status based on item statuses
  const allStatuses = this.items.map(i => i.status);
  if (allStatuses.every(s => s === 'delivered')) {
    this.status = 'delivered';
  } else if (allStatuses.every(s => s === 'shipped' || s === 'delivered')) {
    this.status = 'shipped';
  } else if (allStatuses.some(s => s === 'processing' || s === 'shipped')) {
    this.status = 'processing';
  }

  // Check payout readiness after item status change
  if ((this.status === 'delivered' || this.status === 'completed') && 
      (this.payment.status === 'paid' || this.payment.status === 'completed')) {
    this.payoutStatus = 'ready';
  }

  // --- AUTO-INVENTORY CONTROL ---
  // When an order is marked as Paid or Confirmed, decrement the countInStock
  if (
    this.isModified('payment.status') && 
    ['paid', 'confirmed'].includes(this.payment.status.toLowerCase())
  ) {
    const Product = mongoose.model('Product');
    // We execute this asynchronously so it doesn't strictly block the save
    // or we can wait for it. Promise.all ensures stock is lowered exactly now.
    Promise.all(this.items.map(item => 
      Product.findByIdAndUpdate(item.product, {
        $inc: { 'inventory.quantity': -item.quantity }
      })
    )).catch(err => console.error('Auto-Inventory decrement failed: ', err));
  }
  
  return this.save();
};

// Static method to get orders by customer with pagination
orderSchema.statics.getByCustomer = function(customerId, { page = 1, limit = 10, status } = {}) {
  const filter = { customer: customerId };
  if (status) filter.status = status;

  const query = this.find(filter)
    .populate('items.product', 'name images price')
    .populate('items.artisan', 'profile.firstName profile.lastName')
    .sort({ createdAt: -1 });
  
  const skip = (page - 1) * limit;
  return {
    query: query.skip(skip).limit(limit),
    total: this.countDocuments(filter)
  };
};

// Static method to get orders by artisan with pagination
orderSchema.statics.getByArtisan = function(artisanId, { page = 1, limit = 10, status } = {}) {
  const filter = { 'items.artisan': artisanId };
  if (status) {
    if (status === 'pending') {
      filter.status = { $in: ['pending', 'pending verification'] };
    } else if (status === 'processing') {
      filter.status = { $in: ['confirmed', 'processing'] };
    } else {
      filter.status = status;
    }
  }

  const query = this.find(filter)
    .select('orderNumber status totals payment shippingAddress createdAt customer items payoutStatus commissionStatus isCustom photos')
    .populate('customer', 'profile.firstName profile.lastName profile.phone email')
    .populate('items.product', 'name images price')
    .sort({ createdAt: -1 });
  
  const skip = (page - 1) * limit;
  return {
    query: query.skip(skip).limit(limit),
    total: this.countDocuments(filter)
  };
};

// Indexes for performance optimization
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ 'items.artisan': 1, createdAt: -1 }); // Optimized for artisan dashboard
orderSchema.index({ 'items.artisan': 1, status: 1 }); // Optimized for tab filtering
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'payment.transactionId': 1 }, { sparse: true });

module.exports = mongoose.model('Order', orderSchema);