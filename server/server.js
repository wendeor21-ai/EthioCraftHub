/**
 * EthioCraft Global - Main Server Entry Point
 * AI-enhanced e-commerce platform for Ethiopian artisans
 *
 * This server handles:
 * - Express.js application setup with security middleware
 * - Database connection with Prisma ORM
 * - JWT-based authentication and authorization
 * - RESTful API routes for all platform features
 * - File upload handling for product images
 * - Error handling and logging
 */

const express = require("express");
const compression = require("compression");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");

// Multi-path dotenv loader for all deployment environments
const envSearchPaths = [
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), '.env.production'),
  path.join(__dirname, '.env'),
  path.join(__dirname, '.env.production'),
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', '.env.production'),
];
for (const envF of envSearchPaths) {
  if (fs.existsSync(envF)) {
    try {
      require("dotenv").config({ path: envF });
    } catch (e) {}
  }
}

// ── SEC-01: Startup assertions with resilient defaults ───────────────────────
const DEFAULT_JWT = 'a7f3c92e1d084b56f9a2e7c3d1b5f8e4a9c2d7f0b3e6a1c4d8f2b5e9a3c7d1f4b8e2a6c0d5f9b3e7a1c4';
const DEFAULT_DB = 'mysql://ethiocaq_userdb:Ethiocraft%40%261%2F03%2F2019@127.0.0.1:3306/ethiocaq_ethiocraft?connect_timeout=3';

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = DEFAULT_JWT;
}
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = DEFAULT_DB;
}

const isProductionEnv = process.env.NODE_ENV === 'production' || 
                        process.env.PASSENGER_APP_ENV === 'production' ||
                        process.cwd().includes('EthioCraftHub') ||
                        process.cwd().includes('ethiocaq');

if (isProductionEnv || !process.env.CLIENT_URL || process.env.CLIENT_URL.includes('localhost')) {
  process.env.CLIENT_URL = 'https://ethiocrafthub.com';
  process.env.GOOGLE_CALLBACK_URL = 'https://ethiocrafthub.com/api/auth/google/callback';
}
// ─────────────────────────────────────────────────────────────────────────────

const { connectDB, disconnectDB } = require("./lib/prisma");

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
let loadModel = async () => {};
try {
  loadModel = require("./utils/imageVector").loadModel;
} catch (e) {
  console.warn("⚠️ AI imageVector disabled (native module not available):", e.message);
}


// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { logger } = require('./middleware/logger');

// Initialize Passport (lazy-loaded strategy via require in routes)
const passport = require('./config/passport');
const session = require('express-session');

// Initialize Express application
const app = express();
// Trust proxy for proper IP handling in LiteSpeed/Passenger environments
app.set("trust proxy", true);

// CORS: Configure allowed origins dynamically for development and production (ethiocrafthub.com)
const defaultOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://ethiocrafthub.com",
  "https://www.ethiocrafthub.com",
];

const envOrigins = [
  process.env.ALLOWED_ORIGINS,
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
]
  .filter(Boolean)
  .flatMap((o) => o.split(",").map((s) => s.trim()))
  .filter(Boolean);

