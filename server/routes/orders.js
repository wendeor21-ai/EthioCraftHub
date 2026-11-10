/**
 * Order Routes for EthioCraft Global
 *
 * Handles order management and tracking:
 * - Order creation and checkout
 * - Order status updates
 * - Order history for customers and artisans
 * - Payment processing integration
 */

const express = require("express");
const { body, validationResult } = require("express-validator");
const Order = require("../models/Order");
const Product = require("../models/Product");
const UserInteraction = require("../models/UserInteraction");
const fs = require("fs");
const path = require("path");
const { authenticate, authorize } = require("../middleware/auth");
const {
  asyncHandler,
  createNotFoundError,
  createForbiddenError,
  createValidationError,
} = require("../middleware/errorHandler");
const { logBusinessEvent } = require("../middleware/logger");
const { logActivity } = require("../utils/activityLogger");
const orderManagementController = require("../controllers/orderManagementController");
const multer = require("multer");

// Multer storage for receipts
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, `receipt_${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`);
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

const router = express.Router();

function getPlatformRates() {
  try {
    const p = path.join(__dirname, '..', 'data', 'platform-settings.json');
    if (fs.existsSync(p)) {
      const s = JSON.parse(fs.readFileSync(p, 'utf8'));
      return {
        vatRate: typeof s.vatRate === 'number' ? s.vatRate : 15,
        commissionRate: typeof s.commissionRate === 'number' ? s.commissionRate : 5
      };
    }
  } catch (_) {}
  return { vatRate: 15, commissionRate: 5 };
}


/**
 * @route   GET /api/orders/track/:orderNumber
 * @desc    Get order details for public tracking lookup
 * @access  Public
 */
router.get(
  "/track/:orderNumber",
  asyncHandler(async (req, res) => {
    const orderNum = req.params.orderNumber.toUpperCase();

    // Check if it's a Custom Order tracking request
    if (orderNum.startsWith('CUST-') || orderNum.length === 24) {
      const CustomOrder = require('../models/CustomOrder');
      let searchId = orderNum.startsWith('CUST-') ? null : orderNum; // Usually we can't reliably convert CUST- back to full ObjectID if it's sliced, so we'll do our best.

      let customOrder = null;
      if (searchId && searchId.length === 24) {
        customOrder = await CustomOrder.findById(searchId).populate('artisan', 'profile.firstName profile.lastName');
      } else if (orderNum.startsWith('CUST-')) {
        const slice = orderNum.replace('CUST-', '').toLowerCase();
        // Fallback: fetch recent custom orders and find ending match
        const recentOrders = await CustomOrder.find().sort('-createdAt').limit(100).populate('artisan', 'profile.firstName profile.lastName');
        customOrder = recentOrders.find(o => o._id.toString().toLowerCase().endsWith(slice));
      }

      if (customOrder) {
        return res.json({
          success: true,
          order: {
            _id: customOrder._id,
            orderNumber: `CUST-${customOrder._id.toString().slice(-6).toUpperCase()}`,
            status: customOrder.status,
            createdAt: customOrder.createdAt,
            updatedAt: customOrder.updatedAt,
            customer: customOrder.customer,
            items: [{
              product: customOrder.product,
              quantity: 1,
            }],
            shippingAddress: null,
            shipping: { estimatedDelivery: null },
            totals: { total: customOrder.price || 0 },
            isCustom: true,
            customOrderId: customOrder._id,
            price: customOrder.price,
            gender: customOrder.gender,
            itemType: customOrder.itemType
          }
        });
      }
    }

    const order = await Order.findOne({ orderNumber: orderNum }).populate(
      "items.product",
      "name price images"
    );

    if (!order) {
      throw createNotFoundError("Order");
    }

    res.json({
      success: true,
      order: orderManagementController.formatOrderResponse(order),
    });
  })
);

/**
 * @route   POST /api/orders
 * @desc    Create new order
 * @access  Private (Customers)
 */
