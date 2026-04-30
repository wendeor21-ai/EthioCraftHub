/**
 * EthioCraft Global - Main Server Entry Point
 * AI-enhanced e-commerce platform for Ethiopian artisans
 *
 * This server handles:
 * - Express.js application setup with security middleware
 * - MongoDB connection with Mongoose ODM
 * - JWT-based authentication and authorization
 * - RESTful API routes for all platform features
 * - File upload handling for product images
 * - Error handling and logging
 */

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

// Import route handlers
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user"); // shipping-addresses and profile routes (authenticated)
const usersPublicRoutes = require("./routes/users"); // public artisan listings and verification submission
const productRoutes = require("./routes/products");
const promotionRoutes = require("./routes/promotions");
const orderRoutes = require("./routes/orders");
const adminRoutes = require("./routes/admin");
const aiRoutes = require("./routes/ai");
const zemaAIRoutes = require("./routes/zemaAI.secure");
// Public zema-ai routes (includes /test endpoint)
const zemaAIPublicRoutes = require("./routes/zemaAI");
const searchRoutes = require("./routes/search");
const cartRoutes = require("./routes/cart");
const uploadRoutes = require("./routes/uploads");
const paymentRoutes = require("./routes/payment");
const recommendationRoutes = require("./routes/recommendations");
const supportRoutes = require("./routes/support");
const notificationsRoutes = require("./routes/notifications");
const analyticsRoutes = require("./routes/analytics");
const earningsRoutes = require("./routes/earnings");
const reviewsRoutes = require("./routes/reviews");
const artisanSettingsRoutes = require("./routes/artisanSettings");
const shippingRoutes = require("./routes/shipping");
const artisanRoutes = require("./routes/artisan");
const siteConfigRoutes = require("./routes/siteConfig");
const wishlistRoutes = require("./routes/wishlist");
const customOrderRoutes = require("./routes/customOrder");
const { loadModel } = require("./utils/imageVector");


// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { logger } = require('./middleware/logger');

// Initialize Passport (lazy-loaded strategy via require in routes)
const passport = require('./config/passport');
const session = require('express-session');

// Initialize Express application
const app = express();
// FIX 2: Trust proxy for proper IP handling
app.set("trust proxy", 1);

// CORS: Allow frontend at http://localhost:3000 (placed before routes)
const simpleCors = cors({ origin: "http://localhost:3000", credentials: true });
app.use(simpleCors);
// Ensure preflight OPTIONS are handled
app.options("*", simpleCors);

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "http://localhost:5000", "http://localhost:5001"],
        connectSrc: ["'self'", "http://localhost:5000", "http://localhost:5001", "ws://localhost:5000", "ws://localhost:5001"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      },
    },
  }),
);

// Rate limiting middleware (apply only in production to avoid dev friction)
if (process.env.NODE_ENV === "production") {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: {
      error: "Too many requests from this IP, please try again later.",
      code: "RATE_LIMIT_EXCEEDED",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/", limiter);
} else {
  console.log("⚠️ Rate limiter skipped in development (NODE_ENV!=production)");
}

// Note: simpleCors has already been applied at the top to ensure preflight

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
app.use(logger);

// Express session (required only for OAuth state management during redirect dance)
// NOT used for persistent user sessions — we use JWTs for that
app.use(session({
  secret: process.env.SESSION_SECRET || 'ethiocraft_oauth_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000, // 10 minutes — only needed for OAuth flow
  },
}));

// Initialize Passport (must be after session middleware)
app.use(passport.initialize());
app.use(passport.session());

// Debug middleware for development
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`🌐 ${req.method} ${req.path}`, {
      body: req.body,
      headers: {
        "content-type": req.headers["content-type"],
        authorization: req.headers.authorization ? "Bearer ***" : "none",
        origin: req.headers.origin,
      },
    });
    next();
  });
}

// Static file serving for uploaded images and product images
const path = require("path");
const fs = require("fs");

// Add CORP headers middleware for images
// Ensure uploads directory exists and serve it statically from an absolute path
const uploadsDir = path.join(__dirname, "uploads");
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`Created uploads directory at ${uploadsDir}`);
  }
} catch (err) {
  console.error("Failed to create uploads directory:", err);
}

