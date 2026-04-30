/**
 * Withdrawal Audit Log Model
 * Tracks all status changes and actions on withdrawal requests
 */

const mongoose = require('mongoose');

const withdrawalAuditLogSchema = new mongoose.Schema(
  {
    earningId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Earning',
      required: true,
      index: true,
    },
    
    artisan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
    action: {
      type: String,
      enum: [
        'created',
        'approved',
        'processing',
        'completed',
        'failed',
        'cancelled',
        'status_changed',
      ],
      required: true,
    },
    
    previousStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', null],
    },
    
    newStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    },
    
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    notes: {
      type: String,
      trim: true,
    },
    
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
withdrawalAuditLogSchema.index({ earningId: 1, createdAt: -1 });
withdrawalAuditLogSchema.index({ artisan: 1, createdAt: -1 });

module.exports = mongoose.model('WithdrawalAuditLog', withdrawalAuditLogSchema);
