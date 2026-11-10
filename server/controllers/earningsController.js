/**
 * Earnings Controller for EthioCraft Global
 * Handles artisan earnings, withdrawals, and financial analytics
 */

const mongoose = require('../lib/mongoose');
const Earning = require('../models/Earning');
const WithdrawalAuditLog = require('../models/WithdrawalAuditLog');
const Product = require('../models/Product');
const Order = require('../models/Order');
const CommissionPayment = require('../models/CommissionPayment');
const { asyncHandler } = require('../middleware/errorHandler');

// Platform fee percentage - Updated to 10% per latest request
const PLATFORM_FEE_PERCENTAGE = 10;
const MINIMUM_WITHDRAWAL = 500;

/**
 * @route   GET /api/earnings/dashboard
 * @desc    Get artisan earnings dashboard data
 * @access  Private (Artisan)
 */
exports.getDashboard = asyncHandler(async (req, res) => {
  const artisanId = req.user._id;

  // Get balance
  const balance = await Earning.getArtisanBalance(artisanId);

  // Get pending withdrawals
  const pendingWithdrawals = await Earning.getPendingWithdrawals(artisanId);
  const pendingAmount = pendingWithdrawals.length > 0 ? (pendingWithdrawals[0].total || 0) : 0;
  const pendingCount = pendingWithdrawals.length > 0 ? (pendingWithdrawals[0].count || 0) : 0;

  // Get pending commission payments waiting for approval
  const pendingCommissions = await CommissionPayment.find({ 
    artisan: artisanId, 
    status: 'pending admin approval' 
  });
  const pendingCommissionAmount = pendingCommissions.reduce((sum, p) => sum + p.amount, 0);

  // Get monthly earnings for chart
  const monthlyEarnings = await Earning.getMonthlyEarnings(artisanId, 6);

  // Get earnings by category
  const earningsByCategory = await Earning.getEarningsByCategory(artisanId);

  // Calculate top category
  let topCategory = null;
  let topCategoryPercentage = 0;
  if (earningsByCategory.length > 0) {
    const totalCategoryEarnings = earningsByCategory.reduce(
      (sum, cat) => sum + cat.totalEarnings,
      0
    );
    topCategory = earningsByCategory[0]._id;
    topCategoryPercentage =
      totalCategoryEarnings > 0
        ? ((earningsByCategory[0].totalEarnings / totalCategoryEarnings) * 100).toFixed(1)
        : 0;
  }

  res.json({
    success: true,
    data: {
      balance: {
        totalEarnings: balance.totalEarnings,
        availableBalance: balance.availableBalance,
        totalWithdrawals: balance.totalWithdrawals,
        pendingWithdrawals: pendingAmount,
        pendingWithdrawalsCount: pendingCount,
        unpaidCommission: req.user.unpaidCommission || 0, // renamed from commissionDebt
        paidCommission: req.user.paidCommission || 0,     // added field
        pendingCommissionAmount, // Amount waiting for admin approval
      },
      monthlyEarnings,
      earningsByCategory,
      insights: {
        topCategory,
        topCategoryPercentage,
      },
    },
  });
});

/**
 * @route   GET /api/earnings/commission-history
 * @desc    Get artisan commission payment history
 * @access  Private (Artisan)
 */
exports.getCommissionHistory = asyncHandler(async (req, res) => {
  const artisanId = req.user._id;
  
  const history = await CommissionPayment.find({ artisan: artisanId })
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: history
  });
});

/**
 * @route   GET /api/earnings/transactions
 * @desc    Get artisan transaction history
 * @access  Private (Artisan)
 */
