/**
 * Product Model - PostgreSQL/Prisma backend
 */
const { prisma } = require('../lib/prisma');
const { createModel } = require('../lib/mongoCompat/createModel');
const { defaultTranslateWhere, defaultToPrisma } = require('../lib/mongoCompat/modelHelpers');

const productModelDef = {
  delegate: prisma.product,

  populateMap: {
    artisan: { model: 'User' },
    promotionId: { model: 'Promotion' },
    'reviews.userId': { model: 'User' },
  },

  defaultInclude: { artisan: true, promotion: true },

  async translateWhere(where, ops, rawFilter) {
    const result = await defaultTranslateWhere(where, ops, rawFilter);

    // Only copy plain scalar filters; operators are already normalized into `where`
    if (typeof rawFilter.status === 'string') result.status = rawFilter.status;
    if (typeof rawFilter.featured === 'boolean') result.featured = rawFilter.featured;
    if (typeof rawFilter.category === 'string') result.category = rawFilter.category;
    if (rawFilter.artisan != null && typeof rawFilter.artisan !== 'object') {
      result.artisanId = String(rawFilter.artisan);
    } else if (rawFilter.artisan && (rawFilter.artisan._id || rawFilter.artisan.id)) {
      result.artisanId = String(rawFilter.artisan._id || rawFilter.artisan.id);
    }

    return result;
  },

  toPrisma(data) {
    const prismaData = defaultToPrisma(data, {
      artisan: 'artisanId',
      promotionId: 'promotionId',
    });

    if (!prismaData.images) prismaData.images = [];
    if (!prismaData.aiTags) prismaData.aiTags = [];
    if (!prismaData.culturalTags) prismaData.culturalTags = [];
    if (!prismaData.variations) prismaData.variations = [];
    if (!prismaData.options) prismaData.options = [];
    if (!prismaData.tags) prismaData.tags = [];
    if (!prismaData.reviews) prismaData.reviews = [];

    // Strip fields that don't exist in the Prisma schema
    // 'artisan' and 'promotion' are relation objects (populated); only their scalar FKs
    // (artisanId / promotionId) belong in the update data.
    const UNKNOWN_FIELDS = [
      'isAvailable', 'customizable', 'stock', 'artisan', 'promotion',
      'totalQuantity', 'primaryImage', 'image', 'additionalImages', 'priceUSD',
    ];
    for (const f of UNKNOWN_FIELDS) {
      delete prismaData[f];
    }

    // Ensure brandName is always a string
    if (prismaData.brandName == null) prismaData.brandName = '';
    // Ensure required string fields have defaults
    if (!prismaData.materials) prismaData.materials = '';
    if (!prismaData.dimensions) prismaData.dimensions = '';
    if (!prismaData.story) prismaData.story = '';
    if (!prismaData.careInstructions) prismaData.careInstructions = '';
    if (!prismaData.description) prismaData.description = prismaData.name || '';

    // Numeric conversions for Prisma
    if (prismaData.price != null) prismaData.price = Number(prismaData.price) || 0;
    if (prismaData.craftingTime != null) prismaData.craftingTime = Math.round(Number(prismaData.craftingTime)) || 0;
    if (prismaData.weight != null) prismaData.weight = Number(prismaData.weight) || 0;

    return prismaData;
  },


  virtuals: {
    totalQuantity: (data) => {
      if (data.variations?.length) {
        return data.variations.reduce((sum, v) => sum + (v.quantity || 0), 0);
      }
      return data.inventory?.quantity || 0;
    },
    isAvailable: (data) => {
      const qty = data.variations?.length
        ? data.variations.reduce((sum, v) => sum + (v.quantity || 0), 0)
        : data.inventory?.quantity || 0;
      return data.status === 'active' && qty > 0;
    },
    primaryImage: (data) => {
      const imgs = data.images || [];
      const primary = imgs.find((img) => img?.isPrimary);
      return primary ? primary.url : imgs[0]?.url || null;
    },
    image: (data) => {
      const imgs = data.images || [];
      const primary = imgs.find((img) => img?.isPrimary);
      return primary ? primary.url : imgs[0]?.url || null;
    },
    additionalImages: (data) =>
      (data.images || []).filter((img) => img && !img.isPrimary).map((img) => img.url),
    priceUSD: (data) => {
      if (data.currency === 'USD') return data.price;
      if (data.currency === 'ETB') return Math.round((data.price / 55) * 100) / 100;
      if (data.currency === 'EUR') return Math.round(data.price * 1.1 * 100) / 100;
      return data.price;
    },
  },

  async preSave(doc) {
    const data = doc._data;
    if (
      doc.isModified('name') ||
      doc.isModified('description') ||
      doc.isModified('category')
    ) {
      generateAITags(data);
    }

    if (data.variations?.length) {
      const total = data.variations.reduce((sum, v) => sum + (v.quantity || 0), 0);
      data.inventory = data.inventory || {};
      data.inventory.quantity = total;
    }

    if (data.images?.length) {
      const primaryImages = data.images.filter((img) => img.isPrimary);
      if (primaryImages.length === 0) data.images[0].isPrimary = true;
      else if (primaryImages.length > 1) {
        data.images.forEach((img, index) => {
          img.isPrimary = index === 0;
        });
      }
    }
  },

  methods: {
    generateAITags() {
      generateAITags(this._data);
    },

    async incrementViews() {
      this._data.metrics = this._data.metrics || {};
      this._data.metrics.views = (this._data.metrics.views || 0) + 1;
      this.markModified('metrics');
      return this.save({ validateBeforeSave: false });
    },

    async incrementCartAdds() {
      this._data.metrics = this._data.metrics || {};
      this._data.metrics.cartAdds = (this._data.metrics.cartAdds || 0) + 1;
      this.markModified('metrics');
      return this.save({ validateBeforeSave: false });
    },

    async recordPurchase(quantity = 1) {
      this._data.metrics = this._data.metrics || {};
      this._data.metrics.purchases = (this._data.metrics.purchases || 0) + quantity;
      this._data.inventory = this._data.inventory || {};
      this._data.inventory.quantity = Math.max(
        0,
        (this._data.inventory.quantity || 0) - quantity
      );
      if (this._data.inventory.quantity === 0 && !this._data.inventory.restockable) {
        this._data.status = 'sold';
      }
      this.markModified('metrics');
      this.markModified('inventory');
      return this.save();
    },

    async addReview(userId, userName, rating, comment) {
      const crypto = require('crypto');
      this._data.reviews = this._data.reviews || [];
      this._data.reviews.push({
        _id: crypto.randomBytes(12).toString('hex'),
        userId: String(userId),
        userName,
        rating,
        comment,
        createdAt: new Date(),
      });
      const totalRating = this._data.reviews.reduce((sum, r) => sum + r.rating, 0);
      this._data.metrics = this._data.metrics || {};
      this._data.metrics.averageRating = totalRating / this._data.reviews.length;
      this._data.metrics.reviewCount = this._data.reviews.length;
      this.markModified('reviews');
      this.markModified('metrics');
      return this.save();
    },

    getCulturalStoryText() {
      const cs = this._data.culturalStory;
      if (!cs) return '';
      const parts = [];
      if (cs.origin) parts.push(`Origin: ${cs.origin}`);
      if (cs.significance) parts.push(`Cultural Significance: ${cs.significance}`);
      if (cs.history) parts.push(`History: ${cs.history}`);
      if (cs.techniques?.length) parts.push(`Techniques: ${cs.techniques.join(', ')}`);
      if (cs.materials?.length) parts.push(`Materials: ${cs.materials.join(', ')}`);
      return parts.join('\n\n');
    },
  },
};

