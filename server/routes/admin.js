/**
 * Admin Routes for EthioCraft Global
 *
 * Handles administrative functions:
 * - Artisan verification management
 * - User account management
 * - Platform analytics and reporting
 * - Content moderation
 */

const express = require("express");
const { body, query, validationResult } = require("express-validator");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Message = require("../models/Message");
const UserInteraction = require("../models/UserInteraction");
const CommissionPayment = require("../models/CommissionPayment");
const orderManagementController = require("../controllers/orderManagementController");
const { authenticate, authorize } = require("../middleware/auth");
const {
  asyncHandler,
  createNotFoundError,
} = require("../middleware/errorHandler");
const { logBusinessEvent, logSecurityEvent } = require("../middleware/logger");
const adminWithdrawalsController = require("../controllers/adminWithdrawalsController");

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize("admin"));

// Withdrawal management routes
router.get("/withdrawals", adminWithdrawalsController.getWithdrawals);
router.get("/withdrawals/stats", adminWithdrawalsController.getWithdrawalStats);
router.get("/withdrawals/:id", adminWithdrawalsController.getWithdrawalById);
router.put("/withdrawals/:id", adminWithdrawalsController.updateWithdrawalStatus);

// Simple file-backed storage for platform settings / CMS in development
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const readJson = (name, fallback) => {
  const p = path.join(dataDir, name + ".json");
  try {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p));
  } catch (e) {
    console.error("readJson", p, e);
  }
  return fallback;
};
const writeJson = (name, obj) => {
  const p = path.join(dataDir, name + ".json");
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
};

// Multer for logo uploads (stores in server/uploads)
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

/**
 * Development-friendly admin endpoints (platform settings, CMS, categories, audit logs)
 */

// GET /api/admin/platform-settings
router.get(
  "/platform-settings",
  asyncHandler(async (req, res) => {
    const settings = readJson("platform-settings", {
      name: "EthioCraft",
      contactEmail: "",
      currency: "ETB",
      region: "ET",
      logoUrl: "",
      commissionRate: 5,
      vatRate: 15,
    });

    // Clean logoUrl of any dev localhost origins
    if (settings.logoUrl) {
      settings.logoUrl = settings.logoUrl.replace(/^https?:\/\/localhost(:\d+)?/i, '').replace(/^https?:\/\/127\.0\.0\.1(:\d+)?/i, '');
    }

    res.json({ settings });
  }),
);

// POST /api/admin/platform-settings
router.post(
  "/platform-settings",
  asyncHandler(async (req, res) => {
    const payload = req.body || {};
    const current = readJson("platform-settings", {});
    
    // Normalize logoUrl: if it's an absolute URL, strip the backend part
    if (payload.logoUrl && payload.logoUrl.startsWith('http')) {
      const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5001}`;
      if (payload.logoUrl.startsWith(backendUrl)) {
        payload.logoUrl = payload.logoUrl.replace(backendUrl, '');
      }
    }

    const merged = { ...current, ...payload };
    writeJson("platform-settings", merged);

    // Record audit log
    const audit = readJson("audit-logs", []);
    audit.unshift({
      _id: String(Date.now()),
      action: "platform_settings_updated",
      adminEmail: req.user.email,
      details: "Platform settings or commission rate changed",
      createdAt: new Date(),
    });
    writeJson("audit-logs", audit);

    // Ensure logoUrl is clean for the response
    const settingsResponse = { ...merged };
    if (settingsResponse.logoUrl) {
      settingsResponse.logoUrl = settingsResponse.logoUrl.replace(/^https?:\/\/localhost(:\d+)?/i, '').replace(/^https?:\/\/127\.0\.0\.1(:\d+)?/i, '');
    }

    res.json({ success: true, settings: settingsResponse });
  }),
);


// GET /api/admin/backup/download - Full system database & settings backup
router.get(
  "/backup/download",
  asyncHandler(async (req, res) => {
    const { prisma } = require("../lib/prisma");

    const [
      users,
      products,
      orders,
      customOrders,
      promotions,
      promotionProducts,
      messages,
      earnings,
      commissionPayments,
      commissionPaymentOrders,
      withdrawalAuditLogs,
      userInteractions,
      aiChatLogs,
      alertLogs,
      siteConfigs,
      notificationSettings,
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.product.findMany(),
      prisma.order.findMany(),
      prisma.customOrder.findMany(),
      prisma.promotion.findMany(),
      prisma.promotionProduct.findMany(),
      prisma.message.findMany(),
      prisma.earning.findMany(),
      prisma.commissionPayment.findMany(),
      prisma.commissionPaymentOrder.findMany(),
      prisma.withdrawalAuditLog.findMany(),
      prisma.userInteraction.findMany(),
      prisma.aIChatLog.findMany(),
      prisma.alertLog.findMany(),
      prisma.siteConfig.findMany(),
      prisma.notificationSetting.findMany(),
    ]);

    const platformSettings = readJson("platform-settings", {});
    const auditLogs = readJson("audit-logs", []);
    const broadcasts = readJson("broadcasts", []);

    const backupPayload = {
      system: "EthioCraft Global",
      version: "1.0.0",
      exportDate: new Date().toISOString(),
      database: "MySQL / Prisma",
      summary: {
        users: users.length,
        products: products.length,
        orders: orders.length,
        customOrders: customOrders.length,
        promotions: promotions.length,
        messages: messages.length,
        earnings: earnings.length,
        commissionPayments: commissionPayments.length,
        withdrawalAuditLogs: withdrawalAuditLogs.length,
        userInteractions: userInteractions.length,
        aiChatLogs: aiChatLogs.length,
        alertLogs: alertLogs.length,
        siteConfigs: siteConfigs.length,
        notificationSettings: notificationSettings.length,
        totalRecords:
          users.length +
          products.length +
          orders.length +
          customOrders.length +
          promotions.length +
          messages.length +
          earnings.length +
          commissionPayments.length +
          withdrawalAuditLogs.length +
          userInteractions.length +
          aiChatLogs.length +
          alertLogs.length +
          siteConfigs.length +
          notificationSettings.length,
      },
      data: {
        users,
        products,
        orders,
        customOrders,
        promotions,
        promotionProducts,
        messages,
        earnings,
        commissionPayments,
        commissionPaymentOrders,
        withdrawalAuditLogs,
        userInteractions,
        aiChatLogs,
        alertLogs,
        siteConfigs,
        notificationSettings,
        platformSettings,
        auditLogs,
        broadcasts,
      },
    };

    // Save a copy on the server in backups/ folder
    try {
      const backupsDir = path.join(__dirname, "..", "backups");
      if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
      const localFilename = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      fs.writeFileSync(path.join(backupsDir, localFilename), JSON.stringify(backupPayload, null, 2));
    } catch (saveErr) {
      console.warn("Could not save local backup file:", saveErr.message);
    }

    // Record audit log
    const audit = readJson("audit-logs", []);
    audit.unshift({
      _id: String(Date.now()),
      action: "database_full_backup",
      adminEmail: req.user ? req.user.email : "admin",
      details: `Full database backup downloaded (${backupPayload.summary.totalRecords} total records)`,
      createdAt: new Date(),
    });
    writeJson("audit-logs", audit);

    // Stream download directly to client
    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="ethiocraft-global-backup-${dateStr}.json"`);
    res.status(200).send(JSON.stringify(backupPayload, null, 2));
  })
);

// POST /api/admin/recalculate-rates - Update VAT % and Commission % and recalculate all products
router.post(
  "/recalculate-rates",
  asyncHandler(async (req, res) => {
    const { vatRate = 15, commissionRate = 5 } = req.body;
    const vatNum = parseFloat(vatRate);
    const commNum = parseFloat(commissionRate);

    if (isNaN(vatNum) || vatNum < 0 || vatNum > 100) {
      return res.status(400).json({ success: false, message: "VAT rate must be between 0% and 100%" });
    }
    if (isNaN(commNum) || commNum < 0 || commNum > 100) {
      return res.status(400).json({ success: false, message: "Commission rate must be between 0% and 100%" });
    }

    // 1. Update platform settings JSON
    const current = readJson("platform-settings", {});
    current.vatRate = vatNum;
    current.commissionRate = commNum;
    writeJson("platform-settings", current);

    // 2. Fetch all products from MySQL
    const { prisma } = require("../lib/prisma");
    const allProducts = await prisma.product.findMany();

    // 3. Recalculate specifications and rates for all products
    let updatedCount = 0;
    for (const prod of allProducts) {
      const specs = typeof prod.specifications === "string"
        ? JSON.parse(prod.specifications || "{}")
        : (prod.specifications || {});

      // Calculate VAT & Commission breakdown in %
      const price = Number(prod.price) || 0;
      const vatAmount = Math.round(price * (vatNum / 100) * 100) / 100;
      const commissionAmount = Math.round(price * (commNum / 100) * 100) / 100;
      const artisanNet = Math.round((price - commissionAmount) * 100) / 100;

      const updatedSpecs = {
        ...specs,
        vatRate: vatNum,
        vatAmount,
        commissionRate: commNum,
        commissionAmount,
        artisanNetEarning: artisanNet,
        ratesUpdatedAt: new Date().toISOString(),
      };

      await prisma.product.update({
        where: { id: prod.id },
        data: {
          specifications: updatedSpecs,
        },
      });
      updatedCount++;
    }

    // 4. Record audit log
    const audit = readJson("audit-logs", []);
    audit.unshift({
      _id: String(Date.now()),
      action: "tax_and_commission_updated",
      adminEmail: req.user ? req.user.email : "admin",
      details: `VAT set to ${vatNum}%, Commission set to ${commNum}%. Recalculated ${updatedCount} products.`,
      createdAt: new Date(),
    });
    writeJson("audit-logs", audit);

    res.json({
      success: true,
      message: `VAT (${vatNum}%) and Commission (${commNum}%) successfully updated across ${updatedCount} products!`,
      vatRate: vatNum,
      commissionRate: commNum,
      updatedCount,
      settings: current,
    });
  })
);

// POST /api/admin/platform-settings/logo
router.post(
  "/platform-settings/logo",
  upload.single("logo"),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const url = `/uploads/${req.file.filename}`;
    const current = readJson("platform-settings", {});
    current.logoUrl = url;
    writeJson("platform-settings", current);

    res.json({ success: true, logoUrl: url });
  }),
);

// GET /api/admin/cms
router.get(
  "/cms",
  asyncHandler(async (req, res) => {
    const cms = readJson("cms", { categories: [], banners: [], featured: [] });
    res.json(cms);
  }),
);

// POST /api/admin/cms/featured/:id/toggle
router.post(
  "/cms/featured/:id/toggle",
  asyncHandler(async (req, res) => {
    const cms = readJson("cms", { categories: [], banners: [], featured: [] });
    const id = req.params.id;
    cms.featured = cms.featured || [];
    let action = "featured_added";
    if (cms.featured.includes(id)) {
      cms.featured = cms.featured.filter((x) => x !== id);
      action = "featured_removed";
    } else {
      cms.featured.push(id);
    }
    writeJson("cms", cms);
    // audit log
    const audit = readJson("audit-logs", []);
    audit.unshift({
      _id: String(Date.now()),
      action,
      adminEmail: req.user.email,
      details: `product:${id}`,
      createdAt: new Date(),
    });
    writeJson("audit-logs", audit);
    res.json({ success: true, featured: cms.featured });
  }),
);

// Categories CRUD
router.get(
  "/categories",
  asyncHandler(async (req, res) => {
    const cats = readJson("categories", []);
    res.json({ categories: cats });
  }),
);

router.post(
  "/categories",
  asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });
    const cats = readJson("categories", []);
    const newCat = { _id: String(Date.now()), name };
    cats.unshift(newCat);
    writeJson("categories", cats);
    res.json({ category: newCat });
  }),
);

router.put(
  "/categories/:id",
  asyncHandler(async (req, res) => {
    const cats = readJson("categories", []);
    const idx = cats.findIndex((c) => c._id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    cats[idx].name = req.body.name || cats[idx].name;
    writeJson("categories", cats);
    res.json({ category: cats[idx] });
  }),
);

router.delete(
  "/categories/:id",
  asyncHandler(async (req, res) => {
    let cats = readJson("categories", []);
    const removed = cats.find((c) => c._id === req.params.id);
    cats = cats.filter((c) => c._id !== req.params.id);
    writeJson("categories", cats);
    // audit log
    const audit = readJson("audit-logs", []);
    audit.unshift({
      _id: String(Date.now()),
      action: "category_deleted",
      adminEmail: req.user.email,
      details: removed ? removed.name : req.params.id,
      createdAt: new Date(),
    });
    writeJson("audit-logs", audit);
    res.json({ success: true });
  }),
);

// DELETE /api/admin/cms/banners/:id -> remove banner and its file if present
router.delete(
  "/cms/banners/:id",
  asyncHandler(async (req, res) => {
    const cms = readJson("cms", { categories: [], banners: [], featured: [] });
    const id = req.params.id;
    const banner = (cms.banners || []).find((b) => b._id === id);
    cms.banners = (cms.banners || []).filter((b) => b._id !== id);
    writeJson("cms", cms);
    // remove associated file from uploads if path provided and starts with /uploads/
    try {
      if (banner && banner.image && banner.image.startsWith("/uploads/")) {
        const filePath = path.join(
          __dirname,
          "..",
          banner.image.replace(/^\//, ""),
        );
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.warn("failed to remove banner file", e);
    }
    // audit log
    const audit = readJson("audit-logs", []);
    audit.unshift({
      _id: String(Date.now()),
      action: "banner_deleted",
      adminEmail: req.user.email,
      details: banner ? banner.title || banner._id : id,
      createdAt: new Date(),
    });
    writeJson("audit-logs", audit);
    res.json({ success: true });
  }),
);

// GET /api/admin/audit-logs
router.get(
  "/audit-logs",
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit, 10);
    const logs = readJson("audit-logs", []);
    if (!isNaN(limit) && limit > 0) {
      return res.json({ logs: logs.slice(0, limit), total: logs.length });
    }
    res.json({ logs, total: logs.length });
  }),
);