router.post(
  "/",
  authenticate,
  [
    body("items")
      .isArray({ min: 1 })
      .withMessage("Order must contain at least one item"),
    body("items.*.product").isMongoId().withMessage("Invalid product ID"),
    body("items.*.quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
    body("shippingAddress.firstName")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("First name must be between 2 and 50 characters"),
    body("shippingAddress.lastName")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Last name must be between 2 and 50 characters"),
    body("shippingAddress.street")
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage("Street address must be between 5 and 200 characters"),
    body("shippingAddress.city")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("City must be between 2 and 100 characters"),
    body("shippingAddress.region")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Region must be between 2 and 100 characters"),
    body("shippingAddress.phone")
      .matches(/^(\+251|0)?[97]\d{8}$/)
      .withMessage("Please provide a valid Ethiopian phone number"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("❌ Order validation failed:", errors.array());
      return res.status(400).json({
        error: "Validation failed",
        message: "Invalid input data provided. Please try again.",
        code: "VALIDATION_ERROR",
        details: errors.array(),
      });
    }

    console.log("📦 Creating order with data:", {
      customer: req.user._id,
      itemCount: req.body.items?.length,
      shippingAddress: req.body.shippingAddress,
    });

    const { items, shippingAddress, paymentMethod = "stripe" } = req.body;

    // Validate products and calculate totals
    const orderItems = [];
    let subtotal = 0;
    const promotionTracking = {}; // Track promotions used in this order

    for (const item of items) {
      const product = await Product.findById(item.product).populate(
        "artisan",
        "_id",
      );

      if (!product) {
        throw createNotFoundError(`Product with ID ${item.product}`);
      }

      if (product.status !== "active") {
        return res.status(400).json({
          error: "Product unavailable",
          message: `Product "${product.name}" is not available for purchase`,
          code: "PRODUCT_UNAVAILABLE",
        });
      }

      // Prevent purchasing when out of stock (<= 0)
      if (product.inventory.quantity <= 0) {
        return res.status(400).json({
          error: "Out of stock",
          message: `Product "${product.name}" is currently out of stock`,
          code: "OUT_OF_STOCK",
        });
      }

      if (product.inventory.quantity < item.quantity) {
        return res.status(400).json({
          error: "Insufficient inventory",
          message: `Only ${product.inventory.quantity} units of "${product.name}" available`,
          code: "INSUFFICIENT_INVENTORY",
        });
      }

      // Check if product has active promotion
      const hasPromotion = product.promotionActive && product.promotionId && product.discountPrice;
      const finalPrice = hasPromotion ? product.discountPrice : product.price;
      const originalPrice = product.price;
      const promotionDiscount = hasPromotion ? (originalPrice - finalPrice) * item.quantity : 0;

      const itemTotal = finalPrice * item.quantity;
      subtotal += itemTotal;

      const orderItem = {
        product: product._id,
        artisan: product.artisan._id,
        quantity: item.quantity,
        price: finalPrice,
        status: "pending",
      };

      // Add promotion tracking if applicable
      if (hasPromotion) {
        orderItem.originalPrice = originalPrice;
        orderItem.promotionId = product.promotionId;
        orderItem.promotionDiscount = promotionDiscount;

        // Track promotion usage for analytics update
        const promoId = product.promotionId.toString();
        if (!promotionTracking[promoId]) {
          promotionTracking[promoId] = {
            sales: 0,
            revenue: 0,
            uses: 0
          };
        }
        promotionTracking[promoId].sales += item.quantity;
        promotionTracking[promoId].revenue += itemTotal;
        promotionTracking[promoId].uses += 1;

        console.log(`✅ Promotion applied: ${product.name} - ${originalPrice} ETB → ${finalPrice} ETB (saved ${promotionDiscount} ETB)`);
      }

      orderItems.push(orderItem);

      // Track purchase interaction
      await UserInteraction.trackInteraction({
        user: req.user._id,
        product: product._id,
        interactionType: "purchase",
        quantity: item.quantity,
        sessionId: req.sessionID || "anonymous",
      });
    }

    // Map frontend payment method to standard Schema Enums
    let methodEnum = "Online";
    if (['cod', 'cash_on_delivery'].includes((paymentMethod || "").toLowerCase())) {
      methodEnum = "COD";
    } else if (['manual', 'bank_transfer'].includes((paymentMethod || "").toLowerCase())) {
      methodEnum = "Manual";
    }

    // Dynamic Platform Commission & Tax logic from Platform Settings
    const { vatRate: ordVat, commissionRate: ordComm } = getPlatformRates();
    const platformCommission = Math.round(subtotal * (ordComm / 100) * 100) / 100;
    const artisanEarning = Math.round((subtotal - platformCommission) * 100) / 100;

    // Determine top-level artisanId (first item's artisan — supports single-artisan orders)
    const primaryArtisanId = orderItems[0]?.artisan ? String(orderItems[0].artisan) : undefined;

    // Create order
    const orderData = {
      customer: req.user._id,
      items: orderItems,
      totals: {
        subtotal,
        tax: 0,
        shipping: 0,
        total: subtotal,
        platformCommission,
        artisanEarning
      },
      shippingAddress,
      payment: {
        method: methodEnum,
        status: "pending",
        amount: subtotal,
      },
      status: "pending",
      commissionStatus: "pending",
      ...(primaryArtisanId && { artisan: primaryArtisanId }),
    };

    const order = new Order(orderData);
    await order.save();

    // Update product inventory and metrics
    for (let i = 0; i < items.length; i++) {
      const product = await Product.findById(items[i].product);
      await product.recordPurchase(items[i].quantity);
    }

    // Update promotion analytics for all promotions used in this order
    const Promotion = require('../models/Promotion');
    for (const [promotionId, tracking] of Object.entries(promotionTracking)) {
      try {
        const promotion = await Promotion.findById(promotionId);
        if (promotion) {
          promotion.analytics.totalSales += tracking.sales;
          promotion.analytics.revenue += tracking.revenue;
          promotion.analytics.uses += tracking.uses;
          await promotion.save();
          
          console.log(`📊 Updated promotion analytics for ${promotion.name}:`, {
            sales: `+${tracking.sales} (total: ${promotion.analytics.totalSales})`,
            revenue: `+${tracking.revenue} ETB (total: ${promotion.analytics.revenue} ETB)`,
            uses: `+${tracking.uses} (total: ${promotion.analytics.uses})`
          });
        }
      } catch (promoError) {
        console.error(`❌ Failed to update promotion ${promotionId} analytics:`, promoError.message);
        // Don't fail the order if promotion analytics update fails
      }
    }

        // Emit Socket.io event to involved artisans for real-time dashboard update
    const io = req.app.get('io');
    if (io) {
      const artisanIds = [...new Set(
        orderItems.map(item => item.artisan ? String(item.artisan._id || item.artisan.id || item.artisan) : null)
          .concat(order.artisanId || (order.artisan && (order.artisan._id || order.artisan.id || order.artisan)) || null)
          .filter(Boolean)
      )];
      console.log(`📡 Attempting to notify ${artisanIds.length} artisans via Socket.io:`, artisanIds);
      
      const payload = {
        orderId: order._id ? String(order._id) : String(order.id),
        id: order._id ? String(order._id) : String(order.id),
        _id: order._id ? String(order._id) : String(order.id),
        orderNumber: order.orderNumber,
        total: order.totals?.total || subtotal,
        totals: order.totals || { total: subtotal, subtotal },
        status: order.status || "pending",
        createdAt: order.createdAt || new Date().toISOString(),
        items: orderItems,
        customer: req.user ? {
          _id: String(req.user._id),
          profile: {
            firstName: req.user.profile?.firstName || shippingAddress?.firstName || "Customer",
            lastName: req.user.profile?.lastName || shippingAddress?.lastName || ""
          }
        } : null,
        shippingAddress,
        payment: { method: methodEnum, status: "pending", amount: subtotal },
        message: `🛍️ New order #${order.orderNumber} placed!`
      };

      artisanIds.forEach(artisanId => {
        io.to(String(artisanId)).emit('newOrder', payload);
        io.to(`user_${artisanId}`).emit('newOrder', payload);
        io.to(`artisan_${artisanId}`).emit('newOrder', payload);
        console.log(`   👉 Emitted 'newOrder' to rooms: ${artisanId}, user_${artisanId}, artisan_${artisanId}`);
      });

      io.to('role_admin').emit('newOrder', payload);
      io.to('admin').emit('newOrder', payload);
    } else {
      console.warn("⚠️ Socket.io instance (io) not found in req.app");
    }

    // Log business event
    logBusinessEvent("order_created", req.user._id, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      itemCount: orderItems.length,
      total: order.totals.total,
    });

    // Log activity for each artisan involved
    try {
      // Get unique artisan IDs
      const artisanIds = [...new Set(orderItems.map(item => item.artisan.toString()))];
      
      for (const artisanId of artisanIds) {
        // Get items for this artisan
        const artisanItems = orderItems.filter(item => item.artisan.toString() === artisanId);
        
        // Log activity for each product from this artisan
        for (const item of artisanItems) {
          const product = await Product.findById(item.product);
          if (product) {
            await logActivity({
              userId: artisanId,
              action: 'order_received',
              details: {
                orderId: order._id.toString(),
                orderNumber: order.orderNumber,
                productId: product._id.toString(),
                productName: product.name,
                quantity: item.quantity,
                totalAmount: item.price * item.quantity
              },
              message: `New order received for ${product.name}`
            });
          }
        }
      }
    } catch (logError) {
      console.error('[Activity Logger] Failed to log order creation:', logError.message);
    }

    res.status(201).json({
      message: "Order created successfully",
      order: await Order.findById(order._id)
        .populate("items.product", "name images price")
        .populate("items.artisan", "profile.firstName profile.lastName"),
    });
  }),
);

