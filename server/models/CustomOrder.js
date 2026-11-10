/**
 * CustomOrder Model - PostgreSQL/Prisma backend
 */
const { prisma } = require('../lib/prisma');
const { createModel } = require('../lib/mongoCompat/createModel');
const { defaultTranslateWhere, defaultToPrisma } = require('../lib/mongoCompat/modelHelpers');

const customOrderModelDef = {
  delegate: prisma.customOrder,
  defaultInclude: { customer: true, artisan: true, product: true },

  populateMap: {
    customer: { model: 'User' },
    artisan: { model: 'User' },
    product: { model: 'Product' },
  },

  async translateWhere(where, ops, rawFilter) {
    const result = await defaultTranslateWhere(where, ops, rawFilter);
    if (rawFilter.customer) result.customerId = String(rawFilter.customer._id || rawFilter.customer);
    if (rawFilter.artisan) result.artisanId = String(rawFilter.artisan._id || rawFilter.artisan);
    return result;
  },

  toPrisma(data) {
    return defaultToPrisma(data, {
      customer: 'customerId',
      artisan: 'artisanId',
      product: 'productId',
    });
  },
};

module.exports = createModel('CustomOrder', customOrderModelDef);
