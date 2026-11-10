/**
 * Secure ZemaAI Controller for EthioCraft Global
 *
 * SECURITY FEATURES:
 * - All GROQ API calls go through backend (API key protection)
 * - Audit trail for every conversation (AIChatLog)
 * - Sensitive data scrubbing (passwords, phones, emails)
 * - Rate limiting per user
 * - Permission hardening (read-only Products access)
 * - Admin monitoring capabilities
 *
 * Powered by GROQ API (Llama 3.3) with MongoDB integration
 */

const Groq = require("groq-sdk");
const Product = require("../models/Product");
const AIChatLog = require("../models/AIChatLog");
const { asyncHandler } = require("../middleware/errorHandler");
const { logAIOperation } = require("../middleware/logger");
const {
  sanitizeSensitiveData,
  validateAIQuery,
  sanitizeAIResponse,
  hasZemaAIPermission,
  checkRateLimit,
  getClientIP,
} = require("../utils/securityUtils");

// In-memory rate limit store (use Redis in production)
const rateLimitStore = {};

// Development helper: clear rate limit store on startup to avoid persistent blocks during testing
if (process.env.NODE_ENV !== "production") {
  Object.keys(rateLimitStore).forEach((k) => delete rateLimitStore[k]);
  console.log("🧪 Rate limit store cleared (development)");
}

// In-memory AI monitor settings (persist in DB for production)
const aiMonitorSettings = {
  autoModerationEnabled: true,
  fraudDetectionEnabled: true,
  sensitivity: "medium", // low|medium|high
};

// Helper: promise with timeout
function promiseWithTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("AI request timed out")), ms);
    promise
      .then((res) => {
        clearTimeout(id);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(id);
        reject(err);
      });
  });
}

// Helper: call GROQ API with retries and timeout
async function generateWithRetries(groq, messages, options = {}) {
  const retries = options.retries || 3;
  const timeoutMs = options.timeoutMs || 30000;
  const model = options.model || process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await promiseWithTimeout(
        groq.chat.completions.create({
          messages,
          model,
          temperature: 0.7,
          max_tokens: 1024,
        }),
        timeoutMs,
      );
      return { success: true, result };
    } catch (err) {
      lastError = err;
      console.error(`GROQ attempt ${attempt} failed:`, err.message || err);
      // exponential backoff (simple)
      if (attempt < retries) {
        const backoff = 500 * attempt; // 500ms, 1000ms, ...
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }

  return { success: false, error: lastError };
}

/**
 * Get GROQ AI instance (lazy initialization)
 * SECURITY: API key never exposed to frontend
 */
function getGroqAI() {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey === "your_groq_api_key_here") {
    console.error("❌ GROQ_API_KEY is not configured");
    throw new Error("AI service is not configured");
  }

  return new Groq({ apiKey });
}

/**
 * Get product inventory context for AI
 * SECURITY: Read-only access to Products collection
 */
async function getInventoryContext(userId, userRole) {
  try {
    let query = { status: "active" };

    // Artisans only see their own products
    if (userRole === "artisan") {
      query.artisan = userId;
    }

    // SECURITY: Only select necessary fields, no sensitive data
    const products = await Product.find(query)
      .select(
        "name category price inventory.quantity metrics.views metrics.purchases",
      )
      .limit(50)
      .lean();

    if (!products || products.length === 0) {
      return "No products found in inventory.";
    }

    // Format for AI context
    const summary = products
      .map(
        (p) =>
          `${p.name} (${p.category}): ${p.price} ETB, Stock: ${p.inventory?.quantity || 0}, Views: ${p.metrics?.views || 0}`,
      )
      .join("\n");

    return `Current Inventory (${products.length} products):\n${summary}`;
  } catch (error) {
    console.error("Error fetching inventory context:", error);
    return "Unable to fetch inventory data.";
  }
}

/**
 * Create audit log entry
 * SECURITY: Every conversation is logged for admin review
 */