/**
 * @route   GET /api/orders
 * @desc    Get user's order history
 * @access  Private
 */
router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status } = req.query;
    const paginationOptions = {
      page: parseInt(page),
      limit: parseInt(limit),
      status
    };

    let result;

    if (req.user.role === "artisan") {
      result = await Order.getByArtisan(req.user._id, paginationOptions);
    } else {
      result = await Order.getByCustomer(req.user._id, paginationOptions);
    }

    // getByArtisan returns { orders, total } directly; getByCustomer returns { query, total }
    const orders = result.orders !== undefined ? result.orders : await result.query;
    const totalOrders = result.orders !== undefined ? result.total : await result.total;

    const aid = req.user._id ? String(req.user._id) : null;
    const { prisma } = require('../lib/prisma');

    // For artisans we need the SAME query logic as getByArtisan:
    // match by top-level artisanId FK OR items JSON containing { artisan: aid }
    let artisanOrderIds = null; // null means "use customerId filter"
    if (req.user.role === "artisan" && aid) {
      let byItemsIds = [];
      try {
        const rawResults = await prisma.$queryRawUnsafe(
          `SELECT id FROM orders WHERE JSON_CONTAINS(items, ?) OR JSON_CONTAINS(items, ?)`,
          JSON.stringify({ artisan: aid }),
          JSON.stringify({ artisan: { _id: aid } })
        );
        byItemsIds = (rawResults || []).map(r => String(r.id));
      } catch (e) {
        // Silently fall back to artisanId-only filter
      }
      artisanOrderIds = byItemsIds;
    }

    const buildArtisanWhere = (extra = {}) => {
      if (req.user.role !== "artisan") {
        return { customerId: String(req.user._id), ...extra };
      }
      const orClauses = [{ artisanId: aid }];
      if (artisanOrderIds && artisanOrderIds.length > 0) {
        orClauses.push({ id: { in: artisanOrderIds } });
      }
      return { OR: orClauses, ...extra };
    };

    const counts = await prisma.order.groupBy({
      by: ['status'],
      where: buildArtisanWhere(),
      _count: { status: true },
    });

    const summary = {
      all: 0,
      pending: 0,
      processing: 0,
      shipped: 0,
      completed: 0,
      totalEarnings: 0
    };

    counts.forEach(c => {
      summary.all += c._count.status;
      const st = (c.status || "").toLowerCase();
      if (["pending", "pending verification"].includes(st)) summary.pending += c._count.status;
      else if (["confirmed", "processing"].includes(st)) summary.processing += c._count.status;
      else if (st === "shipped") summary.shipped += c._count.status;
      else if (["completed", "delivered", "completed/delivered"].includes(st)) summary.completed += c._count.status;
    });

    // Calculate total earnings for artisans
    if (req.user.role === "artisan") {
      const completedOrders = await prisma.order.findMany({
        where: buildArtisanWhere({ status: { in: ["completed", "delivered", "completed/delivered"] } }),
        select: { totals: true },
      });
      summary.totalEarnings = completedOrders.reduce((sum, o) => {
        const t = o.totals;
        return sum + (t?.artisanEarning || 0);
      }, 0);
    }

    res.json({
      orders,
      summary,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalOrders / limit),
        totalOrders,
        limit: parseInt(limit)
      },
    });
  }),
);

