/**
 * User Model - PostgreSQL/Prisma backend with Mongoose-compatible API
 */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { prisma } = require('../lib/prisma');
const { createModel } = require('../lib/mongoCompat/createModel');
const { defaultTranslateWhere, defaultToPrisma } = require('../lib/mongoCompat/modelHelpers');
const { toIdString } = require('../lib/mongoCompat/serialize');

const userModelDef = {
  delegate: prisma.user,

  refMap: {
    reviewedBy: 'reviewedBy',
  },

  populateMap: {
    'cart.productId': { model: 'Product' },
    'verification.reviewedBy': { model: 'User' },
    'preferences.viewedProducts.product': { model: 'Product' },
  },

  async translateWhere(where, ops, rawFilter) {
    return defaultTranslateWhere(where, ops, rawFilter);
  },

  toPrisma(data, { isNew } = {}) {
    const prismaData = defaultToPrisma(data, {
      customer: 'customerId',
      artisan: 'artisanId',
    });

    // Strip relation objects — only scalar FKs belong in update data
    const UNKNOWN_FIELDS = [
      'artisanProducts', 'customerOrders', 'artisanOrders',
      'customOrdersAsCustomer', 'customOrdersAsArtisan', 'promotions',
      'earnings', 'earningsProcessed', 'commissionPayments',
      'withdrawalAuditLogs', 'withdrawalAuditPerformed',
      'messagesSent', 'messagesReceived', 'userInteractions',
      'aiChatLogs', 'aiChatLogsReviewed', 'notificationSettings',
    ];
    for (const f of UNKNOWN_FIELDS) {
      delete prismaData[f];
    }

    // 'google' is stored internally as alias for 'googleId' — remap it
    if (prismaData.google !== undefined) {
      if (!prismaData.googleId) prismaData.googleId = prismaData.google;
      delete prismaData.google;
    }

  // Ensure defaults for JSON fields
    if (!prismaData.profile) prismaData.profile = {};
    if (!prismaData.preferences) prismaData.preferences = {};
    if (!prismaData.wishlist) prismaData.wishlist = [];
    if (!prismaData.cart) prismaData.cart = [];
    if (!prismaData.shippingAddresses) prismaData.shippingAddresses = [];
    if (!prismaData.flags) prismaData.flags = [];
    if (!prismaData.alerts) prismaData.alerts = [];

    return prismaData;
  },

  virtuals: {
    isLocked: (data) => !!(data.lockUntil && new Date(data.lockUntil) > new Date()),
    fullName: (data) => {
      if (!data.profile) return 'User';
      return `${data.profile.firstName || ''} ${data.profile.lastName || ''}`.trim();
    },
  },

  async preSave(doc, validateBeforeSave) {
    if ((doc._isNew || doc.isModified('password')) && doc._data.password) {
      // Skip if already a bcrypt hash
      if (!/^\$2[aby]?\$\d{2}\$/.test(doc._data.password)) {
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
        doc._data.password = await bcrypt.hash(doc._data.password, saltRounds);
      }
    }
  },

  methods: {
    async comparePassword(candidatePassword) {
      try {
        if (!this._data.password) {
          const row = await prisma.user.findUnique({
            where: { id: this._data._id },
            select: { password: true },
          });
          this._data.password = row?.password;
        }
        return await bcrypt.compare(candidatePassword, this._data.password);
      } catch (error) {
        throw new Error('Password comparison failed');
      }
    },

    async incLoginAttempts() {
      if (this._data.lockUntil && new Date(this._data.lockUntil) < new Date()) {
        this._data.lockUntil = undefined;
        this._data.loginAttempts = 1;
      } else {
        this._data.loginAttempts = (this._data.loginAttempts || 0) + 1;
        if (this._data.loginAttempts >= 5 && !this.isLocked) {
          this._data.lockUntil = new Date(Date.now() + 2 * 60 * 60 * 1000);
        }
      }
      return this.save();
    },

    async resetLoginAttempts() {
      this._data.loginAttempts = 0;
      this._data.lockUntil = undefined;
      return this.save();
    },

    createPasswordResetToken() {
      const rawToken = crypto.randomBytes(32).toString('hex');
      this._data.passwordResetToken = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');
      this._data.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
      return rawToken;
    },

    async addToCart(productId, quantity = 1) {
      const pid = toIdString(productId);
      const existing = (this._data.cart || []).find(
        (item) => toIdString(item.productId) === pid
      );
      if (existing) {
        existing.quantity += quantity;
      } else {
        this._data.cart = this._data.cart || [];
        this._data.cart.push({
          _id: crypto.randomBytes(12).toString('hex'),
          productId: pid,
          quantity,
          addedAt: new Date(),
        });
      }
      this.markModified('cart');
      return this.save();
    },

    async updateCartQuantity(productId, quantity) {
      const pid = toIdString(productId);
      const item = (this._data.cart || []).find(
        (i) => toIdString(i.productId) === pid
      );
      if (item) {
        if (quantity <= 0) {
          this._data.cart = this._data.cart.filter(
            (i) => toIdString(i.productId) !== pid
          );
        } else {
          item.quantity = quantity;
        }
      }
      this.markModified('cart');
      return this.save();
    },

    async removeFromCart(productId) {
      const pid = toIdString(productId);
      this._data.cart = (this._data.cart || []).filter(
        (i) => toIdString(i.productId) !== pid
      );
      this.markModified('cart');
      return this.save();
    },

    async clearCart() {
      this._data.cart = [];
      this.markModified('cart');
      return this.save();
    },

    async getPopulatedCart() {
      await this.populate({
        path: 'cart.productId',
        select: 'name price images category inventory artisan',
        populate: { path: 'artisan', select: 'profile.firstName profile.lastName' },
      });
      return this;
    },

    async addShippingAddress(addressData) {
      if (addressData.isDefault) {
        (this._data.shippingAddresses || []).forEach((addr) => {
          addr.isDefault = false;
        });
      }
      this._data.shippingAddresses = this._data.shippingAddresses || [];
      this._data.shippingAddresses.push({
        _id: crypto.randomBytes(12).toString('hex'),
        ...addressData,
      });
      this.markModified('shippingAddresses');
      return this.save();
    },

    async updateShippingAddress(addressId, addressData) {
      const addr = (this._data.shippingAddresses || []).find(
        (a) => toIdString(a._id) === toIdString(addressId)
      );
      if (!addr) throw new Error('Shipping address not found');

      if (addressData.isDefault) {
        this._data.shippingAddresses.forEach((a) => {
          if (toIdString(a._id) !== toIdString(addressId)) a.isDefault = false;
        });
      }
      Object.assign(addr, addressData);
      this.markModified('shippingAddresses');
      return this.save();
    },

    async removeShippingAddress(addressId) {
      this._data.shippingAddresses = (this._data.shippingAddresses || []).filter(
        (a) => toIdString(a._id) !== toIdString(addressId)
      );
      this.markModified('shippingAddresses');
      return this.save();
    },

    getDefaultShippingAddress() {
      return (
        (this._data.shippingAddresses || []).find((a) => a.isDefault) ||
        this._data.shippingAddresses?.[0]
      );
    },
  },
};

const User = createModel('User', userModelDef);

User.findByEmail = function (email) {
  return User.findOne({ email: email.toLowerCase() });
};

User.getArtisansByStatus = function (status) {
  return User.find({ role: 'artisan', 'verification.status': status }).select('-password');
};

User.Types = { ObjectId: class { constructor(id) { this._id = id; } } };

module.exports = User;