async function createAuditLog(data) {
  try {
    console.log('📝 Creating audit log:', {
      userId: data.userId,
      userEmail: data.userEmail,
      userRole: data.userRole,
      queryLength: data.userQuery?.length,
      context: data.conversationContext
    });

    const log = await AIChatLog.create({
      userId: data.userId || null,
      userEmail: data.userEmail || null,
      userRole: data.userRole || "anonymous",
      userQuery: data.userQuery,
      sanitizedQuery: data.sanitizedQuery,
      aiResponse: data.aiResponse,
      conversationContext: data.conversationContext || "general_query",
      productId: data.productId || null,
      containsSensitiveData: data.containsSensitiveData || false,
      sanitizationApplied: data.sanitizationApplied || false,
      flaggedForReview: data.flaggedForReview || false,
      responseTime: data.responseTime || 0,
      tokenCount: data.tokenCount || 0,
      sessionId: data.sessionId || null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      reviewNotes: data.reviewNotes || null,
    });

    console.log(`✅ Audit log created: ${log._id} (userRole: ${log.userRole})`);
    return log;
  } catch (error) {
    console.error("❌ Failed to create audit log:", error);
    console.error("   Error details:", error.message);
    console.error("   Stack:", error.stack);
    // Don't throw - logging failure shouldn't break the request
    return null;
  }
}

/**
 * @route   POST /api/zema-ai/chat
 * @desc    Chat with Zema AI assistant (SECURE)
 * @access  Private
 */
