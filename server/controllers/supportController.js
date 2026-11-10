const Message = require("../models/Message");

// Create a support message (authenticated users)
exports.createMessage = async (req, res) => {
  try {
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res
        .status(400)
        .json({ error: "Subject and message are required" });
    }

    const sender = req.user._id;
    const senderRole = req.user.role === "artisan" ? "artisan" : "customer";

    const newMessage = await Message.create({
      sender,
      senderRole,
      subject,
      message,
    });

    res
      .status(201)
      .json({ message: "Support message created", data: newMessage });
  } catch (error) {
    console.error("Error creating support message:", error);
    res.status(500).json({ error: "Failed to create message" });
  }
};

// Return all messages related to a specific artisan (sender or recipient)
exports.getMessagesByArtisan = async (req, res) => {
  try {
    const { artisanId } = req.params;

    // only allow the artisan themselves or an admin
    if (req.user.role !== "admin" && req.user._id.toString() !== artisanId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const messages = await Message.find({
      $or: [{ sender: artisanId }, { recipient: artisanId }],
    })
      .populate("sender", "email profile")
      .populate("recipient", "email profile")
      .sort({ createdAt: -1 });

    res.json({ messages });
  } catch (error) {
    console.error("Error fetching artisan messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

// Get messages: admin gets all, users get their own
exports.getMessages = async (req, res) => {
  try {
    let messages;

    if (req.user.role === "admin") {
      messages = await Message.find()
        .populate("sender", "email profile")
        .populate("recipient", "email profile")
        .sort({ createdAt: -1 });
    } else {
      messages = await Message.find({
        $or: [{ sender: req.user._id }, { recipient: req.user._id }],
      })
        .populate("sender", "email profile")
        .populate("recipient", "email profile")
        .sort({ createdAt: -1 });
    }

    // ensure we send plain objects so frontend always sees fields like adminResponse
    const safeMessages = messages.map((m) => (m.toObject ? m.toObject() : m));

    res.json({ messages: safeMessages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

// Get unread count for admin (or user own unread replies or admin-sent messages)
exports.getUnreadCount = async (req, res) => {
  try {
    let count = 0;
    if (req.user.role === "admin") {
      count = await Message.countDocuments({ read: false });
    } else {
      // For regular users (customers / artisans): count all unread messages addressed to or sent by them
      count = await Message.countDocuments({
        read: false,
        $or: [{ sender: req.user._id }, { recipient: req.user._id }],
      });
    }

    res.json({ unreadCount: count });
  } catch (error) {
    console.error("Error getting unread count:", error);
    res.status(500).json({ error: "Failed to get unread count" });
  }
};

// Get single message (owner or admin)
exports.getMessageById = async (req, res) => {
  try {
    const { id } = req.params;
    const msg = await Message.findById(id).populate(
      "sender",
      "email profile role",
    );

    if (!msg) return res.status(404).json({ error: "Message not found" });

    if (
      req.user.role !== "admin" &&
      msg.sender.toString() !== req.user._id.toString() &&
      (!msg.recipient || msg.recipient.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    // If admin views the message, mark it read
    if (req.user.role === "admin" && !msg.read) {
      msg.read = true;
      await msg.save();
    }

    // If recipient views a replied message, mark it read
    if (
      req.user._id &&
      msg.status === "Replied" &&
      msg.recipient &&
      msg.recipient.toString() === req.user._id.toString() &&
      !msg.read
    ) {
      msg.read = true;
      await msg.save();
    }

    res.json({ message: msg });
  } catch (error) {
    console.error("Error fetching message:", error);
    res.status(500).json({ error: "Failed to fetch message" });
  }
};

// Mark a message as read (admin, sender or recipient)
exports.markRead = async (req, res) => {
  try {
    const { id } = req.params;
    const msg = await Message.findById(id);

    if (!msg) return res.status(404).json({ error: "Message not found" });

    // only admin, sender or recipient can mark as read
    if (
      req.user.role !== "admin" &&
      msg.sender.toString() !== req.user._id.toString() &&
      (!msg.recipient || msg.recipient.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!msg.read) {
      msg.read = true;
      await msg.save();
    }

    // compute updated unread count for the requester
    let unreadCount = 0;
    if (req.user.role === "admin") {
      unreadCount = await Message.countDocuments({ read: false });
    } else {
      unreadCount = await Message.countDocuments({
        read: false,
        $or: [{ sender: req.user._id }, { recipient: req.user._id }],
      });
    }

    res.json({ message: "Marked read", data: msg, unreadCount });
  } catch (error) {
    console.error("Error marking message read:", error);
    res.status(500).json({ error: "Failed to mark message read" });
  }
};

// Admin reply to a message
exports.replyToMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminResponse } = req.body;

    if (!adminResponse || !adminResponse.trim()) {
      return res.status(400).json({ error: "Response cannot be empty" });
    }

    const msg = await Message.findById(id);
    if (!msg) return res.status(404).json({ error: "Message not found" });

    msg.adminResponse = adminResponse;
    msg.status = "Replied";
    // mark as unread for the sender so they receive notification
    msg.read = false;
    await msg.save();

    res.json({ message: "Reply saved", data: msg });
  } catch (error) {
    console.error("Error replying to message:", error);
    res.status(500).json({ error: "Failed to save reply" });
  }
};

// Admin can send a one-off message to specific user
exports.adminSendMessage = async (req, res) => {
  try {
    const { recipientId, subject, message: body } = req.body;
    if (!recipientId || !subject || !body) {
      return res
        .status(400)
        .json({ error: "recipientId, subject and message are required" });
    }

    const User = require("../models/User");
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: "Recipient not found" });
    }

    const newMsg = await Message.create({
      sender: req.user._id,
      senderRole: "admin",
      recipient: recipientId,
      subject,
      message: body,
      status: "New",
      read: false,
    });

    res.status(201).json({ message: "Admin message created", data: newMsg });
  } catch (error) {
    console.error("Error creating admin message:", error);
    res.status(500).json({ error: "Failed to create admin message" });
  }
};