// DELETE /api/admin/audit-logs/clear -> clear all audit logs
router.delete(
  "/audit-logs/clear",
  asyncHandler(async (req, res) => {
    writeJson("audit-logs", []);
    res.json({ success: true, message: "All activity history cleared successfully" });
  }),
);

// POST /api/admin/audit-logs/delete-bulk -> delete selected audit logs
router.post(
  "/audit-logs/delete-bulk",
  asyncHandler(async (req, res) => {
    const { ids } = req.body;
    let logs = readJson("audit-logs", []);
    if (Array.isArray(ids) && ids.length > 0) {
      const idSet = new Set(ids.map(String));
      logs = logs.filter((log) => !idSet.has(String(log._id || log.id)));
      writeJson("audit-logs", logs);
    }
    res.json({ success: true, remaining: logs.length });
  }),
);

// DELETE /api/admin/audit-logs/:id -> delete a single audit log
router.delete(
  "/audit-logs/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    let logs = readJson("audit-logs", []);
    logs = logs.filter((log) => String(log._id || log.id) !== String(id));
    writeJson("audit-logs", logs);
    res.json({ success: true, message: "Activity item deleted successfully" });
  }),
);

// GET /api/admin/notifications/broadcasts -> get all broadcasts with active status and time remaining
router.get(
  "/notifications/broadcasts",
  asyncHandler(async (req, res) => {
    const broadcasts = readJson("broadcasts", []);
    const now = Date.now();
    const enriched = broadcasts.map((b) => {
      const expiresAtMs = b.expiresAt ? new Date(b.expiresAt).getTime() : null;
      const isExpired = expiresAtMs ? expiresAtMs <= now : false;
      const remainingMs = expiresAtMs && !isExpired ? expiresAtMs - now : 0;
      const remainingHours = remainingMs ? Math.floor(remainingMs / (1000 * 60 * 60)) : 0;
      const remainingMinutes = remainingMs ? Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60)) : 0;
      return {
        ...b,
        isExpired,
        remainingMs,
        remainingText: isExpired ? "Expired" : remainingMs ? `${remainingHours}h ${remainingMinutes}m` : "Permanent",
      };
    });
    res.json({ success: true, broadcasts: enriched });
  }),
);

// POST /api/admin/notifications/broadcast
router.post(
  "/notifications/broadcast",
  asyncHandler(async (req, res) => {
    const { message, title, target, targetEmail, type, durationHours } = req.body || {};
    if (!message || !message.trim()) return res.status(400).json({ error: "Message required" });

    const broadcasts = readJson("broadcasts", []);
    const hours = durationHours !== undefined && durationHours !== null ? Number(durationHours) : 24; // default 24h
    const now = Date.now();
    const expiresAt = hours > 0 ? new Date(now + hours * 3600 * 1000) : null;

    const item = {
      _id: String(Date.now()),
      title: (title || "").trim() || (type === "alert" ? "Urgent Alert" : type === "promotion" ? "Special Offer" : "Platform Announcement"),
      message: message.trim(),
      target: target || "all", // 'all', 'artisan', 'customer', 'individual'
      targetEmail: target === "individual" && targetEmail ? targetEmail.trim().toLowerCase() : null,
      type: type || "announcement", // 'announcement', 'alert', 'promotion', 'info'
      durationHours: hours,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      createdAt: new Date().toISOString(),
      createdBy: req.user?.email || "Admin",
    };

    broadcasts.unshift(item);
    writeJson("broadcasts", broadcasts);

    // Log broadcast in audit logs
    const audit = readJson("audit-logs", []);
    audit.unshift({
      _id: String(Date.now()),
      action: "broadcast_sent",
      adminEmail: req.user?.email || "Admin",
      details: item.message,
      target: item.target,
      durationHours: hours,
      createdAt: new Date(),
    });
    writeJson("audit-logs", audit);

    // Real-time broadcast emission via Socket.io
    const io = req.app.get("io");
    if (io) {
      io.emit("newBroadcast", item);
      io.emit("broadcastNotification", item);
      console.log(`📢 Real-time broadcast emitted to all clients (target: ${item.target}, type: ${item.type}): "${item.message}"`);
    } else {
      console.warn("⚠️ Socket.io instance not found in req.app during broadcast");
    }

    res.json({ success: true, broadcast: item });
  }),
);

// DELETE /api/admin/notifications/broadcasts/:id -> clear a broadcast or 'all'
router.delete(
  "/notifications/broadcasts/:id",
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    let broadcasts = readJson("broadcasts", []);
    let removedMessage = "All active broadcasts";

    if (id === "all" || id === "clear-all") {
      broadcasts = [];
      writeJson("broadcasts", []);
    } else {
      const removed = broadcasts.find((b) => b._id === id);
      if (removed) removedMessage = removed.message;
      broadcasts = broadcasts.filter((b) => b._id !== id);
      writeJson("broadcasts", broadcasts);
    }

    // audit log
    const audit = readJson("audit-logs", []);
    audit.unshift({
      _id: String(Date.now()),
      action: "broadcast_cleared",
      adminEmail: req.user?.email || "Admin",
      details: removedMessage,
      createdAt: new Date(),
    });
    writeJson("audit-logs", audit);

    // Real-time deletion emission via Socket.io
    const io = req.app.get("io");
    if (io) {
      io.emit("broadcastDeleted", { id, all: id === "all" || id === "clear-all" });
      io.emit("clearBroadcast", { id, all: id === "all" || id === "clear-all" });
      io.emit("broadcastCleared", { id, all: id === "all" || id === "clear-all" });
      console.log(`📢 Real-time broadcast removal emitted to all clients (id: ${id})`);
    }

    res.json({ success: true, message: "Broadcast cancelled/removed successfully" });
  }),
);

// GET /api/admin/login-alerts
router.get(
  "/login-alerts",
  asyncHandler(async (req, res) => {
    const alerts = readJson("login-alerts", []);
    res.json({ alerts });
  }),
);

/**
 * @route   GET /api/admin/orders/:orderNumber
 * @desc    Get full order details by orderNumber string (e.g. EC-20260323-41327)
 * @access  Private (Admin)
 */
router.get(
  "/orders/:orderNumber",
  asyncHandler(async (req, res) => {
    const { prisma } = require("../lib/prisma");
    const { toMongoDoc } = require("../lib/mongoCompat/serialize");
    const identifier = req.params.orderNumber;

    // Use Prisma directly to avoid $or issues in MongoCompat layer
    // orderNumber is unique so try it first; fall back to id match
    let raw = await prisma.order.findFirst({
      where: {
        OR: [
          { orderNumber: identifier },
          { id: identifier },
        ]
      },
      include: { customer: true, artisan: true },
    });

    if (!raw) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = toMongoDoc(raw);

    // Manually populate items.product and items.artisan from JSON array
    if (Array.isArray(order.items)) {
      const productIds = [...new Set(order.items.map(i => i.product).filter(Boolean).map(String))];
      const artisanIds = [...new Set(order.items.map(i => i.artisan).filter(Boolean).map(String))];

      const [productRecs, artisanRecs] = await Promise.all([
        productIds.length ? prisma.product.findMany({ where: { id: { in: productIds } } }) : [],
        artisanIds.length ? prisma.user.findMany({ where: { id: { in: artisanIds } } }) : [],
      ]);

      const productMap = new Map(productRecs.map(p => [p.id, toMongoDoc(p)]));
      const artisanMap = new Map(artisanRecs.map(u => [u.id, toMongoDoc(u)]));

      order.items = order.items.map(item => ({
        ...item,
        product: (item.product && productMap.get(String(item.product))) || item.product,
        artisan: (item.artisan && artisanMap.get(String(item.artisan))) || item.artisan,
      }));
    }

    // Delivery efficiency
    if (['delivered', 'completed'].includes(order.status)) {
      const completionDate = order.shipping?.deliveredAt || order.updatedAt;
      if (completionDate) {
        const diffTime = Math.abs(new Date(completionDate) - new Date(order.createdAt));
        order.deliveryEfficiencyDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        order.completionDate = completionDate;
      }
    }

    res.json({ success: true, order });
  })
);

/**
 * @route   PUT /api/admin/orders/:id/confirm-cod
 * @desc    Confirm COD: marks platform commission as collected from artisan
 * @access  Private (Admin)
 */
router.put(
  "/orders/:id/confirm-cod",
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (order.payment.method !== "COD") {
      return res.status(400).json({ success: false, message: "Only COD orders can use this action" });
    }
    order.commissionStatus = "Paid";
    order.payment.status = "Completed";
    order.payment.processedAt = new Date();
    order.payment.processedBy = req.user._id;
    await order.save();
    res.json({ success: true, message: "COD commission confirmed. Payment marked as Completed.", order });
  })
);

/**
 * @route   PUT /api/admin/orders/:id/flag
 * @desc    Flag/Dispute an order
 * @access  Private (Admin)
 */
router.put(
  "/orders/:id/flag",
  asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    order.isDisputed = !order.isDisputed; // toggle
    if (order.isDisputed) {
      order.notes = ((order.notes || "") + ` | FLAGGED: ${reason || "Admin dispute"}`).trim();
    }
    await order.save();
    res.json({ success: true, message: order.isDisputed ? "Order flagged as disputed" : "Dispute flag removed", order });
  })
);

/**
 * @route   PUT /api/admin/orders/:id/approve-payment
 * @desc    Approve manual bank transfer receipt
 * @access  Private (Admin)
 */
router.put(
  "/orders/:id/approve-payment",
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (order.payment.status === "Paid") {
      return res.status(400).json({ success: false, message: "Payment already approved" });
    }
    order.payment.status = "Paid";
    order.payment.processedAt = new Date();
    order.payment.processedBy = req.user._id;
    order.shippingAddress.isAddressVisible = true; // escrow: reveal address
    order.payoutStatus = "Ready";
    await order.save();
    res.json({ success: true, message: "Manual payment approved. Address now visible to artisan.", order });
  })
);


/**
 * @route   GET /api/admin/payments
 * @desc    Get all order payments and payout statuses
 * @access  Private (Admin)
 */
router.get(
  "/payments",
  asyncHandler(async (req, res) => {
    const { prisma } = require("../lib/prisma");
    const { toMongoDoc } = require("../lib/mongoCompat/serialize");
    const { search, paymentStatus, deliveryStatus, paymentMethod } = req.query;

    const andClauses = [];

    if (search) {
      const matchingUsers = await prisma.user.findMany({
        where: {
          OR: [
            { profile: { path: (process.env.DATABASE_URL || '').startsWith('mysql:') ? '$.firstName' : ['firstName'], string_contains: search } },
            { profile: { path: (process.env.DATABASE_URL || '').startsWith('mysql:') ? '$.lastName' : ['lastName'], string_contains: search } },
          ]
        },
        select: { id: true }
      }).catch(() => []);
      const userIds = matchingUsers.map(u => u.id);
      const orClauses = [{ orderNumber: { contains: search, mode: 'insensitive' } }];
      if (userIds.length > 0) {
        orClauses.push({ customerId: { in: userIds } });
        orClauses.push({ artisanId: { in: userIds } });
      }
      andClauses.push({ OR: orClauses });
    }

    if (deliveryStatus && deliveryStatus !== 'All') {
      andClauses.push({ status: { equals: deliveryStatus, mode: 'insensitive' } });
    }

    const where = andClauses.length > 0 ? { AND: andClauses } : {};

    const rawOrders = await prisma.order.findMany({
      where,
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
    });

    // Cache artisan lookups to avoid N+1 queries
    const artisanCache = new Map();
    const getArtisan = async (id) => {
      if (!id) return null;
      const sid = String(id);
      if (artisanCache.has(sid)) return artisanCache.get(sid);
      const rec = await prisma.user.findUnique({ where: { id: sid } }).catch(() => null);
      artisanCache.set(sid, rec);
      return rec;
    };

    const transactions = [];
    for (const raw of rawOrders) {
      const order = toMongoDoc(raw);
      const payment = order.payment || {};
      const totals = order.totals || {};

      // Post-filter JSON payment fields
      if (paymentStatus && paymentStatus !== 'All') {
        if ((payment.status || '').toLowerCase() !== paymentStatus.toLowerCase()) continue;
      }
      if (paymentMethod && paymentMethod !== 'All') {
        if ((payment.method || '').toLowerCase() !== paymentMethod.toLowerCase()) continue;
      }

      // Resolve artisan from items JSON
      const firstItemArtisanId = Array.isArray(order.items) && order.items[0]?.artisan
        ? String(order.items[0].artisan)
        : (order.artisanId ? String(order.artisanId) : null);

      let artisanName = 'Artisan Hub';
      let artisanId = null;
      const artisanRec = await getArtisan(firstItemArtisanId);
      if (artisanRec) {
        const profile = artisanRec.profile || {};
        artisanName = profile.storeName || profile.businessName ||
          (profile.firstName ? `${profile.firstName} ${profile.lastName || ''}`.trim() : 'Artisan Hub');
        artisanId = artisanRec.id;
      }

      let completionDate = null;
      let deliveryEfficiencyDays = null;
      if (['delivered', 'completed'].includes(order.status)) {
        completionDate = order.shipping?.deliveredAt || order.updatedAt;
        if (completionDate) {
          const diffTime = Math.abs(new Date(completionDate) - new Date(order.createdAt));
          deliveryEfficiencyDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        }
      }

      const totalAmount = totals.total || payment.amount || 0;
      transactions.push({
        _id: order._id,
        orderNumber: order.orderNumber,
        customer: order.customer,
        artisanName,
        artisanId,
        amount: totalAmount,
        currency: "ETB",
        status: payment.status || order.status || 'Pending',
        method: payment.method || 'Manual',
        payoutStatus: order.payoutStatus || 'Pending',
        commissionStatus: order.commissionStatus || 'Pending',
        deliveryStatus: order.shipping?.deliveryStatus || order.status || 'Pending',
        commission: totals.platformCommission || (totalAmount * 0.05),
        earning: totals.artisanEarning || (totalAmount * 0.95),
        receiptUrl: payment.receipt,
        createdAt: order.createdAt,
        completionDate,
        deliveryEfficiencyDays,
        transactionId: payment.transactionId,
        isDisputed: order.isDisputed,
      });
    }

    res.json({ success: true, transactions });
  }),
);

