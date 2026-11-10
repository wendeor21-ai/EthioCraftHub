/**
 * UserInteraction Model - PostgreSQL/Prisma backend
 */
const { prisma } = require('../lib/prisma');
const { createModel } = require('../lib/mongoCompat/createModel');
const { defaultTranslateWhere, defaultToPrisma } = require('../lib/mongoCompat/modelHelpers');
const { toIdString } = require('../lib/mongoCompat/serialize');

const SCORES = {
  view: 1,
  like: 3,
  cart_add: 5,
  share: 4,
  purchase: 10,
  review: 8,
  cart_remove: -2,
};

const userInteractionModelDef = {
  delegate: prisma.userInteraction,
  defaultInclude: { user: true, product: true },

  populateMap: {
    user: { model: 'User' },
    product: { model: 'Product' },
  },

  async translateWhere(where, ops, rawFilter) {
    const result = await defaultTranslateWhere(where, ops, rawFilter);
    if (rawFilter.user) result.userId = String(rawFilter.user._id || rawFilter.user);
    if (rawFilter.product) result.productId = String(rawFilter.product._id || rawFilter.product);
    if (rawFilter.createdAt?.$gte) {
      result.createdAt = { gte: rawFilter.createdAt.$gte };
    }
    return result;
  },

  toPrisma(data) {
    return defaultToPrisma(data, {
      user: 'userId',
      product: 'productId',
    });
  },

  virtuals: {
    score: (data) => {
      let baseScore = SCORES[data.interactionType] || 1;
      if (data.interactionType === 'view' && data.duration) {
        if (data.duration > 60) baseScore *= 2;
        else if (data.duration > 30) baseScore *= 1.5;
      }
      if (data.interactionType === 'purchase' && data.quantity > 1) {
        baseScore *= Math.min(data.quantity, 3);
      }
      return baseScore;
    },
  },
};

const UserInteraction = createModel('UserInteraction', userInteractionModelDef);

UserInteraction.trackInteraction = async function (data) {
  const userId = toIdString(data.user);
  const productId = toIdString(data.product);

  if (data.interactionType === 'view') {
    const recent = await UserInteraction.findOne({
      user: userId,
      product: productId,
      interactionType: 'view',
      createdAt: { $gte: new Date(Date.now() - 30000) },
    });

    if (recent) {
      const doc = UserInteraction.bind(recent);
      doc._data.duration = Math.max(doc._data.duration || 0, data.duration || 0);
      return doc.save();
    }
  }

  const doc = new UserInteraction({
    ...data,
    user: userId,
    product: productId,
  });
  return doc.save();
};

UserInteraction.getUserHistory = function (userId, limit = 100) {
  return UserInteraction.find({ user: userId })
    .populate('product', 'name category price images')
    .sort({ createdAt: -1 })
    .limit(limit);
};

UserInteraction.getProductStats = function (productId) {
  return UserInteraction.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: '$interactionType',
        count: { $sum: 1 },
        totalDuration: { $sum: '$duration' },
        totalQuantity: { $sum: '$quantity' },
      },
    },
  ]);
};

UserInteraction.getUserPreferences = async function (userId) {
  const interactions = await prisma.userInteraction.findMany({
    where: { userId: String(userId) },
    include: { product: true },
  });

  const grouped = {};
  for (const i of interactions) {
    const category = i.product?.category || i.metadata?.category;
    if (!category) continue;
    if (!grouped[category]) {
      grouped[category] = {
        _id: category,
        totalScore: 0,
        recentSearches: [],
        interactionCount: 0,
      };
    }
    const score = SCORES[i.interactionType] || 1;
    const qty = i.quantity || 1;
    grouped[category].totalScore += score * qty;
    grouped[category].interactionCount += 1;
    if (i.metadata?.searchQuery) {
      grouped[category].recentSearches.push(i.metadata.searchQuery);
    }
  }

  return Object.values(grouped).sort((a, b) => b.totalScore - a.totalScore);
};

UserInteraction.getPopularProducts = async function (category = null, limit = 20) {
  const interactions = await prisma.userInteraction.findMany({
    include: { product: true },
  });

  const scores = {};
  for (const i of interactions) {
    if (!i.product || i.product.status !== 'active') continue;
    if (category && i.product.category !== category) continue;

    const pid = i.productId;
    if (!scores[pid]) {
      scores[pid] = {
        _id: pid,
        viewCount: 0,
        likeCount: 0,
        cartAddCount: 0,
        purchaseCount: 0,
        totalScore: 0,
        product: i.product,
      };
    }
    const s = scores[pid];
    const typeScore = SCORES[i.interactionType] || 1;
    s.totalScore += typeScore;
    if (i.interactionType === 'view') s.viewCount += 1;
    if (i.interactionType === 'like') s.likeCount += 1;
    if (i.interactionType === 'cart_add') s.cartAddCount += 1;
    if (i.interactionType === 'purchase') s.purchaseCount += 1;
  }

  return Object.values(scores)
    .sort((a, b) => b.totalScore - a.totalScore || b.viewCount - a.viewCount)
    .slice(0, limit);
};

UserInteraction.getSimilarUsers = async function (userId, limit = 10) {
  const userProducts = await prisma.userInteraction.findMany({
    where: { userId: String(userId) },
    select: { productId: true },
  });
  const productIds = userProducts.map((p) => p.productId);
  if (!productIds.length) return [];

  const others = await prisma.userInteraction.findMany({
    where: {
      productId: { in: productIds },
      userId: { not: String(userId) },
    },
  });

  const similarity = {};
  for (const o of others) {
    if (!similarity[o.userId]) {
      similarity[o.userId] = { _id: o.userId, commonProducts: 0, similarity: 0 };
    }
    similarity[o.userId].commonProducts += 1;
    similarity[o.userId].similarity += 1;
  }

  return Object.values(similarity)
    .sort((a, b) => b.similarity - a.similarity || b.commonProducts - a.commonProducts)
    .slice(0, limit);
};

module.exports = UserInteraction;
