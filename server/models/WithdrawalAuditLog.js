/**
 * WithdrawalAuditLog Model - PostgreSQL/Prisma backend
 */
const { prisma } = require('../lib/prisma');
const { createModel } = require('../lib/mongoCompat/createModel');
const { defaultTranslateWhere, defaultToPrisma } = require('../lib/mongoCompat/modelHelpers');

const withdrawalAuditLogModelDef = {
  delegate: prisma.withdrawalAuditLog,
  defaultInclude: { earning: true, artisan: true, performedBy: true },

  populateMap: {
    earningId: { model: 'Earning' },
    artisan: { model: 'User' },
    performedBy: { model: 'User' },
  },

  async translateWhere(where, ops, rawFilter) {
    const result = await defaultTranslateWhere(where, ops, rawFilter);
    if (rawFilter.artisan) result.artisanId = String(rawFilter.artisan._id || rawFilter.artisan);
    if (rawFilter.earningId) result.earningId = String(rawFilter.earningId._id || rawFilter.earningId);
    return result;
  },

  toPrisma(data) {
    return defaultToPrisma(data, {
      earningId: 'earningId',
      artisan: 'artisanId',
      performedBy: 'performedById',
    });
  },
};

module.exports = createModel('WithdrawalAuditLog', withdrawalAuditLogModelDef);