/**
 * @route   GET /api/orders/:id
 * @desc    Get single order details
 * @access  Private (Order owner or involved artisan)
 */
router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const mongoose = require("../lib/mongoose");
    const { id } = req.params;

    // Try to resolve by Mongo ObjectId first; if invalid or not found,
    // fallback to searching by `orderNumber` (string/number) so the
    // public order tracking page can accept friendly order numbers.
    let order = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await Order.findById(id)
        .populate(
          "customer",
          "profile.firstName profile.lastName profile.phone",
        )
        .populate("items.product", "name images price category")
        .populate("items.artisan", "profile.firstName profile.lastName")
        .populate(
          "communication.from",
          "profile.firstName profile.lastName role",
        )
        .populate(
          "communication.to",
          "profile.firstName profile.lastName role",
        );
    }

    if (!order) {
      // attempt lookup by orderNumber (try numeric form first, then string)
      if (/^\d+$/.test(id)) {
        const num = parseInt(id, 10);
        order = await Order.findOne({ orderNumber: num })
          .populate(
            "customer",
            "profile.firstName profile.lastName profile.phone",
          )
          .populate("items.product", "name images price category")
          .populate("items.artisan", "profile.firstName profile.lastName")
          .populate(
            "communication.from",
            "profile.firstName profile.lastName role",
          )
          .populate(
            "communication.to",
            "profile.firstName profile.lastName role",
          );
      }

      if (!order) {
        order = await Order.findOne({ orderNumber: id })
          .populate(
            "customer",
            "profile.firstName profile.lastName profile.phone",
          )
          .populate("items.product", "name images price category")
          .populate("items.artisan", "profile.firstName profile.lastName")
          .populate(
            "communication.from",
            "profile.firstName profile.lastName role",
          )
          .populate(
            "communication.to",
            "profile.firstName profile.lastName role",
          );
      }
    }

    // CHECK CUSTOM ORDERS AS A FALLBACK IF STILL NOT FOUND
    if (!order && mongoose.Types.ObjectId.isValid(id)) {
      const CustomOrder = require('../models/CustomOrder');
      const customOrder = await CustomOrder.findById(id)
        .populate("customer", "profile.firstName profile.lastName profile.phone")
        .populate("artisan", "profile.firstName profile.lastName")
        .populate("product", "name images price category");

      if (customOrder) {
        order = {
          _id: customOrder._id,
          orderNumber: `CUST-${customOrder._id.toString().slice(-6).toUpperCase()}`,
          status: customOrder.status,
          createdAt: customOrder.createdAt,
          updatedAt: customOrder.updatedAt,
          customer: customOrder.customer,
          items: [{
            product: customOrder.product || { name: `${customOrder.gender} ${customOrder.itemType} Design`, price: customOrder.price },
            artisan: customOrder.artisan,
            quantity: 1,
            price: customOrder.price || 0,
            status: customOrder.status
          }],
          totals: {
            subtotal: customOrder.price || 0,
            total: customOrder.price || 0,
          },
          shippingAddress: null,
          payment: {
            method: 'Custom Request',
            status: customOrder.status === 'price_quoted' ? 'unpaid' : (customOrder.status === 'paid' ? 'paid' : 'pending')
          },
          isCustom: true
        };
      }
    }

    if (!order) {
      throw createNotFoundError("Order");
    }

    // Check access permissions
    const isCustomer = order.customer && order.customer._id ? order.customer._id.toString() === req.user._id.toString() : false;
    const isInvolvedArtisan = order.items && order.items.some(
      (item) => item.artisan && item.artisan._id ? item.artisan._id.toString() === req.user._id.toString() : false
    );
    const isAdmin = req.user.role === "admin";

    if (!isCustomer && !isInvolvedArtisan && !isAdmin) {
      throw createForbiddenError("You can only view your own orders");
    }

    res.json({ order });
  }),
);