exports.chat = asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { query, context } = req.body;

  console.log('🔵 ZemaAI Chat Request Received:');
  console.log('   User:', req.user?.email, '(', req.user?.role, ')');
  console.log('   Query:', query || req.body.message);
  console.log('   Body:', JSON.stringify(req.body).substring(0, 100));

  // SECURITY CHECK 0: Validate query parameter (support both 'query' and 'message')
  const userMessage = query || req.body.message;
  if (
    !userMessage ||
    typeof userMessage !== "string" ||
    userMessage.trim().length === 0
  ) {
    console.log('❌ Invalid query parameter');
    return res.status(400).json({
      success: false,
      error: "Invalid query",
      message: "Query must be a non-empty string",
    });
  }

  console.log('✅ Query validated:', userMessage.substring(0, 50) + '...');

  // SECURITY CHECK 1: Permission check
  if (!hasZemaAIPermission(req.user)) {
    return res.status(403).json({
      success: false,
      error: "Access denied",
      message: "You do not have permission to use Zema AI",
    });
  }

  // SECURITY CHECK 2: Rate limiting
  const rateLimit = checkRateLimit(req.user?._id?.toString(), rateLimitStore);
  // Debugging info
  console.log("Rate Limit Debug:", rateLimit);
  console.log(
    `User ${req.user?.email || req.user?._id} rate limit: ${rateLimit.remaining} remaining`,
  );

  // Allow admins and artisans to bypass strict rate limits during testing
  if (
    !rateLimit.allowed &&
    req.user?.role !== "admin" &&
    req.user?.role !== "artisan"
  ) {
    return res.status(429).json({
      success: false,
      error: "Rate limit exceeded",
      message: `Too many requests. Please try again after ${rateLimit.resetTime.toLocaleTimeString()}`,
      resetTime: rateLimit.resetTime,
    });
  }

  // SECURITY CHECK 3: Validate and sanitize query
  const validation = validateAIQuery(userMessage);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      error: "Invalid query",
      message: validation.errors.join(", "),
    });
  }

  const { sanitized: sanitizedQuery, flagged, removedPatterns } = validation;

  // Log if sensitive data was detected
  if (flagged) {
    console.warn(
      `⚠️ Sensitive data removed from query: ${removedPatterns.join(", ")}`,
    );
  }

  try {
    // Get GROQ AI instance
    const groq = getGroqAI();

    // Get inventory context (read-only Products access)
    const inventoryContext = await getInventoryContext(
      req.user._id,
      req.user.role,
    );

    // Build AI prompt with context
    const systemMessage = `You are Zema AI (ዜማ AI), an intelligent, friendly, and professional AI assistant for EthioCraft Global — an e-commerce platform connecting Ethiopian artisans with global customers.

YOUR IDENTITY & ROLE:
- Name: Zema AI (ዜማ AI)
- Tone: Polite, warm, respectful, and professional at all times.
- Purpose: Help customers and artisans with product inquiries, price details, inventory insights, cultural background, and platform support.
- User Role: ${req.user.role || 'customer'}

CRITICAL AMHARIC (አማርኛ) SYSTEM INSTRUCTIONS:
1. 🔴 NATIVE FLUENCY & GRAMMAR:
   - Write in natural, grammatically sound, and fluent native Amharic using standard Subject-Object-Verb (SOV) sentence structure.
   - Punctuation: Use standard spaces between words. NEVER place \`፡\` (ሁለት ነጥብ) after words or sentences. End complete sentences ONLY with \`።\` (አራት ነጥብ - Arat Neteb).
   - Use polite Amharic honorifics: "እርስዎ", "ማግኘት ይችላሉ", "ይመልከቱ", "አመሰግናለሁ". Avoid awkward direct translations like "የምታገኘው ... አለ" or "ወደ እኛ መግኘት ይቻላል".

2. 🔴 DATABASE REPHRASING & CONVERSATIONAL RESPONSE:
   - Rephrase raw database context into clear, natural, and human-like Amharic sentences.
   - DO NOT copy database fields verbatim or output awkward word-for-word translations. Frame information gracefully as a knowledgeable assistant.

3. 🔴 PRICE RANGE & PRODUCT SPEC FORMATTING:
   - Format price ranges and product specifications cleanly using proper Ethiopian currency phrasing.
   - Price Format Examples: "ከብር 5,999.98 እስከ ብር 7,200.00" or "ከ 5,999.98 እስከ 7,200.00 ብር ባለው ዋጋ ይገኛሉ።"
   - Use authentic Ethiopian craft terms (e.g., "ሀበሻ ቀሚስ", "የጥልፍ ሥራ", "በእጅ የተሸመነ", "የጥጥ ቀሚስ"). Avoid gibberish or transliteration artifacts (e.g. never use "ቲክሽ").

4. 🔴 MULTILINGUAL MATCHING:
   - Detect user query language (Amharic, Afaan Oromoo, Tigrinya, or English) and reply ENTIRELY in that exact language.

Current Inventory Context:
${inventoryContext}`;

    const messages = [
      { role: "system", content: systemMessage },
      { role: "user", content: sanitizedQuery }
    ];

    // Call GROQ API (SECURE: through backend only) with retries and timeout
    const genResult = await generateWithRetries(groq, messages, {
      retries: 3,
      timeoutMs: 30000,
    });
    
    if (!genResult.success) {
      const err = genResult.error || new Error("AI generation failed");
      throw err; // let outer catch handle audit logging and friendly message
    }

    const result = genResult.result;
    const aiText = result.choices[0]?.message?.content || "";

    // SECURITY: Sanitize AI response
    const sanitizedResponse = sanitizeAIResponse(aiText);

    const responseTime = Date.now() - startTime;

    // SECURITY: Create audit log (every conversation tracked)
    console.log('💾 Creating audit log for:', req.user.email, '(', req.user.role, ')');
    const auditLog = await createAuditLog({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      userQuery: userMessage,
      sanitizedQuery,
      aiResponse: sanitizedResponse,
      conversationContext: context || "general_query",
      containsSensitiveData: flagged,
      sanitizationApplied: flagged || sanitizedQuery !== userMessage,
      flaggedForReview: flagged,
      responseTime,
      tokenCount: aiText.length, // Approximate
      sessionId: req.sessionID,
      ipAddress: getClientIP(req),
      userAgent: req.headers["user-agent"],
    });
    console.log('✅ Audit log created:', auditLog?._id || 'NO ID');

    // Log AI operation
    logAIOperation(
      "zema_chat",
      req.user._id,
      null,
      {
        queryLength: userMessage.length,
        responseLength: sanitizedResponse.length,
        sanitized: flagged,
      },
      responseTime,
    );

    res.json({
      success: true,
      response: sanitizedResponse,
      metadata: {
        responseTime: `${responseTime}ms`,
        sanitized: flagged,
        removedPatterns: flagged ? removedPatterns : [],
        remaining: rateLimit.remaining,
      },
    });
  } catch (error) {
    console.error("❌ Zema AI error:", error);

    // Friendly message shown to admin UI and user
    const friendlyMessage =
      "Service temporarily unavailable. Please click Retry AI to attempt again.";

    // Log error in audit trail with raw details in reviewNotes
    try {
      await createAuditLog({
        userId: req.user._id,
        userEmail: req.user.email,
        userRole: req.user.role,
        userQuery: userMessage,
        sanitizedQuery,
        aiResponse: friendlyMessage,
        conversationContext: "general_query",
        flaggedForReview: true,
        responseTime: Date.now() - startTime,
        sessionId: req.sessionID,
        ipAddress: getClientIP(req),
        userAgent: req.headers["user-agent"],
        reviewNotes:
          error && error.stack
            ? String(error.stack).slice(0, 500)
            : error.message || "No details",
      });
    } catch (logError) {
      console.error("❌ Failed to create error audit log:", logError.message);
    }

    res.status(500).json({
      success: false,
      error: "AI service error",
      message: friendlyMessage,
      details:
        process.env.NODE_ENV === "development"
          ? error.message || String(error)
          : undefined,
    });
  }
});

