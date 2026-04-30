/**
 * Admin Withdrawals Controller
 * Manage and process artisan withdrawal requests
 */

const Earning = require('../models/Earning');
const WithdrawalAuditLog = require('../models/WithdrawalAuditLog');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/admin/withdrawals
 * @desc    Get all withdrawal requests with filters
 * @access  Private (Admin only)
 */
exports.getWithdrawals = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const query = {
    transactionType: 'withdrawal',
  };

  if (status) {
    query.withdrawalStatus = status;
  }

  const withdrawals = await Earning.find(query)
    .populate('artisan', 'email profile')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .lean();

  const total = await Earning.countDocuments(query);

  res.json({
    success: true,
    data: {
      withdrawals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

/**
 * @route   GET /api/admin/withdrawals/:id
 * @desc    Get single withdrawal details
 * @access  Private (Admin only)
 */
exports.getWithdrawalById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const withdrawal = await Earning.findById(id)
    .populate('artisan', 'email profile')
    .lean();

  if (!withdrawal) {
    return res.status(404).json({
      success: false,
      message: 'Withdrawal not found',
    });
  }

  // Get audit logs
  const auditLogs = await WithdrawalAuditLog.find({ earningId: id })
    .populate('performedBy', 'email')
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: {
      withdrawal,
      auditLogs,
    },
  });
});

/**
 * @route   PUT /api/admin/withdrawals/:id
 * @desc    Update withdrawal status
 * @access  Private (Admin only)
 */
exports.updateWithdrawalStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  // Validate status
  const validStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status',
    });
  }

  const withdrawal = await Earning.findById(id);

  if (!withdrawal) {
    return res.status(404).json({
      success: false,
      message: 'Withdrawal not found',
    });
  }

  if (withdrawal.transactionType !== 'withdrawal') {
    return res.status(400).json({
      success: false,
      message: 'This is not a withdrawal transaction',
    });
  }

  const previousStatus = withdrawal.withdrawalStatus;

  // Update withdrawal
  withdrawal.withdrawalStatus = status;
  withdrawal.processedBy = req.user._id;
  withdrawal.processedAt = new Date();

  if (status === 'completed') {
    withdrawal.status = 'completed';
  } else if (status === 'failed' || status === 'cancelled') {
    withdrawal.status = 'failed';
    withdrawal.failureReason = notes;
  }

  await withdrawal.save();

  // Create audit log
  await WithdrawalAuditLog.create({
    earningId: withdrawal._id,
    artisan: withdrawal.artisan,
    action: status === 'completed' ? 'completed' : status === 'processing' ? 'processing' : 'status_changed',
    previousStatus,
    newStatus: status,
    performedBy: req.user._id,
    notes: notes || `Status changed from ${previousStatus} to ${status}`,
  });

  res.json({
    success: true,
    message: `Withdrawal ${status} successfully`,
    data: withdrawal,
  });
});

/**
 * @route   GET /api/admin/withdrawals/stats
 * @desc    Get withdrawal statistics
 * @access  Private (Admin only)
 */
exports.getWithdrawalStats = asyncHandler(async (req, res) => {
  const stats = await Earning.aggregate([
    {
      $match: {
        transactionType: 'withdrawal',
      },
    },
    {
      $group: {
        _id: '$withdrawalStatus',
        count: { $sum: 1 },
        totalAmount: { $sum: { $abs: '$netAmount' } },
      },
    },
  ]);

  const formattedStats = {
    pending: { count: 0, totalAmount: 0 },
    processing: { count: 0, totalAmount: 0 },
    completed: { count: 0, totalAmount: 0 },
    failed: { count: 0, totalAmount: 0 },
    cancelled: { count: 0, totalAmount: 0 },
  };

  stats.forEach((stat) => {
    if (formattedStats[stat._id]) {
      formattedStats[stat._id] = {
        count: stat.count,
        totalAmount: stat.totalAmount,
      };
    }
  });

  res.json({
    success: true,
    data: formattedStats,
  });
});

module.exports = exports;