/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status (Artisans and Admins)
 * @access  Private (Artisan/Admin)
 */
router.put(
  "/:id/status",
  authenticate,
  [
    body("status")
      .isIn(["confirmed", "processing", "shipped", "delivered", "cancelled"])
      .withMessage("Invalid order status"),
    body("notes")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Notes cannot exceed 1000 characters"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Invalid status update data",
        code: "VALIDATION_ERROR",
        details: errors.array(),
      });
    }

    const { status, notes } = req.body;

    const order = await Order.findById(req.params.id).populate(
      "customer",
      "profile.firstName profile.lastName email",
    );

    if (!order) {
      throw createNotFoundError("Order");
    }

    // Check permissions
    const isInvolvedArtisan = order.items.some(
      (item) => item.artisan.toString() === req.user._id.toString(),
    );
    const isAdmin = req.user.role === "admin";

    if (!isInvolvedArtisan && !isAdmin) {
      throw createForbiddenError(
        "You can only update orders for your products",
      );
    }

    // Capture old status before update
    const oldStatus = order.status;

    // Update order status
    await order.updateStatus(status, notes);

    // Add communication message
    const statusMessages = {
      confirmed: "Your order has been confirmed and is being prepared",
      processing: "Your order is currently being processed",
      shipped: "Your order has been shipped",
      delivered: "Your order has been delivered",
      cancelled: "Your order has been cancelled",
    };

    await order.addMessage(
      req.user._id,
      order.customer._id,
      statusMessages[status] + (notes ? `. Notes: ${notes}` : ""),
      "status_update",
    );

    // Log business event
    logBusinessEvent("order_status_updated", req.user._id, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      oldStatus: oldStatus,
      newStatus: status,
    });

    // Log activity for each artisan involved
    try {
      // Get unique artisan IDs
      const artisanIds = [...new Set(order.items.map(item => item.artisan.toString()))];
      
      for (const artisanId of artisanIds) {
        await logActivity({
          userId: artisanId,
          action: 'order_status_changed',
          details: {
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            oldStatus: oldStatus,
            newStatus: status
          },
          message: `Order ${order.orderNumber} status changed to ${status}`
        });
      }
    } catch (logError) {
      console.error('[Activity Logger] Failed to log order status update:', logError.message);
    }

    res.json({
      message: "Order status updated successfully",
      order: await Order.findById(order._id)
        .populate("items.product", "name images")
        .populate("items.artisan", "profile.firstName profile.lastName"),
    });
  }),
);

