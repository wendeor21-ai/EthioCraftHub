/**
 * NotificationSetting Model - PostgreSQL/Prisma backend
 */
const { prisma } = require('../lib/prisma');
const { createModel } = require('../lib/mongoCompat/createModel');
const { defaultTranslateWhere, defaultToPrisma } = require('../lib/mongoCompat/modelHelpers');

const notificationSettingModelDef = {
  delegate: prisma.notificationSetting,
  defaultInclude: { adminUser: true },

  populateMap: {
    adminUserId: { model: 'User' },
  },

  async translateWhere(where, ops, rawFilter) {
    const result = await defaultTranslateWhere(where, ops, rawFilter);
    if (rawFilter.adminUserId) {
      result.adminUserId = String(rawFilter.adminUserId._id || rawFilter.adminUserId);
    }
    return result;
  },

  toPrisma(data) {
    return defaultToPrisma(data, { adminUserId: 'adminUserId' });
  },
};

module.exports = createModel('NotificationSetting', notificationSettingModelDef);
