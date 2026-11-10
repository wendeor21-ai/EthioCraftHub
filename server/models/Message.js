/**
 * Message Model - PostgreSQL/Prisma backend
 */
const { prisma } = require('../lib/prisma');
const { createModel } = require('../lib/mongoCompat/createModel');
const { defaultTranslateWhere, defaultToPrisma } = require('../lib/mongoCompat/modelHelpers');

const messageModelDef = {
  delegate: prisma.message,
  defaultInclude: { sender: true, recipient: true },

  populateMap: {
    sender: { model: 'User' },
    recipient: { model: 'User' },
  },

  async translateWhere(where, ops, rawFilter) {
    const result = await defaultTranslateWhere(where, ops, rawFilter);
    if (rawFilter.sender) result.senderId = String(rawFilter.sender._id || rawFilter.sender);
    if (rawFilter.recipient) result.recipientId = String(rawFilter.recipient._id || rawFilter.recipient);
    return result;
  },

  toPrisma(data) {
    return defaultToPrisma(data, {
      sender: 'senderId',
      recipient: 'recipientId',
    });
  },
};

module.exports = createModel('Message', messageModelDef);
