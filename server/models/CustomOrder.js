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
    if (result.OR && Array.isArray(result.OR)) {
      result.OR = result.OR.map(clause => {
        const c = { ...clause };
        if (c.artisan !== undefined) {
          c.artisanId = c.artisan ? String(c.artisan._id || c.artisan) : null;
          delete c.artisan;
        }
        if (c.artisanId && typeof c.artisanId === 'object') {
          c.artisanId = String(c.artisanId._id || c.artisanId);
        }
        return c;
      });
    }
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
