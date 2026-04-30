const Promotion = require('../models/Promotion');

/**
 * Middleware to apply active promotions to products
 * Calculates discountPrice based on active promotions
 */
const applyPromotions = async (req, res, next) => {
  try {
    // Get products from response (works with product list endpoints)
    if (res.locals.products && Array.isArray(res.locals.products)) {
      const products = res.locals.products;
      
      // Get all active promotions
      const now = new Date();
      const activePromotions = await Promotion.find({
        status: 'active',
        startDate: { $lte: now },
        endDate: { $gte: now }
      }).populate('selectedProducts');

      // Apply promotions to each product
      for (let product of products) {
        const applicablePromotion = activePromotions.find(promo => {
          if (promo.targetType === 'all' && promo.artisanId.toString() === product.artisanId.toString()) {
            return true;
          }
          if (promo.targetType === 'specific' && promo.selectedProducts.some(p => p._id.toString() === product._id.toString())) {
            return true;
          }
          return false;
        });

        if (applicablePromotion) {
          product.promotionActive = true;
          product.promotionId = applicablePromotion._id;
          product.promotion = applicablePromotion;
          product.discountPrice = product.price - applicablePromotion.calculateDiscount(product.price);
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Error applying promotions:', error);
    next(); // Continue even if promotion application fails
  }
};

/**
 * Apply promotion to a single product
 */
const applyPromotionToProduct = async (product) => {
  try {
    const now = new Date();
    const activePromotion = await Promotion.findOne({
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now },
      $or: [
        { targetType: 'all', artisanId: product.artisanId },
        { targetType: 'specific', selectedProducts: product._id }
      ]
    });

    if (activePromotion) {
      product.promotionActive = true;
      product.promotionId = activePromotion._id;
      product.promotion = activePromotion;
      product.discountPrice = product.price - activePromotion.calculateDiscount(product.price);
    }

    return product;
  } catch (error) {
    console.error('Error applying promotion to product:', error);
    return product;
  }
};

/**
 * Scheduled job to update expired promotions
 * Should be called periodically (e.g., every hour)
 */
const updateExpiredPromotions = async () => {
  try {
    const now = new Date();
    
    // Find and update expired promotions
    const expiredPromotions = await Promotion.find({
      status: 'active',
      endDate: { $lt: now }
    });

    for (let promotion of expiredPromotions) {
      promotion.status = 'expired';
      await promotion.save();
      
      // Remove promotion from products
      const Product = require('../models/Product');
      if (promotion.targetType === 'all') {
        await Product.updateMany(
          { artisanId: promotion.artisanId },
          { $set: { promotionActive: false, promotionId: null, discountPrice: null } }
        );
      } else {
        await Product.updateMany(
          { _id: { $in: promotion.selectedProducts } },
          { $set: { promotionActive: false, promotionId: null, discountPrice: null } }
        );
      }
    }

    // Activate scheduled promotions
    const scheduledPromotions = await Promotion.find({
      status: 'scheduled',
      startDate: { $lte: now },
      endDate: { $gte: now }
    });

    for (let promotion of scheduledPromotions) {
      promotion.status = 'active';
      await promotion.save();
      
      // Apply promotion to products
      const Product = require('../models/Product');
      if (promotion.targetType === 'all') {
        await Product.updateMany(
          { artisanId: promotion.artisanId },
          { $set: { promotionActive: true, promotionId: promotion._id } }
        );
      } else {
        await Product.updateMany(
          { _id: { $in: promotion.selectedProducts } },
          { $set: { promotionActive: true, promotionId: promotion._id } }
        );
      }
    }

    console.log(`Updated ${expiredPromotions.length} expired and ${scheduledPromotions.length} scheduled promotions`);
  } catch (error) {
    console.error('Error updating promotions:', error);
  }
};

module.exports = {
  applyPromotions,
  applyPromotionToProduct,
  updateExpiredPromotions
};
