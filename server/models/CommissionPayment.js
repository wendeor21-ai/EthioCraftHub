/**
 * CommissionPayment Model - PostgreSQL/Prisma backend
 */
const { prisma } = require('../lib/prisma');
const { createModel } = require('../lib/mongoCompat/createModel');
const { defaultTranslateWhere, defaultToPrisma } = require('../lib/mongoCompat/modelHelpers');

const commissionPaymentModelDef = {
  delegate: prisma.commissionPayment,
  defaultInclude: { artisan: true },

  populateMap: {
    artisan: { model: 'User' },
  },

  async translateWhere(where, ops, rawFilter) {
    const result = await defaultTranslateWhere(where, ops, rawFilter);
    if (rawFilter.artisan) result.artisanId = String(rawFilter.artisan._id || rawFilter.artisan);
    return result;
  },

  toPrisma(data) {
    const prismaData = defaultToPrisma(data, { artisan: 'artisanId' });
    if (!prismaData.orderIds) prismaData.orderIds = [];
    return prismaData;
  },
};

module.exports = createModel('CommissionPayment', commissionPaymentModelDef);
