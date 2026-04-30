/**
 * Support Message Model
 * Fields: sender (User ID), senderRole, subject, message, status, adminResponse
 */
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    senderRole: {
      type: String,
      enum: ["customer", "artisan", "admin"],
      required: true,
    },
    subject: {
      type: String,
      trim: true,
      required: true,
    },
    message: {
      type: String,
      trim: true,
      required: true,
    },
    status: {
      type: String,
      enum: ["New", "Replied"],
      default: "New",
    },
    adminResponse: {
      type: String,
      trim: true,
      default: "",
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Message", messageSchema);