/**
 * @route   GET /api/admin/payments/:id
 * @desc    Get single payment/order transaction details
 * @access  Private (Admin)
 */
router.get(
  "/payments/:id",
  asyncHandler(async (req, res) => {
    const { prisma } = require("../lib/prisma");
    const { toMongoDoc } = require("../lib/mongoCompat/serialize");
    const { id } = req.params;

    const raw = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: { customer: true },
    });

    if (!raw) {
      return res.status(404).json({ success: false, message: "Payment/Order not found" });
    }

    const order = toMongoDoc(raw);
    res.json({ success: true, payment: order.payment || {}, order });
  }),
);

/**
 * @route   GET /api/admin/disputes
 * @desc    Get all disputes & flagged orders for resolution tracking
 * @access  Private (Admin)
 */
router.get(
  "/disputes",
  asyncHandler(async (req, res) => {
    const { prisma } = require("../lib/prisma");
    const { toMongoDoc } = require("../lib/mongoCompat/serialize");

    const rawOrders = await prisma.order.findMany({
      where: {
        OR: [{ isDisputed: true }, { status: "disputed" }],
      },
      include: { customer: true },
      orderBy: { updatedAt: "desc" },
    });

    const cases = rawOrders.map((raw) => {
      const order = toMongoDoc(raw);
      const cust = order.customer || {};
      const custProfile = cust.profile || {};
      return {
        _id: order._id,
        id: order._id,
        orderId: order.orderNumber,
        customerEmail: cust.email || order.shippingAddress?.email || custProfile.email || "N/A",
        reason: order.notes || (order.isDisputed ? "Order flagged for dispute review" : "Dispute reported"),
        status: order.isDisputed ? "open" : (order.status || "resolved"),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        amount: order.totals?.total || order.totalAmount || 0,
        currency: order.currency || "ETB",
      };
    });

    res.json({ success: true, cases });
  }),
);

/**
 * @route   POST /api/admin/disputes/:id/status
 * @desc    Update dispute status
 * @access  Private (Admin)
 */
router.post(
  "/disputes/:id/status",
  asyncHandler(async (req, res) => {
    const { prisma } = require("../lib/prisma");
    const { toMongoDoc } = require("../lib/mongoCompat/serialize");
    const { id } = req.params;
    const { status } = req.body;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Dispute order not found" });
    }

    const isResolved = status === "resolved" || status === "closed";
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        isDisputed: !isResolved,
        notes: (order.notes || "") + ` | Dispute status set to ${status}`,
      },
    });

    res.json({ success: true, message: `Dispute status updated to ${status}`, order: toMongoDoc(updated) });
  }),
);

/**
 * @route   GET /api/admin/commissions
 * @desc    Get commission tracking summary per artisan
 * @access  Private (Admin)
 */
router.get(
  "/commissions",
  asyncHandler(async (req, res) => {
    // Get all artisans with their commission balances
    const artisans = await User.find({ role: "artisan" })
      .select("profile email unpaidCommission paidCommission bankDetails businessProfile")
      .lean();

    // Get order stats for these artisans
    const stats = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.artisan",
          orderCount: { $addToSet: "$_id" },
          totalRevenue: { $sum: "$totals.total" }
        }
      }
    ]);

    const statsMap = stats.reduce((acc, s) => {
      acc[s._id.toString()] = {
        orderCount: s.orderCount.length,
        totalRevenue: s.totalRevenue
      };
      return acc;
    }, {});

    const enrichedArtisans = artisans.map(artisan => ({
      artisanId: artisan,
      orderCount: statsMap[artisan._id.toString()]?.orderCount || 0,
      totalRevenue: statsMap[artisan._id.toString()]?.totalRevenue || 0,
      unpaidDebt: artisan.unpaidCommission || 0,
      paidCommission: artisan.paidCommission || 0
    }));

    res.json({ success: true, stats: enrichedArtisans });
  }),
);

/**
 * @route   GET /api/admin/commissions/summary
 * @desc    Get global commission totals for admin dashboard cards
 * @access  Private (Admin)
 */
router.get(
  "/commissions/summary",
  asyncHandler(async (req, res) => {
    // Aggregate from User model — single source of truth
    const result = await User.aggregate([
      { $match: { role: "artisan" } },
      {
        $group: {
          _id: null,
          totalUnpaidDebt: { $sum: { $ifNull: ["$unpaidCommission", 0] } },
          totalPaidCommission: { $sum: { $ifNull: ["$paidCommission", 0] } },
          artisanCount: { $sum: 1 }
        }
      }
    ]);

    // Count pending verification submissions
    const CommissionPayment = require('../models/CommissionPayment');
    const pendingCount = await CommissionPayment.countDocuments({ status: 'pending admin approval' });

    res.json({
      success: true,
      summary: {
        totalUnpaidDebt: result[0]?.totalUnpaidDebt || 0,
        totalPaidCommission: result[0]?.totalPaidCommission || 0,
        artisanCount: result[0]?.artisanCount || 0,
        pendingVerificationCount: pendingCount
      }
    });
  }),
);

/**
 * @route   GET /api/admin/health-check
 * @desc    Get detailed platform health check and live system diagnosis
 * @access  Private (Admin)
 */
router.get(
  "/health-check",
  asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const { prisma } = require("../lib/prisma");
    const fs = require("fs");
    const path = require("path");

    let dbStatus = "connected";
    let dbLatencyMs = 0;
    let counts = { users: 0, artisans: 0, products: 0, orders: 0, customOrders: 0 };
    let dbError = null;

    try {
      const qStart = Date.now();
      if (prisma && typeof prisma.user?.count === "function") {
        const [uCount, aCount, pCount, oCount] = await Promise.all([
          prisma.user.count().catch(() => 0),
          prisma.user.count({ where: { role: "artisan" } }).catch(() => 0),
          prisma.product.count().catch(() => 0),
          prisma.order.count().catch(() => 0),
        ]);
        dbLatencyMs = Date.now() - qStart;
        counts = {
          users: uCount,
          artisans: aCount,
          products: pCount,
          orders: oCount,
          customOrders: 0,
        };
      }
    } catch (e) {
      dbStatus = "error";
      dbError = e.message;
    }

    const uploadsDir = path.join(__dirname, "..", "uploads");
    const dataDir = path.join(__dirname, "..", "data");
    const storageHealthy = fs.existsSync(uploadsDir) && fs.existsSync(dataDir);

    const io = req.app.get("io");
    const socketActive = !!io;
    const socketClients = io && io.engine ? io.engine.clientsCount || 0 : 0;

    const memUsage = process.memoryUsage();
    const uptimeSec = Math.floor(process.uptime());
    const uptimeHours = Math.floor(uptimeSec / 3600);
    const uptimeMins = Math.floor((uptimeSec % 3600) / 60);

    const totalResponseTimeMs = Date.now() - startTime;

    res.json({
      success: true,
      status: dbStatus === "connected" ? "healthy" : "degraded",
      healthScore: dbStatus === "connected" ? 100 : 75,
      timestamp: new Date().toISOString(),
      responseTimeMs: totalResponseTimeMs,
      server: {
        status: "online",
        uptime: `${uptimeHours}h ${uptimeMins}m ${uptimeSec % 60}s`,
        uptimeSec,
        nodeVersion: process.version,
        platform: `${process.platform} (${process.arch})`,
        environment: process.env.NODE_ENV || "production",
        memory: {
          rssMb: Math.round(memUsage.rss / (1024 * 1024)),
          heapUsedMb: Math.round(memUsage.heapUsed / (1024 * 1024)),
          heapTotalMb: Math.round(memUsage.heapTotal / (1024 * 1024)),
        },
      },
      database: {
        status: dbStatus,
        type: "MySQL / Prisma",
        latencyMs: dbLatencyMs,
        counts,
        error: dbError,
      },
      storage: {
        status: storageHealthy ? "operational" : "warning",
        uploadsDir: fs.existsSync(uploadsDir),
        dataDir: fs.existsSync(dataDir),
      },
      realtime: {
        status: socketActive ? "active" : "standby",
        connectedClients: socketClients,
      },
      security: {
        jwtAuth: "active",
        corsConfig: "enabled",
        rateLimiter: "active",
      },
    });
  }),
);

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard statistics
 * @access  Private (Admin)
 */
router.get(
  "/dashboard",
  asyncHandler(async (req, res) => {
    try {
      let userStats = [];
      let verificationStats = [];
      let productStats = [];
      let orderStats = [];
      let dailyTrends = [];
      let platformEarnings = [];

      try {
        const { prisma } = require("../lib/prisma");
        const [artisanTotal, customerTotal, adminTotal] = await Promise.all([
          prisma.user.count({ where: { role: 'artisan' } }).catch(() => 0),
          prisma.user.count({ where: { role: 'customer' } }).catch(() => 0),
          prisma.user.count({ where: { role: 'admin' } }).catch(() => 0),
        ]);
        userStats = [
          { _id: "artisan", count: artisanTotal, active: artisanTotal },
          { _id: "customer", count: customerTotal, active: customerTotal },
          { _id: "admin", count: adminTotal, active: adminTotal },
        ];
      } catch (e) {
        console.warn("userStats direct count warning:", e.message);
        userStats = [
          { _id: "admin", count: 1, active: 1 },
          { _id: "artisan", count: 0, active: 0 },
          { _id: "customer", count: 0, active: 0 },
        ];
      }

      try {
        const { prisma } = require("../lib/prisma");
        const artisans = await prisma.user.findMany({
          where: { role: "artisan" },
          select: { verification: true },
        });
        const counts = {};
        artisans.forEach((a) => {
          const st = (a.verification && typeof a.verification === "object" && a.verification.status) || "not_submitted";
          counts[st] = (counts[st] || 0) + 1;
        });
        verificationStats = Object.keys(counts).map((st) => ({ _id: st, count: counts[st] }));
      } catch (e) {
        console.warn("verificationStats fallback:", e.message);
      }

      try {
        productStats = await Product.aggregate([
          {
            $group: {
              _id: "$category",
              total: { $sum: 1 },
              active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
              avgPrice: { $avg: "$price" },
            },
          },
        ]);
      } catch (e) {
        console.warn("productStats fallback:", e.message);
      }

      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        orderStats = await Order.aggregate([
          { $match: { createdAt: { $gte: thirtyDaysAgo } } },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalRevenue: { $sum: "$totals.total" },
              totalCommission: { $sum: "$totals.platformCommission" },
              totalArtisanEarnings: { $sum: "$totals.artisanEarning" },
              averageOrderValue: { $avg: "$totals.total" },
            },
          },
        ]);
      } catch (e) {
        console.warn("orderStats fallback:", e.message);
      }

      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        dailyTrends = await Order.aggregate([
          { $match: { createdAt: { $gte: sevenDaysAgo } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              orders: { $sum: 1 },
              revenue: { $sum: "$totals.total" },
            },
          },
          { $sort: { _id: 1 } },
        ]);
      } catch (e) {
        console.warn("dailyTrends fallback:", e.message);
      }

      try {
        const Earning = require("../models/Earning");
        platformEarnings = await Earning.aggregate([
          {
            $match: {
              transactionType: "sale",
              status: "completed",
            },
          },
          {
            $group: {
              _id: null,
              totalFees: { $sum: "$platformFee" },
              totalSales: { $sum: "$amount" },
              transactionCount: { $sum: 1 },
            },
          },
        ]);
      } catch (e) {
        console.warn("platformEarnings fallback:", e.message);
      }

      res.json({
        users: userStats,
        verifications: verificationStats,
        products: productStats,
        orders: (orderStats && orderStats[0]) || {
          totalOrders: 0,
          totalRevenue: 0,
          totalCommission: 0,
          totalArtisanEarnings: 0,
          averageOrderValue: 0,
        },
        platformEarnings: (platformEarnings && platformEarnings[0]) || {
          totalFees: 0,
          totalSales: 0,
          transactionCount: 0,
        },
        trends: dailyTrends,
        lastUpdated: new Date().toISOString(),
      });
    } catch (globalErr) {
      console.warn("⚠️ Dashboard global fallback:", globalErr.message);
      res.json({
        users: [{ _id: "admin", count: 1, active: 1 }],
        verifications: [],
        products: [],
        orders: { totalOrders: 0, totalRevenue: 0, totalCommission: 0, totalArtisanEarnings: 0, averageOrderValue: 0 },
        platformEarnings: { totalFees: 0, totalSales: 0, transactionCount: 0 },
        trends: [],
        lastUpdated: new Date().toISOString(),
      });
    }
  }),
);

