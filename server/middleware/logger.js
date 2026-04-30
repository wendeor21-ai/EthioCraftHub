/**
 * Logging Middleware for EthioCraft Global
 *
 * Provides comprehensive request/response logging with:
 * - Request details and timing
 * - User identification and IP tracking
 * - Error logging and monitoring
 * - Performance metrics
 * - Security event logging
 */

const fs = require("fs");
const path = require("path");

// Ensure logs directory exists
const logsDir = path.join(__dirname, "../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Generate unique request ID for tracking
 */
const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get client IP address from request
 */
const getClientIP = (req) => {
  return (
    req.headers["x-forwarded-for"] ||
    req.headers["x-real-ip"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
    req.ip
  );
};

/**
 * Format log entry with consistent structure
 */
const formatLogEntry = (level, message, metadata = {}) => {
  return {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    ...metadata,
    environment: process.env.NODE_ENV || "development",
  };
};

/**
 * Write log entry to file
 */
const writeLogToFile = (filename, logEntry) => {
  const logPath = path.join(logsDir, filename);
  const logLine = JSON.stringify(logEntry) + "\n";

  fs.appendFile(logPath, logLine, (err) => {
    if (err) {
      console.error("Failed to write to log file:", err);
    }
  });
};

/**
 * Main request logging middleware
 */
const logger = (req, res, next) => {
  // Generate unique request ID
  req.id = generateRequestId();

  // Capture request start time
  const startTime = Date.now();

  // Get client information
  const clientIP = getClientIP(req);
  const userAgent = req.get("User-Agent") || "Unknown";

  // Log request start
  const requestLog = formatLogEntry("info", "Request started", {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    ip: clientIP,
    userAgent,
    userId: req.user?._id,
    userEmail: req.user?.email,
    userRole: req.user?.role,
    headers: {
      "content-type": req.get("Content-Type"),
      authorization: req.get("Authorization") ? "Bearer [REDACTED]" : undefined,
      accept: req.get("Accept"),
    },
    query: req.query,
    body: sanitizeRequestBody(req.body),
  });

  console.log(
    `[${requestLog.timestamp}] ${req.method} ${req.originalUrl} - ${clientIP}`,
  );
  writeLogToFile("requests.log", requestLog);

  // Override res.json to capture response
  const originalJson = res.json;
  res.json = function (data) {
    const duration = Date.now() - startTime;

    // Log response
    const responseLog = formatLogEntry("info", "Request completed", {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: clientIP,
      userId: req.user?._id,
      responseSize: JSON.stringify(data).length,
      success: res.statusCode < 400,
    });

    console.log(
      `[${responseLog.timestamp}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`,
    );
    writeLogToFile("requests.log", responseLog);

    // Log errors separately
    if (res.statusCode >= 400) {
      const errorLog = formatLogEntry("error", "Request error", {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        error: data.error || "Unknown error",
        message: data.message,
        code: data.code,
        details: data.details || null,
        ip: clientIP,
        userId: req.user?._id,
        userAgent,
      });

      writeLogToFile("errors.log", errorLog);
    }

    // Log slow requests (> 2 seconds)
    if (duration > 2000) {
      const slowLog = formatLogEntry("warn", "Slow request detected", {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        duration: `${duration}ms`,
        ip: clientIP,
        userId: req.user?._id,
      });

      writeLogToFile("performance.log", slowLog);
    }

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Sanitize request body for logging (remove sensitive data)
 */
const sanitizeRequestBody = (body) => {
  if (!body || typeof body !== "object") {
    return body;
  }

  const sanitized = { ...body };
  const sensitiveFields = [
    "password",
    "token",
    "secret",
    "key",
    "authorization",
  ];

  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = "[REDACTED]";
    }
  });

  return sanitized;
};

/**
 * Security event logger
 */
const logSecurityEvent = (event, req, details = {}) => {
  const securityLog = formatLogEntry("warn", `Security event: ${event}`, {
    event,
    requestId: req.id,
    ip: getClientIP(req),
    userAgent: req.get("User-Agent"),
    userId: req.user?._id,
    userEmail: req.user?.email,
    url: req.originalUrl,
    method: req.method,
    ...details,
  });

  console.warn(`[SECURITY] ${event} - ${getClientIP(req)}`);
  writeLogToFile("security.log", securityLog);
};

/**
 * Authentication event logger
 */
const logAuthEvent = (
  event,
  userId,
  email,
  req,
  success = true,
  details = {},
) => {
  const authLog = formatLogEntry(
    success ? "info" : "warn",
    `Auth event: ${event}`,
    {
      event,
      userId,
      email,
      success,
      requestId: req?.id,
      ip: req ? getClientIP(req) : "unknown",
      userAgent: req?.get("User-Agent"),
      ...details,
    },
  );

  console.log(`[AUTH] ${event} - ${email} - ${success ? "SUCCESS" : "FAILED"}`);
  writeLogToFile("auth.log", authLog);
};

/**
 * Business event logger (orders, products, etc.)
 */
const logBusinessEvent = (event, userId, details = {}) => {
  const businessLog = formatLogEntry("info", `Business event: ${event}`, {
    event,
    userId,
    ...details,
  });

  console.log(`[BUSINESS] ${event} - User: ${userId}`);
  writeLogToFile("business.log", businessLog);
};

/**
 * Performance monitoring logger
 */
const logPerformanceMetric = (metric, value, context = {}) => {
  const perfLog = formatLogEntry("info", `Performance metric: ${metric}`, {
    metric,
    value,
    unit: context.unit || "ms",
    ...context,
  });

  writeLogToFile("performance.log", perfLog);
};

/**
 * Database operation logger
 */
const logDatabaseOperation = (
  operation,
  collection,
  duration,
  success = true,
  error = null,
) => {
  const dbLog = formatLogEntry(
    success ? "info" : "error",
    `Database operation: ${operation}`,
    {
      operation,
      collection,
      duration: `${duration}ms`,
      success,
      error: error?.message,
    },
  );

  if (!success) {
    console.error(
      `[DB ERROR] ${operation} on ${collection} failed:`,
      error?.message,
    );
  }

  writeLogToFile("database.log", dbLog);
};

/**
 * AI/ML operation logger
 */
const logAIOperation = (operation, userId, productId, result, duration) => {
  const aiLog = formatLogEntry("info", `AI operation: ${operation}`, {
    operation,
    userId,
    productId,
    result: typeof result === "object" ? JSON.stringify(result) : result,
    duration: `${duration}ms`,
  });

  writeLogToFile("ai.log", aiLog);
};

/**
 * Log rotation utility (called daily via cron or scheduler)
 */
const rotateLogFiles = () => {
  const logFiles = [
    "requests.log",
    "errors.log",
    "security.log",
    "auth.log",
    "business.log",
    "performance.log",
    "database.log",
    "ai.log",
  ];
  const today = new Date().toISOString().split("T")[0];

  logFiles.forEach((filename) => {
    const currentPath = path.join(logsDir, filename);
    const archivePath = path.join(logsDir, `${filename}.${today}`);

    if (fs.existsSync(currentPath)) {
      fs.rename(currentPath, archivePath, (err) => {
        if (err) {
          console.error(`Failed to rotate log file ${filename}:`, err);
        } else {
          console.log(`Log file ${filename} rotated to ${archivePath}`);
        }
      });
    }
  });
};

/**
 * Clean old log files (keep last 30 days)
 */
const cleanOldLogs = () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  fs.readdir(logsDir, (err, files) => {
    if (err) {
      console.error("Failed to read logs directory:", err);
      return;
    }

    files.forEach((file) => {
      const filePath = path.join(logsDir, file);

      fs.stat(filePath, (err, stats) => {
        if (err) return;

        if (stats.mtime < thirtyDaysAgo) {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error(`Failed to delete old log file ${file}:`, err);
            } else {
              console.log(`Deleted old log file: ${file}`);
            }
          });
        }
      });
    });
  });
};

module.exports = {
  logger,
  logSecurityEvent,
  logAuthEvent,
  logBusinessEvent,
  logPerformanceMetric,
  logDatabaseOperation,
  logAIOperation,
  rotateLogFiles,
  cleanOldLogs,
  formatLogEntry,
};
