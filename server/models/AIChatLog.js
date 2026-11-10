/**
 * AIChatLog Model - PostgreSQL/Prisma backend
 */
const { prisma } = require('../lib/prisma');
const { createModel } = require('../lib/mongoCompat/createModel');
const { defaultTranslateWhere, defaultToPrisma } = require('../lib/mongoCompat/modelHelpers');

const aiChatLogModelDef = {
  delegate: prisma.aIChatLog,
  defaultInclude: { user: true, product: true, reviewedBy: true },

  populateMap: {
    userId: { model: 'User' },
    productId: { model: 'Product' },
    reviewedBy: { model: 'User' },
  },

  async translateWhere(where, ops, rawFilter) {
    const result = await defaultTranslateWhere(where, ops, rawFilter);
    if (rawFilter.userId) result.userId = String(rawFilter.userId._id || rawFilter.userId);
    return result;
  },

  toPrisma(data) {
    return defaultToPrisma(data, {
      userId: 'userId',
      productId: 'productId',
      reviewedBy: 'reviewedById',
    });
  },

  virtuals: {
    formattedDate: (data) =>
      data.createdAt
        ? new Date(data.createdAt).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '',
  },
};

const AIChatLog = createModel('AIChatLog', aiChatLogModelDef);

AIChatLog.getRecentLogs = function (limit = 50, filters = {}) {
  return AIChatLog.find(filters)
    .populate('userId', 'email profile.firstName profile.lastName role')
    .populate('productId', 'name category')
    .sort({ createdAt: -1 })
    .limit(limit);
};

AIChatLog.getFlaggedLogs = function (limit = 20) {
  return AIChatLog.find({ flaggedForReview: true })
    .populate('userId', 'email profile.firstName profile.lastName role')
    .sort({ createdAt: -1 })
    .limit(limit);
};

AIChatLog.getUserHistory = function (userId, limit = 20) {
  return AIChatLog.find({ userId }).sort({ createdAt: -1 }).limit(limit);
};

AIChatLog.getAnalytics = async function (startDate, endDate) {
  const match = {};
  if (startDate) match.createdAt = { $gte: new Date(startDate) };
  if (endDate) match.createdAt = { ...match.createdAt, $lte: new Date(endDate) };

  return AIChatLog.aggregate([{ $match: match }, { $group: { _id: null } }]);
};

module.exports = AIChatLog;
