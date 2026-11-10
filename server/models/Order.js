/**
 * Order Model - PostgreSQL/Prisma backend
 */
const { prisma } = require('../lib/prisma');
const { createModel, getModel } = require('../lib/mongoCompat/createModel');
const { defaultTranslateWhere, defaultToPrisma } = require('../lib/mongoCompat/modelHelpers');
const { toIdString } = require('../lib/mongoCompat/serialize');

const MANUAL_METHODS = [
  'Manual', 'MANUAL', 'COD', 'manual', 'cash_on_delivery',
  'CASH_ON_DELIVERY', 'cod', 'bank_transfer', 'telebirr',
];

const orderModelDef = {
  delegate: prisma.order,

  defaultInclude: { customer: true, artisan: true },

  populateMap: {
    customer: { model: 'User' },
    artisan: { model: 'User' },
    'items.product': { model: 'Product' },
    'items.artisan': { model: 'User' },
    'items.promotionId': { model: 'Promotion' },
    'communication.from': { model: 'User' },
    'communication.to': { model: 'User' },
    'payment.processedBy': { model: 'User' },
  },

  async translateWhere(where, ops, rawFilter) {
    const result = await defaultTranslateWhere(where, ops, rawFilter);

    if (rawFilter.customer) {
      result.customerId = String(rawFilter.customer._id || rawFilter.customer);
    }
    if (rawFilter['items.artisan']) {
      const aid = String(rawFilter['items.artisan']._id || rawFilter['items.artisan']);
      // Filter by top-level artisanId FK (set when order is created)
      // Also include orders where the artisan appears in the items JSON array
      result.artisanId = aid;
    }
    if (rawFilter.status) {
      if (rawFilter.status.$in) result.status = { in: rawFilter.status.$in };
      else result.status = rawFilter.status;
    }

    return result;
  },

  toPrisma(data) {
    const prismaData = defaultToPrisma(data, {
      customer: 'customerId',
      artisan: 'artisanId',
    });

    // Strip relation objects — Prisma only accepts scalar FKs
    const UNKNOWN_FIELDS = [
      'customer', 'artisan',
      'earnings', 'commissionPaymentOrders',
    ];
    for (const f of UNKNOWN_FIELDS) {
      delete prismaData[f];
    }

    if (!prismaData.communication) prismaData.communication = [];
    if (!prismaData.statusHistory) prismaData.statusHistory = [];

    return prismaData;
  },

  virtuals: {
    fullShippingAddress: (data) => {
      const addr = data.shippingAddress;
      if (!addr) return '';
      return `${addr.firstName} ${addr.lastName}, ${addr.street}, ${addr.city}, ${addr.region}, ${addr.country}`;
    },
    summary: (data) => ({
      orderNumber: data.orderNumber,
      itemCount: data.items?.length || 0,
      total: data.totals?.total,
      status: data.status,
      createdAt: data.createdAt,
    }),
    artisans: (data) => {
      const ids = [...new Set((data.items || []).map((item) => toIdString(item.artisan)))];
      return ids;
    },
  },

  async preSave(doc) {
    const data = doc._data;

    if (!data.orderNumber) {
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const random = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
      data.orderNumber = `EC-${dateStr}-${random}`;
    }

    if (doc.isModified('items') && !data.isCustom) {
      calculateTotals(data);
    }
  },

  methods: {
    async addMessage(from, to, message, type) {
      const crypto = require('crypto');
      this._data.communication = this._data.communication || [];
      this._data.communication.push({
        _id: crypto.randomBytes(12).toString('hex'),
        from: toIdString(from),
        to: toIdString(to),
        message,
        type,
        isRead: false,
        createdAt: new Date(),
      });
      this.markModified('communication');
      return this.save();
    },

    async updateStatus(newStatus, notes = '') {
      this._data.status = newStatus;
      this._data.statusHistory = this._data.statusHistory || [];
      this._data.statusHistory.push({
        status: newStatus,
        timestamp: new Date(),
        note: notes,
      });
      if (notes) this._data.notes = notes;

      const payment = this._data.payment || {};
      if (
        (newStatus === 'confirmed' || newStatus === 'processing') &&
        (payment.status === 'pending' || payment.status === 'unpaid')
      ) {
        if (['CHAPA', 'stripe'].includes(payment.method)) {
          payment.status = 'paid';
          payment.processedAt = new Date();
        }
      } else if (['cancelled', 'rejected'].includes(newStatus)) {
        payment.status = 'failed';
      } else if (newStatus === 'refunded') {
        payment.status = 'refunded';
      }

      if (
        (newStatus === 'delivered' || newStatus === 'completed') &&
        (payment.status === 'paid' || payment.status === 'completed')
      ) {
        this._data.payoutStatus = 'ready';
      }

      for (const item of this._data.items || []) {
        if (item.status === 'pending' && newStatus === 'confirmed') item.status = 'confirmed';
        else if (newStatus === 'cancelled') item.status = 'cancelled';
      }

      this._data.payment = payment;
      this.markModified('status');
      this.markModified('payment');
      this.markModified('statusHistory');
      this.markModified('items');
      return this.save();
    },

    async updateItemStatus(itemId, newStatus, artisanNotes = '') {
      const item = (this._data.items || []).find(
        (i) => toIdString(i._id) === toIdString(itemId)
      );
      if (!item) throw new Error('Order item not found');

      item.status = newStatus;
      if (artisanNotes) item.artisanNotes = artisanNotes;

      const allStatuses = (this._data.items || []).map((i) => i.status);
      if (allStatuses.every((s) => s === 'delivered')) this._data.status = 'delivered';
      else if (allStatuses.every((s) => s === 'shipped' || s === 'delivered'))
        this._data.status = 'shipped';
      else if (allStatuses.some((s) => s === 'processing' || s === 'shipped'))
        this._data.status = 'processing';

      if (
        (this._data.status === 'delivered' || this._data.status === 'completed') &&
        (this._data.payment?.status === 'paid' || this._data.payment?.status === 'completed')
      ) {
        this._data.payoutStatus = 'ready';
      }

      this.markModified('items');
      return this.save();
    },
  },
};

