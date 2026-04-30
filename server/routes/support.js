const express = require("express");
const router = express.Router();
const supportCtrl = require("../controllers/supportController");
const { authenticate, authorize } = require("../middleware/auth");

// Create message (authenticated users)
router.post("/messages", authenticate, supportCtrl.createMessage);

// Admin can send a direct message to a specific user
router.post(
  "/messages/admin-send",
  authenticate,
  authorize("admin"),
  supportCtrl.adminSendMessage,
);

// Get messages (admin => all, user => own)
router.get("/messages", authenticate, supportCtrl.getMessages);

// Artisan-specific (or self) message list – useful for artisan dashboard
router.get(
  "/messages/artisan/:artisanId",
  authenticate,
  supportCtrl.getMessagesByArtisan,
);

// Unread count
router.get("/messages/unread-count", authenticate, supportCtrl.getUnreadCount);

// Get single message
router.get("/messages/:id", authenticate, supportCtrl.getMessageById);

// Mark message as read (admin or owner)
router.put("/messages/:id/mark-read", authenticate, supportCtrl.markRead);

// Admin reply
router.put(
  "/messages/:id/reply",
  authenticate,
  authorize("admin"),
  supportCtrl.replyToMessage,
);

module.exports = router;