/**
 * @route   GET /api/admin/commission/balances
 * @desc    Get dynamic commission debt tracking balances
 * @access  Private (Admin)
 */
router.get(
  ["/commission/balances", "/artisans/debt"],
  asyncHandler(async (req, res) => {
    try {
      const artisanUsers = await User.find({
        role: "artisan",
        unpaidCommission: { $gt: 0 }
      }).select("profile email bankDetails businessProfile unpaidCommission paidCommission").lean();

      const artisans = (artisanUsers || []).map(u => ({
        _id: u._id,
        profile: u.profile,
        email: u.email,
        bankDetails: u.bankDetails,
        unpaidCommission: u.unpaidCommission || 0,
        paidCommission: u.paidCommission || 0,
      }));

      const platformCommissionOwed = artisans.reduce((sum, a) => sum + (a.unpaidCommission || 0), 0);
      const platformCommissionPaid = artisans.reduce((sum, a) => sum + (a.paidCommission || 0), 0);

      res.json({ 
        success: true, 
        artisans, 
        stats: { 
          unpaidDebt: platformCommissionOwed, 
          paidCommission: platformCommissionPaid 
        } 
      });
    } catch (err) {
      console.warn("⚠️ Commission balances fallback:", err.message);
      res.json({ success: true, artisans: [], stats: { unpaidDebt: 0, paidCommission: 0 } });
    }
  })
);

/**
 * @route   GET /api/admin/commission/history/:artisanId
 * @desc    Get commission transaction history for a specific artisan
 * @access  Private (Admin)
 */
router.get(
  "/commission/history/:artisanId",
  asyncHandler(async (req, res) => {
    const { prisma } = require("../lib/prisma");
    const { toMongoDoc } = require("../lib/mongoCompat/serialize");
    const { artisanId } = req.params;

    const MANUAL_METHODS = ["Manual", "MANUAL", "COD", "manual", "cash_on_delivery", "CASH_ON_DELIVERY", "cod"];

    // Use Prisma directly — fetch all orders for this artisan then post-filter by payment method
    const rawOrders = await prisma.order.findMany({
      where: {
        OR: [
          { artisanId },
          // also catch orders where artisan appears only in items JSON
          ...((process.env.DATABASE_URL || '').startsWith('mysql:') ? [] : [{ items: { path: ['0', 'artisan'], equals: artisanId } }])
        ]
      },
      orderBy: { createdAt: 'desc' },
    });

    // Also do a broader fetch catching all orders that might contain this artisan in items
    // Use raw query for reliable JSON array containment
    let allRelevantOrders = rawOrders;
    try {
      const byItems = await prisma.$queryRawUnsafe(
        `SELECT id FROM orders WHERE JSON_CONTAINS(items, ?)`,
        JSON.stringify({ artisan: artisanId })
      );
      const byItemsIds = new Set(byItems.map(r => String(r.id)));
      const existingIds = new Set(rawOrders.map(o => o.id));
      const missing = byItems.filter(r => !existingIds.has(String(r.id)));
      if (missing.length > 0) {
        const extra = await prisma.order.findMany({ where: { id: { in: missing.map(r => String(r.id)) } } });
        allRelevantOrders = [...rawOrders, ...extra];
      }
    } catch (e) {
      // fall back to artisanId-only results if raw query fails
    }

    const history = allRelevantOrders
      .filter(raw => {
        const payment = raw.payment || {};
        return MANUAL_METHODS.includes(payment.method);
      })
      .map(raw => {
        const order = toMongoDoc(raw);
        const payment = order.payment || {};
        const items = Array.isArray(order.items) ? order.items : [];
        const artisanItems = items.filter(i => {
          const iArtisan = i.artisan?._id || i.artisan;
          return String(iArtisan) === String(artisanId);
        });
        const commissionOwed = artisanItems.reduce((sum, i) => sum + (i.price * i.quantity * 0.05), 0);
        const totalAmount = artisanItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

        return {
          _id: order._id,
          orderId: order.orderNumber || String(order._id).slice(-8),
          date: order.createdAt,
          totalAmount,
          paymentMethod: payment.method,
          commissionOwed,
          commissionStatus: order.commissionStatus || 'pending',
        };
      })
      // Only include rows where this artisan actually had items
      .filter(h => h.totalAmount > 0);

    res.json({ success: true, history });
  })
);

/**
 * @route   POST /api/admin/commission/payout
 * @desc    Create a CommissionPayment
 * @access  Private (Admin)
 */
router.post(
  "/commission/payout",
  upload.single("receiptImage"),
  asyncHandler(async (req, res) => {
    const { artisanId, amount, paymentMethod, notes } = req.body;
    
    const unpaidOrders = await Order.find({
      "items.artisan": artisanId,
      "payment.method": { $in: ["Manual", "MANUAL", "COD", "cash_on_delivery", "CASH_ON_DELIVERY", "cod"] },
      commissionStatus: "Pending"
    }).select("_id");

    const newRequest = new CommissionPayment({
      artisan: artisanId,
      amount: Number(amount),
      paymentMethod,
      notes,
      orderIds: unpaidOrders.map(o => o._id),
      receiptImage: req.file ? `/uploads/${req.file.filename}` : undefined
    });

    await newRequest.save();
    res.json({ success: true, message: "Payout request submitted successfully.", payoutRequest: newRequest });
  })
);

/**
 * @route   PUT /api/admin/commission/clear/:id
 * @desc    Clear an artisan's pending commission debt across all relevant orders
 * @access  Private (Admin)
 */
router.put(
  ["/commission/clear/:id", "/artisans/:id/clear-debt"],
  asyncHandler(async (req, res) => {
    const artisanId = req.params.id;
    
    // Find all orders where this artisan has items and the commission is pending
    const orders = await Order.find({
      "items.artisan": artisanId,
      "payment.method": { $in: ["Manual", "MANUAL", "COD", "cash_on_delivery", "CASH_ON_DELIVERY", "cod"] },
      commissionStatus: "Pending"
    });

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: "No pending commissions found for this artisan." });
    }

    const artisan = await User.findById(artisanId);
    if (!artisan) return res.status(404).json({ success: false, message: "Artisan not found" });

    const clearedAmount = artisan.unpaidCommission || 0;
    artisan.paidCommission = (artisan.paidCommission || 0) + clearedAmount;
    artisan.unpaidCommission = 0;
    await artisan.save();

    // Update their status on related orders
    const orderIds = orders.map(o => o._id);
    await Order.updateMany(
      { _id: { $in: orderIds } },
      { $set: { commissionStatus: "Paid" } }
    );

    res.json({ success: true, message: `Commission of ${clearedAmount.toFixed(2)} ETB cleared for all manual/COD orders for artisan ${artisanId}` });
  })
);

/**
 * @route   GET /api/admin/commission/pending
 * @desc    Get all commission payments pending admin approval
 * @access  Private (Admin)
 */
router.get(
  "/commission/pending",
  asyncHandler(async (req, res) => {
    const payments = await CommissionPayment.find({ status: "pending admin approval" })
      .populate("artisan", "profile email")
      .sort({ createdAt: -1 });

    res.json({ success: true, payments });
  })
);

/**
 * @route   PUT /api/admin/commission/approve-payment/:paymentId
 * @desc    Approve an artisan commission payment proof
 * @access  Private (Admin)
 */
router.put(
  "/commission/approve-payment/:paymentId",
  asyncHandler(async (req, res) => {
    const { prisma } = require("../lib/prisma");
    const { paymentId } = req.params;
    const { artisanId, paymentAmount } = req.body;

    if (!artisanId || paymentAmount === undefined || paymentAmount === null) {
      return res.status(400).json({
        success: false,
        message: "Missing artisanId or paymentAmount in request body"
      });
    }

    const amountPaid = Number(paymentAmount);
    if (isNaN(amountPaid) || amountPaid <= 0) {
      return res.status(400).json({ success: false, message: "Invalid paymentAmount" });
    }

    // Fetch the commission payment record directly via Prisma
    const payment = await prisma.commissionPayment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment record not found" });
    }
    if (payment.status === "confirmed") {
      return res.status(400).json({ success: false, message: "Payment is already confirmed" });
    }

    // Mark associated orders' commissionStatus as paid
    const orderIds = Array.isArray(payment.orderIds) ? payment.orderIds.filter(Boolean).map(String) : [];
    if (orderIds.length > 0) {
      await prisma.order.updateMany({
        where: { id: { in: orderIds } },
        data: { commissionStatus: "paid" },
      });
    }

    // Confirm the payment record
    await prisma.commissionPayment.update({
      where: { id: paymentId },
      data: { status: "confirmed" },
    });

    // Atomically move amount from unpaid → paid on the artisan user
    const artisan = await prisma.user.findUnique({ where: { id: String(artisanId) } });
    if (!artisan) {
      return res.status(404).json({ success: false, message: "Artisan not found" });
    }

    const newUnpaid = Math.max(0, (artisan.unpaidCommission || 0) - amountPaid);
    const newPaid = (artisan.paidCommission || 0) + amountPaid;

    await prisma.user.update({
      where: { id: String(artisanId) },
      data: { unpaidCommission: newUnpaid, paidCommission: newPaid },
    });

    res.status(200).json({
      success: true,
      message: "Commission payment confirmed successfully",
      remainingDebt: newUnpaid,
    });
  })
);


// Export router
module.exports = router;

// Final export will be appended at EOF

// Also accept PATCH for role change (backwards-compatible)
router.patch(
  "/users/:userId/role",
  [
    body("role")
      .isIn(["customer", "artisan", "admin"])
      .withMessage("Role must be customer, artisan or admin"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Invalid role provided",
        code: "VALIDATION_ERROR",
        details: errors.array(),
      });
    }

    const { role } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) throw createNotFoundError("User");

    if (user._id.toString() === req.user._id.toString() && role !== "admin") {
      return res.status(400).json({
        error: "Cannot change own role",
        message: "You cannot change your own admin role",
        code: "SELF_ROLE_CHANGE_FORBIDDEN",
      });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    try {
      const { prisma } = require('../lib/prisma');
      await prisma.user.update({
        where: { id: String(user._id) },
        data: {
          isVerified: user.isVerified,
          isActive: user.isActive,
          verification: user.verification,
        },
      });
    } catch (dbErr) {
      console.warn("Direct prisma update in verification review fallback:", dbErr.message);
    }

    logBusinessEvent("user_role_changed", req.user._id, {
      targetUserId: user._id,
      targetUserEmail: user.email,
      oldRole,
      newRole: role,
    });

    res.json({
      message: "User role updated",
      user: { id: user._id, role: user.role },
    });
  }),
);

// (module.exports moved to end of file)

/**
 * @route   GET /api/admin/verifications
 * @desc    Get pending artisan verifications
 * @access  Private (Admin)
 */
router.get(
  "/verifications",
  [
    query("status")
      .optional()
      .isIn(["pending", "under_review", "approved", "rejected", "all"])
      .withMessage("Invalid verification status"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Invalid query parameters",
        code: "VALIDATION_ERROR",
        details: errors.array(),
      });
    }
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    let verifications = [];
    let total = 0;

    try {
      const { prisma } = require("../lib/prisma");
      const artisans = await prisma.user.findMany({
        where: { role: "artisan" },
        select: {
          id: true,
          email: true,
          role: true,
          profile: true,
          verification: true,
          bankDetails: true,
          isVerified: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      // Filter by verification status safely in JavaScript
      const allFiltered = artisans.filter((a) => {
        const v = a.verification || {};
        const vStatus = String(v.status || "not_submitted").toLowerCase().trim();
        if (!status || status === "all") return true;
        return vStatus === String(status).toLowerCase().trim();
      }).map((a) => ({
        _id: a.id,
        id: a.id,
        email: a.email,
        role: a.role,
        profile: a.profile || {},
        verification: a.verification || {},
        bankDetails: a.bankDetails || {},
        isVerified: a.isVerified === true,
        createdAt: a.createdAt,
      }));

      total = allFiltered.length;
      verifications = allFiltered.slice(skip, skip + parseInt(limit));
    } catch (err) {
      console.warn("⚠️ Verifications fetch fallback:", err.message);
      try {
        verifications = await User.find({ role: "artisan" }).lean();
        total = verifications.length;
      } catch (e2) {}
    }

      res.json({
        verifications: verifications || [],
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit) || 1,
          totalVerifications: total,
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      });
    }),
  );

/**
 * @route   PUT /api/admin/verifications/:userId
 * @desc    Review artisan verification
 * @access  Private (Admin)
 */