// (module exports will be attached at the very end of this file)

/**
 * @route   GET /api/zema-ai/suggestions
 * @desc    Get suggested questions based on user role
 * @access  Private
 */
exports.getSuggestions = asyncHandler(async (req, res) => {
  const userRole = req.user.role;

  const suggestions = {
    artisan: [
      "What are my best-selling products?",
      "How can I improve my product descriptions?",
      "What pricing strategy should I use?",
      "How do I increase my product visibility?",
      "What are current market trends for Ethiopian crafts?",
    ],
    admin: [
      "Show me platform analytics",
      "What are the most popular product categories?",
      "How many active artisans do we have?",
      "What are common customer complaints?",
      "Show me revenue trends",
    ],
    customer: [
      "What are the most popular Ethiopian crafts?",
      "Tell me about traditional Ethiopian textiles",
      "What makes Ethiopian jewelry unique?",
      "How do I care for leather products?",
      "What are authentic Ethiopian basketry techniques?",
    ],
  };

  res.json({
    success: true,
    suggestions: suggestions[userRole] || suggestions.customer,
  });
});

/**
 * @route   POST /api/zema-ai/analyze-reviews
 * @desc    Analyze product reviews with AI (SECURE)
 * @access  Public
 */
exports.analyzeReviews = asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { productId } = req.body;

  if (!productId) {
    return res.status(400).json({
      success: false,
      error: "Product ID is required",
    });
  }

  try {
    // SECURITY: Read-only access to Products
    const product = await Product.findById(productId)
      .select("name reviews metrics.averageRating metrics.reviewCount")
      .lean();

    if (!product || !product.reviews || product.reviews.length === 0) {
      return res.json({
        success: true,
        badge: null,
        summary: "No reviews yet",
        sentiment: "neutral",
      });
    }

    // Simple analysis without AI for now (can enhance later)
    const avgRating = product.metrics?.averageRating || 0;
    const reviewCount = product.metrics?.reviewCount || 0;

    let badge = null;
    let sentiment = "neutral";

    if (avgRating >= 4.5 && reviewCount >= 5) {
      badge = "🔥 Top Rated";
      sentiment = "positive";
    } else if (avgRating >= 4.0 && reviewCount >= 3) {
      badge = "⭐ Highly Rated";
      sentiment = "positive";
    } else if (avgRating < 3.0) {
      sentiment = "negative";
    }

    // Create audit log
    await createAuditLog({
      userId: req.user?._id || null,
      userEmail: req.user?.email || null,
      userRole: req.user?.role || "anonymous",
      userQuery: `Analyze reviews for product ${productId}`,
      sanitizedQuery: `Analyze reviews for product ${productId}`,
      aiResponse: `Badge: ${badge}, Sentiment: ${sentiment}`,
      conversationContext: "review_analysis",
      productId,
      responseTime: Date.now() - startTime,
      sessionId: req.sessionID,
      ipAddress: getClientIP(req),
      userAgent: req.headers["user-agent"],
    });

    res.json({
      success: true,
      badge,
      sentiment,
      summary: `${reviewCount} reviews, ${avgRating.toFixed(1)} average rating`,
    });
  } catch (error) {
    console.error("Error analyzing reviews:", error);
    res.status(500).json({
      success: false,
      error: "Failed to analyze reviews",
    });
  }
});

