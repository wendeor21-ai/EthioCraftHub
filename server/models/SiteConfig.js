/**
 * SiteConfig Model - PostgreSQL/Prisma backend
 */
const { prisma } = require('../lib/prisma');
const { createModel } = require('../lib/mongoCompat/createModel');
const { defaultTranslateWhere, defaultToPrisma } = require('../lib/mongoCompat/modelHelpers');

const siteConfigModelDef = {
  delegate: prisma.siteConfig,

  async translateWhere(where, ops, rawFilter) {
    return defaultTranslateWhere(where, ops, rawFilter);
  },

  toPrisma(data) {
    const prismaData = defaultToPrisma(data);
    if (!prismaData.heroSlides) prismaData.heroSlides = [];
    return prismaData;
  },
};

module.exports = createModel('SiteConfig', siteConfigModelDef);