function calculateTotals(data) {
  const totals = data.totals || {};
  totals.subtotal = (data.items || []).reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (data.shippingAddress?.country === 'Ethiopia') {
    totals.tax = Math.round(totals.subtotal * 0.15 * 100) / 100;
  } else {
    totals.tax = totals.tax || 0;
  }

  if (totals.subtotal < 1000 && data.shippingAddress?.country === 'Ethiopia') {
    totals.shipping = 50;
  } else if (data.shippingAddress?.country !== 'Ethiopia') {
    totals.shipping = 200;
  } else {
    totals.shipping = totals.shipping || 0;
  }

  totals.total = totals.subtotal + totals.tax + totals.shipping;
  totals.platformCommission = Math.round(totals.total * 0.05 * 100) / 100;
  totals.artisanEarning = Math.round((totals.total - totals.platformCommission) * 100) / 100;

  data.totals = totals;
  if (data.payment) data.payment.amount = totals.total;
}

const Order = createModel('Order', orderModelDef);

Order.getByCustomer = function (customerId, { page = 1, limit = 10, status } = {}) {
  const filter = { customer: customerId };
  if (status) filter.status = status;
  const query = Order.find(filter)
    .populate('items.product', 'name images price')
    .populate('items.artisan', 'profile.firstName profile.lastName')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  return {
    query,
    total: Order.countDocuments(filter),
  };
};

Order.getByArtisan = async function (artisanId, { page = 1, limit = 10, status } = {}) {
  const aid = String(artisanId._id || artisanId);

  // Build status filter for Prisma
  let statusFilterWhere = {};
  if (status) {
    if (status === 'pending') statusFilterWhere = { status: { in: ['pending', 'pending verification'] } };
    else if (status === 'processing') statusFilterWhere = { status: { in: ['confirmed', 'processing'] } };
    else statusFilterWhere = { status };
  }

  const { prisma } = require('../lib/prisma');

  // Step 1: find order IDs where items JSON array contains { artisan: aid }
  // Uses PostgreSQL JSONB containment operator @> for reliable matching
  let byItemsIds = [];
  try {
    const rawResults = await prisma.$queryRawUnsafe(
      `SELECT id FROM orders WHERE JSON_CONTAINS(items, ?) OR JSON_CONTAINS(items, ?)`,
      JSON.stringify({ artisan: aid }),
      JSON.stringify({ artisan: { _id: aid } })
    );
    byItemsIds = (rawResults || []).map(r => String(r.id));
  } catch (e) {
    console.warn('[getByArtisan] Raw JSON containment query failed:', e.message);
  }

  // Step 2: Build a unified OR clause: artisanId FK match OR items-json match
  const orClauses = [{ artisanId: aid }];
  if (byItemsIds.length > 0) {
    orClauses.push({ id: { in: byItemsIds } });
  }
  const baseWhere = { OR: orClauses, ...statusFilterWhere };

  // Step 3: Count total + fetch page in parallel
  const [total, page_results_raw] = await Promise.all([
    prisma.order.count({ where: baseWhere }),
    prisma.order.findMany({
      where: baseWhere,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  // Convert to compat docs and populate fields
  const { toMongoDoc } = require('../lib/mongoCompat/serialize');
  const User = require('./User');
  const Product = require('./Product');

  const orders = await Promise.all(page_results_raw.map(async (raw) => {
    const doc = toMongoDoc(raw);

    // Populate customer
    if (doc.customer && typeof doc.customer === 'string') {
      const cust = await User.findById(doc.customer).lean();
      if (cust) doc.customer = cust;
    }

    // Populate items: product + artisan user
    if (Array.isArray(doc.items)) {
      doc.items = await Promise.all(doc.items.map(async (item) => {
        if (item.product && typeof item.product === 'string') {
          const prod = await Product.findById(item.product).lean();
          if (prod) item.product = prod;
        }
        if (item.artisan && typeof item.artisan === 'string') {
          const art = await User.findById(item.artisan).lean();
          if (art) item.artisan = art;
        }
        return item;
      }));
    }

    return doc;
  }));

  return { query: { then: (res) => res(orders), exec: async () => orders }, orders, total };
};

module.exports = Order;
