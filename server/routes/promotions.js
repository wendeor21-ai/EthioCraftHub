const express = require('express');
const router = express.Router();
const Promotion = require('../models/Promotion');
const Product = require('../models/Product');
const { authenticate, requireArtisan } = require('../middleware/auth');

// Get all promotions for an artisan with real-time analytics from orders
router.get('/artisan/:artisanId', async (req, res) => {
  try {
    const promotions = await Promotion.find({ artisanId: req.params.artisanId })
      .sort({ createdAt: -1 })
      .populate('selectedProducts', 'name price');
    
    // Verify analytics against actual orders in MongoDB
    const Order = require('../models/Order');
    const mongoose = require('mongoose');
    
    console.log(`📊 Fetching ${promotions.length} promotions for artisan ${req.params.artisanId}`);
    const now = new Date();
    
    // Enhance each promotion with verified analytics from orders
    const enhancedPromotions = await Promise.all(promotions.map(async (promotion) => {
      const start = new Date(promotion.startDate);
      const end = new Date(promotion.endDate);
      const status = end < now ? 'EXPIRED' : start > now ? 'SCHEDULED' : 'ACTIVE';
      
      // Aggregate real-time data from Orders collection
      const orderStats = await Order.aggregate([
        {
          $match: {
            'items.promotionId': new mongoose.Types.ObjectId(promotion._id)
          }
        },
        {
          $unwind: '$items'
        },
        {
          $match: {
            'items.promotionId': new mongoose.Types.ObjectId(promotion._id)
          }
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$items.quantity' },
            totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
            uniqueOrders: { $addToSet: '$_id' }
          }
        },
        {
          $project: {
            _id: 0,
            totalSales: 1,
            totalRevenue: { $round: ['$totalRevenue', 2] },
            uses: { $size: '$uniqueOrders' }
          }
        }
      ]);

      const realTimeStats = orderStats[0] || { totalSales: 0, totalRevenue: 0, uses: 0 };
      
      console.log(`  - ${promotion.name}: ${status} (${start.toISOString()} to ${end.toISOString()})`);
      console.log(`    Stored Analytics: ${promotion.analytics.totalSales} sales, ${promotion.analytics.revenue} ETB, ${promotion.analytics.uses} uses`);
      console.log(`    Real-Time from Orders: ${realTimeStats.totalSales} sales, ${realTimeStats.totalRevenue} ETB, ${realTimeStats.uses} uses`);
      
      // If there's a mismatch, sync the stored analytics with real data
      if (promotion.analytics.totalSales !== realTimeStats.totalSales ||
          promotion.analytics.revenue !== realTimeStats.totalRevenue ||
          promotion.analytics.uses !== realTimeStats.uses) {
        console.log(`    ⚠️ Mismatch detected! Syncing analytics...`);
        promotion.analytics.totalSales = realTimeStats.totalSales;
        promotion.analytics.revenue = realTimeStats.totalRevenue;
        promotion.analytics.uses = realTimeStats.uses;
        await promotion.save();
        console.log(`    ✅ Analytics synced with real order data`);
      }
      
      return promotion;
    }));
    
    res.json(enhancedPromotions);
  } catch (error) {
    console.error('❌ Error fetching promotions:', error);
    res.status(500).json({ message: 'Failed to fetch promotions', error: error.message });
  }
});