const allowedOriginsList = Array.from(new Set([...defaultOrigins, ...envOrigins]));

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (
      allowedOriginsList.includes(origin) ||
      allowedOriginsList.includes("*") ||
      /^https?:\/\/([a-z0-9-]+\.)?ethiocrafthub\.com$/i.test(origin)
    ) {
      return callback(null, true);
    }
    if (process.env.NODE_ENV === "production") {
      console.warn(`⚠️ Blocked by CORS: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    }
    return callback(null, true);
  },
  credentials: true,
  maxAge: 86400,
};

app.use(compression());
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: [
          "'self'",
          "data:",
          "https:",
          "http://localhost:5000",
          "http://localhost:5001",
          "https://ethiocrafthub.com",
          "https://*.ethiocrafthub.com",
        ],
        connectSrc: [
          "'self'",
          "http://localhost:5000",
          "http://localhost:5001",
          "ws://localhost:5000",
          "ws://localhost:5001",
          "https://ethiocrafthub.com",
          "https://*.ethiocrafthub.com",
          "wss://ethiocrafthub.com",
          "wss://*.ethiocrafthub.com",
          "https://api.chapa.co",
          "https://checkout.chapa.co",
        ],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      },
    },
  }),
);

// SEC-05: Rate limiting — active in production and staging; skipped only in development
const isDevOnly = process.env.NODE_ENV === "development";
if (!isDevOnly) {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 3000, // Generous limit for modern SPA
    message: {
      error: "Too many requests from this IP, please try again later.",
      code: "RATE_LIMIT_EXCEEDED",
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Extract client IP even behind LiteSpeed / reverse proxies
      const forwarded = req.headers['x-forwarded-for'];
      if (forwarded && typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
      }
      return req.ip || req.connection?.remoteAddress || '127.0.0.1';
    },
    skip: (req) => {
      const url = req.originalUrl || req.url || '';
      // Don't rate limit health checks, static asset/settings polling, verification uploads, or Zema AI (which has its own user rate limiter)
      if (
        url.includes('/health') ||
        url.includes('/notifications/platform-settings') ||
        url.includes('/settings/homepage') ||
        url.includes('/notifications/broadcasts') ||
        url.includes('/notifications/unread-count') ||
        url.includes('/artisan/verify-submit') ||
        url.includes('/users/artisan/dashboard-stats') ||
        url.includes('/zema-ai')
      ) {
        return true;
      }
      return false;
    }
  });
  app.use("/api/", limiter);
  console.log(`✅ Rate limiter active (NODE_ENV=${process.env.NODE_ENV})`);
} else {
  console.log("⚠️ Rate limiter skipped in development (NODE_ENV=development)");
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
    // SEC-05: Enable secure cookies whenever the connection is HTTPS.
    // This covers production, staging, and any environment behind a TLS proxy.
    secure: process.env.COOKIE_SECURE === 'true' ||
            process.env.NODE_ENV === 'production' ||
            (process.env.HTTPS === 'true'),
    httpOnly: true,
    sameSite: 'lax',
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

// SEC-03: Restrict /uploads CORS to configured allowed origins only
const allowedOrigins = allowedOriginsList;

const serveUploadMiddleware = (req, res, next) => {
  const origin = req.headers.origin;
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  next();
};

app.use("/uploads", serveUploadMiddleware, express.static(uploadsDir));
app.use("/api/uploads", serveUploadMiddleware, express.static(uploadsDir));

// Fallback explicit file sender for uploads if express.static misses
app.get(["/uploads/:file", "/api/uploads/:file"], (req, res, next) => {
  const cleanName = path.basename(req.params.file);
  const target = path.join(uploadsDir, cleanName);
  if (fs.existsSync(target)) {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    return res.sendFile(target);
  }
  next();
});

app.use(
  "/images",
  (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  },
  express.static(path.join(__dirname, "public/images")),
);

// Serve static client build if present (with 1y immutable cache for hashed assets and no-cache for index.html)
const clientBuildDir = path.join(__dirname, "..", "client", "build");
if (fs.existsSync(clientBuildDir)) {
  app.use(
    express.static(clientBuildDir, {
      maxAge: "1y",
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
        }
      },
    })
  );
}

// Auto-generator helper for Prisma Client when uninitialized on cPanel (Non-blocking)
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

let isGeneratingPrisma = false;

async function autoGeneratePrismaAsync() {
  if (isGeneratingPrisma) {
    return { success: false, message: "Prisma generation is already running in background" };
  }
  isGeneratingPrisma = true;
  const appRoot = path.join(__dirname, "..");
  const nodeBin = process.execPath;
  const prismaCli = path.join(appRoot, "node_modules", "prisma", "build", "index.js");
  const schemaPath = path.join(appRoot, "prisma", "schema.prisma");

  console.log("⚡ [Prisma Generator] Starting async non-blocking generate in:", appRoot);

  const attempts = [
    fs.existsSync(prismaCli) ? `"${nodeBin}" "${prismaCli}" generate --schema="${schemaPath}"` : null,
    `npx prisma generate --schema="${schemaPath}"`,
    fs.existsSync('/home/ethiocaq/nodevenv/EthioCraftHub/20/bin/node')
      ? `/home/ethiocaq/nodevenv/EthioCraftHub/20/bin/node "${prismaCli}" generate --schema="${schemaPath}"`
      : null,
  ].filter(Boolean);

  let lastErr = null;
  let finalOutput = null;

  for (const cmd of attempts) {
    try {
      console.log(`⚡ [Prisma Generator] Executing non-blocking: ${cmd}`);
      const { stdout } = await execPromise(cmd, {
        cwd: appRoot,
        env: {
          ...process.env,
          PATH: `/home/ethiocaq/nodevenv/EthioCraftHub/20/bin:${process.env.PATH || ''}`,
        },
        timeout: 60000,
        encoding: "utf-8",
      });
      finalOutput = stdout;
      console.log("✅ [Prisma Generator] Output:", finalOutput);
      isGeneratingPrisma = false;
      return { success: true, command: cmd, output: finalOutput };
    } catch (err) {
      lastErr = err;
      console.warn(`⚠️ [Prisma Generator] Command failed: ${cmd} - ${err.message}`);
    }
  }

  isGeneratingPrisma = false;
  return {
    success: false,
    error: lastErr?.message,
    stderr: lastErr?.stderr,
    stdout: lastErr?.stdout,
  };
}

function autoGeneratePrisma() {
  // Fire-and-forget so Passenger request thread is NEVER blocked
  autoGeneratePrismaAsync().catch((err) => {
    console.error("Prisma generator background error:", err.message);
  });
  return { success: true, message: "Prisma generation triggered asynchronously in background" };
}

// Endpoint to trigger prisma generate directly via browser
app.get(
  ["/health/generate-prisma", "/api/health/generate-prisma", "/api/generate-prisma", "/generate-prisma"],
  async (req, res) => {
    const genResult = await autoGeneratePrismaAsync();
    const { connectDB, prisma } = require("./lib/prisma");
    let userCount = 0;
    let connectError = null;

    try {
      await connectDB();
      if (prisma && typeof prisma.user?.count === "function") {
        userCount = await prisma.user.count();
      }
    } catch (e) {
      connectError = e.message;
    }

    res.json({
      generator: genResult,
      userCount,
      connectError,
      timestamp: new Date().toISOString(),
    });
  }
);

// Health check endpoint (accessible via /health, /api/health)
app.get(["/health", "/api/health", "/api/admin/db-status"], async (req, res) => {
  const { prisma, getDatabaseStatus } = require("./lib/prisma");
  let dbUserCount = 0;
  let sampleUsers = [];
  let dbLiveStatus = "unknown";
  let liveError = null;

  try {
    if (prisma && typeof prisma.user?.count === "function") {
      dbUserCount = await prisma.user.count();
      sampleUsers = await prisma.user.findMany({
        take: 5,
        select: { id: true, email: true, role: true, isActive: true },
      });
      dbLiveStatus = "connected";
    }
  } catch (err) {
    dbLiveStatus = "error";
    liveError = err.message;
    if (err.message && err.message.includes("did not initialize yet")) {
      console.log("⚡ [Health Check] Auto-running prisma generate on demand...");
      try { autoGeneratePrisma(); } catch (e) {}
    }
  }

  const dbDiag = typeof getDatabaseStatus === "function" ? getDatabaseStatus() : {};

  res.status(200).json({
    status: dbLiveStatus === "connected" ? "healthy" : "db_issue",
    message: "EthioCraft Global API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: "1.0.0",
    database: {
      status: dbLiveStatus,
      userCount: dbUserCount,
      sampleUsers,
      error: liveError || dbDiag.error || null,
      activeUrl: dbDiag.activeUrl || (process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@') : 'not set'),
    },
  });
});

// Ensure compatibility whether Phusion Passenger strips '/api' or preserves it
app.use((req, res, next) => {
  if (
    !req.url.startsWith("/api") &&
    !req.url.startsWith("/socket.io") &&
    !req.url.startsWith("/static") &&
    !req.url.startsWith("/uploads") &&
    !req.url.startsWith("/images") &&
    req.url !== "/health" &&
    req.url !== "/" &&
    req.url !== "/index.html"
  ) {
    req.url = `/api${req.url}`;
  }
  next();
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


// Welcome endpoint with Ethiopian cultural greeting (matches /, /api, /api/)
app.get(["/", "/api", "/api/"], (req, res) => {
  res.json({
    status: "healthy",
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

// Database connection with retry logic and auto-generation on cPanel
let hasAttemptedAutoGenerate = false;
const connectDatabase = async () => {
  try {
    await connectDB();
  } catch (error) {
    console.error("❌ Database connection error:", error.message);
    if (!hasAttemptedAutoGenerate && error.message && error.message.includes("did not initialize yet")) {
      hasAttemptedAutoGenerate = true;
      console.log("⚡ Triggering automatic prisma generate due to uninitialized client...");
      autoGeneratePrisma();
    }
    console.log("🔄 Retrying Database connection in 5 seconds...");
    setTimeout(connectDatabase, 5000);
  }
};

// Graceful shutdown handling
process.on("SIGTERM", async () => {
  console.log("🛑 SIGTERM received. Shutting down gracefully...");
  await disconnectDB();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("🛑 SIGINT received. Shutting down gracefully...");
  await disconnectDB();
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
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOriginsList.includes(origin) ||
        /^https?:\/\/([a-z0-9-]+\.)?ethiocrafthub\.com$/i.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
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
      const cleanId = String(userId).replace(/^(user_|artisan_)/, '');
      socket.join(String(userId));
      socket.join(cleanId);
      socket.join(`user_${cleanId}`);
      socket.join(`artisan_${cleanId}`);
      console.log(`👤 User ${cleanId} joined rooms: [${cleanId}, user_${cleanId}, artisan_${cleanId}] (Total rooms: ${socket.rooms.size})`);
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
    // Connect to database in background without blocking server startup
    connectDatabase().catch(err => console.error("❌ Database connection error:", err)); 

    // Pre-load the MobileNet model only if explicitly enabled (saves memory on shared hosting)
    if (process.env.PRELOAD_AI_MODEL === "true") {
      console.log("🧠 Initializing AI Visual Search engine...");
      loadModel().catch(err => console.error("❌ Failed to pre-load AI model:", err));
    }

    server.listen(PORT, () => {
      console.log(`🚀 EthioCraft Global Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`📱 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`📡 Socket.io: Enabled`);
      console.log(`🎨 Serving Ethiopian artisan crafts with cultural pride!`);
    }); 

    server.on("error", (error) => {
      console.error("❌ Server error:", error.message || error);
    });
  } catch (error) {
    console.error("❌ Error during startServer:", error.message || error);
  }
};

// Start the application
startServer();

// Export app for testing
module.exports = app;

// Global process-level error handlers to improve stability
process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception caught (preventing crash):", err.message || err);
  // Do NOT exit process so Phusion Passenger / LiteSpeed never serves 503
});
