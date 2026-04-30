const mongoose = require("mongoose");

const alertLogSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    level: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "info",
    },
    details: { type: mongoose.Schema.Types.Mixed },
    to: { type: String },
    subject: { type: String },
    message: { type: String },
    success: { type: Boolean, default: false },
    error: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AlertLog", alertLogSchema);