exports.getTransactions = asyncHandler(async (req, res) => {
  const artisanId = req.user._id;
  const { page = 1, limit = 20, type, status } = req.query;

  const query = { artisan: artisanId };

  if (type) {
    query.transactionType = type;
  }

  if (status) {
    if (type === 'withdrawal') {
      query.withdrawalStatus = status;
    } else {
      query.status = status;
    }
  }

  const transactions = await Earning.find(query)
    .populate('productId', 'name images category')
    .populate('orderId', 'orderNumber')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .lean();

  const total = await Earning.countDocuments(query);

  res.json({
    success: true,
    data: {
      transactions,
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
 * @route   POST /api/earnings/withdraw
 * @desc    Create withdrawal request
 * @access  Private (Artisan)
 */
exports.createWithdrawal = asyncHandler(async (req, res) => {
  const artisanId = req.user._id;
  const { amount, method, accountDetails } = req.body;

  // Validation
  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid withdrawal amount',
    });
  }

  if (amount < MINIMUM_WITHDRAWAL) {
    return res.status(400).json({
      success: false,
      message: `Minimum withdrawal amount is ${MINIMUM_WITHDRAWAL} ETB`,
    });
  }

  if (!method || !['telebirr', 'cbe_birr', 'bank_transfer'].includes(method)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid withdrawal method',
    });
  }

  // Check available balance
  const balance = await Earning.getArtisanBalance(artisanId);

  if (amount > balance.availableBalance) {
    return res.status(400).json({
      success: false,
      message: `Insufficient balance. Available: ${balance.availableBalance.toFixed(2)} ETB`,
    });
  }

  // Create withdrawal transaction
  const withdrawal = await Earning.create({
    artisan: artisanId,
    transactionType: 'withdrawal',
    amount: -amount,
    platformFee: 0,
    netAmount: -amount,
    withdrawalMethod: method,
    withdrawalStatus: 'pending',
    withdrawalAccountDetails: accountDetails,
    status: 'pending',
    description: `Withdrawal request via ${method}`,
  });

  // Create audit log
  await WithdrawalAuditLog.create({
    earningId: withdrawal._id,
    artisan: artisanId,
    action: 'created',
    previousStatus: null,
    newStatus: 'pending',
    performedBy: artisanId,
    notes: 'Withdrawal request created by artisan',
  });

  res.status(201).json({
    success: true,
    message: 'Withdrawal request submitted successfully',
    data: withdrawal,
  });
});

/**
 * @route   GET /api/earnings/withdrawals
 * @desc    Get artisan withdrawal history
 * @access  Private (Artisan)
 */