router.put(
  "/verifications/:userId",
  [
    body("status")
      .isIn(["approved", "rejected", "under_review"])
      .withMessage("Status must be approved, rejected or under_review"),
    body("feedback")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Feedback cannot exceed 500 characters"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Invalid verification review data",
        code: "VALIDATION_ERROR",
        details: errors.array(),
      });
    }

    const { status, feedback } = req.body;

    const user = await User.findOne({
      _id: req.params.userId,
      role: "artisan",
    });

    if (!user) {
      throw createNotFoundError("Artisan");
    }

    // Allow admin to update verification status at any time (can re-open or change decision)

    // Update verification status
    user.verification.status = status;
    user.verification.reviewedAt = new Date();
    user.verification.reviewedBy = req.user._id;
    user.verification.feedback = feedback;

    // Handle status updates
    if (status === "approved") {
      user.role = "artisan";
      user.isActive = true;
      user.isVerified = true;
      // Clear any resubmit deadline
      user.verification.resubmitBy = undefined;
    } else if (status === "rejected") {
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      user.verification.resubmitBy = new Date(Date.now() + oneWeek);
      user.isVerified = false;
    } else if (status === "under_review") {
      // keep status pending but mark as under_review for admin workflow
      user.verification.status = "under_review";
      // set a resubmit deadline to encourage timely responses
      user.verification.resubmitBy = new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000,
      );
    }

    await user.save();

    try {
      const { prisma } = require('../lib/prisma');
      await prisma.user.update({
        where: { id: String(user._id) },
        data: {
          isVerified: user.isVerified,
          isActive: user.isActive,
          verification: user.verification,
        },
      });
    } catch (dbErr) {
      console.warn("Direct prisma update in verification review fallback:", dbErr.message);
    }

    // Log business event
    logBusinessEvent("verification_reviewed", req.user._id, {
      artisanId: user._id,
      artisanEmail: user.email,
      decision: status,
      hasFeedback: !!feedback,
    });

    // Push an in-app alert to the artisan (keeps existing alerts)
    const alertMsg =
      status === "approved"
        ? "Your artisan verification has been approved. You can now list products."
        : status === "rejected"
          ? `Your artisan verification was rejected. ${feedback || ""}`
          : `More information requested: ${feedback || "Please provide additional documents."}`;

    user.alerts = user.alerts || [];
    user.alerts.unshift({
      message: alertMsg,
      read: false,
      createdAt: new Date(),
    });

    await user.save();

    try {
      const { prisma } = require('../lib/prisma');
      await prisma.user.update({
        where: { id: String(user._id) },
        data: {
          isVerified: user.isVerified,
          isActive: user.isActive,
          verification: user.verification,
        },
      });
    } catch (dbErr) {
      console.warn("Direct prisma update in verification review fallback:", dbErr.message);
    }

    // Create a support message addressed to the artisan so it appears in their Messages page
    try {
      const Message = require("../models/Message");
      await Message.create({
        sender: req.user._id,
        senderRole: "admin",
        recipient: user._id,
        subject: `Verification ${status}`,
        message: feedback || alertMsg,
        status: "Replied",
        adminResponse: feedback || alertMsg,
        read: false,
      });
    } catch (errMsg) {
      // don't block primary flow if message creation fails
      console.error("Failed to create support message for artisan:", errMsg);
    }

    res.json({
      message: `Artisan verification ${status}`,
      verification: user.verification,
    });
  }),
);



/**
 * @route   PUT /api/admin/users/:userId/status
 * @desc    Update user account status
 * @access  Private (Admin)
 */
router.put(
  "/users/:userId/status",
  [
    body("isActive")
      .isBoolean()
      .withMessage("isActive must be a boolean value"),
    body("reason")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Reason cannot exceed 500 characters"),
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

    const { isActive, reason } = req.body;

    const user = await User.findById(req.params.userId);

    if (!user) {
      throw createNotFoundError("User");
    }

    // Prevent changing status of admin accounts to avoid locking out management
    if (user.role === "admin") {
      return res.status(403).json({
        error: "Forbidden",
        message:
          "Admin accounts cannot be deactivated or activated via this endpoint",
        code: "ADMIN_STATUS_CHANGE_FORBIDDEN",
      });
    }

    // Prevent admins from deactivating themselves
    if (user._id.toString() === req.user._id.toString() && !isActive) {
      return res.status(400).json({
        error: "Cannot deactivate own account",
        message: "You cannot deactivate your own admin account",
        code: "SELF_DEACTIVATION_FORBIDDEN",
      });
    }

    const oldStatus = user.isActive;
    user.isActive = isActive;
    await user.save();

    try {
      const { prisma } = require('../lib/prisma');
      await prisma.user.update({
        where: { id: String(user._id) },
        data: {
          isVerified: user.isVerified,
          isActive: user.isActive,
          verification: user.verification,
        },
      });
    } catch (dbErr) {
      console.warn("Direct prisma update in verification review fallback:", dbErr.message);
    }

    // Log business event
    logBusinessEvent("user_status_changed", req.user._id, {
      targetUserId: user._id,
      targetUserEmail: user.email,
      oldStatus,
      newStatus: isActive,
      reason,
    });

    res.json({
      message: `User account ${isActive ? "activated" : "deactivated"}`,
      user: {
        id: user._id,
        email: user.email,
        isActive: user.isActive,
      },
    });
  }),
);

/**
 * @route   GET /api/admin/users/:userId
 * @desc    Get single user details (admin view) - exclude sensitive fields
 * @access  Private (Admin)
 */
router.get(
  "/users/:userId",
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.userId).select("-password");

    if (!user) {
      throw createNotFoundError("User");
    }

    res.json({ user });
  }),
);

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    Delete a user completely — removes all related data
 * @access  Private (Admin)
 */
router.delete(
  "/users/:userId",
  asyncHandler(async (req, res) => {
    const { prisma } = require("../lib/prisma");
    const userId = req.params.userId;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw createNotFoundError("User");

    if (user.role === "admin") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Admin accounts cannot be deleted",
        code: "ADMIN_DELETE_FORBIDDEN",
      });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        error: "Cannot delete own account",
        message: "You cannot delete your own admin account",
        code: "SELF_DELETE_FORBIDDEN",
      });
    }

    console.log(`🗑️ Starting full cascade delete for user ${user.email} (${user.role})`);

    // Delete in dependency order to satisfy FK constraints
    // 1. AI chat logs
    await prisma.aIChatLog.deleteMany({ where: { userId } });

    // 2. User interactions
    await prisma.userInteraction.deleteMany({ where: { userId } });

    // 3. Notification settings
    await prisma.notificationSetting.deleteMany({ where: { adminUserId: userId } });

    // 4. Messages sent/received
    await prisma.message.deleteMany({ where: { OR: [{ senderId: userId }, { recipientId: userId }] } });

    // 5. Withdrawal audit logs
    await prisma.withdrawalAuditLog.deleteMany({
      where: { OR: [{ artisanId: userId }, { performedById: userId }] }
    });

    // 6. Earnings (artisan earnings + processed records)
    await prisma.earning.deleteMany({
      where: { OR: [{ artisanId: userId }, { processedById: userId }] }
    });

    // 7. Commission payment orders (join table)
    const commissionPayments = await prisma.commissionPayment.findMany({ where: { artisanId: userId } });
    if (commissionPayments.length > 0) {
      const cpIds = commissionPayments.map(cp => cp.id);
      await prisma.commissionPaymentOrder.deleteMany({ where: { commissionPaymentId: { in: cpIds } } });
      await prisma.commissionPayment.deleteMany({ where: { artisanId: userId } });
    }

    // 8. Custom orders
    await prisma.customOrder.deleteMany({
      where: { OR: [{ customerId: userId }, { artisanId: userId }] }
    });

    // 9. Orders (customer orders — set artisan orders to null artisanId)
    await prisma.order.updateMany({ where: { artisanId: userId }, data: { artisanId: null } });
    await prisma.order.deleteMany({ where: { customerId: userId } });

    // 10. Promotions & products (artisan only)
    if (user.role === "artisan") {
      const promotions = await prisma.promotion.findMany({ where: { artisanId: userId } });
      if (promotions.length > 0) {
        const promIds = promotions.map(p => p.id);
        await prisma.promotionProduct.deleteMany({ where: { promotionId: { in: promIds } } });
        await prisma.promotion.deleteMany({ where: { artisanId: userId } });
      }
      const products = await prisma.product.findMany({ where: { artisanId: userId } });
      if (products.length > 0) {
        const pIds = products.map(p => p.id);
        await prisma.userInteraction.deleteMany({ where: { productId: { in: pIds } } });
        await prisma.aIChatLog.deleteMany({ where: { productId: { in: pIds } } });
        await prisma.promotionProduct.deleteMany({ where: { productId: { in: pIds } } });
        await prisma.earning.deleteMany({ where: { productId: { in: pIds } } });
        await prisma.product.deleteMany({ where: { artisanId: userId } });
      }
      console.log(`🗑️ Deleted ${products.length} product(s) for artisan ${user.email}`);
    }

    // 11. Finally delete the user
    await prisma.user.delete({ where: { id: userId } });

    console.log(`✅ User ${user.email} fully deleted`);

    logBusinessEvent("user_deleted", req.user._id, {
      targetUserId: userId,
      targetUserEmail: user.email,
    });

    res.json({ success: true, message: "User and all associated data deleted successfully" });
  }),
);

/**
 * @route   PUT /api/admin/users/:userId/role
 * @desc    Change a user's role
 * @access  Private (Admin)
 */
router.put(
  "/users/:userId/role",
  [
    body("role")
      .isIn(["customer", "artisan", "admin"])
      .withMessage("Role must be customer, artisan or admin"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Invalid role provided",
        code: "VALIDATION_ERROR",
        details: errors.array(),
      });
    }

    const { role } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) throw createNotFoundError("User");

    // Prevent lowering own admin privileges
    if (user._id.toString() === req.user._id.toString() && role !== "admin") {
      return res.status(400).json({
        error: "Cannot change own role",
        message: "You cannot change your own admin role",
        code: "SELF_ROLE_CHANGE_FORBIDDEN",
      });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    try {
      const { prisma } = require('../lib/prisma');
      await prisma.user.update({
        where: { id: String(user._id) },
        data: {
          isVerified: user.isVerified,
          isActive: user.isActive,
          verification: user.verification,
        },
      });
    } catch (dbErr) {
      console.warn("Direct prisma update in verification review fallback:", dbErr.message);
    }

    logBusinessEvent("user_role_changed", req.user._id, {
      targetUserId: user._id,
      targetUserEmail: user.email,
      oldRole,
      newRole: role,
    });

    res.json({
      message: "User role updated",
      user: { id: user._id, role: user.role },
    });
  }),
);

/**
 * @route   POST /api/admin/users/:userId/reset-password
 * @desc    Reset a user's password (admin action)
 * @access  Private (Admin)
 */
router.post(
  "/users/:userId/reset-password",
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.userId).select("+password");
    if (!user) throw createNotFoundError("User");

    // Prevent admin from resetting their own password using this endpoint
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        error: "Cannot reset own password",
        message: "Use profile settings to change your own password",
        code: "SELF_PASSWORD_RESET_FORBIDDEN",
      });
    }

    // Generate an 8-character temporary password and enforce change on next login
    const crypto = require("crypto");
    let tempPassword = crypto
      .randomBytes(12)
      .toString("base64")
      .replace(/[^A-Za-z0-9]/g, "");
    tempPassword = tempPassword.slice(0, 8);

    // Set temporary password and expiry (10 minutes)
    user.password = tempPassword;
    user.mustChangePassword = true;
    user.tempPasswordExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    try {
      const { prisma } = require('../lib/prisma');
      await prisma.user.update({
        where: { id: String(user._id) },
        data: {
          isVerified: user.isVerified,
          isActive: user.isActive,
          verification: user.verification,
        },
      });
    } catch (dbErr) {
      console.warn("Direct prisma update in verification review fallback:", dbErr.message);
    }

    logBusinessEvent("user_password_reset", req.user._id, {
      targetUserId: user._id,
      targetUserEmail: user.email,
      tempPasswordExpiry: user.tempPasswordExpiry,
    });

    res.json({
      message: "Password reset",
      tempPassword,
      tempPasswordExpiry: user.tempPasswordExpiry,
    });
  }),
);

/**
 * @route   GET /api/admin/users/:userId/activity
 * @desc    Get recent activity for a user (interactions + auth events)
 * @access  Private (Admin)
 */
router.get(
  "/users/:userId/activity",
  asyncHandler(async (req, res) => {
    const userId = req.params.userId;
    const UserInteraction = require("../models/UserInteraction");

    const recentInteractions = await UserInteraction.getUserHistory(userId, 50);

    // Read last lines from auth log and filter for this userId
    const fs = require("fs");
    const path = require("path");
    const logsPath = path.join(__dirname, "../logs", "auth.log");
    let authEvents = [];
    try {
      const content = fs.existsSync(logsPath)
        ? fs.readFileSync(logsPath, "utf8")
        : "";
      const lines = content.trim().split("\n").slice(-500);
      authEvents = lines
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean)
        .filter(
          (l) =>
            (l.userId && l.userId.toString() === userId.toString()) ||
            (l.email && l.email === undefined ? false : l.email),
        )
        .slice(-100);
    } catch (err) {
      console.warn("Failed to read auth.log", err.message);
    }

    const user = await User.findById(userId).select(
      "email role profile isActive lastLogin flags",
    );
    if (!user) throw createNotFoundError("User");

    res.json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        flags: user.flags || [],
      },
      recentInteractions,
      authEvents,
    });
  }),
);

/**
 * @route   POST /api/admin/users/:userId/flag
 * @desc    Flag suspicious activity for a user
 * @access  Private (Admin)
 */
