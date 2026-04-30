const mongoose = require("mongoose");

const notificationSettingSchema = new mongoose.Schema(
  {
    adminUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    enabledAlerts: {
      security: { type: Boolean, default: true },
      content: { type: Boolean, default: true },
      dailySummary: { type: Boolean, default: true },
    },
    lastNotifiedAt: Date,
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "NotificationSetting",
  notificationSettingSchema,
);