/**
 * @route   PUT /api/orders/:id/items/:itemId/status
 * @desc    Update individual item status (Artisans)
 * @access  Private (Item's Artisan)
 */
router.put(
  "/:id/items/:itemId/status",
  authenticate,
  authorize("artisan"),
  [
    body("status")
      .isIn(["confirmed", "processing", "shipped", "delivered", "cancelled"])
      .withMessage("Invalid item status"),
    body("artisanNotes")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Artisan notes cannot exceed 500 characters"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Invalid status update data",
        code: "VALIDATION_ERROR",
        details: errors.array(),
      });
    }

    const { status, artisanNotes } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      throw createNotFoundError("Order");
    }

    const item = order.items.id(req.params.itemId);
    if (!item) {
      throw createNotFoundError("Order item");
    }

    // Check if artisan owns this item
    if (item.artisan.toString() !== req.user._id.toString()) {
      throw createForbiddenError("You can only update your own products");
    }

    // Update item status
    await order.updateItemStatus(req.params.itemId, status, artisanNotes);

    res.json({
      message: "Item status updated successfully",
      item: order.items.id(req.params.itemId),
    });
  }),
);

/**
 * @route   POST /api/orders/:id/messages
 * @desc    Add message to order communication
 * @access  Private (Order participants)
 */