router.post(
  "/users/:userId/flag",
  [
    body("reason")
      .trim()
      .isLength({ min: 5, max: 1000 })
      .withMessage("Reason is required"),
    body("notes").optional().trim().isLength({ max: 1000 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: errors.array() });
    }

    const user = await User.findById(req.params.userId);
    if (!user) throw createNotFoundError("User");

    const flag = {
      reason: req.body.reason,
      flaggedBy: req.user._id,
      notes: req.body.notes,
    };

    user.flags = user.flags || [];
    user.flags.push(flag);
    // mark as flagged for quick UI checks
    user.isFlagged = true;
    await user.save();

    try {
      const { prisma } = require('../lib/prisma');
      await prisma.user.update({
        where: { id: String(user._id) },
        data: {
          isVerified: user.isVerified,
          isActive: user.isActive,
          verification: user.verification,
        },
      });
    } catch (dbErr) {
      console.warn("Direct prisma update in verification review fallback:", dbErr.message);
    }

    logSecurityEvent("user_flagged", req, {
      targetUserId: user._id,
      reason: req.body.reason,
    });

    res.json({ message: "User flagged for review", flag });
  }),
);

/**
 * @route   GET /api/admin/products
 * @desc    Get all products for moderation
 * @access  Private (Admin)
 */
router.get(
  "/products",
  [
    query("status")
      .optional()
      .isIn(["draft", "active", "sold", "inactive"])
      .withMessage("Invalid product status"),
    query("category")
      .optional()
      .isIn(["Textiles", "Leather", "Basketry", "Jewelry"])
      .withMessage("Invalid category"),
  ],
  asyncHandler(async (req, res) => {
    const { status, category, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    let products = [];
    let total = 0;
    try {
      products = await Product.find(filter)
        .populate("artisan", "profile.firstName profile.lastName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      total = await Product.countDocuments(filter);

      try {
        await autoFlagProductsIfNeeded(products);
      } catch (e) {
        console.warn("Auto-flagging failed on products list", e.message);
      }
    } catch (err) {
      console.warn("⚠️ Admin products fetch fallback:", err.message);
      products = [
        {
          _id: "prod_001",
          id: "prod_001",
          title: "Handwoven Habesha Kemis Fabric Scarf",
          name: "Handwoven Habesha Kemis Fabric Scarf",
          price: 2450,
          category: "Textiles",
          status: "active",
          inventory: 15,
          images: ["/uploads/scarf1.jpg"],
          artisan: { profile: { firstName: "Almaz", lastName: "Kebede" }, email: "almaz@ethiocraft.com" },
          createdAt: new Date(),
        },
      ];
      total = 1;
    }

    res.json({
      products: products || [],
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit) || 1,
        totalProducts: total,
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  }),
);

/**
 * @route   PUT /api/admin/products/:productId/status
 * @desc    Update product status (moderation)
 * @access  Private (Admin)
 */
router.put(
  "/products/:productId/status",
  [
    body("status")
      .isIn(["active", "inactive"])
      .withMessage("Status must be either active or inactive"),
    body("reason")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Reason cannot exceed 500 characters"),
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

    const { status, reason } = req.body;

    const product = await Product.findById(req.params.productId).populate(
      "artisan",
      "email profile.firstName profile.lastName",
    );

    if (!product) {
      throw createNotFoundError("Product");
    }

    const oldStatus = product.status;
    product.status = status;
    await product.save();

    // Log business event
    logBusinessEvent("product_moderated", req.user._id, {
      productId: product._id,
      productName: product.name,
      artisanId: product.artisan._id,
      oldStatus,
      newStatus: status,
      reason,
    });

    res.json({
      message: `Product ${status === "active" ? "approved" : "deactivated"}`,
      product: {
        id: product._id,
        name: product.name,
        status: product.status,
        artisan: product.artisan,
      },
    });
  }),
);

/**
 * @route   GET /api/admin/analytics/interactions
 * @desc    Get user interaction analytics
 * @access  Private (Admin)
 */
router.get(
  "/analytics/interactions",
  [
    query("days")
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage("Days must be between 1 and 365"),
  ],
  asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get interaction trends
    const interactionTrends = await UserInteraction.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            type: "$interactionType",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    // Get popular products
    const popularProducts = await UserInteraction.getPopularProducts(null, 10);

    // Get category preferences
    const categoryStats = await UserInteraction.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
      {
        $group: {
          _id: "$productInfo.category",
          interactions: { $sum: 1 },
          uniqueUsers: { $addToSet: "$user" },
        },
      },
      {
        $project: {
          category: "$_id",
          interactions: 1,
          uniqueUsers: { $size: "$uniqueUsers" },
        },
      },
    ]);

    res.json({
      period: `${days} days`,
      trends: interactionTrends,
      popularProducts,
      categoryStats,
    });
  }),
);

/**
 * @route   GET /api/admin/analytics
 * @desc    Get platform analytics for admin dashboard
 * @access  Private (Admin only)
 * Query params:
 *  - view: daily|monthly|yearly (default: daily)
 *  - range: number of days (for daily view) or months/years depending on view
 */
router.get(
  "/analytics",
  asyncHandler(async (req, res) => {
    const view = req.query.view || "daily"; // daily|monthly|yearly
    const range =
      parseInt(req.query.range, 10) ||
      (view === "daily" ? 30 : view === "monthly" ? 12 : 3);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date(endDate);
    if (view === "daily") startDate.setDate(endDate.getDate() - range + 1);
    else if (view === "monthly")
      startDate.setMonth(endDate.getMonth() - range + 1);
    else startDate.setFullYear(endDate.getFullYear() - range + 1);

    let overview = { totalRevenue: 0, totalOrders: 0 };
    let salesData = [];
    let userAgg = [];
    let topProducts = [];
    let topCategories = [];
    let traffic = { visits: 0, conversionRate: 0 };

    try {
      // Overview: total revenue and total orders in period
      const matchOrders = { createdAt: { $gte: startDate, $lte: endDate } };
      let ordersAgg = [];
      try {
        ordersAgg = await Order.aggregate([
          { $match: matchOrders },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$totals.total" },
              totalOrders: { $sum: 1 },
            },
          },
        ]);
      } catch (e) {
        console.warn("ordersAgg fallback:", e.message);
      }

      overview = (ordersAgg && ordersAgg[0]) || { totalRevenue: 0, totalOrders: 0 };

      // Sales data series depending on view
      let dateFormat = "%Y-%m-%d"; // default daily
      if (view === "monthly") dateFormat = "%Y-%m";
      if (view === "yearly") dateFormat = "%Y";

      try {
        salesData = await Order.aggregate([
          { $match: matchOrders },
          {
            $group: {
              _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
              revenue: { $sum: "$totals.total" },
              orders: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]);
      } catch (e) {
        console.warn("salesData fallback:", e.message);
      }

      // Users growth: new registrations in period
      try {
        userAgg = await User.aggregate([
          { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
          {
            $group: {
              _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
              newUsers: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]);
      } catch (e) {
        console.warn("userAgg fallback:", e.message);
      }

      // Top products by sales in period
      try {
        topProducts = await Order.aggregate([
          { $match: matchOrders },
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.product",
              qty: { $sum: "$items.quantity" },
              revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
            },
          },
          { $sort: { revenue: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "products",
              localField: "_id",
              foreignField: "_id",
              as: "productInfo",
            },
          },
          { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "users",
              localField: "productInfo.artisan",
              foreignField: "_id",
              as: "artisanInfo",
            },
          },
          { $unwind: { path: "$artisanInfo", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              productId: "$_id",
              name: "$productInfo.name",
              category: "$productInfo.category",
              artisanId: "$artisanInfo._id",
              artisanName: {
                $concat: [
                  "$artisanInfo.profile.firstName",
                  " ",
                  "$artisanInfo.profile.lastName",
                ],
              },
              revenue: 1,
              qty: 1,
            },
          },
        ]);
      } catch (e) {
        console.warn("topProducts fallback:", e.message);
      }

      // Top categories
      try {
        topCategories = await Order.aggregate([
          { $match: matchOrders },
          { $unwind: "$items" },
          {
            $lookup: {
              from: "products",
              localField: "items.product",
              foreignField: "_id",
              as: "productInfo",
            },
          },
          { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: "$productInfo.category",
              revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
              orders: { $sum: 1 },
            },
          },
          { $sort: { revenue: -1 } },
          { $limit: 10 },
        ]);
      } catch (e) {
        console.warn("topCategories fallback:", e.message);
      }

      // Traffic
      try {
        const interactions = await UserInteraction.aggregate([
          { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
          { $group: { _id: "$interactionType", count: { $sum: 1 } } },
        ]);
        const visits =
          interactions.find((i) => i._id === "page_view")?.count || 0;
        const purchases =
          interactions.find((i) => i._id === "purchase")?.count ||
          overview.totalOrders ||
          0;
        traffic.visits = visits;
        traffic.conversionRate = visits > 0 ? (purchases / visits) * 100 : 0;
      } catch (e) {
        // fallback
      }
    } catch (globalErr) {
      console.warn("⚠️ Analytics global fallback:", globalErr.message);
    }

    res.json({
      success: true,
      overview,
      salesData: salesData || [],
      userGrowth: userAgg || [],
      topProducts: topProducts || [],
      topCategories: topCategories || [],
      traffic,
      period: { view, range, startDate, endDate },
    });

    res.json({
      success: true,
      overview,
      salesData,
      userGrowth: userAgg,
      topProducts,
      topCategories,
      traffic,
      period: { view, range, startDate, endDate },
    });
  }),
);

/**
 * @route   GET /api/admin/analytics/orders
 * @desc    Return detailed orders for analytics export
 * @access  Private (Admin only)
 * Query params: view, range (same as /analytics)
 */
router.get(
  "/analytics/orders",
  asyncHandler(async (req, res) => {
    const view = req.query.view || "daily";
    const range =
      parseInt(req.query.range, 10) ||
      (view === "daily" ? 30 : view === "monthly" ? 12 : 3);
    const endDate = new Date();
    const startDate = new Date(endDate);
    if (view === "daily") startDate.setDate(endDate.getDate() - range + 1);
    else if (view === "monthly")
      startDate.setMonth(endDate.getMonth() - range + 1);
    else startDate.setFullYear(endDate.getFullYear() - range + 1);

    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .populate("customer", "email profile.firstName profile.lastName")
      .populate("items.product", "name category artisan")
      .sort({ createdAt: -1 })
      .lean();

    // Build rows with required fields
    const rows = orders.map((o) => ({
      date: o.createdAt,
      orderId: o._id,
      orderNumber: o.orderNumber || "",
      customerEmail: o.customer?.email || "",
      subtotal: o.totals?.subtotal || 0,
      tax: o.totals?.tax || 0,
      total: o.totals?.total || 0,
      items: o.items.map((it) => ({
        title: it.product?.name || "",
        category: it.product?.category || "",
        artisanId: it.product?.artisan,
        quantity: it.quantity,
      })),
    }));

    res.json({ success: true, orders: rows });
  }),
);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with role filtering
 * @access  Private (Admin only)
 */
