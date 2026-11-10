/**
 * Seed PostgreSQL from JSON export files in database/
 *
 * - Preserves legacy ObjectId strings as PostgreSQL primary keys
 * - Validates foreign keys before every upsert
 * - Nulls optional missing refs; skips required missing refs (orphans)
 * - Retries deferred records after parents are loaded
 *
 * Usage:
 *   node scripts/seed-database.js
 *   npm run db:seed
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const BATCH_SIZE = 100;

const report = {
  startedAt: new Date().toISOString(),
  collections: {},
  skipped: [],
  errors: [],
  rootCauses: {},
  validation: {},
  completedAt: null,
};

/** In-memory ID sets for FK validation */
const ids = {
  users: new Set(),
  products: new Set(),
  promotions: new Set(),
  orders: new Set(),
  earnings: new Set(),
};

/** Deferred docs for retry after parents exist */
const deferred = [];

function oid(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string') return value;
  if (value.$oid) return value.$oid;
  if (value._id) return oid(value._id);
  if (typeof value === 'object' && typeof value.toString === 'function') {
    const s = value.toString();
    if (/^[a-fA-F0-9]{24}$/.test(s)) return s;
  }
  return String(value);
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value.$date) return new Date(value.$date);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Coerce Mongo mixed numeric fields to Number / Int for Prisma */
function toNumber(value, fallback = 0) {
  if (value == null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toInt(value, fallback = 0) {
  return Math.trunc(toNumber(value, fallback));
}

function trackSkip(collection, id, reason, missingRefs = []) {
  const entry = {
    collection,
    id,
    reason,
    missingRefs,
    rootCause: 'Source MongoDB data references a parent that does not exist (orphan / deleted parent)',
  };
  report.skipped.push(entry);

  const key = `${collection}:${reason}`;
  report.rootCauses[key] = (report.rootCauses[key] || 0) + 1;

  console.warn(`  ⏭️  Skipped ${id}: ${reason}${missingRefs.length ? ` [${missingRefs.join(', ')}]` : ''}`);
}

/**
 * Resolve optional FK: return id if parent exists, else null.
 */
function optionalFk(id, setName) {
  const resolved = oid(id);
  if (!resolved) return null;
  if (ids[setName].has(resolved)) return resolved;
  return null;
}

/**
 * Require FK: return { ok, id, missing } — if missing, caller must skip.
 */
function requireFk(id, setName, fieldName) {
  const resolved = oid(id);
  if (!resolved) {
    return { ok: false, id: null, missing: `${fieldName}=null` };
  }
  if (!ids[setName].has(resolved)) {
    return { ok: false, id: resolved, missing: `${fieldName}=${resolved} (not in ${setName})` };
  }
  return { ok: true, id: resolved, missing: null };
}

async function hydrateIdCachesFromPostgres() {
  const [users, products, promotions, orders, earnings] = await Promise.all([
    prisma.user.findMany({ select: { id: true } }),
    prisma.product.findMany({ select: { id: true } }),
    prisma.promotion.findMany({ select: { id: true } }),
    prisma.order.findMany({ select: { id: true } }),
    prisma.earning.findMany({ select: { id: true } }),
  ]);
  users.forEach((u) => ids.users.add(u.id));
  products.forEach((p) => ids.products.add(p.id));
  promotions.forEach((p) => ids.promotions.add(p.id));
  orders.forEach((o) => ids.orders.add(o.id));
  earnings.forEach((e) => ids.earnings.add(e.id));
  console.log(
    `📇 ID caches: users=${ids.users.size}, products=${ids.products.size}, promotions=${ids.promotions.size}, orders=${ids.orders.size}, earnings=${ids.earnings.size}`
  );
}

// ---------------------------------------------------------------------------
// Handlers — each returns { status: 'ok'|'skipped'|'deferred' }
// ---------------------------------------------------------------------------

const handlers = {
  users: async (doc) => {
    const id = oid(doc._id);
    await prisma.user.upsert({
      where: { id },
      create: {
        id,
        email: doc.email,
        password: doc.password || null,
        googleId: doc.googleId || null,
        authProvider: doc.authProvider || 'local',
        role: doc.role,
        profile: doc.profile || {},
        verification: doc.verification || null,
        preferences: doc.preferences || {},
        wishlist: (doc.wishlist || []).map(oid).filter(Boolean),
        cart: doc.cart || [],
        shippingAddresses: doc.shippingAddresses || [],
        isActive: doc.isActive ?? true,
        isVerified: doc.isVerified ?? false,
        isFlagged: doc.isFlagged ?? false,
        mustChangePassword: doc.mustChangePassword ?? false,
        hasAcceptedGuidelines: doc.hasAcceptedGuidelines ?? false,
        tempPasswordExpiry: parseDate(doc.tempPasswordExpiry),
        flags: doc.flags || [],
        alerts: doc.alerts || [],
        lastLogin: parseDate(doc.lastLogin),
        loginAttempts: toInt(doc.loginAttempts, 0),
        lockUntil: parseDate(doc.lockUntil),
        bankDetails: doc.bankDetails || null,
        notificationPreferences: doc.notificationPreferences || null,
        storeSettings: doc.storeSettings || null,
        shippingSettings: doc.shippingSettings || null,
        twoFactorEnabled: doc.twoFactorEnabled ?? false,
        lastPasswordChange: parseDate(doc.lastPasswordChange),
        tokenVersion: toInt(doc.tokenVersion, 0),
        passwordResetToken: doc.passwordResetToken || null,
        passwordResetExpires: parseDate(doc.passwordResetExpires),
        unpaidCommission: toNumber(doc.unpaidCommission, 0),
        paidCommission: toNumber(doc.paidCommission, 0),
        createdAt: parseDate(doc.createdAt) || new Date(),
        updatedAt: parseDate(doc.updatedAt) || new Date(),
      },
      update: {
        email: doc.email,
        password: doc.password || null,
        profile: doc.profile || {},
        verification: doc.verification || null,
        preferences: doc.preferences || {},
        wishlist: (doc.wishlist || []).map(oid).filter(Boolean),
        cart: doc.cart || [],
        shippingAddresses: doc.shippingAddresses || [],
        unpaidCommission: toNumber(doc.unpaidCommission, 0),
        paidCommission: toNumber(doc.paidCommission, 0),
      },
    });
    ids.users.add(id);
    return { status: 'ok' };
  },

  products: async (doc) => {
    const id = oid(doc._id);
    const artisan = requireFk(doc.artisan, 'users', 'artisanId');
    if (!artisan.ok) {
      trackSkip('products', id, 'missing required artisan', [artisan.missing]);
      return { status: 'skipped' };
    }

    // promotionId is optional and promotions migrate AFTER products — always null first pass
    const promotionId = optionalFk(doc.promotionId, 'promotions');

    await prisma.product.upsert({
      where: { id },
      create: {
        id,
        brandName: doc.brandName || '',
        name: doc.name,
        description: doc.description,
        shortDescription: doc.shortDescription || null,
        slug: doc.slug || null,
        originRegion: doc.originRegion || null,
        originZone: doc.originZone || null,
        category: doc.category,
        materials: doc.materials || '',
        dimensions: doc.dimensions || '',
        craftingTime: toInt(doc.craftingTime, 0),
        story: doc.story || '',
        careInstructions: doc.careInstructions || '',
        weight: toNumber(doc.weight, 0),
        videoUrl: doc.videoUrl || null,
        subcategory: doc.subcategory || null,
        price: toNumber(doc.price, 0),
        currency: doc.currency || 'ETB',
        artisanId: artisan.id,
        images: doc.images || [],
        culturalStory: doc.culturalStory || null,
        specifications: doc.specifications || null,
        inventory: doc.inventory || null,
        aiTags: doc.aiTags || [],
        culturalTags: doc.culturalTags || [],
        variations: doc.variations || [],
        options: doc.options || [],
        metrics: doc.metrics || null,
        status: doc.status || 'draft',
        featured: doc.featured ?? false,
        tags: doc.tags || [],
        reviews: doc.reviews || [],
        promotionActive: doc.promotionActive ?? false,
        promotionId,
        discountPrice: doc.discountPrice == null ? null : toNumber(doc.discountPrice),
        seo: doc.seo || null,
        shipping: doc.shipping || null,
        imageFeatureVector: Array.isArray(doc.imageFeatureVector)
          ? doc.imageFeatureVector.map((v) => toNumber(v, 0))
          : [],
        createdAt: parseDate(doc.createdAt) || new Date(),
        updatedAt: parseDate(doc.updatedAt) || new Date(),
      },
      update: {
        name: doc.name,
        description: doc.description,
        artisanId: artisan.id,
        craftingTime: toInt(doc.craftingTime, 0),
        weight: toNumber(doc.weight, 0),
        price: toNumber(doc.price, 0),
        discountPrice: doc.discountPrice == null ? null : toNumber(doc.discountPrice),
        status: doc.status || 'draft',
        images: doc.images || [],
        inventory: doc.inventory || null,
        reviews: doc.reviews || [],
        promotionId,
      },
    });
    ids.products.add(id);
    return { status: 'ok' };
  },

  promotions: async (doc) => {
    const id = oid(doc._id);
    const artisan = requireFk(doc.artisanId, 'users', 'artisanId');
    if (!artisan.ok) {
      trackSkip('promotions', id, 'missing required artisan', [artisan.missing]);
      return { status: 'skipped' };
    }

    await prisma.promotion.upsert({
      where: { id },
      create: {
        id,
        name: doc.name,
        artisanId: artisan.id,
        discountType: doc.discountType,
        discountValue: toNumber(doc.discountValue, 0),
        couponCode: doc.couponCode || null,
        startDate: parseDate(doc.startDate),
        endDate: parseDate(doc.endDate),
        targetType: doc.targetType || 'all',
        urgencyBadge: doc.urgencyBadge ?? false,
        badgeText: doc.badgeText || 'Limited Time Offer',
        minOrderValue: toNumber(doc.minOrderValue, 0),
        status: doc.status || 'active',
        analytics: doc.analytics || { totalSales: 0, revenue: 0, uses: 0 },
        createdAt: parseDate(doc.createdAt) || new Date(),
        updatedAt: parseDate(doc.updatedAt) || new Date(),
      },
      update: {
        name: doc.name,
        artisanId: artisan.id,
        discountValue: toNumber(doc.discountValue, 0),
        status: doc.status || 'active',
        analytics: doc.analytics || { totalSales: 0, revenue: 0, uses: 0 },
      },
    });
    ids.promotions.add(id);

    // Only link products that exist
    if (doc.selectedProducts?.length) {
      for (const pid of doc.selectedProducts) {
        const productId = optionalFk(pid, 'products');
        if (!productId) {
          trackSkip(
            'promotion_products',
            `${id}/${oid(pid)}`,
            'selected product missing — join row skipped',
            [`productId=${oid(pid)}`]
          );
          continue;
        }
        await prisma.promotionProduct.upsert({
          where: {
            promotionId_productId: { promotionId: id, productId },
          },
          create: { promotionId: id, productId },
          update: {},
        });
      }
    }

    return { status: 'ok' };
  },

  /** Second pass: attach promotionId on products now that promotions exist */
  productPromotions: async (doc) => {
    const id = oid(doc._id);
    if (!ids.products.has(id)) return { status: 'skipped' };
    const promotionId = optionalFk(doc.promotionId, 'promotions');
    if (!promotionId) return { status: 'ok' };
    await prisma.product.update({
      where: { id },
      data: { promotionId, promotionActive: doc.promotionActive ?? true },
    });
    return { status: 'ok' };
  },

  orders: async (doc) => {
    const id = oid(doc._id);
    const customer = requireFk(doc.customer, 'users', 'customerId');
    if (!customer.ok) {
      trackSkip('orders', id, 'missing required customer', [customer.missing]);
      return { status: 'skipped' };
    }

    const artisanId = optionalFk(doc.artisanId, 'users');

    await prisma.order.upsert({
      where: { id },
      create: {
        id,
        orderNumber: doc.orderNumber,
        customerId: customer.id,
        artisanId,
        cartId: doc.cartId || null,
        items: doc.items || [],
        totals: doc.totals,
        shippingAddress: doc.shippingAddress,
        payment: doc.payment,
        shipping: doc.shipping || null,
        communication: doc.communication || [],
        status: doc.status || 'pending',
        payoutStatus: doc.payoutStatus || 'pending',
        commissionStatus: doc.commissionStatus || 'pending',
        statusHistory: doc.statusHistory || [],
        notes: doc.notes || null,
        cancelReason: doc.cancelReason || null,
        isDisputed: doc.isDisputed ?? false,
        isCustom: doc.isCustom ?? false,
        photos: doc.photos || null,
        debtRecorded: doc.debtRecorded ?? false,
        createdAt: parseDate(doc.createdAt) || new Date(),
        updatedAt: parseDate(doc.updatedAt) || new Date(),
      },
      update: {
        customerId: customer.id,
        artisanId,
        items: doc.items || [],
        totals: doc.totals,
        payment: doc.payment,
        status: doc.status || 'pending',
      },
    });
    ids.orders.add(id);
    return { status: 'ok' };
  },

  customorders: async (doc) => {
    const id = oid(doc._id);
    const customer = requireFk(doc.customer, 'users', 'customerId');
    if (!customer.ok) {
      trackSkip('customorders', id, 'missing required customer', [customer.missing]);
      return { status: 'skipped' };
    }

    await prisma.customOrder.upsert({
      where: { id },
      create: {
        id,
        customerId: customer.id,
        artisanId: optionalFk(doc.artisan, 'users'),
        productId: optionalFk(doc.product, 'products'),
        gender: doc.gender,
        itemType: doc.itemType,
        measurements: doc.measurements || null,
        photos: doc.photos || null,
        status: doc.status || 'pending',
        price: toNumber(doc.price, 0),
        commission: toNumber(doc.commission, 0),
        artisanEarning: toNumber(doc.artisanEarning, 0),
        paymentMethod: doc.paymentMethod || 'None',
        transactionId: doc.transactionId || null,
        description: doc.description || null,
        adminNotes: doc.adminNotes || null,
        rejectionReason: doc.rejectionReason || null,
        createdAt: parseDate(doc.createdAt) || new Date(),
        updatedAt: parseDate(doc.updatedAt) || new Date(),
      },
      update: {
        customerId: customer.id,
        artisanId: optionalFk(doc.artisan, 'users'),
        productId: optionalFk(doc.product, 'products'),
        status: doc.status || 'pending',
        price: toNumber(doc.price, 0),
      },
    });
    return { status: 'ok' };
  },

  messages: async (doc) => {
    const id = oid(doc._id);
    const sender = requireFk(doc.sender, 'users', 'senderId');
    if (!sender.ok) {
      trackSkip('messages', id, 'missing required sender', [sender.missing]);
      return { status: 'skipped' };
    }

    // recipient is optional — null if deleted/missing
    const recipientId = optionalFk(doc.recipient, 'users');

    await prisma.message.upsert({
      where: { id },
      create: {
        id,
        senderId: sender.id,
        recipientId,
        senderRole: doc.senderRole,
        subject: doc.subject,
        message: doc.message,
        status: doc.status || 'New',
        adminResponse: doc.adminResponse || '',
        read: doc.read ?? false,
        createdAt: parseDate(doc.createdAt) || new Date(),
        updatedAt: parseDate(doc.updatedAt) || new Date(),
      },
      update: {
        senderId: sender.id,
        recipientId,
        status: doc.status || 'New',
        adminResponse: doc.adminResponse || '',
        read: doc.read ?? false,
      },
    });
    return { status: 'ok' };
  },

  earnings: async (doc) => {
    const id = oid(doc._id);
    const artisan = requireFk(doc.artisan, 'users', 'artisanId');
    if (!artisan.ok) {
      trackSkip('earnings', id, 'missing required artisan', [artisan.missing]);
      return { status: 'skipped' };
    }

    await prisma.earning.upsert({
      where: { id },
      create: {
        id,
        artisanId: artisan.id,
        transactionType: doc.transactionType,
        amount: toNumber(doc.amount, 0),
        platformFee: toNumber(doc.platformFee, 0),
        netAmount: toNumber(doc.netAmount, 0),
        orderId: optionalFk(doc.orderId, 'orders'),
        productId: optionalFk(doc.productId, 'products'),
        withdrawalMethod: doc.withdrawalMethod || null,
        withdrawalStatus: doc.withdrawalStatus || null,
        withdrawalAccountDetails: doc.withdrawalAccountDetails || null,
        status: doc.status || 'completed',
        description: doc.description || null,
        processedById: optionalFk(doc.processedBy, 'users'),
        processedAt: parseDate(doc.processedAt),
        failureReason: doc.failureReason || null,
        metadata: doc.metadata || null,
        createdAt: parseDate(doc.createdAt) || new Date(),
        updatedAt: parseDate(doc.updatedAt) || new Date(),
      },
      update: {
        artisanId: artisan.id,
        amount: toNumber(doc.amount, 0),
        netAmount: toNumber(doc.netAmount, 0),
        orderId: optionalFk(doc.orderId, 'orders'),
        productId: optionalFk(doc.productId, 'products'),
        status: doc.status || 'completed',
        withdrawalStatus: doc.withdrawalStatus || null,
      },
    });
    ids.earnings.add(id);
    return { status: 'ok' };
  },

  commissionpayments: async (doc) => {
    const id = oid(doc._id);
    const artisan = requireFk(doc.artisan, 'users', 'artisanId');
    if (!artisan.ok) {
      trackSkip('commissionpayments', id, 'missing required artisan', [artisan.missing]);
      return { status: 'skipped' };
    }

    // Keep only order IDs that exist
    const orderIds = (doc.orderIds || [])
      .map(oid)
      .filter((id) => id && ids.orders.has(id));

    await prisma.commissionPayment.upsert({
      where: { id },
      create: {
        id,
        artisanId: artisan.id,
        amount: toNumber(doc.amount, 0),
        paymentMethod: doc.paymentMethod,
        notes: doc.notes || null,
        receiptImage: doc.receiptImage || null,
        status: doc.status || 'pending admin approval',
        orderIds,
        createdAt: parseDate(doc.createdAt) || new Date(),
        updatedAt: parseDate(doc.updatedAt) || new Date(),
      },
      update: {
        artisanId: artisan.id,
        amount: toNumber(doc.amount, 0),
        status: doc.status || 'pending admin approval',
        orderIds,
      },
    });
    return { status: 'ok' };
  },

  withdrawalauditlogs: async (doc) => {
    const id = oid(doc._id);
    const earning = requireFk(doc.earningId, 'earnings', 'earningId');
    const artisan = requireFk(doc.artisan, 'users', 'artisanId');
    const performer = requireFk(doc.performedBy, 'users', 'performedById');

    const missing = [earning, artisan, performer].filter((r) => !r.ok).map((r) => r.missing);
    if (missing.length) {
      trackSkip('withdrawalauditlogs', id, 'missing required FK(s)', missing);
      return { status: 'skipped' };
    }

    await prisma.withdrawalAuditLog.upsert({
      where: { id },
      create: {
        id,
        earningId: earning.id,
        artisanId: artisan.id,
        action: doc.action,
        previousStatus: doc.previousStatus || null,
        newStatus: doc.newStatus || null,
        performedById: performer.id,
        notes: doc.notes || null,
        metadata: doc.metadata || null,
        createdAt: parseDate(doc.createdAt) || new Date(),
        updatedAt: parseDate(doc.updatedAt) || new Date(),
      },
      update: {
        action: doc.action,
        previousStatus: doc.previousStatus || null,
        newStatus: doc.newStatus || null,
        notes: doc.notes || null,
      },
    });
    return { status: 'ok' };
  },

  userinteractions: async (doc) => {
    const id = oid(doc._id);
    const user = requireFk(doc.user, 'users', 'userId');
    const product = requireFk(doc.product, 'products', 'productId');

    const missing = [user, product].filter((r) => !r.ok).map((r) => r.missing);
    if (missing.length) {
      trackSkip(
        'userinteractions',
        id,
        'orphan interaction — user or product deleted in MongoDB',
        missing
      );
      return { status: 'skipped' };
    }

    await prisma.userInteraction.upsert({
      where: { id },
      create: {
        id,
        userId: user.id,
        productId: product.id,
        interactionType: doc.interactionType,
        duration: doc.duration == null ? null : toNumber(doc.duration),
        quantity: doc.quantity == null ? null : toInt(doc.quantity),
        metadata: doc.metadata || null,
        sessionId: doc.sessionId || 'migrated',
        ipAddress: doc.ipAddress || null,
        userAgent: doc.userAgent || null,
        createdAt: parseDate(doc.createdAt) || new Date(),
        updatedAt: parseDate(doc.updatedAt) || new Date(),
      },
      update: {
        interactionType: doc.interactionType,
        duration: doc.duration == null ? null : toNumber(doc.duration),
        quantity: doc.quantity == null ? null : toInt(doc.quantity),
        metadata: doc.metadata || null,
      },
    });
    return { status: 'ok' };
  },

  aichatlogs: async (doc) => {
    const id = oid(doc._id);
    await prisma.aIChatLog.upsert({
      where: { id },
      create: {
        id,
        userId: optionalFk(doc.userId, 'users'),
        userEmail: doc.userEmail || null,
        userRole: doc.userRole || 'anonymous',
        userQuery: doc.userQuery,
        sanitizedQuery: doc.sanitizedQuery,
        aiResponse: doc.aiResponse || '',
        conversationContext: doc.conversationContext || 'general',
        productId: optionalFk(doc.productId, 'products'),
        containsSensitiveData: doc.containsSensitiveData ?? false,
        sanitizationApplied: doc.sanitizationApplied ?? false,
        flaggedForReview: doc.flaggedForReview ?? false,
        responseTime: doc.responseTime == null ? null : toNumber(doc.responseTime),
        tokenCount: doc.tokenCount == null ? null : toInt(doc.tokenCount),
        sessionId: doc.sessionId || null,
        ipAddress: doc.ipAddress || null,
        userAgent: doc.userAgent || null,
        reviewedById: optionalFk(doc.reviewedBy, 'users'),
        reviewedAt: parseDate(doc.reviewedAt),
        reviewNotes: doc.reviewNotes || null,
        createdAt: parseDate(doc.createdAt) || new Date(),
        updatedAt: parseDate(doc.updatedAt) || new Date(),
      },
      update: {
        userId: optionalFk(doc.userId, 'users'),
        productId: optionalFk(doc.productId, 'products'),
        aiResponse: doc.aiResponse || '',
        flaggedForReview: doc.flaggedForReview ?? false,
      },
    });
    return { status: 'ok' };
  },

  alertlogs: async (doc) => {
    const id = oid(doc._id);
    await prisma.alertLog.upsert({
      where: { id },
      create: {
        id,
        type: doc.type,
        level: doc.level || 'info',
        details: doc.details || null,
        to: doc.to || null,
        subject: doc.subject || null,
        message: doc.message || null,
        success: doc.success ?? false,
        error: doc.error || null,
        createdAt: parseDate(doc.createdAt) || new Date(),
        updatedAt: parseDate(doc.updatedAt) || new Date(),
      },
      update: {
        type: doc.type,
        level: doc.level || 'info',
        success: doc.success ?? false,
      },
    });
    return { status: 'ok' };
  },

  siteconfigs: async (doc) => {
    const id = oid(doc._id);
    await prisma.siteConfig.upsert({
      where: { id },
      create: {
        id,
        configType: doc.configType || 'homepage',
        heroSlides: doc.heroSlides || [],
        heritageTitle_en: doc.heritageTitle_en || null,
        heritageTitle_am: doc.heritageTitle_am || null,
        heritageTitle_or: doc.heritageTitle_or || null,
        heritageTitle_ti: doc.heritageTitle_ti || null,
        heritageDescription_en: doc.heritageDescription_en || null,
        heritageDescription_am: doc.heritageDescription_am || null,
        heritageDescription_or: doc.heritageDescription_or || null,
        heritageDescription_ti: doc.heritageDescription_ti || null,
        heritageImage: doc.heritageImage || null,
        headerLogo: doc.headerLogo || null,
        footerLogo: doc.footerLogo || null,
        commissionRate: toNumber(doc.commissionRate, 5),
        createdAt: parseDate(doc.createdAt) || new Date(),
        updatedAt: parseDate(doc.updatedAt) || new Date(),
      },
      update: {
        heroSlides: doc.heroSlides || [],
        commissionRate: toNumber(doc.commissionRate, 5),
        headerLogo: doc.headerLogo || null,
        footerLogo: doc.footerLogo || null,
      },
    });
    return { status: 'ok' };
  },
};

/**
 * Parent → child order. productPromotions is a second pass over products.
 */
const MIGRATION_ORDER = [
  'users',
  'products',
  'promotions',
  'productPromotions', // re-apply promotionId after promotions exist
  'orders',
  'customorders',
  'messages',
  'earnings',
  'commissionpayments',
  'withdrawalauditlogs',
  'userinteractions',
  'aichatlogs',
  'alertlogs',
  'siteconfigs',
];

async function runHandler(collectionName, doc) {
  const handler = handlers[collectionName];
  if (!handler) return { status: 'skipped' };

  try {
    return await handler(doc);
  } catch (err) {
    // Unexpected error (should be rare with FK validation)
    const isFk =
      err.code === 'P2003' ||
      (err.message && err.message.includes('Foreign key constraint'));

    if (isFk) {
      // Defer for retry — parent may appear later in same run
      deferred.push({ collection: collectionName, doc });
      console.warn(`  ⏳ Deferred ${oid(doc._id)} (${collectionName}): FK not ready, will retry`);
      return { status: 'deferred' };
    }

    report.errors.push({
      collection: collectionName,
      id: oid(doc._id),
      error: err.message,
    });
    console.error(`  ❌ Failed ${oid(doc._id)}: ${err.message}`);
    return { status: 'failed' };
  }
}

async function migrateFromJsonExports() {
  const dbDir = path.join(__dirname, '..', 'database');

  const loadJson = (collectionName) => {
    const file = path.join(dbDir, `ethiocraft_global.${collectionName}.json`);
    if (!fs.existsSync(file)) return [];
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(data) ? data : [];
  };

  for (const name of MIGRATION_ORDER) {
    const mongoName = name === 'productPromotions' ? 'products' : name;
    const data = loadJson(mongoName);
    if (!data.length) {
      console.log(`⏭️  Skipping empty ${name}`);
      report.collections[name] = { total: 0, processed: 0, skipped: 0, deferred: 0, failed: 0 };
      continue;
    }

    console.log(`\n📄 Importing ${name} from JSON (${data.length} records)...`);
    let processed = 0;
    let skipped = 0;
    let failed = 0;
    let deferredCount = 0;

    for (const doc of data) {
      const result = await runHandler(name, doc);
      if (result.status === 'ok') processed += 1;
      else if (result.status === 'skipped') skipped += 1;
      else if (result.status === 'deferred') deferredCount += 1;
      else failed += 1;
    }

    report.collections[name] = {
      total: data.length,
      processed,
      skipped,
      deferred: deferredCount,
      failed,
    };
    console.log(`  ✅ ${processed}/${data.length} ok | ⏭️ ${skipped} skipped`);
  }
}

async function retryDeferred(maxRounds = 3) {
  if (!deferred.length) return;

  console.log(`\n🔄 Retrying ${deferred.length} deferred record(s)...`);

  for (let round = 1; round <= maxRounds && deferred.length; round++) {
    const batch = deferred.splice(0, deferred.length);
    console.log(`  Round ${round}: ${batch.length} records`);
    let recovered = 0;

    for (const { collection, doc } of batch) {
      const result = await runHandler(collection, doc);
      if (result.status === 'ok') {
        recovered += 1;
        // Adjust collection stats
        if (report.collections[collection]) {
          report.collections[collection].processed =
            (report.collections[collection].processed || 0) + 1;
          report.collections[collection].deferred = Math.max(
            0,
            (report.collections[collection].deferred || 1) - 1
          );
        }
      } else if (result.status === 'skipped') {
        if (report.collections[collection]) {
          report.collections[collection].skipped =
            (report.collections[collection].skipped || 0) + 1;
          report.collections[collection].deferred = Math.max(
            0,
            (report.collections[collection].deferred || 1) - 1
          );
        }
      }
      // if deferred again, runHandler already re-pushed
    }

    console.log(`  Recovered: ${recovered}, still deferred: ${deferred.length}`);
  }

  // Anything still deferred after retries → treat as orphan skip
  while (deferred.length) {
    const { collection, doc } = deferred.pop();
    trackSkip(
      collection,
      oid(doc._id),
      'still missing FK after retries — source data orphan',
      []
    );
    if (report.collections[collection]) {
      report.collections[collection].skipped =
        (report.collections[collection].skipped || 0) + 1;
      report.collections[collection].deferred = Math.max(
        0,
        (report.collections[collection].deferred || 1) - 1
      );
    }
  }
}

async function validateCounts() {
  console.log('\n📊 PostgreSQL row counts after seed');

  const tableMap = {
    users: () => prisma.user.count(),
    products: () => prisma.product.count(),
    promotions: () => prisma.promotion.count(),
    orders: () => prisma.order.count(),
    customorders: () => prisma.customOrder.count(),
    messages: () => prisma.message.count(),
    earnings: () => prisma.earning.count(),
    commissionpayments: () => prisma.commissionPayment.count(),
    withdrawalauditlogs: () => prisma.withdrawalAuditLog.count(),
    userinteractions: () => prisma.userInteraction.count(),
    aichatlogs: () => prisma.aIChatLog.count(),
    alertlogs: () => prisma.alertLog.count(),
    siteconfigs: () => prisma.siteConfig.count(),
  };

  for (const [name, countFn] of Object.entries(tableMap)) {
    const pgCount = await countFn();
    const skippedForCollection = report.skipped.filter((s) => s.collection === name).length;

    report.validation[name] = {
      postgres: pgCount,
      skipped: skippedForCollection,
    };

    console.log(`  ${name}: ${pgCount} rows (skipped orphans=${skippedForCollection})`);
  }
}

async function main() {
  console.log('🚀 EthioCraft Global: PostgreSQL seed from JSON');
  console.log('='.repeat(60));
  console.log('Strategy: validate FKs → null optional orphans → skip required orphans → retry');

  await hydrateIdCachesFromPostgres();

  console.log('📂 Loading JSON exports from database/ folder');
  await migrateFromJsonExports();

  await retryDeferred();

  await validateCounts();

  report.completedAt = new Date().toISOString();
  report.summary = {
    totalSkipped: report.skipped.length,
    totalErrors: report.errors.length,
    rootCauses: report.rootCauses,
  };

  const reportPath = path.join(__dirname, '..', 'migration-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('✅ Seed complete');
  console.log(`📋 Report: ${reportPath}`);
  console.log(`⏭️  Skipped orphans: ${report.skipped.length}`);
  console.log(`❌ Unexpected errors: ${report.errors.length}`);

  if (Object.keys(report.rootCauses).length) {
    console.log('\nRoot cause summary (orphaned source refs):');
    for (const [cause, count] of Object.entries(report.rootCauses)) {
      console.log(`  • ${cause}: ${count}`);
    }
  }

  if (report.errors.length === 0) {
    console.log('\n🎉 Total unexpected errors: 0');
    console.log(
      'Skipped records are intentional: source JSON referenced deleted/missing parents.'
    );
  }

  await prisma.$disconnect();
  process.exit(report.errors.length > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('💥 Seed failed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
