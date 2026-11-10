/**
 * Earning Model - PostgreSQL/Prisma backend
 */
const { prisma } = require('../lib/prisma');
const { createModel } = require('../lib/mongoCompat/createModel');
const { defaultTranslateWhere, defaultToPrisma } = require('../lib/mongoCompat/modelHelpers');

const earningModelDef = {
  delegate: prisma.earning,
  defaultInclude: { artisan: true, order: true, product: true, processedBy: true },

  populateMap: {
    artisan: { model: 'User' },
    orderId: { model: 'Order' },
    productId: { model: 'Product' },
    processedBy: { model: 'User' },
  },

  async translateWhere(where, ops, rawFilter) {
    const result = await defaultTranslateWhere(where, ops, rawFilter);
    if (rawFilter.artisan) result.artisanId = String(rawFilter.artisan._id || rawFilter.artisan);
    return result;
  },

  toPrisma(data) {
    return defaultToPrisma(data, {
      artisan: 'artisanId',
      orderId: 'orderId',
      productId: 'productId',
      processedBy: 'processedById',
    });
  },

  virtuals: {
    formattedAmount: (data) => `${(data.amount || 0).toFixed(2)} ETB`,
  },

  methods: {
    createAuditLog(action, userId, notes) {
      return {
        earningId: this._data._id,
        action,
        userId,
        notes,
        timestamp: new Date(),
        previousStatus: this._data.withdrawalStatus,
      };
    },
  },
};

const Earning = createModel('Earning', earningModelDef);

Earning.getArtisanBalance = async function (artisanId) {
  const result = await Earning.aggregate([
    { $match: { artisan: artisanId, status: 'completed' } },
    { $group: { _id: '$transactionType', total: { $sum: '$netAmount' } } },
  ]);

  let totalEarnings = 0;
  let totalWithdrawals = 0;
  result.forEach((item) => {
    if (item._id === 'sale') totalEarnings += item.total;
    else if (item._id === 'withdrawal') totalWithdrawals += Math.abs(item.total);
  });

  return {
    totalEarnings,
    totalWithdrawals,
    availableBalance: totalEarnings - totalWithdrawals,
  };
};

Earning.getPendingWithdrawals = async function (artisanId) {
  return Earning.aggregate([
    {
      $match: {
        artisan: artisanId,
        transactionType: 'withdrawal',
        withdrawalStatus: { $in: ['pending', 'processing'] },
      },
    },
    { $group: { _id: null, total: { $sum: { $abs: '$netAmount' } }, count: { $sum: 1 } } },
  ]);
};

Earning.getMonthlyEarnings = async function (artisanId, months = 6) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  return Earning.aggregate([
    {
      $match: {
        artisan: artisanId,
        transactionType: 'sale',
        status: 'completed',
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        totalEarnings: { $sum: '$netAmount' },
        totalSales: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);
};

Earning.getEarningsByCategory = async function (artisanId) {
  return Earning.aggregate([
    {
      $match: {
        artisan: artisanId,
        transactionType: 'sale',
        status: 'completed',
        productId: { $exists: true },
      },
    },
    { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'product' } },
    { $unwind: '$product' },
    {
      $group: {
        _id: '$product.category',
        totalEarnings: { $sum: '$netAmount' },
        totalSales: { $sum: 1 },
      },
    },
    { $sort: { totalEarnings: -1 } },
  ]);
};

module.exports = Earning;