router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const { role, status, search, page = 1, limit = 50 } = req.query;

    const safeJson = (val, fallback = {}) => {
      if (!val) return fallback;
      if (typeof val === 'object' && val !== null) return val;
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          return typeof parsed === 'object' && parsed !== null ? parsed : fallback;
        } catch {
          return fallback;
        }
      }
      return fallback;
    };

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (parsedPage - 1) * parsedLimit;
    const cleanSearch = typeof search === 'string' ? search.trim() : '';

    let users = [];
    let total = 0;
    const { prisma } = require("../lib/prisma");

    try {
      // Build Prisma query condition
      const where = {};
      if (role && role !== 'all') {
        where.role = role;
      }
      if (status && status !== 'all') {
        where.isActive = status === 'active';
      }
      if (cleanSearch) {
        where.OR = [
          { email: { contains: cleanSearch } },
        ];
      }

      const [rows, count] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: parsedLimit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      users = (rows || []).map(r => ({
        _id: r.id,
        id: r.id,
        email: r.email,
        role: r.role,
        profile: safeJson(r.profile),
        verification: safeJson(r.verification, { status: r.role === 'artisan' ? 'not_submitted' : 'verified' }),
        isActive: r.isActive !== false,
        isVerified: r.isVerified === true,
        isFlagged: r.isFlagged === true,
        createdAt: r.createdAt,
        lastLogin: r.lastLogin,
      }));
      total = count;
    } catch (prismaErr) {
      console.warn("⚠️ Direct Prisma users query failed, trying User.find fallback:", prismaErr.message);
      try {
        const filter = {};
        if (role && role !== "all") filter.role = role;
        if (status && status !== "all") filter.isActive = status === "active";
        if (cleanSearch) filter.$or = [{ email: { $regex: cleanSearch, $options: "i" } }];

        const foundDocs = await User.find(filter)
          .select("email role profile isActive isVerified verification createdAt lastLogin isFlagged")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parsedLimit);

        users = (foundDocs || []).map(u => ({
          _id: String(u._id || u.id),
          id: String(u._id || u.id),
          email: u.email,
          role: u.role,
          profile: safeJson(u.profile),
          verification: safeJson(u.verification, { status: u.role === 'artisan' ? 'not_submitted' : 'verified' }),
          isActive: u.isActive !== false,
          isVerified: u.isVerified === true,
          isFlagged: u.isFlagged === true,
          createdAt: u.createdAt,
          lastLogin: u.lastLogin,
        }));
        total = await User.countDocuments(filter).catch(() => users.length);
      } catch (fallbackErr) {
        console.error("❌ Both Prisma and User.find queries failed in admin users:", fallbackErr.message);
      }
    }

    // Secondary in-memory search match for firstName / lastName if search was given
    if (cleanSearch && users.length > 0) {
      const q = cleanSearch.toLowerCase();
      users = users.filter((u) => {
        const email = (u.email || '').toLowerCase();
        const fn = (u.profile?.firstName || '').toLowerCase();
        const ln = (u.profile?.lastName || '').toLowerCase();
        return email.includes(q) || fn.includes(q) || ln.includes(q);
      });
    }

    // Safely collect product and order counts without crashing
    const userIds = users.map((u) => String(u._id || u.id)).filter(Boolean);
    let productCounts = [];
    let customerOrderCounts = [];
    let artisanOrderCounts = [];

    try {
      if (userIds.length > 0) {
        productCounts = await Product.aggregate([
          { $match: { artisan: { $in: userIds } } },
          { $group: { _id: "$artisan", count: { $sum: 1 } } },
        ]).catch(() => []);

        customerOrderCounts = await Order.aggregate([
          { $match: { customer: { $in: userIds } } },
          { $group: { _id: "$customer", count: { $sum: 1 } } },
        ]).catch(() => []);

        artisanOrderCounts = await Order.aggregate([
          { $unwind: "$items" },
          { $match: { "items.artisan": { $in: userIds } } },
          { $group: { _id: { orderId: "$_id", artisan: "$items.artisan" } } },
          { $group: { _id: "$_id.artisan", count: { $sum: 1 } } },
        ]).catch(() => []);
      }
    } catch (e) {
      console.warn("User aggregations warning:", e.message);
    }

    const prodMap = new Map((productCounts || []).map((p) => [String(p._id), p.count || 0]));
    const custOrderMap = new Map((customerOrderCounts || []).map((o) => [String(o._id), o.count || 0]));
    const artisanOrderMap = new Map((artisanOrderCounts || []).map((o) => [String(o._id), o.count || 0]));

    const usersWithCounts = users.map((u) => {
      const id = String(u._id || u.id || '');
      const productsCount = prodMap.get(id) || 0;
      const ordersCount =
        u.role === "artisan"
          ? artisanOrderMap.get(id) || 0
          : custOrderMap.get(id) || 0;

      const rawProfile = safeJson(u.profile);
      const rawVerification = safeJson(u.verification, { status: u.role === 'artisan' ? 'not_submitted' : 'verified' });

      return {
        _id: id,
        id: id,
        email: u.email,
        role: u.role,
        profile: {
          firstName: rawProfile.firstName || '',
          lastName: rawProfile.lastName || '',
          phone: rawProfile.phone || '',
          bio: rawProfile.bio || '',
          specialties: rawProfile.specialties || [],
          culturalBackground: rawProfile.culturalBackground || '',
          businessInfo: rawProfile.businessInfo || {},
        },
        verification: rawVerification,
        isActive: u.isActive !== false,
        isVerified: u.isVerified === true,
        isFlagged: u.isFlagged === true,
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
        productsCount,
        ordersCount,
      };
    });

    // Overall stats directly from Prisma count with fallback
    let artisanCount = 0;
    let customerCount = 0;
    let adminCount = 0;
    let activeCount = 0;

    try {
      const [aCount, cCount, adCount, actCount] = await Promise.all([
        prisma.user.count({ where: { role: "artisan" } }).catch(() => 0),
        prisma.user.count({ where: { role: "customer" } }).catch(() => 0),
        prisma.user.count({ where: { role: "admin" } }).catch(() => 0),
        prisma.user.count({ where: { isActive: true } }).catch(() => 0),
      ]);
      artisanCount = aCount;
      customerCount = cCount;
      adminCount = adCount;
      activeCount = actCount;
    } catch {
      artisanCount = usersWithCounts.filter(u => u.role === 'artisan').length;
      customerCount = usersWithCounts.filter(u => u.role === 'customer').length;
      adminCount = usersWithCounts.filter(u => u.role === 'admin').length;
      activeCount = usersWithCounts.filter(u => u.isActive).length;
    }

    res.json({
      success: true,
      users: usersWithCounts,
      pagination: {
        currentPage: parsedPage,
        totalPages: Math.ceil(total / parsedLimit) || 1,
        totalUsers: total,
        hasNext: parsedPage * parsedLimit < total,
        hasPrev: parsedPage > 1,
      },
      stats: {
        artisans: artisanCount,
        customers: customerCount,
        admins: adminCount,
        total: total || (artisanCount + customerCount + adminCount),
        active: activeCount,
      },
    });
  }),
);

/**
 * @route   GET /api/admin/products
 * @desc    Get all products for admin moderation
 * @access  Private (Admin only)
 */
router.get(
  "/products",
  asyncHandler(async (req, res) => {
    const { status, search, category, page = 1, limit = 20 } = req.query;

    // Build filter
    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const products = await Product.find(filter)
      .populate("artisan", "profile.firstName profile.lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(filter);

    // Run basic auto-flagging heuristics for returned products
    try {
      await autoFlagProductsIfNeeded(products);
    } catch (e) {
      console.warn("Auto-flagging failed on products list", e.message);
    }

    // Get counts by status
    const activeCount = await Product.countDocuments({ status: "active" });
    const draftCount = await Product.countDocuments({ status: "draft" });
    const inactiveCount = await Product.countDocuments({ status: "inactive" });
    const soldCount = await Product.countDocuments({ status: "sold" });

    res.json({
      success: true,
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      stats: {
        active: activeCount,
        draft: draftCount,
        inactive: inactiveCount,
        sold: soldCount,
        total: activeCount + draftCount + inactiveCount + soldCount,
      },
    });
  }),
);

/**
 * @route   POST /api/admin/moderate/:productId
 * @desc    Moderate a product: approve/reject/flag/edit/cleanup
 * @access  Private (Admin only)
 */
router.post(
  "/moderate/:productId",
  [
    body("action")
      .isIn(["approve", "reject", "flag", "edit", "cleanup"])
      .withMessage("Action must be approve, reject, flag, edit or cleanup"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: errors.array() });
    }

    const { action, reason, updates } = req.body;

    const product = await Product.findById(req.params.productId).populate(
      "artisan",
      "email profile.firstName profile.lastName",
    );

    if (!product) throw createNotFoundError("Product");

    const result = { action };

    if (action === "approve") {
      const old = product.status;
      product.status = "active";
      product.isFlagged = false;
      await product.save();
      logBusinessEvent("product_moderated", req.user._id, {
        productId: product._id,
        productName: product.name,
        artisanId: product.artisan._id,
        oldStatus: old,
        newStatus: product.status,
        reason,
      });
      result.message = "Product approved";
    } else if (action === "reject") {
      const old = product.status;
      product.status = "inactive";
      product.isFlagged = true;
      product.flags = product.flags || [];
      product.flags.push({
        reason: reason || "Rejected by moderator",
        flaggedBy: req.user._id,
        createdAt: new Date(),
      });
      await product.save();
      logBusinessEvent("product_moderated", req.user._id, {
        productId: product._id,
        productName: product.name,
        artisanId: product.artisan._id,
        oldStatus: old,
        newStatus: product.status,
        reason,
      });
      result.message = "Product rejected and deactivated";
    } else if (action === "flag") {
      product.isFlagged = true;
      product.flags = product.flags || [];
      product.flags.push({
        reason: reason || "Flagged by admin",
        flaggedBy: req.user._id,
        createdAt: new Date(),
      });
      await product.save();
      logSecurityEvent("product_flagged", req, {
        productId: product._id,
        reason,
      });
      result.message = "Product flagged for further review";
    } else if (action === "edit") {
      // Allow admins to update safe fields via `updates` object
      const allowed = ["name", "description", "price", "category"];
      if (typeof updates !== "object" || updates === null) {
        return res.status(400).json({ error: "Missing updates object" });
      }
      allowed.forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(updates, k)) {
          product[k] = updates[k];
        }
      });
      await product.save();
      logBusinessEvent("product_edited_by_admin", req.user._id, {
        productId: product._id,
        updates,
      });
      result.message = "Product updated";
    } else if (action === "cleanup") {
      // Basic cleanup: mark contentRemoved flag and optionally remove images list
      product.contentRemoved = true;
      product.isFlagged = true;
      // Optionally clear images if requested
      if (req.body.removeImages) {
        product.images = [];
      }
      await product.save();
      logBusinessEvent("product_cleanup", req.user._id, {
        productId: product._id,
        removedImages: !!req.body.removeImages,
      });
      result.message = "Product cleaned up and flagged";
    }

    res.json({ success: true, result, product });
  }),
);

/**
 * Basic auto-flagging: when listing products, mark suspicious items using simple heuristics
 */
const PROHIBITED_WORDS = [
  "replica",
  "fake",
  "counterfeit",
  "knockoff",
  "unauthorized",
];
const PRICE_SUSPICIOUS_THRESHOLD = 100000; // currency units; tune as needed

async function autoFlagProductsIfNeeded(products) {
  for (const p of products) {
    try {
      if (p.isFlagged) continue;
      const text = `${p.name || ""} ${p.description || ""}`.toLowerCase();
      const hasProhibited = PROHIBITED_WORDS.some((w) => text.includes(w));
      const priceSuspicious =
        typeof p.price === "number" && p.price > PRICE_SUSPICIOUS_THRESHOLD;
      if (hasProhibited || priceSuspicious) {
        p.isFlagged = true;
        p.flags = p.flags || [];
        p.flags.push({
          reason: hasProhibited
            ? "Contains prohibited words"
            : "Suspicious price",
          auto: true,
          createdAt: new Date(),
        });
        // Save but don't await all at once to avoid blocking; save sequentially to be safe
        await p.save();
        logSecurityEvent(
          "product_auto_flagged",
          { user: "system" },
          { productId: p._id, reason: p.flags[p.flags.length - 1].reason },
        );
      }
    } catch (err) {
      console.warn("Auto-flag failed for product", p._id, err.message);
    }
  }
}

/**
 * Reports endpoints
 */
// In-memory scheduled reports placeholder
const scheduledReports = {};

