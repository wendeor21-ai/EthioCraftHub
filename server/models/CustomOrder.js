/**
 * CustomOrder Model for EthioCraft Global
 * Handles tailored clothing requests with specific measurements
 */

const mongoose = require("mongoose");

const customOrderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    artisan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      // Optional: a custom order might be based on an existing product template
    },
    gender: {
      type: String,
      enum: ["Male", "Female"],
      required: true,
    },
    itemType: {
      type: String,
      enum: ["Dress", "Shirt", "Trousers"],
      required: true,
    },
    // Measurement fields
    measurements: {
      length: Number,     // ቁመት
      shoulder: Number,   // ትክሻ
      bust: Number,       // ጡት (Female)
      chest: Number,      // ደረት (Male)
      waist: Number,      // ወገብ
      stomach: Number,    // ቦርጭ (Male)
      hip: Number,        // ዳሌ (Trousers)
      thigh: Number,      // ጭን (Trousers)
      ankle: Number,      // ተረከዝ (Trousers)
      armLength: Number,  // እጅ እርዝመት (Dress/Shirt)
      shirtLength: Number, // (Male Shirt)
    },
    // Reference photos
    photos: {
      front: String,
      back: String,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "price_quoted", "rejected", "paid", "completed"],
      default: "pending",
    },
    price: {
      type: Number,
      default: 0,
    },
    commission: {
      type: Number,
      default: 0,
    },
    artisanEarning: { // 90% goes to artisan
      type: Number,
      default: 0,
    },
    paymentMethod: {
      type: String,
      default: "None"
    },
    transactionId: {
      type: String
    },
    description: {
      type: String,
      trim: true,
    },
    adminNotes: String,
    rejectionReason: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
customOrderSchema.index({ customer: 1 });
customOrderSchema.index({ artisan: 1 });
customOrderSchema.index({ status: 1 });

const CustomOrder = mongoose.model("CustomOrder", customOrderSchema);

module.exports = CustomOrder;
