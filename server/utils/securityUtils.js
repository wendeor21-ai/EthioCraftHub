/**
 * Security Utilities for EthioCraft Global
 *
 * Provides data sanitization and security functions:
 * - Sensitive data scrubbing (passwords, phone numbers, emails)
 * - Input validation and sanitization
 * - Security logging and monitoring
 */

/**
 * Sanitize user input by removing sensitive data
 * @param {string} text - Text to sanitize
 * @returns {object} - { sanitized: string, flagged: boolean, removedPatterns: array }
 */
function sanitizeSensitiveData(text) {
  if (!text || typeof text !== "string") {
    return { sanitized: "", flagged: false, removedPatterns: [] };
  }

  let sanitized = text;
  const removedPatterns = [];
  let flagged = false;

  // Pattern 1: Remove passwords (common patterns)
  const passwordPatterns = [
    /password\s*[:=]\s*['"]?[\w!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{6,}['"]?/gi,
    /pass\s*[:=]\s*['"]?[\w!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{6,}['"]?/gi,
    /pwd\s*[:=]\s*['"]?[\w!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{6,}['"]?/gi,
    /\bpassword\b\s*\w+/gi,
  ];

  passwordPatterns.forEach((pattern) => {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, "[PASSWORD_REMOVED]");
      removedPatterns.push("password");
      flagged = true;
    }
  });

  // Pattern 2: Remove phone numbers (international and Ethiopian formats)
  const phonePatterns = [
    /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, // General format
    /(\+251|0)?[97]\d{8}/g, // Ethiopian format
    /\b\d{10,15}\b/g, // Generic long numbers
  ];

  phonePatterns.forEach((pattern) => {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, "[PHONE_REMOVED]");
      removedPatterns.push("phone");
      flagged = true;
    }
  });

  // Pattern 3: Remove email addresses
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  if (emailPattern.test(sanitized)) {
    sanitized = sanitized.replace(emailPattern, "[EMAIL_REMOVED]");
    removedPatterns.push("email");
    flagged = true;
  }

  // Pattern 4: Remove credit card numbers
  const creditCardPattern = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;
  if (creditCardPattern.test(sanitized)) {
    sanitized = sanitized.replace(creditCardPattern, "[CARD_REMOVED]");
    removedPatterns.push("credit_card");
    flagged = true;
  }

  // Pattern 5: Remove API keys and tokens
  const apiKeyPatterns = [
    /api[_-]?key\s*[:=]\s*['"]?[\w-]{20,}['"]?/gi,
    /token\s*[:=]\s*['"]?[\w-]{20,}['"]?/gi,
    /bearer\s+[\w-]{20,}/gi,
  ];

  apiKeyPatterns.forEach((pattern) => {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, "[API_KEY_REMOVED]");
      removedPatterns.push("api_key");
      flagged = true;
    }
  });

  // Pattern 6: Remove social security or ID numbers
  const idPattern = /\b\d{3}-\d{2}-\d{4}\b/g; // SSN format
  if (idPattern.test(sanitized)) {
    sanitized = sanitized.replace(idPattern, "[ID_REMOVED]");
    removedPatterns.push("id_number");
    flagged = true;
  }

  return {
    sanitized: sanitized.trim(),
    flagged,
    removedPatterns: [...new Set(removedPatterns)], // Remove duplicates
  };
}

/**
 * Validate and sanitize user query before sending to AI
 * @param {string} query - User query
 * @returns {object} - { isValid: boolean, sanitized: string, errors: array }
 */
function validateAIQuery(query) {
  const errors = [];

  // Check if query exists
  if (!query || typeof query !== "string") {
    errors.push("Query must be a non-empty string");
    return { isValid: false, sanitized: "", errors };
  }

  // Check length
  if (query.length < 2) {
    errors.push("Query must be at least 2 characters");
  }

  if (query.length > 2000) {
    errors.push("Query cannot exceed 2000 characters");
  }

  // Sanitize sensitive data
  const { sanitized, flagged, removedPatterns } = sanitizeSensitiveData(query);

  // Check for malicious patterns
  const maliciousPatterns = [
    /<script/gi, // XSS attempts
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers
    /eval\(/gi,
    /exec\(/gi,
  ];

  maliciousPatterns.forEach((pattern) => {
    if (pattern.test(query)) {
      errors.push("Query contains potentially malicious content");
    }
  });

  return {
    isValid: errors.length === 0,
    sanitized,
    flagged,
    removedPatterns,
    errors,
  };
}

/**
 * Sanitize AI response before sending to user
 * @param {string} response - AI response
 * @returns {string} - Sanitized response
 */
function sanitizeAIResponse(response) {
  if (!response || typeof response !== "string") {
    return "";
  }

  let sanitized = response;

  // Remove any accidentally leaked sensitive data
  const { sanitized: cleaned } = sanitizeSensitiveData(sanitized);
  sanitized = cleaned;

  // Remove any HTML/script tags
  sanitized = sanitized.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    "",
  );
  sanitized = sanitized.replace(/<[^>]+>/g, "");

  return sanitized.trim();
}

/**
 * Check if user has permission to access Zema AI
 * @param {object} user - User object
 * @returns {boolean} - Has permission
 */
function hasZemaAIPermission(user) {
  // All authenticated users can use Zema AI
  // Banned or suspended users cannot
  if (!user) return false;

  if (user.status === "banned" || user.status === "suspended") {
    return false;
  }

  return true;
}

/**
 * Rate limiting check for AI queries
 * @param {string} userId - User ID
 * @param {object} rateLimitStore - In-memory store for rate limiting
 * @returns {object} - { allowed: boolean, remaining: number, resetTime: Date }
 */
function checkRateLimit(userId, rateLimitStore = {}) {
  // Increase default rate limit for testing to avoid blocking legitimate AI assist requests
  const MAX_REQUESTS = process.env.RATE_LIMIT_MAX_REQUESTS
    ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10)
    : 500; // per hour
  const WINDOW_MS = 60 * 60 * 1000; // 1 hour

  const now = Date.now();
  const userKey = userId || "anonymous";

  if (!rateLimitStore[userKey]) {
    rateLimitStore[userKey] = {
      count: 1,
      resetTime: now + WINDOW_MS,
    };
    return {
      allowed: true,
      remaining: MAX_REQUESTS - 1,
      resetTime: new Date(now + WINDOW_MS),
    };
  }

  const userLimit = rateLimitStore[userKey];

  // Reset if window expired
  if (now > userLimit.resetTime) {
    rateLimitStore[userKey] = {
      count: 1,
      resetTime: now + WINDOW_MS,
    };
    return {
      allowed: true,
      remaining: MAX_REQUESTS - 1,
      resetTime: new Date(now + WINDOW_MS),
    };
  }

  // Check if limit exceeded
  if (userLimit.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: new Date(userLimit.resetTime),
    };
  }

  // Increment count
  userLimit.count += 1;

  return {
    allowed: true,
    remaining: MAX_REQUESTS - userLimit.count,
    resetTime: new Date(userLimit.resetTime),
  };
}

/**
 * Extract IP address from request
 * @param {object} req - Express request object
 * @returns {string} - IP address
 */
function getClientIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

module.exports = {
  sanitizeSensitiveData,
  validateAIQuery,
  sanitizeAIResponse,
  hasZemaAIPermission,
  checkRateLimit,
  getClientIP,
};
