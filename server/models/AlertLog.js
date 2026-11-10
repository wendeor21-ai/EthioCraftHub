/**
 * AlertLog Model - PostgreSQL/Prisma backend
 */
const { prisma } = require('../lib/prisma');
const { createModel } = require('../lib/mongoCompat/createModel');
const { defaultTranslateWhere, defaultToPrisma } = require('../lib/mongoCompat/modelHelpers');

const alertLogModelDef = {
  delegate: prisma.alertLog,

  async translateWhere(where, ops, rawFilter) {
    return defaultTranslateWhere(where, ops, rawFilter);
  },

  toPrisma(data) {
    return defaultToPrisma(data);
  },
};

module.exports = createModel('AlertLog', alertLogModelDef);