function generateAITags(data) {
  const tags = new Set();
  if (data.category) tags.add(String(data.category).toLowerCase());
  if (data.subcategory) tags.add(String(data.subcategory).toLowerCase().replace(/\s+/g, '-'));

  const text = `${data.name || ''} ${data.description || ''}`.toLowerCase();
  const keywords = text.match(/\b\w{3,}\b/g) || [];
  const skip = ['the', 'and', 'for', 'with', 'this', 'that', 'from', 'made', 'hand', 'craft'];
  keywords
    .filter((w) => !skip.includes(w))
    .slice(0, 10)
    .forEach((k) => tags.add(k));

  if (data.culturalStory?.materials && Array.isArray(data.culturalStory.materials)) {
    data.culturalStory.materials.forEach((m) =>
      m && tags.add(String(m).toLowerCase().replace(/\s+/g, '-'))
    );
  }
  if (data.culturalStory?.techniques && Array.isArray(data.culturalStory.techniques)) {
    data.culturalStory.techniques.forEach((t) =>
      t && tags.add(String(t).toLowerCase().replace(/\s+/g, '-'))
    );
  }
  if (data.specifications?.colors && Array.isArray(data.specifications.colors)) {
    data.specifications.colors.forEach((c) => c && tags.add(String(c).toLowerCase()));
  }

  data.aiTags = Array.from(tags).filter(Boolean).slice(0, 20);
}

const Product = createModel('Product', productModelDef);

Product.getByCategory = function (category, limit = 20) {
  return Product.find({
    category,
    status: 'active',
    'inventory.quantity': { $gt: 0 },
  })
    .populate('artisan', 'profile.firstName profile.lastName profile.culturalBackground')
    .limit(limit)
    .sort({ createdAt: -1 });
};

Product.searchProducts = function (query, filters = {}) {
  const searchQuery = {
    status: 'active',
    'inventory.quantity': { $gt: 0 },
    ...filters,
  };
  if (query) {
    searchQuery.$or = [
      { brandName: { $regex: query, $options: 'i' } },
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
    ];
  }
  return Product.find(searchQuery)
    .populate('artisan', 'profile.firstName profile.lastName profile.culturalBackground')
    .sort({ createdAt: -1 });
};

Product.getFeatured = function (limit = 10) {
  return Product.find({
    featured: true,
    status: 'active',
    'inventory.quantity': { $gt: 0 },
  })
    .populate('artisan', 'profile.firstName profile.lastName')
    .limit(limit)
    .sort({ createdAt: -1 });
};

module.exports = Product;