/**
 * @route   GET /api/zema-ai/admin/logs
 * @desc    Get AI chat logs for admin monitoring
 * @access  Private (Admin only)
 */
exports.getAdminLogs = asyncHandler(async (req, res) => {
  // Check admin permission
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Access denied",
      message: "Admin access required",
    });
  }

  const { limit = 50, flagged = false, userRole } = req.query;

  try {
    // Build query
    const query = {};
    
    // Filter by flagged status
    if (flagged === "true") {
      query.flaggedForReview = true;
    }
    
    // Filter by user role if specified (e.g., only customer queries)
    if (userRole) {
      query.userRole = userRole;
    }

    console.log('📊 Fetching admin logs with query:', query);

    const logs = await AIChatLog.find(query)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .populate("userId", "email role profile")
      .populate("productId", "name images category")
      .lean();

    console.log(`✅ Found ${logs.length} logs`);
    
    // Add formatted date to each log for display
    const logsWithFormattedDate = logs.map(log => ({
      ...log,
      formattedDate: new Date(log.createdAt).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      })
    }));

    return res.json({
      success: true,
      logs: logsWithFormattedDate,
      count: logs.length,
      currentDate: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching admin logs:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch logs",
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/zema-ai/admin/analytics
 * @desc    Get AI usage analytics
 * @access  Private (Admin only)
 */
exports.getAnalytics = asyncHandler(async (req, res) => {
  // Check admin permission
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Access denied",
      message: "Admin access required",
    });
  }

  const { startDate, endDate } = req.query;

  try {
    const analytics = await AIChatLog.getAnalytics(startDate, endDate);

    res.json({
      success: true,
      analytics: analytics[0] || {
        totalQueries: 0,
        avgResponseTime: 0,
        totalTokens: 0,
        flaggedCount: 0,
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch analytics",
    });
  }
});

/**
 * @route   DELETE /api/zema-ai/admin/logs/:id
 * @desc    Delete an AI chat log (admin only)
 * @access  Private (Admin only)
 */
exports.deleteLog = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, error: "Access denied" });
  }

  const { id } = req.params;
  try {
    const deleted = await AIChatLog.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Log not found" });
    }

    res.json({ success: true, message: "Log deleted" });
  } catch (error) {
    console.error("Error deleting log:", error);
    res.status(500).json({ success: false, error: "Failed to delete log" });
  }
});

/**
 * @route   POST /api/zema-ai/admin/logs/:id/retry
 * @desc    Retry AI generation for a specific log (admin only)
 * @access  Private (Admin only)
 */
