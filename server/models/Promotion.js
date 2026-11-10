/**
 * Promotion Model - PostgreSQL/Prisma backend
 */
const { prisma } = require('../lib/prisma');
const { createModel } = require('../lib/mongoCompat/createModel');
const { defaultTranslateWhere, defaultToPrisma } = require('../lib/mongoCompat/modelHelpers');

const promotionModelDef = {
  delegate: prisma.promotion,
  defaultInclude: { artisan: true, selectedProducts: { include: { product: true } } },

  populateMap: {
    artisanId: { model: 'User' },
    selectedProducts: { model: 'Product' },
  },

  async translateWhere(where, ops, rawFilter) {
    const result = await defaultTranslateWhere(where, ops, rawFilter);
    if (rawFilter.artisanId) result.artisanId = String(rawFilter.artisanId._id || rawFilter.artisanId);
    return result;
  },

  toPrisma(data) {
    const prismaData = defaultToPrisma(data, { artisanId: 'artisanId' });
    if (prismaData.selectedProducts && Array.isArray(prismaData.selectedProducts)) {
      prismaData.selectedProducts = prismaData.selectedProducts.map((p) =>
        typeof p === 'object' ? p._id || p.id : p
      );
    }
    return prismaData;
  },

  methods: {
    isActive() {
      const now = new Date();
      return (
        this._data.status === 'active' &&
        new Date(this._data.startDate) <= now &&
        new Date(this._data.endDate) >= now
      );
    },

    calculateDiscount(price) {
      if (this._data.discountType === 'percentage') {
        return price * (this._data.discountValue / 100);
      }
      if (this._data.discountType === 'fixed') {
        return Math.min(this._data.discountValue, price);
      }
      return 0;
    },
  },
};

module.exports = createModel('Promotion', promotionModelDef);
