/**
 * Earning Model for EthioCraft Global
 * Tracks artisan earnings, withdrawals, and financial transactions
 */

const mongoose = require('mongoose');

const earningSchema = new mongoose.Schema(
  {
    artisan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
    // Transaction details
    transactionType: {
      type: String,
      enum: ['sale', 'withdrawal', 'refund', 'adjustment', 'fee'],
      required: true,
    },
    
    amount: {
      type: Number,
      required: true,
    },
    
    platformFee: {
      type: Number,
      default: 0,
    },
    
    netAmount: {
      type: Number,
      required: true,
    },
    
    // Related references
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    
    // Withdrawal specific fields
    withdrawalMethod: {
      type: String,
      enum: ['telebirr', 'cbe_birr', 'bank_transfer', null],
    },
    
    withdrawalStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', null],
    },
    
    withdrawalAccountDetails: {
      accountNumber: String,
      accountName: String,
      bankName: String,
      phoneNumber: String,
    },
    
    // Status tracking
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'completed',
    },
    
    description: {
      type: String,
      trim: true,
    },
    
    // Audit trail
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    
    processedAt: {
      type: Date,
    },
    
    failureReason: {
      type: String,
      trim: true,
    },
    
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for efficient querying
earningSchema.index({ artisan: 1, createdAt: -1 });
earningSchema.index({ transactionType: 1, status: 1 });
earningSchema.index({ withdrawalStatus: 1 });

// Virtual for formatted amount
earningSchema.virtual('formattedAmount').get(function () {
  return `${this.amount.toFixed(2)} ETB`;
});

// Static method to calculate artisan balance
earningSchema.statics.getArtisanBalance = async function (artisanId) {
  const result = await this.aggregate([
    {
      $match: {
        artisan: new mongoose.Types.ObjectId(artisanId),
        status: 'completed',
      },
    },
    {
      $group: {
        _id: '$transactionType',
        total: { $sum: '$netAmount' },
      },
    },
  ]);

  let totalEarnings = 0;
  let totalWithdrawals = 0;

  result.forEach((item) => {
    if (item._id === 'sale') {
      totalEarnings += item.total;
    } else if (item._id === 'withdrawal') {
      totalWithdrawals += Math.abs(item.total);
    }
  });

  const availableBalance = totalEarnings - totalWithdrawals;

  return {
    totalEarnings,
    totalWithdrawals,
    availableBalance,
  };
};

// Static method to get pending withdrawals
earningSchema.statics.getPendingWithdrawals = async function (artisanId) {
  return this.aggregate([
    {
      $match: {
        artisan: new mongoose.Types.ObjectId(artisanId),
        transactionType: 'withdrawal',
        withdrawalStatus: { $in: ['pending', 'processing'] },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: { $abs: '$netAmount' } },
        count: { $sum: 1 },
      },
    },
  ]);
};

// Static method to get monthly earnings
earningSchema.statics.getMonthlyEarnings = async function (artisanId, months = 6) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  return this.aggregate([
    {
      $match: {
        artisan: new mongoose.Types.ObjectId(artisanId),
        transactionType: 'sale',
        status: 'completed',
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        totalEarnings: { $sum: '$netAmount' },
        totalSales: { $sum: 1 },
      },
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 },
    },
  ]);
};

// Static method to get earnings by category
earningSchema.statics.getEarningsByCategory = async function (artisanId) {
  return this.aggregate([
    {
      $match: {
        artisan: new mongoose.Types.ObjectId(artisanId),
        transactionType: 'sale',
        status: 'completed',
        productId: { $exists: true },
      },
    },
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product',
      },
    },
    {
      $unwind: '$product',
    },
    {
      $group: {
        _id: '$product.category',
        totalEarnings: { $sum: '$netAmount' },
        totalSales: { $sum: 1 },
      },
    },
    {
      $sort: { totalEarnings: -1 },
    },
  ]);
};

// Method to create audit log entry
earningSchema.methods.createAuditLog = function (action, userId, notes) {
  return {
    earningId: this._id,
    action,
    userId,
    notes,
    timestamp: new Date(),
    previousStatus: this.withdrawalStatus,
  };
};

module.exports = mongoose.model('Earning', earningSchema);