exports.retryAI = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, error: "Access denied" });
  }

  const { id } = req.params;
  try {
    const log = await AIChatLog.findById(id);
    if (!log)
      return res.status(404).json({ success: false, error: "Log not found" });

    // 1. Initialize Groq (ከ Gemini ይልቅ)
    const groq = getGroqAI();
    const systemPrompt = `You are Zema AI assistant. Context: ${log.conversationContext}. User Query: ${log.sanitizedQuery}`;

    const start = Date.now();

    // 2. Call Groq
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: systemPrompt }],
      model: process.env.GROQ_MODEL || "qwen/qwen3.8-27b",
    });

    const aiText = chatCompletion.choices[0]?.message?.content || "";

    // 3. Update Log
    log.aiResponse = aiText.trim();
    log.responseTime = Date.now() - start;
    log.flaggedForReview = false;
    await log.save();

    res.json({ success: true, log });
  } catch (error) {
    console.error("Error retrying with Groq:", error);
    res
      .status(500)
      .json({ success: false, error: "Retry failed", details: error.message });
  }
});
/**
 * Additional admin monitoring endpoints
 */
exports.getAlerts = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ success: false, error: "Access denied" });

  const since = new Date(Date.now() - 1000 * 60 * 60); // last 1 hour

  const ipAgg = await AIChatLog.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: "$ipAddress", count: { $sum: 1 } } },
    { $match: { _id: { $ne: null }, count: { $gte: 50 } } },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]);

  const queryAgg = await AIChatLog.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: "$sanitizedQuery", count: { $sum: 1 } } },
    { $match: { count: { $gte: 10 }, _id: { $ne: "" } } },
    { $sort: { count: -1 } },
    { $limit: 50 },
  ]);

  const flagged = await AIChatLog.find({ flaggedForReview: true })
    .limit(200)
    .sort({ createdAt: -1 })
    .populate("userId", "email profile.firstName profile.lastName");

  res.json({
    success: true,
    alerts: {
      suspiciousIPs: ipAgg,
      repeatedQueries: queryAgg,
      flaggedLogs: flagged,
    },
  });
});

exports.getPolicyViolations = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ success: false, error: "Access denied" });
  const violations = await AIChatLog.find({ flaggedForReview: true })
    .limit(500)
    .sort({ createdAt: -1 })
    .lean();
  const withReasons = violations.map((v) => ({
    _id: v._id,
    createdAt: v.createdAt,
    userId: v.userId,
    sanitizedQuery: v.sanitizedQuery,
    reason: v.containsSensitiveData
      ? "Contains sensitive data"
      : v.sanitizationApplied
        ? "Sanitization applied"
        : "Flagged by model",
    reviewNotes: v.reviewNotes || null,
  }));
  res.json({ success: true, violations: withReasons });
});

exports.getDecisionLogs = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ success: false, error: "Access denied" });
  const { limit = 200 } = req.query;
  const logs = await AIChatLog.find({ flaggedForReview: true })
    .limit(parseInt(limit))
    .sort({ createdAt: -1 })
    .lean();
  const explained = logs.map((l) => ({
    _id: l._id,
    createdAt: l.createdAt,
    userEmail: l.userEmail,
    sanitizedQuery: l.sanitizedQuery,
    flaggedForReview: l.flaggedForReview,
    containsSensitiveData: l.containsSensitiveData,
    sanitizationApplied: l.sanitizationApplied,
    reviewNotes: l.reviewNotes || null,
    explanation: l.containsSensitiveData
      ? "Detected personal data (emails/phones) and redacted"
      : l.sanitizationApplied
        ? "User input sanitized due to detected patterns"
        : "Model confidence low / policy rule triggered",
  }));
  res.json({ success: true, logs: explained });
});

exports.getSystemHealth = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ success: false, error: "Access denied" });
  const uptimeSec = process.uptime();
  const mem = process.memoryUsage();
  const recentErrors = await AIChatLog.find({ conversationContext: "error" })
    .limit(50)
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, health: { uptimeSec, memory: mem, recentErrors } });
});

exports.getSettings = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ success: false, error: "Access denied" });
  res.json({ success: true, settings: aiMonitorSettings });
});