exports.getWithdrawals = asyncHandler(async (req, res) => {
  const artisanId = req.user._id;
  const { page = 1, limit = 10, status } = req.query;

  const query = {
    artisan: artisanId,
    transactionType: 'withdrawal',
  };

  if (status) {
    query.withdrawalStatus = status;
  }

  const withdrawals = await Earning.find(query)
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
 * @route   POST /api/earnings/sale
 * @desc    Record a sale earning (called when order is completed)
 * @access  Private (System/Admin)
 */
exports.recordSale = asyncHandler(async (req, res) => {
  const { artisanId, orderId, productId, amount } = req.body;

  // Calculate platform fee
  const platformFee = (amount * PLATFORM_FEE_PERCENTAGE) / 100;
  const netAmount = amount - platformFee;

  // Create earning record
  const earning = await Earning.create({
    artisan: artisanId,
    transactionType: 'sale',
    amount,
    platformFee,
    netAmount,
    orderId,
    productId,
    status: 'completed',
    description: 'Sale commission',
  });

  res.status(201).json({
    success: true,
    message: 'Sale earning recorded',
    data: earning,
  });
});

/**
 * @route   GET /api/earnings/insights
 * @desc    Get ZemaAI financial insights
 * @access  Private (Artisan)
 */
exports.getInsights = asyncHandler(async (req, res) => {
  const artisanId = req.user._id;

  // Get earnings by category
  const earningsByCategory = await Earning.getEarningsByCategory(artisanId);

  // Get monthly earnings
  const monthlyEarnings = await Earning.getMonthlyEarnings(artisanId, 3);

  // Calculate insights
  let insight = 'Start selling to see your financial insights!';

  if (earningsByCategory.length > 0) {
    const topCategory = earningsByCategory[0];
    const totalEarnings = earningsByCategory.reduce((sum, cat) => sum + cat.totalEarnings, 0);
    const percentage = ((topCategory.totalEarnings / totalEarnings) * 100).toFixed(1);

    insight = `Your top-selling category this month is ${topCategory._id}, contributing ${percentage}% of your income (${topCategory.totalEarnings.toFixed(2)} ETB from ${topCategory.totalSales} sales).`;

    // Add trend analysis
    if (monthlyEarnings.length >= 2) {
      const currentMonth = monthlyEarnings[monthlyEarnings.length - 1];
      const previousMonth = monthlyEarnings[monthlyEarnings.length - 2];
      const growth =
        ((currentMonth.totalEarnings - previousMonth.totalEarnings) / previousMonth.totalEarnings) *
        100;

      if (growth > 0) {
        insight += ` Your earnings have grown by ${growth.toFixed(1)}% compared to last month. Keep up the great work!`;
      } else if (growth < 0) {
        insight += ` Your earnings decreased by ${Math.abs(growth).toFixed(1)}% compared to last month. Consider promoting your ${topCategory._id} products more.`;
      }
    }
  }

  res.json({
    success: true,
    data: {
      insight,
      earningsByCategory,
      monthlyEarnings,
    },
  });
});

/**
 * @route   GET /api/earnings/commission-debt
 * @desc    Get current commission debt for artisan
 * @access  Private (Artisan)
 */
exports.getCommissionDebt = asyncHandler(async (req, res) => {
  const artisanId = req.user._id;
  const User = require('../models/User');

  // Fetch fresh user data to get the latest unpaidCommission
  const artisan = await User.findById(artisanId).select('unpaidCommission paidCommission').lean();
  const masterDebt = artisan?.unpaidCommission || 0;

  // Also aggregate from orders for the list of relevant orderIds
  const pipeline = [
    {
      $match: {
        "payment.method": { $in: ["Manual", "MANUAL", "COD", "cash_on_delivery", "CASH_ON_DELIVERY", "cod", "bank_transfer", "telebirr"] },
        // Match any casing of Pending/pending/PENDING
        commissionStatus: { $in: ["Pending", "pending", "PENDING", "Unpaid", "unpaid"] },
        // Only include delivered orders
        status: { $in: ["Delivered", "delivered", "Completed", "completed"] }
      }
    },
    { $unwind: "$items" },
    {
      $match: {
        "items.artisan": new mongoose.Types.ObjectId(artisanId)
      }
    },
    {
      $group: {
        _id: "$items.artisan",
        calculatedDebt: { $sum: { $multiply: ["$items.price", "$items.quantity", 0.10] } },
        orderIds: { $addToSet: "$_id" }
      }
    }
  ];

  const result = await Order.aggregate(pipeline);
  const orderIds = result[0]?.orderIds || [];

  // Use masterDebt (User model) as the source of truth — it's incremented precisely on delivery
  res.json({
    success: true,
    data: {
      totalDebt: masterDebt,        // primary: User.unpaidCommission
      calculatedDebt: result[0]?.calculatedDebt || 0, // secondary: from orders aggregation
      orderIds
    }
  });
});

/**
 * @route   POST /api/earnings/commission-payment
 * @desc    Submit commission payment proof
 * @access  Private (Artisan)
 */
exports.submitCommissionPayment = asyncHandler(async (req, res) => {
  const artisanId = req.user._id;
  const { amount, paymentMethod, notes, orderIds } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid payment amount' });
  }

  // Create payment record
  const payment = await CommissionPayment.create({
    artisan: artisanId,
    amount: Number(amount),
    paymentMethod,
    notes,
    orderIds: orderIds ? JSON.parse(orderIds) : [],
    receiptImage: req.file ? `/uploads/${req.file.filename}` : null,
    status: 'pending admin approval'
  });

  res.status(201).json({
    success: true,
    message: 'Commission payment proof submitted successfully. Waiting for admin confirmation.',
    data: payment
  });
});

module.exports = exports;