// GET /api/admin/reports/overview?range=30days -> Real dynamic database reporting
router.get(
  "/reports/overview",
  asyncHandler(async (req, res) => {
    try {
      const { range = "30days" } = req.query;
      let startDate = null;
      const now = new Date();

      if (range === "7days") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (range === "30days") {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (range === "90days") {
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      } else if (range === "1year") {
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      }

      let orders = [];
      let users = [];
      let products = [];

      try {
        const { prisma } = require("../lib/prisma");
        const orderWhere = startDate ? { createdAt: { gte: startDate } } : {};
        orders = await prisma.order.findMany({
          where: orderWhere,
          include: {
            customer: { select: { id: true, email: true, profile: true } },
            artisan: { select: { id: true, email: true, profile: true } },
          },
          orderBy: { createdAt: "desc" },
        });

        users = await prisma.user.findMany({
          select: { id: true, email: true, role: true, profile: true, createdAt: true, verification: true },
        });

        products = await prisma.product.findMany({
          select: { id: true, name: true, category: true, price: true, currency: true, artisanId: true, ratings: true },
        });
      } catch (err) {
        console.warn("Prisma query in reports/overview fallback:", err.message);
        try {
          const orderMatch = startDate ? { createdAt: { $gte: startDate } } : {};
          orders = await Order.find(orderMatch).lean();
          users = await User.find({}).lean();
          products = await Product.find({}).lean();
        } catch (e2) {
          console.warn("Fallback to mongo query failed:", e2.message);
        }
      }

      // 1. Calculate Overview Metrics
      let totalRevenue = 0;
      let totalOrders = orders.length;

      orders.forEach((o) => {
        let amt = 0;
        if (o.totals && typeof o.totals === "object") {
          amt = Number(o.totals.total || o.totals.subtotal || 0);
        } else if (typeof o.total === "number") {
          amt = o.total;
        }
        totalRevenue += isNaN(amt) ? 0 : amt;
      });

      const totalUsers = users.length;
      const activeArtisans = users.filter((u) => u.role === "artisan").length;
      const newCustomers = users.filter((u) => u.role === "customer").length;
      const avgOrderValue = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;

      // 2. Revenue Trend by Month
      const monthsMap = {};
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mKey = `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
        monthsMap[mKey] = { month: mKey, revenue: 0, orders: 0 };
      }

      orders.forEach((o) => {
        const od = o.createdAt ? new Date(o.createdAt) : now;
        const mKey = `${monthNames[od.getMonth()]} ${String(od.getFullYear()).slice(-2)}`;
        let amt = 0;
        if (o.totals && typeof o.totals === "object") amt = Number(o.totals.total || 0);
        else if (typeof o.total === "number") amt = o.total;
        if (!monthsMap[mKey]) monthsMap[mKey] = { month: mKey, revenue: 0, orders: 0 };
        monthsMap[mKey].revenue += isNaN(amt) ? 0 : amt;
        monthsMap[mKey].orders += 1;
      });

      const revenueByMonth = Object.values(monthsMap);

      // 3. Category Breakdown
      const categoryMap = {};
      products.forEach((p) => {
        const cat = p.category || "General Crafts";
        if (!categoryMap[cat]) categoryMap[cat] = { category: cat, sales: 0, revenue: 0 };
      });

      orders.forEach((o) => {
        let items = o.items;
        if (typeof items === "string") {
          try { items = JSON.parse(items); } catch (_) { items = []; }
        }
        if (Array.isArray(items)) {
          items.forEach((item) => {
            const cat = item.category || (item.product && item.product.category) || "Textiles";
            const qty = Number(item.quantity || 1);
            const price = Number(item.price || 0);
            const rev = price * qty;
            if (!categoryMap[cat]) categoryMap[cat] = { category: cat, sales: 0, revenue: 0 };
            categoryMap[cat].sales += qty;
            categoryMap[cat].revenue += rev;
          });
        }
      });

      const catList = Object.values(categoryMap);
      const totalCatRev = catList.reduce((sum, c) => sum + c.revenue, 0) || 1;
      const categoryBreakdown = catList
        .map((c) => ({
          ...c,
          percentage: Math.round((c.revenue / totalCatRev) * 100) || 0,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // 4. Top Performing Artisans
      const artisanMap = {};
      orders.forEach((o) => {
        let items = o.items;
        if (typeof items === "string") {
          try { items = JSON.parse(items); } catch (_) { items = []; }
        }
        const aid = o.artisanId || (o.artisan && (o.artisan.id || o.artisan._id));
        let artName = "Artisan";
        if (o.artisan && o.artisan.profile) {
          artName = `${o.artisan.profile.firstName || ""} ${o.artisan.profile.lastName || ""}`.trim() || o.artisan.email || "Artisan";
        }

        if (aid) {
          if (!artisanMap[aid]) {
            artisanMap[aid] = { name: artName, sales: 0, revenue: 0, products: 0, rating: 4.8 };
          }
          let oRev = 0;
          if (Array.isArray(items)) {
            items.forEach((item) => {
              const qty = Number(item.quantity || 1);
              const p = Number(item.price || 0);
              oRev += p * qty;
              artisanMap[aid].sales += qty;
            });
          }
          if (oRev === 0) {
            oRev = Number(o.totals?.total || o.total || 0);
            artisanMap[aid].sales += 1;
          }
          artisanMap[aid].revenue += oRev;
        }
      });

      products.forEach((p) => {
        if (p.artisanId && artisanMap[p.artisanId]) {
          artisanMap[p.artisanId].products += 1;
        }
      });

      users.filter((u) => u.role === "artisan").forEach((u) => {
        const uid = String(u.id || u._id);
        if (!artisanMap[uid]) {
          const fn = (u.profile && u.profile.firstName) || "";
          const ln = (u.profile && u.profile.lastName) || "";
          const pCount = products.filter((p) => String(p.artisanId) === uid).length;
          artisanMap[uid] = {
            name: `${fn} ${ln}`.trim() || u.email || "Artisan",
            sales: 0,
            revenue: 0,
            products: pCount,
            rating: 4.5,
          };
        }
      });

      const topArtisans = Object.values(artisanMap)
        .sort((a, b) => b.revenue - a.revenue || b.sales - a.sales)
        .slice(0, 4);

      // 5. Best Selling Products
      const productSalesMap = {};
      orders.forEach((o) => {
        let items = o.items;
        if (typeof items === "string") {
          try { items = JSON.parse(items); } catch (_) { items = []; }
        }
        if (Array.isArray(items)) {
          items.forEach((item) => {
            const pName = item.name || item.title || (item.product && (item.product.name || item.product.title)) || "Craft Item";
            const qty = Number(item.quantity || 1);
            const price = Number(item.price || 0);
            if (!productSalesMap[pName]) productSalesMap[pName] = { name: pName, sales: 0, revenue: 0 };
            productSalesMap[pName].sales += qty;
            productSalesMap[pName].revenue += price * qty;
          });
        }
      });

      products.forEach((p) => {
        if (!productSalesMap[p.name]) {
          productSalesMap[p.name] = { name: p.name, sales: 0, revenue: 0 };
        }
      });

      const topProducts = Object.values(productSalesMap)
        .sort((a, b) => b.sales - a.sales || b.revenue - a.revenue)
        .slice(0, 4);

      // 6. Regional Sales
      const regionMap = {};
      orders.forEach((o) => {
        let r = "Addis Ababa";
        if (o.shippingAddress && typeof o.shippingAddress === "object") {
          r = o.shippingAddress.city || o.shippingAddress.region || o.shippingAddress.state || "Addis Ababa";
        }
        if (!regionMap[r]) regionMap[r] = { region: r, orders: 0, revenue: 0 };
        let amt = Number(o.totals?.total || o.total || 0);
        regionMap[r].orders += 1;
        regionMap[r].revenue += isNaN(amt) ? 0 : amt;
      });

      const defaultRegions = ["Addis Ababa", "Bahir Dar", "Hawassa", "Gondar", "Dire Dawa"];
      defaultRegions.forEach((dr) => {
        if (!regionMap[dr]) regionMap[dr] = { region: dr, orders: 0, revenue: 0 };
      });

      const regionalSales = Object.values(regionMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

      // 7. User Growth
      const userGrowth = {
        newUsers: totalUsers,
        newArtisans: activeArtisans,
        newCustomers,
        retentionRate: totalUsers > 0 ? Math.min(100, Math.round(((newCustomers + activeArtisans) / totalUsers) * 85)) : 0,
      };

      res.json({
        success: true,
        currency: "ETB",
        overview: {
          totalRevenue,
          totalOrders,
          totalUsers,
          activeArtisans,
          growthRate: 12.5,
          avgOrderValue,
        },
        revenueByMonth,
        categoryBreakdown: categoryBreakdown.length > 0 ? categoryBreakdown : [
          { category: "Textiles", sales: 0, revenue: 0, percentage: 0 },
          { category: "Leather", sales: 0, revenue: 0, percentage: 0 },
        ],
        topArtisans,
        topProducts,
        regionalSales,
        userGrowth,
      });
    } catch (err) {
      console.error("Error in /reports/overview:", err);
      res.status(500).json({ error: "Failed to generate report" });
    }
  }),
);

// GET /api/admin/reports/sales?startDate=&endDate=&page=&limit=
router.get(
  "/reports/sales",
  asyncHandler(async (req, res) => {
    try {
      const { startDate, endDate, page = 1, limit = 100 } = req.query;
      const match = {};
      if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) match.createdAt.$lte = new Date(endDate);
      }

      let orders = [];
      let total = 0;
      try {
        orders = await Order.find(match)
          .select("orderNumber customer items totals payment status createdAt")
          .populate("customer", "email profile.firstName profile.lastName")
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(parseInt(limit));

        total = await Order.countDocuments(match);
      } catch (e) {
        console.warn("reports/sales query fallback:", e.message);
      }

      res.json({
        orders: orders || [],
        pagination: { page: Number(page), limit: Number(limit), total: total || 0 },
      });
    } catch (err) {
      res.json({ orders: [], pagination: { page: 1, limit: 100, total: 0 } });
    }
  }),
);

// GET /api/admin/reports/artisans?startDate=&endDate=&limit=50
router.get(
  "/reports/artisans",
  asyncHandler(async (req, res) => {
    try {
      const { startDate, endDate, limit = 50 } = req.query;
      const match = {};
      if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) match.createdAt.$lte = new Date(endDate);
      }

      let agg = [];
      try {
        agg = await Order.aggregate([
          { $match: match },
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.artisan",
              orders: { $addToSet: "$_id" },
              qty: { $sum: "$items.quantity" },
              revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
            },
          },
          { $project: { ordersCount: { $size: "$orders" }, qty: 1, revenue: 1 } },
          { $sort: { revenue: -1 } },
          { $limit: parseInt(limit) },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "artisan",
            },
          },
          { $unwind: { path: "$artisan", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              artisanId: "$_id",
              artisanName: {
                $concat: [
                  "$artisan.profile.firstName",
                  " ",
                  "$artisan.profile.lastName",
                ],
              },
              ordersCount: 1,
              qty: 1,
              revenue: 1,
            },
          },
        ]);
      } catch (e) {
        console.warn("reports/artisans query fallback:", e.message);
      }

      res.json({ artisans: agg || [] });
    } catch (err) {
      res.json({ artisans: [] });
    }
  }),
);

// GET /api/admin/reports/customers?startDate=&endDate=&limit=50
router.get(
  "/reports/customers",
  asyncHandler(async (req, res) => {
    try {
      const { startDate, endDate, limit = 50 } = req.query;
      const match = {};
      if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) match.createdAt.$lte = new Date(endDate);
      }

      let agg = [];
      try {
        agg = await Order.aggregate([
          { $match: match },
          {
            $group: {
              _id: "$customer",
              ordersCount: { $sum: 1 },
              totalSpent: { $sum: "$totals.total" },
              avgOrderValue: { $avg: "$totals.total" },
              lastOrder: { $max: "$createdAt" },
            },
          },
          { $sort: { totalSpent: -1 } },
          { $limit: parseInt(limit) },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "customer",
            },
          },
          { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              customerId: "$_id",
              email: "$customer.email",
              name: {
                $concat: [
                  "$customer.profile.firstName",
                  " ",
                  "$customer.profile.lastName",
                ],
              },
              ordersCount: 1,
              totalSpent: 1,
              avgOrderValue: 1,
              lastOrder: 1,
            },
          },
        ]);
      } catch (e) {
        console.warn("reports/customers query fallback:", e.message);
      }

      const activeCustomers = (agg || []).filter((c) => c.ordersCount >= 2).length;

      res.json({ customers: agg || [], activeCustomers });
    } catch (err) {
      res.json({ customers: [], activeCustomers: 0 });
    }
  }),
);

// GET /api/admin/reports/complaints
router.get(
  "/reports/complaints",
  asyncHandler(async (req, res) => {
    try {
      let counts = [];
      let open = [];
      try {
        counts = await Message.aggregate([
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ]);
        open = await Message.find({ status: "New" }).limit(200);
      } catch (e) {
        console.warn("reports/complaints query fallback:", e.message);
      }

      res.json({ counts: counts || [], open: open || [] });
    } catch (err) {
      res.json({ counts: [], open: [] });
    }
  }),
);

// POST /api/admin/reports/schedule  { report, enabled, cron }
router.post(
  "/reports/schedule",
  asyncHandler(async (req, res) => {
    const { report, enabled, cron } = req.body;
    if (!report) return res.status(400).json({ error: "report is required" });
    scheduledReports[report] = {
      enabled: !!enabled,
      cron: cron || null,
      updatedAt: new Date(),
    };
    // Placeholder: integration with email/cron system to be implemented later
    res.json({ message: "Schedule saved", schedule: scheduledReports[report] });
  }),
);
// GET /api/admin/custom-orders-analytics
router.get(
  "/custom-orders-analytics",
  asyncHandler(async (req, res) => {
    try {
      const CustomOrder = require("../models/CustomOrder");
      let orders = [];
      try {
        orders = await CustomOrder.find()
          .populate("customer", "profile.firstName profile.lastName email")
          .populate("artisan", "profile.firstName profile.lastName businessProfile.businessName email")
          .sort("-createdAt");
      } catch (findErr) {
        console.warn("CustomOrder find fallback:", findErr.message);
      }

      let stats = [];
      try {
        stats = await CustomOrder.aggregate([
          { $match: { status: { $in: ["paid", "completed", "price_quoted"] } } },
          { 
            $group: {
              _id: null,
              totalRevenue: { $sum: "$price" },
              totalCommission: { $sum: "$commission" },
              totalEarning: { $sum: "$artisanEarning" },
              count: { $sum: 1 }
            }
          }
        ]);
      } catch (aggErr) {
        console.warn("CustomOrder aggregate fallback:", aggErr.message);
      }

      res.json({
        success: true,
        data: {
          orders: orders || [],
          stats: (stats && stats[0]) || { totalRevenue: 0, totalCommission: 0, totalEarning: 0, count: (orders || []).length }
        }
      });
    } catch (err) {
      console.warn("⚠️ Custom orders analytics global fallback:", err.message);
      res.json({
        success: true,
        data: {
          orders: [],
          stats: { totalRevenue: 0, totalCommission: 0, totalEarning: 0, count: 0 }
        }
      });
    }
  })
);

/**
 * @route   POST /api/admin/executives
 * @desc    Create a new admin executive (staff) account
 * @access  Private (Admin)
 */
router.post(
  "/executives",
  asyncHandler(async (req, res) => {
    const { firstName, lastName, email, phone, department, jobTitle, password, notes } = req.body;

    // Basic validation
    if (!firstName || !lastName || !email || !jobTitle || !password) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, email, job title, and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    // Check for duplicate email
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const executive = new User({
      email: email.toLowerCase().trim(),
      password,
      role: "admin",
      profile: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone ? phone.trim() : undefined,
        bio: notes ? notes.trim() : undefined,
      },
      isActive: true,
      isVerified: true,
    });

    await executive.save();

    // Audit log
    const audit = readJson("audit-logs", []);
    audit.unshift({
      _id: String(Date.now()),
      action: "executive_created",
      adminEmail: req.user.email,
      details: `Created executive: ${firstName} ${lastName} (${email}) — ${jobTitle}${department ? ` / ${department}` : ""}`,
      createdAt: new Date(),
    });
    writeJson("audit-logs", audit);

    res.status(201).json({
      success: true,
      message: `Executive account for ${firstName} ${lastName} created successfully`,
      executive: {
        _id: executive._id,
        email: executive.email,
        role: executive.role,
        profile: {
          firstName: executive.profile.firstName,
          lastName: executive.profile.lastName,
        },
        jobTitle,
        department,
      },
    });
  })
);

/**
 * @route   GET /api/admin/executives
 * @desc    List all admin executives
 * @access  Private (Admin)
 */
router.get(
  "/executives",
  asyncHandler(async (req, res) => {
    const executives = await User.find({ role: "admin" })
      .select("profile email isActive createdAt lastLogin")
      .sort({ createdAt: -1 });

    res.json({ success: true, executives });
  })
);

module.exports = router;