// Create new promotion
router.post('/', authenticate, requireArtisan, async (req, res) => {
  try {
    const {
      name,
      discountType,
      discountValue,
      couponCode,
      startDate,
      endDate,
      targetType,
      selectedProducts,
      urgencyBadge,
      badgeText,
      minOrderValue,
      artisanId
    } = req.body;

    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    if (discountType === 'percentage' && discountValue > 100) {
      return res.status(400).json({ message: 'Percentage discount cannot exceed 100%' });
    }

    if (discountType === 'coupon' && !couponCode) {
      return res.status(400).json({ message: 'Coupon code is required for coupon type' });
    }

    if (discountType === 'coupon') {
      const existingCoupon = await Promotion.findOne({ couponCode: couponCode.toUpperCase() });
      if (existingCoupon) {
        return res.status(400).json({ message: 'Coupon code already exists' });
      }
    }

    const promotion = new Promotion({
      name,
      artisanId,
      discountType,
      discountValue: parseFloat(discountValue),
      couponCode: couponCode?.toUpperCase(),
      startDate,
      endDate,
      targetType,
      selectedProducts: targetType === 'specific' ? selectedProducts : [],
      urgencyBadge,
      badgeText,
      minOrderValue: minOrderValue ? parseFloat(minOrderValue) : 0,
      status: new Date(startDate) > new Date() ? 'scheduled' : 'active'
    });

    await promotion.save();
    console.log('✅ Promotion created:', promotion._id, promotion.name);

    // Calculate and update discount prices for affected products
    const mongoose = require('mongoose');
    let updateResult;
    
    if (targetType === 'all') {
      // CRITICAL FIX: Use 'new' keyword with ObjectId constructor
      const artisanObjectId = new mongoose.Types.ObjectId(artisanId);
      
      // First, get all products to calculate individual discount prices
      const allProducts = await Product.find({ artisan: artisanObjectId });
      console.log(`📦 Found ${allProducts.length} products for artisan ${artisanObjectId}`);
      
      if (allProducts.length === 0) {
        console.log(`⚠️ WARNING: No products found for artisan ${artisanObjectId}`);
        return res.status(201).json(promotion);
      }

      // Update each product individually to calculate correct discount price
      let updatedCount = 0;
      for (const product of allProducts) {
        try {
          let discountPrice = product.price;
          if (discountType === 'percentage') {
            discountPrice = product.price - (product.price * parseFloat(discountValue) / 100);
          } else if (discountType === 'fixed') {
            discountPrice = Math.max(0, product.price - parseFloat(discountValue));
          }

          await Product.updateOne(
            { _id: product._id },
            { 
              $set: { 
                promotionActive: true,
                promotionId: promotion._id,
                discountPrice: Math.round(discountPrice * 100) / 100
              }
            }
          );
          updatedCount++;
          console.log(`✅ Updated: ${product.name} - ${product.price} ETB → ${Math.round(discountPrice * 100) / 100} ETB`);
        } catch (err) {
          console.error(`❌ Error updating product ${product._id}:`, err.message);
        }
      }
      
      console.log(`✅ Successfully updated ${updatedCount} of ${allProducts.length} products`);
      
    } else {
      // For specific products
      const specificProducts = await Product.find({ _id: { $in: selectedProducts } });
      console.log(`📦 Found ${specificProducts.length} specific products`);
      
      let updatedCount = 0;
      for (const product of specificProducts) {
        try {
          let discountPrice = product.price;
          if (discountType === 'percentage') {
            discountPrice = product.price - (product.price * parseFloat(discountValue) / 100);
          } else if (discountType === 'fixed') {
            discountPrice = Math.max(0, product.price - parseFloat(discountValue));
          }

          await Product.updateOne(
            { _id: product._id },
            { 
              $set: { 
                promotionActive: true,
                promotionId: promotion._id,
                discountPrice: Math.round(discountPrice * 100) / 100
              }
            }
          );
          updatedCount++;
          console.log(`✅ Updated: ${product.name} - ${product.price} ETB → ${Math.round(discountPrice * 100) / 100} ETB`);
        } catch (err) {
          console.error(`❌ Error updating product ${product._id}:`, err.message);
        }
      }
      
      console.log(`✅ Successfully updated ${updatedCount} of ${specificProducts.length} products`);
    }

    res.status(201).json(promotion);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create promotion', error: error.message });
  }
});

