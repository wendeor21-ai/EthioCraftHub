const mongoose = require('mongoose');

const commissionPaymentSchema = new mongoose.Schema({
  artisan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Artisan reference is required']
  },
  amount: {
    type: Number,
    required: [true, 'Payout amount is required'],
    min: [0, 'Payout amount cannot be negative']
  },
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['bank transfer', 'wallet', 'cash to admin', 'Bank Transfer', 'Wallet', 'Cash to Admin', 'Wallet / Telebirr'],
    lowercase: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  receiptImage: {
    type: String, // URL to uploaded receipt image
    trim: true
  },
  status: {
    type: String,
    enum: ['pending admin approval', 'approved', 'rejected', 'confirmed'],
    default: 'pending admin approval',
    lowercase: true
  },
  orderIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }]
}, { 
  timestamps: true 
});

module.exports = mongoose.model('CommissionPayment', commissionPaymentSchema);