router.post(
  "/:id/messages",
  authenticate,
  [
    body("message")
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage("Message must be between 1 and 1000 characters"),
    body("to").isMongoId().withMessage("Invalid recipient ID"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Invalid message data",
        code: "VALIDATION_ERROR",
        details: errors.array(),
      });
    }

    const { message, to } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      throw createNotFoundError("Order");
    }

    // Check if user is involved in this order
    const isCustomer = order.customer.toString() === req.user._id.toString();
    const isInvolvedArtisan = order.items.some(
      (item) => item.artisan.toString() === req.user._id.toString(),
    );

    if (!isCustomer && !isInvolvedArtisan) {
      throw createForbiddenError("You can only message about your own orders");
    }

    // Add message
    const messageType =
      req.user.role === "customer" ? "customer_inquiry" : "artisan_response";
    await order.addMessage(req.user._id, to, message, messageType);

    res.json({
      message: "Message sent successfully",
      communication: order.communication[order.communication.length - 1],
    });
  }),
);

/**
 * @route   GET /api/orders/stats/summary
 * @desc    Get order statistics (for artisans and admins)
 * @access  Private (Artisan/Admin)
 */
router.get(
  "/stats/summary",
  authenticate,
  authorize(["artisan", "admin"]),
  asyncHandler(async (req, res) => {
    let matchStage = {};

    if (req.user.role === "artisan") {
      matchStage = { "items.artisan": req.user._id };
    }

    const stats = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totals.total" },
          averageOrderValue: { $avg: "$totals.total" },
          statusBreakdown: {
            $push: "$status",
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalOrders: 1,
          totalRevenue: 1,
          averageOrderValue: { $round: ["$averageOrderValue", 2] },
          statusBreakdown: 1,
        },
      },
    ]);

    // Calculate status counts
    const statusCounts = {};
    if (stats.length > 0) {
      stats[0].statusBreakdown.forEach((status) => {
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
    }

    res.json({
      stats: stats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
      },
      statusBreakdown: statusCounts,
    });
  }),
);

// Professional Order Management Routes
router.put('/:id/accept', authenticate, authorize('artisan', 'admin'), orderManagementController.acceptOrder);
router.put('/:id/reject', authenticate, authorize('artisan', 'admin'), orderManagementController.rejectOrder);
router.put('/:id/processing', authenticate, authorize('artisan', 'admin'), orderManagementController.markAsProcessing);
router.put('/:id/ship', authenticate, authorize('artisan', 'admin'), orderManagementController.shipOrder);
router.put('/:id/tracking', authenticate, authorize('artisan', 'admin'), orderManagementController.updateTracking);
router.put('/:id/deliver', authenticate, authorize(['artisan', 'admin']), orderManagementController.markAsDelivered);
router.put('/:id/flag', authenticate, authorize('admin'), orderManagementController.flagOrder);
router.put('/:id/complete', authenticate, orderManagementController.completeOrder);
router.put('/:id/cancel', authenticate, authorize('artisan', 'admin'), orderManagementController.cancelOrder);
router.delete('/:id', authenticate, authorize('artisan', 'admin'), orderManagementController.deleteOrder);
router.post('/bulk-delete', authenticate, authorize('artisan', 'admin'), orderManagementController.bulkDeleteOrders);

// Payment & Payout Management
router.put('/:id/approve-payment', authenticate, authorize('admin'), orderManagementController.approvePayment);
router.put('/:id/reject-payment', authenticate, authorize('admin'), orderManagementController.rejectPayment);
router.put('/:id/mark-cod-paid', authenticate, authorize('admin'), orderManagementController.markCodPaid);
router.put('/:id/pay-artisan', authenticate, authorize('admin'), orderManagementController.payArtisan);
router.put('/:id/mark-commission-paid', authenticate, authorize('admin'), orderManagementController.markCommissionPaid);
router.post('/cleanup-external', authenticate, authorize('admin'), orderManagementController.cleanupUnpaidManualOrders);
router.put('/:id/upload-receipt', authenticate, upload.single('image'), orderManagementController.uploadReceipt);
router.put('/:id/artisan-approve-payment', authenticate, authorize('artisan'), orderManagementController.artisanApprovePayment);
router.put('/:id/artisan-reject-payment', authenticate, authorize('artisan'), orderManagementController.artisanRejectPayment);

module.exports = router;