// Update promotion status
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const promotion = await Promotion.findById(req.params.id);

    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    promotion.status = status;
    await promotion.save();

    const mongoose = require('mongoose');
    
    if (status === 'active') {
      // Recalculate and apply discount prices
      let affectedProducts;
      if (promotion.targetType === 'all') {
        const artisanObjectId = new mongoose.Types.ObjectId(promotion.artisanId);
        affectedProducts = await Product.find({ artisan: artisanObjectId });
      } else {
        affectedProducts = await Product.find({ _id: { $in: promotion.selectedProducts } });
      }

      for (let product of affectedProducts) {
        let discountPrice = product.price;
        if (promotion.discountType === 'percentage') {
          discountPrice = product.price - (product.price * promotion.discountValue / 100);
        } else if (promotion.discountType === 'fixed') {
          discountPrice = Math.max(0, product.price - promotion.discountValue);
        }

        await Product.updateOne(
          { _id: product._id },
          { 
            $set: { 
              promotionActive: true,
              promotionId: promotion._id,
              discountPrice: Math.round(discountPrice * 100) / 100
            }
          }
        );
      }
    } else {
      // Remove promotion from products
      if (promotion.targetType === 'all') {
        const artisanObjectId = new mongoose.Types.ObjectId(promotion.artisanId);
        await Product.updateMany(
          { artisan: artisanObjectId },
          { $set: { promotionActive: false, promotionId: null, discountPrice: null } }
        );
      } else {
        await Product.updateMany(
          { _id: { $in: promotion.selectedProducts } },
          { $set: { promotionActive: false, promotionId: null, discountPrice: null } }
        );
      }
    }

    res.json(promotion);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update promotion', error: error.message });
  }
});

// Delete promotion
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);

    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    const mongoose = require('mongoose');
    
    if (promotion.targetType === 'all') {
      const artisanObjectId = new mongoose.Types.ObjectId(promotion.artisanId);
      await Product.updateMany(
        { artisan: artisanObjectId },
        { $set: { promotionActive: false, promotionId: null, discountPrice: null } }
      );
    } else {
      await Product.updateMany(
        { _id: { $in: promotion.selectedProducts } },
        { $set: { promotionActive: false, promotionId: null, discountPrice: null } }
      );
    }

    await Promotion.findByIdAndDelete(req.params.id);
    res.json({ message: 'Promotion deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete promotion', error: error.message });
  }
});

// Validate coupon code
router.post('/validate-coupon', async (req, res) => {
  try {
    const { couponCode, productIds, orderTotal } = req.body;

    const promotion = await Promotion.findOne({ 
      couponCode: couponCode.toUpperCase(),
      status: 'active'
    });

    if (!promotion) {
      return res.status(404).json({ message: 'Invalid coupon code' });
    }

    if (!promotion.isActive()) {
      return res.status(400).json({ message: 'Coupon has expired' });
    }

    if (promotion.minOrderValue > 0 && orderTotal < promotion.minOrderValue) {
      return res.status(400).json({ 
        message: `Minimum order value of ${promotion.minOrderValue} ETB required` 
      });
    }

    if (promotion.targetType === 'specific') {
      const hasValidProduct = productIds.some(id => 
        promotion.selectedProducts.includes(id)
      );
      if (!hasValidProduct) {
        return res.status(400).json({ 
          message: 'Coupon not applicable to items in cart' 
        });
      }
    }

    res.json({ 
      valid: true, 
      promotion: {
        discountType: promotion.discountType,
        discountValue: promotion.discountValue,
        name: promotion.name
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to validate coupon', error: error.message });
  }
});

// Update promotion analytics
router.patch('/:id/analytics', authenticate, async (req, res) => {
  try {
    const { totalSales, revenue } = req.body;
    const promotion = await Promotion.findById(req.params.id);

    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    promotion.analytics.totalSales += totalSales || 0;
    promotion.analytics.revenue += revenue || 0;
    promotion.analytics.uses += 1;

    await promotion.save();
    res.json(promotion);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update analytics', error: error.message });
  }
});

module.exports = router;