exports.updateSettings = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ success: false, error: "Access denied" });
  const { autoModerationEnabled, fraudDetectionEnabled, sensitivity } =
    req.body;
  if (typeof autoModerationEnabled === "boolean")
    aiMonitorSettings.autoModerationEnabled = autoModerationEnabled;
  if (typeof fraudDetectionEnabled === "boolean")
    aiMonitorSettings.fraudDetectionEnabled = fraudDetectionEnabled;
  if (sensitivity && ["low", "medium", "high"].includes(sensitivity))
    aiMonitorSettings.sensitivity = sensitivity;
  logAIOperation(
    "zema_monitor_settings_updated",
    req.user._id,
    null,
    { settings: aiMonitorSettings },
    0,
  );
  res.json({ success: true, settings: aiMonitorSettings });
});

// exports will be attached at the end of this file

/**
 * @route   POST /api/zema-ai/generate-description
 * @desc    Generate product description from title and tags
 * @access  Private (Authenticated users)
 */
exports.generateDescription = asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { title, tags = [], materials = "", story = "" } = req.body;

  // Validation
  if (!title || typeof title !== "string" || title.trim().length < 3) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      message: "Title is required and must be at least 3 characters",
      code: "INVALID_TITLE",
    });
  }

  // materials and story optional here but log values for context
  // Rate limiting for description generation
  const rateLimit = checkRateLimit(req.user?._id?.toString(), rateLimitStore);
  console.log("Rate Limit Debug (generateDescription):", rateLimit);
  console.log(
    `User ${req.user?.email || req.user?._id} rate limit: ${rateLimit.remaining} remaining`,
  );
  if (
    !rateLimit.allowed &&
    req.user?.role !== "admin" &&
    req.user?.role !== "artisan"
  ) {
    return res.status(429).json({
      success: false,
      error: "Rate limit exceeded",
      message: `Too many requests. Please try again after ${rateLimit.resetTime.toLocaleTimeString()}`,
      resetTime: rateLimit.resetTime,
    });
  }

  try {
    const groq = getGroqAI();

    // Build description prompt incorporating materials and story if provided
    let prompt = `Write a professional product description for an Ethiopian artisan marketplace.

Product Title: ${title}
Materials: ${materials || 'Not specified'}
Cultural Story: ${story || 'Not specified'}
Tags: ${tags.join(', ') || 'None'}

Requirements:
- Focus on Ethiopian craftsmanship and cultural significance
- Highlight the materials and traditional techniques
- Keep it professional and engaging (2-3 paragraphs)
- Emphasize authenticity and artisan skill

Write the description now:`;

    const messages = [
      { role: "user", content: prompt }
    ];

    // Generate with timeout and retries
    const genResult = await generateWithRetries(groq, messages, {
      retries: 2,
      timeoutMs: 15000,
    });

    if (!genResult || !genResult.success) {
      throw (genResult && genResult.error) || new Error("AI generation failed");
    }

    // extract response from helper result
    const aiText = genResult.result.choices[0]?.message?.content || "";

    if (!aiText || aiText.trim().length === 0) {
      throw new Error("AI returned empty text");
    }

    const description = aiText.trim();

    // Log audit entry including new fields for review
    await createAuditLog({
      userId: req.user?._id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      userQuery: title,
      sanitizedQuery: `title:${title}; materials:${materials}; story:${story}; tags:${tags.join(",")}`,
      aiResponse: description,
      conversationContext: "product",
      containsSensitiveData: false,
      sanitizationApplied: false,
      flaggedForReview: false,
      responseTime: Date.now() - startTime,
      tokenCount: description.length,
      sessionId: req.sessionID,
      ipAddress: getClientIP(req),
      userAgent: req.headers["user-agent"],
    });

    console.log(
      `✅ Description generated for "${title}" (${description.length} chars)`,
    );

    res.status(200).json({
      success: true,
      description,
    });
  } catch (error) {
    // log full error object so stack/messages are preserved
    console.error("❌ Description generation error:", error);

    // include the underlying message in the response so the frontend can display it
    const userMsg = `Failed to generate description: ${error.message || "unknown error"}`;

    res.status(500).json({
      success: false,
      error: "AI_ERROR",
      message: userMsg,
      details: error.message || null,
    });
  }
});

// Attach exports at file end so all handlers are exported
module.exports = exports;
