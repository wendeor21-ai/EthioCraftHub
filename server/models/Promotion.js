const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  artisanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed', 'coupon'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  couponCode: {
    type: String,
    uppercase: true,
    sparse: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  targetType: {
    type: String,
    enum: ['all', 'specific'],
    default: 'all'
  },
  selectedProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  urgencyBadge: {
    type: Boolean,
    default: false
  },
  badgeText: {
    type: String,
    default: 'Limited Time Offer'
  },
  minOrderValue: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'scheduled', 'expired'],
    default: 'active'
  },
  analytics: {
    totalSales: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    uses: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

promotionSchema.index({ artisanId: 1, status: 1 });
promotionSchema.index({ couponCode: 1 }, { unique: true, sparse: true });
promotionSchema.index({ endDate: 1 });

promotionSchema.methods.isActive = function() {
  const now = new Date();
  return this.status === 'active' && 
         this.startDate <= now && 
         this.endDate >= now;
};

promotionSchema.methods.calculateDiscount = function(price) {
  if (this.discountType === 'percentage') {
    return price * (this.discountValue / 100);
  } else if (this.discountType === 'fixed') {
    return Math.min(this.discountValue, price);
  }
  return 0;
};

module.exports = mongoose.model('Promotion', promotionSchema);
