const express = require('express');
const router = express.Router();
const { authenticate, requireArtisan } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { prisma } = require('../lib/prisma');
const { toMongoDoc, generateObjectId } = require('../lib/mongoCompat/serialize');

// ─── Helpers ────────────────────────────────────────────────────────────────

function calcDiscountPrice(price, discountType, discountValue) {
  if (discountType === 'percentage') {
    return Math.round((price - price * discountValue / 100) * 100) / 100;
  }
  if (discountType === 'fixed') {
    return Math.round(Math.max(0, price - discountValue) * 100) / 100;
  }
  return price;
}

// Apply or remove promotion discount on products via Prisma directly
async function applyPromotionToProducts(artisanId, promotionId, targetType, selectedProductIds, discountType, discountValue) {
  let products = [];
  if (targetType === 'all') {
    products = await prisma.product.findMany({ where: { artisanId } });
  } else if (targetType === 'specific' && selectedProductIds?.length) {
    products = await prisma.product.findMany({ where: { id: { in: selectedProductIds.map(String) } } });
  }

  for (const p of products) {
    const dp = calcDiscountPrice(p.price, discountType, discountValue);
    await prisma.product.update({
      where: { id: p.id },
      data: { promotionActive: true, promotionId, discountPrice: dp },
    });
  }
  return products.length;
}

async function removePromotionFromProducts(artisanId, targetType, selectedProductIds) {
  if (targetType === 'all') {
    await prisma.product.updateMany({
      where: { artisanId },
      data: { promotionActive: false, promotionId: null, discountPrice: null },
    });
  } else if (selectedProductIds?.length) {
    await prisma.product.updateMany({
      where: { id: { in: selectedProductIds.map(String) } },
      data: { promotionActive: false, promotionId: null, discountPrice: null },
    });
  }
}

// ─── GET artisan promotions ──────────────────────────────────────────────────
router.get('/artisan/:artisanId', asyncHandler(async (req, res) => {
  const promotions = await prisma.promotion.findMany({
    where: { artisanId: req.params.artisanId },
    include: { selectedProducts: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(promotions.map(p => toMongoDoc(p)));
}));

// ─── POST create promotion ───────────────────────────────────────────────────
router.post('/', authenticate, requireArtisan, asyncHandler(async (req, res) => {
  const {
    name, discountType, discountValue, couponCode,
    startDate, endDate, targetType, selectedProducts,
    urgencyBadge, badgeText, minOrderValue,
  } = req.body;

  const artisanId = String(req.user._id);

  // Validations
  if (new Date(endDate) <= new Date(startDate)) {
    return res.status(400).json({ message: 'End date must be after start date' });
  }
  if (discountType === 'percentage' && parseFloat(discountValue) > 100) {
    return res.status(400).json({ message: 'Percentage discount cannot exceed 100%' });
  }
  if (discountType === 'coupon' && !couponCode) {
    return res.status(400).json({ message: 'Coupon code is required for coupon type' });
  }
  if (couponCode) {
    const existing = await prisma.promotion.findUnique({ where: { couponCode: couponCode.toUpperCase() } });
    if (existing) return res.status(400).json({ message: 'Coupon code already exists' });
  }

  const dv = parseFloat(discountValue);
  const status = new Date(startDate) > new Date() ? 'scheduled' : 'active';

  // Build selectedProducts connect array for Prisma many-to-many
  const productConnect = targetType === 'specific' && selectedProducts?.length
    ? selectedProducts.map(id => ({ promotionId: '', productId: String(id) }))
    : [];

  const promotion = await prisma.promotion.create({
    data: {
      id: generateObjectId(),
      name,
      artisanId,
      discountType,
      discountValue: dv,
      couponCode: couponCode ? couponCode.toUpperCase() : null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      targetType: targetType || 'all',
      urgencyBadge: urgencyBadge || false,
      badgeText: badgeText || 'Limited Time Offer',
      minOrderValue: minOrderValue ? parseFloat(minOrderValue) : 0,
      status,
      analytics: { totalSales: 0, revenue: 0, uses: 0 },
    },
  });

  // Link specific products via join table
  if (targetType === 'specific' && selectedProducts?.length) {
    await prisma.promotionProduct.createMany({
      data: selectedProducts.map(pid => ({ promotionId: promotion.id, productId: String(pid) })),
      skipDuplicates: true,
    });
  }

  // Apply discount prices to products
  if (status === 'active') {
    const count = await applyPromotionToProducts(artisanId, promotion.id, targetType, selectedProducts, discountType, dv);
    console.log(`✅ Promotion "${name}" created, ${count} products updated`);
  }

  res.status(201).json(toMongoDoc(promotion));
}));

// ─── PATCH status ────────────────────────────────────────────────────────────
router.patch('/:id/status', authenticate, asyncHandler(async (req, res) => {
  const { status } = req.body;
  const promotion = await prisma.promotion.findUnique({
    where: { id: req.params.id },
    include: { selectedProducts: true },
  });
  if (!promotion) return res.status(404).json({ message: 'Promotion not found' });

  await prisma.promotion.update({ where: { id: promotion.id }, data: { status } });

  const selectedIds = promotion.selectedProducts.map(sp => sp.productId);
  if (status === 'active') {
    await applyPromotionToProducts(promotion.artisanId, promotion.id, promotion.targetType, selectedIds, promotion.discountType, promotion.discountValue);
  } else {
    await removePromotionFromProducts(promotion.artisanId, promotion.targetType, selectedIds);
  }

  res.json({ ...toMongoDoc(promotion), status });
}));

// ─── DELETE promotion ─────────────────────────────────────────────────────────
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const promotion = await prisma.promotion.findUnique({
    where: { id: req.params.id },
    include: { selectedProducts: true },
  });
  if (!promotion) return res.status(404).json({ message: 'Promotion not found' });

  const selectedIds = promotion.selectedProducts.map(sp => sp.productId);
  await removePromotionFromProducts(promotion.artisanId, promotion.targetType, selectedIds);

  // Delete join table rows first (cascade may handle this, but be explicit)
  await prisma.promotionProduct.deleteMany({ where: { promotionId: promotion.id } });
  await prisma.promotion.delete({ where: { id: promotion.id } });

  res.json({ message: 'Promotion deleted successfully' });
}));