app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  },
  express.static(uploadsDir),
);

app.use(
  "/images",
  (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  },
  express.static(path.join(__dirname, "public/images")),
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    message: "EthioCraft Global API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: "1.0.0",
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
// Also mount the public/users routes (artisans listing, verification submit)
app.use("/api/users", usersPublicRoutes);
app.use("/api/products", productRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
// Uploads API (handles multipart form uploads)
app.use("/api/uploads", uploadRoutes);
app.use("/api/ai", aiRoutes);
// Mount public zema-ai routes first (exposes /api/zema-ai/test)
app.use("/api/zema-ai", zemaAIPublicRoutes);
// Then mount the secure routes for authenticated/admin endpoints
app.use("/api/zema-ai", zemaAIRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/earnings", earningsRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/artisan/settings", artisanSettingsRoutes);
app.use("/api", shippingRoutes);
app.use("/api/artisan", artisanRoutes);
app.use("/api", siteConfigRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/custom-orders", customOrderRoutes);


// Welcome endpoint with Ethiopian cultural greeting
app.get("/", (req, res) => {
  res.json({
    message: "ሰላም! Welcome to EthioCraft Global API",
    description:
      "AI-enhanced e-commerce platform connecting Ethiopian artisans with global markets",
    features: [
      "Authentic Ethiopian handicrafts (Textiles, Leather, Basketry, Jewelry)",
      "AI-powered product recommendations",
      "Cultural storytelling and heritage preservation",
      "Secure payment processing",
      "Artisan verification and support",
    ],
    documentation: "/api/docs",
    health: "/health",
  });
});

// 404 handler for undefined routes
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    message: `The requested endpoint ${req.originalUrl} does not exist`,
    availableEndpoints: [
      "/api/auth",
      "/api/users",
      "/api/products",
      "/api/orders",
      "/api/admin",
      "/api/ai",
      "/api/zema-ai",
    ],
  });
});

// Global error handling middleware
app.use(errorHandler);

// MongoDB connection with retry logic
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message); // Retry connection after 5 seconds

    console.log("🔄 Retrying MongoDB connection in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
};

// Graceful shutdown handling
process.on("SIGTERM", async () => {
  console.log("🛑 SIGTERM received. Shutting down gracefully...");
  await mongoose.connection.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("🛑 SIGINT received. Shutting down gracefully...");
  await mongoose.connection.close();
  process.exit(0);
});

// Start server
// Default to 5001 to match development frontend expectations
// Create HTTP server
const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" 
      ? process.env.FRONTEND_URL 
      : ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
  },
});

// Make io accessible globally via app
app.set("io", io);

console.log("📡 Socket.io system initialized and exposed to app");

// Socket.io connection logic
io.on("connection", (socket) => {
  console.log(`🔌 New client socket connected: ${socket.id} from ${socket.handshake.address}`);

  socket.on("join", (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`👤 User ${userId} joined room: user_${userId} (Total rooms for this socket: ${socket.rooms.size})`);
    } else {
      console.warn(`⚠️ Socket ${socket.id} tried to join room with empty userId`);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`🔌 Client disconnected: ${socket.id}. Reason: ${reason}`);
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB(); 

    // Pre-load the MobileNet model for faster visual search response times
    // This is especially important for the first search request
    console.log("🧠 Initializing AI Visual Search engine...");
    loadModel().catch(err => console.error("❌ Failed to pre-load AI model:", err));

    server.listen(PORT, () => {
      console.log(`🚀 EthioCraft Global Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`📱 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`📡 Socket.io: Enabled`);
      console.log(`🎨 Serving Ethiopian artisan crafts with cultural pride!`);
    }); 

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        console.error("❌ Server error:", error);
      }
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Start the application
startServer();

// Export app for testing
module.exports = app;

// Global process-level error handlers to improve stability
process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason); // Optional: you can decide to exit or attempt graceful shutdown
});

process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception thrown:", err); // Log then exit to allow a process manager to restart the app
  process.exit(1);
});
