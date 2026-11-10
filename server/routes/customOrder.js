const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const CustomOrder = require('../models/CustomOrder');
const { asyncHandler } = require('../middleware/errorHandler');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for custom order photos
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/custom-orders');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'custom-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

/**
 * @route   POST /api/custom-orders
 * @desc    Create a new custom order request
 * @access  Private (Customer)
 */
router.post(
  '/',
  authenticate,
  upload.fields([{ name: 'frontPhoto', maxCount: 1 }, { name: 'backPhoto', maxCount: 1 }]),
  asyncHandler(async (req, res) => {
    let { artisanId, gender, itemType, measurements, description, productId } = req.body;
    
    // Remove auto-assignment logic to support "Open" orders as per Direct Routing upgrade
    const targetArtisanId = (artisanId && artisanId !== 'undefined' && artisanId !== 'null') ? artisanId : null;

    // Parse measurements if they come as a string
    let parsedMeasurements = typeof measurements === 'string' ? JSON.parse(measurements) : measurements;

    // Clean up empty measurements to prevent Mongoose CastError on Numbers
    if (parsedMeasurements && typeof parsedMeasurements === 'object') {
      for (const key in parsedMeasurements) {
        if (parsedMeasurements[key] === '' || parsedMeasurements[key] === null || isNaN(Number(parsedMeasurements[key]))) {
          delete parsedMeasurements[key];
        } else {
          parsedMeasurements[key] = Number(parsedMeasurements[key]);
        }
      }
    }

    const orderData = {
      customer: req.user._id,
      artisan: targetArtisanId,
      gender,
      itemType,
      measurements: parsedMeasurements,
      description,
      photos: {
        front: req.files?.frontPhoto ? `/uploads/custom-orders/${req.files.frontPhoto[0].filename}` : null,
        back: req.files?.backPhoto ? `/uploads/custom-orders/${req.files.backPhoto[0].filename}` : null,
      }
    };
    if (productId && productId !== 'undefined' && productId !== 'null') orderData.product = productId;

    const customOrder = new CustomOrder(orderData);
    await customOrder.save();
    
    // Emit real-time notification ONLY to the specific artisan if provided
    const io = req.app.get('io');
    if (io && targetArtisanId) {
      io.to(`user_${targetArtisanId}`).emit('newCustomOrder', {
        orderId: customOrder._id,
        customerName: `${req.user.profile?.firstName || ''} ${req.user.profile?.lastName || ''}`.trim() || 'A user',
        itemType: itemType
      });
    }

    res.status(201).json({ success: true, data: customOrder });
  })
);

/**
 * @route   GET /api/custom-orders/artisan
 * @desc    Get custom orders for the logged-in artisan
 * @access  Private (Artisan)
 */
router.get(
  '/artisan',
  authenticate,
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'artisan') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const orders = await CustomOrder.find({
      $or: [
        { artisan: req.user._id },
        { artisan: null },
        { artisan: { $exists: false } }
      ]
    })
      .populate('customer', 'profile.firstName profile.lastName email')
      .sort('-createdAt');
    res.json({ success: true, data: orders });
  })
);

/**
 * @route   GET /api/custom-orders
 * @desc    Get custom orders for the logged-in customer
 * @access  Private (Customer)
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const orders = await CustomOrder.find({ customer: req.user._id })
      .populate('artisan', 'profile.firstName profile.lastName')
      .populate('product', 'name images price')
      .sort('-createdAt');
    res.json({ success: true, orders }); // Match syntax with regular orders response
  })
);

/**
 * @route   PATCH /api/custom-orders/:id/status
 * @desc    Update custom order status (Accept/Reject)
 * @access  Private (Artisan)
 */
router.patch(
  '/:id/status',
  authenticate,
  asyncHandler(async (req, res) => {
    const { status, price, rejectionReason } = req.body;
    
    const order = await CustomOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    const { toIdString } = require('../lib/mongoCompat/serialize');

    // Extract current artisan ID string from order.artisan (which might be populated user object or ID string)
    const existingArtisanId = order.artisan ? toIdString(order.artisan._id || order.artisan) : null;
    const currentUserId = toIdString(req.user._id || req.user.id);

    // If order has no artisan assigned yet, assign to current artisan when accepting/quoting
    if (!existingArtisanId) {
      order.artisan = currentUserId;
    } else if (existingArtisanId !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to update this order' });
    }

    order.status = status;
    if (price !== undefined && price !== null && price !== '') {
      order.price = Number(price);
    }
    if (rejectionReason) order.rejectionReason = rejectionReason;

    await order.save();

    // Alert Customer if price is quoted
    if (status === 'price_quoted') {
      const io = req.app.get('io');
      if (io && order.customer) {
        io.to(`user_${order.customer.toString()}`).emit('customOrderPriceQuoted', {
          orderId: order._id,
          price: order.price,
          message: 'An artisan has quoted a price for your custom design!'
        });
      }
    }

    res.json({ success: true, data: order });
  })
);

module.exports = router;