// ─── POST validate coupon ─────────────────────────────────────────────────────
router.post('/validate-coupon', asyncHandler(async (req, res) => {
  const { couponCode, productIds, orderTotal } = req.body;

  const promotion = await prisma.promotion.findFirst({
    where: { couponCode: couponCode?.toUpperCase(), status: 'active' },
    include: { selectedProducts: true },
  });

  if (!promotion) return res.status(404).json({ message: 'Invalid coupon code' });

  const now = new Date();
  if (new Date(promotion.endDate) < now) {
    return res.status(400).json({ message: 'Coupon has expired' });
  }

  if (promotion.minOrderValue > 0 && orderTotal < promotion.minOrderValue) {
    return res.status(400).json({ message: `Minimum order value of ${promotion.minOrderValue} ETB required` });
  }

  if (promotion.targetType === 'specific') {
    const validIds = new Set(promotion.selectedProducts.map(sp => sp.productId));
    const hasValid = (productIds || []).some(id => validIds.has(String(id)));
    if (!hasValid) return res.status(400).json({ message: 'Coupon not applicable to items in cart' });
  }

  res.json({
    valid: true,
    promotion: { discountType: promotion.discountType, discountValue: promotion.discountValue, name: promotion.name },
  });
}));

// ─── PATCH analytics ─────────────────────────────────────────────────────────
router.patch('/:id/analytics', authenticate, asyncHandler(async (req, res) => {
  const { totalSales, revenue } = req.body;
  const promotion = await prisma.promotion.findUnique({ where: { id: req.params.id } });
  if (!promotion) return res.status(404).json({ message: 'Promotion not found' });

  const current = promotion.analytics || { totalSales: 0, revenue: 0, uses: 0 };
  const updated = await prisma.promotion.update({
    where: { id: promotion.id },
    data: {
      analytics: {
        totalSales: (current.totalSales || 0) + (totalSales || 0),
        revenue: (current.revenue || 0) + (revenue || 0),
        uses: (current.uses || 0) + 1,
      },
    },
  });

  res.json(toMongoDoc(updated));
}));

module.exports = router;
