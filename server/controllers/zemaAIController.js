/**
 * ZemaAI Controller for EthioCraft Global
 *
 * AI-powered assistant that helps with:
 * - Product inventory insights
 * - Sales recommendations
 * - Customer queries about Ethiopian crafts
 * - Artisan support and guidance
 *
 * Powered by Google Gemini API with MongoDB integration
 */

const Groq = require("groq-sdk");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { asyncHandler } = require("../middleware/errorHandler");
const { logAIOperation } = require("../middleware/logger");

/**
 * Get Gemini AI instance (lazy initialization)
 */
function getGroqAI() {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error("❌ GROQ_API_KEY is not configured");
    throw new Error("GROQ_API_KEY is missing");
  }

  return new Groq({ apiKey });
}
/**
 * Get product inventory summary for AI context
 */
async function getInventoryContext(userId, userRole) {
  try {
    let query = { status: "active" };

    if (userRole === "artisan") {
      query.artisan = userId;
    }

    const products = await Product.find(query)
      .select(
        "name category price inventory.quantity metrics.views metrics.purchases",
      )
      .limit(50)
      .lean();

    if (!products || products.length === 0) {
      console.log("⚠️  No products found for inventory context");
      return {
        totalProducts: 0,
        categories: {},
        lowStock: [],
        topSellers: [],
        totalValue: 0,
        isEmpty: true,
      };
    }

    const summary = {
      totalProducts: products.length,
      categories: {},
      lowStock: [],
      topSellers: [],
      totalValue: 0,
      isEmpty: false,
    };

    products.forEach((product) => {
      if (!product.category || !product.price || !product.inventory) {
        console.warn("⚠️  Product missing required fields:", product._id);
        return;
      }

      if (!summary.categories[product.category]) {
        summary.categories[product.category] = {
          count: 0,
          totalValue: 0,
          avgPrice: 0,
        };
      }
      summary.categories[product.category].count++;
      summary.categories[product.category].totalValue +=
        product.price * (product.inventory.quantity || 0);

      if (product.inventory.quantity < 3) {
        summary.lowStock.push({
          name: product.name || "Unknown Product",
          quantity: product.inventory.quantity || 0,
          category: product.category,
        });
      }

      if (product.metrics && product.metrics.purchases > 0) {
        summary.topSellers.push({
          name: product.name || "Unknown Product",
          purchases: product.metrics.purchases || 0,
          views: product.metrics.views || 0,
        });
      }

      summary.totalValue += product.price * (product.inventory.quantity || 0);
    });

    Object.keys(summary.categories).forEach((cat) => {
      const catData = summary.categories[cat];
      if (catData.count > 0) {
        catData.avgPrice = Math.round(catData.totalValue / catData.count);
      }
    });

    summary.topSellers.sort((a, b) => b.purchases - a.purchases);
    summary.topSellers = summary.topSellers.slice(0, 5);

    console.log("✅ Inventory context loaded:", {
      totalProducts: summary.totalProducts,
      categories: Object.keys(summary.categories).length,
      lowStock: summary.lowStock.length,
      topSellers: summary.topSellers.length,
    });

    return summary;
  } catch (error) {
    console.error("❌ Error getting inventory context:", error);
    return {
      totalProducts: 0,
      categories: {},
      lowStock: [],
      topSellers: [],
      totalValue: 0,
      isEmpty: true,
      error: error.message,
    };
  }
}

/**
 * Get recent orders context for AI
 */
async function getOrdersContext(userId, userRole) {
  try {
    let orders;

    if (userRole === "artisan") {
      orders = await Order.find({ "items.artisan": userId })
        .select("orderNumber status totals.total createdAt")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
    } else if (userRole === "admin") {
      orders = await Order.find({})
        .select("orderNumber status totals.total createdAt")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
    } else {
      orders = await Order.find({ customer: userId })
        .select("orderNumber status totals.total createdAt")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
    }

    if (!orders || orders.length === 0) {
      console.log("⚠️  No orders found for context");
      return {
        totalOrders: 0,
        statusBreakdown: {},
        totalRevenue: 0,
        recentOrders: [],
        isEmpty: true,
      };
    }

    const summary = {
      totalOrders: orders.length,
      statusBreakdown: {},
      totalRevenue: 0,
      recentOrders: [],
      isEmpty: false,
    };

    orders.forEach((order) => {
      if (!order.status || !order.totals) {
        console.warn("⚠️  Order missing required fields:", order._id);
        return;
      }

      summary.statusBreakdown[order.status] =
        (summary.statusBreakdown[order.status] || 0) + 1;
      summary.totalRevenue += order.totals.total || 0;
      summary.recentOrders.push({
        orderNumber: order.orderNumber || "Unknown",
        status: order.status,
        total: order.totals.total || 0,
        date: order.createdAt,
      });
    });

    console.log("✅ Orders context loaded:", {
      totalOrders: summary.totalOrders,
      totalRevenue: summary.totalRevenue,
    });

    return summary;
  } catch (error) {
    console.error("❌ Error getting orders context:", error);
    return {
      totalOrders: 0,
      statusBreakdown: {},
      totalRevenue: 0,
      recentOrders: [],
      isEmpty: true,
      error: error.message,
    };
  }
}

/**
 * Build system prompt with context
 */
function buildSystemPrompt(userRole, inventoryContext, ordersContext) {
  let prompt = `You are Zema AI (ዜማ AI), an intelligent, friendly, and professional AI assistant for EthioCraft Global — an e-commerce platform connecting Ethiopian artisans with global customers.

YOUR IDENTITY & ROLE:
- Name: Zema AI (ዜማ AI)
- Tone: Polite, warm, respectful, and professional at all times.
- Purpose: Help ${userRole}s and customers with product inquiries, price details, inventory insights, cultural background, and platform support.

CRITICAL AMHARIC (አማርኛ) SYSTEM INSTRUCTIONS:
1. 🔴 NATIVE FLUENCY & GRAMMAR:
   - Write in natural, grammatically sound, and fluent native Amharic using standard Subject-Object-Verb (SOV) sentence structure. NEVER translate word-for-word from English.
   - Punctuation: Use standard spaces between words. NEVER place "፡" (ሁለት ነጥብ) after words or sentences. End complete sentences ONLY with "።" (አራት ነጥብ - Arat Neteb).
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

TERMINOLOGY CONSISTENCY:
- Keep "EthioCraft Global" unchanged in all languages (brand name)
- Keep "Zema AI" / "ዜማ AI" unchanged in all languages (AI assistant name)
- Translate technical terms appropriately:
  * Inventory → አክሲዮን (Amharic), Kuusaa (Afaan Oromoo), ንብረት (Tigrinya)
  * Sales → ሽያጭ (Amharic), Gurgurtaa (Afaan Oromoo), ሽያጥ (Tigrinya)
  * Products → ምርቶች (Amharic), Oomishaalee (Afaan Oromoo), ፍርያት (Tigrinya)
  * Orders → ትዕዛዞች (Amharic), Ajajawwan (Afaan Oromoo), ትእዛዛት (Tigrinya)
  * Revenue → ገቢ (Amharic), Galii (Afaan Oromoo), እቶት (Tigrinya)

CAPABILITIES:
- Analyze product inventory and sales data
- Provide recommendations for pricing, restocking, and marketing
- Answer questions about Ethiopian traditional crafts
- Help with order management and customer service
- Suggest product improvements and new ideas
- Support multilingual communication across Ethiopian languages

`;

  if (inventoryContext && !inventoryContext.isEmpty) {
    prompt += `\nCURRENT INVENTORY DATA:
- Total Products: ${inventoryContext.totalProducts}
- Total Inventory Value: ${inventoryContext.totalValue.toFixed(2)} ETB
- Categories: ${Object.keys(inventoryContext.categories).join(", ") || "None"}

`;

    if (Object.keys(inventoryContext.categories).length > 0) {
      prompt += `Category Breakdown:
${Object.entries(inventoryContext.categories)
  .map(
    ([cat, data]) =>
      `  • ${cat}: ${data.count} items, Avg Price: ${data.avgPrice} ETB`,
  )
  .join("\n")}

`;
    }

    if (inventoryContext.lowStock.length > 0) {
      prompt += `LOW STOCK ALERTS:
${inventoryContext.lowStock
  .map(
    (item) =>
      `  ⚠️ ${item.name} (${item.category}): Only ${item.quantity} left`,
  )
  .join("\n")}

`;
    }

    if (inventoryContext.topSellers.length > 0) {
      prompt += `TOP SELLERS:
${inventoryContext.topSellers
  .map(
    (item, i) =>
      `  ${i + 1}. ${item.name}: ${item.purchases} sales, ${item.views} views`,
  )
  .join("\n")}

`;
    }
  } else {
    prompt += `\nNOTE: No inventory data available at the moment. You can still provide general advice about Ethiopian crafts and business strategies.\n\n`;
  }

  if (ordersContext && !ordersContext.isEmpty) {
    prompt += `RECENT ORDERS DATA:
- Total Orders: ${ordersContext.totalOrders}
- Total Revenue: ${ordersContext.totalRevenue.toFixed(2)} ETB
- Status Breakdown: ${Object.entries(ordersContext.statusBreakdown)
      .map(([status, count]) => `${status}: ${count}`)
      .join(", ")}

Recent Orders:
${ordersContext.recentOrders
  .slice(0, 5)
  .map(
    (order) => `  • ${order.orderNumber}: ${order.status}, ${order.total} ETB`,
  )
  .join("\n")}

`;
  } else {
    prompt += `NOTE: No order data available at the moment.\n\n`;
  }

  prompt += `
RESPONSE GUIDELINES:
1. 🔴 FIRST: Detect the language of the user's question (Amharic, Afaan Oromoo, Tigrinya, or English)
2. 🔴 THEN: Respond ENTIRELY in that same language - NO EXCEPTIONS
3. 🔴 USE: Proper punctuation ("።" for full stops in Amharic, standard spaces) and honorifics
4. Always reference actual data when answering questions
5. Provide actionable insights and recommendations
6. If asked about specific products, mention them by name
7. For pricing questions, consider Ethiopian market context
8. Suggest cultural storytelling to enhance product appeal
9. Keep responses under 300 words unless detailed analysis is requested

IMPORTANT:
- Only answer questions related to EthioCraft Global, Ethiopian crafts, or business operations
- If asked about unrelated topics, politely redirect to craft-related questions (in the user's language)
- Never make up data - only use the provided inventory and order information
- If you don't have enough data, say so and suggest what information would help
- 🔴 REMEMBER: Match the user's language EXACTLY (Amharic ↔ Amharic, Afaan Oromoo ↔ Afaan Oromoo, Tigrinya ↔ Tigrinya, English ↔ English)
- 🔴 RESPECT: Use appropriate honorifics and formal language for each Ethiopian language
- 🔴 CONSISTENCY: Keep brand names (EthioCraft Global, ZemaAI) unchanged across all languages

Now, respond to the user's question based on this context.`;

  return prompt;
}

/**
 * @route   POST /api/zema-ai/chat
 * @desc    Send message to ZemaAI and get response
 * @access  Private (Authenticated users)
 */
exports.sendMessage = asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { message, conversationHistory = [] } = req.body;

  console.log("📨 ZemaAI chat request received:", {
    user: req.user && req.user._id,
    role: req.user && req.user.role,
    messageLength: message?.length,
  });

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({
      error: "Validation failed",
      message: "Message is required and must be a non-empty string",
      code: "INVALID_MESSAGE",
    });
  }

  if (message.length > 2000) {
    return res.status(400).json({
      error: "Validation failed",
      message: "Message cannot exceed 2000 characters",
      code: "MESSAGE_TOO_LONG",
    });
  }

  try {
    // Load context data first
    const inventoryContext = await getInventoryContext(
      req.user && req.user._id,
      req.user && req.user.role,
    );
    const ordersContext = await getOrdersContext(
      req.user && req.user._id,
      req.user && req.user.role,
    );

    const systemPrompt = buildSystemPrompt(
      req.user && req.user.role ? req.user.role : "user",
      inventoryContext,
      ordersContext,
    );

    console.log("🤖 Initializing Groq AI...");
    const groq = getGroqAI();
    const aiModelName = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";

    console.log("💬 Generating response with Groq...");
    const chatCompletion = await groq.chat.completions.create({
      model: aiModelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    const aiText =
      chatCompletion?.choices?.[0]?.message?.content ||
      chatCompletion?.choices?.[0]?.text ||
      "";

    // Log AI operation (best-effort)
    try {
      await logAIOperation({
        userId: req.user && req.user._id,
        endpoint: "chat",
        request: message,
        response: aiText,
        model: aiModelName,
      });
    } catch (logErr) {
      console.warn("⚠️ Failed to record AI log:", logErr.message || logErr);
    }

    const duration = Date.now() - startTime;
    return res.json({
      success: true,
      reply: (aiText || "").trim(),
      model: aiModelName,
      durationMs: duration,
    });
  } catch (error) {
    console.error("❌ ZemaAI chat error:", error);
    if (
      error &&
      error.message &&
      error.message.toLowerCase().includes("rate")
    ) {
      return res.status(429).json({
        error: "Rate limit",
        message: "Too many requests. Please try again later.",
        code: "RATE_LIMIT_EXCEEDED",
      });
    }
    return res.status(500).json({
      error: "AI_ERROR",
      message: "Failed to generate response",
      details: error && error.message,
    });
  }
});

// --------------------------------------------------
// Helper endpoint: generate product description from title & tags
// --------------------------------------------------
exports.generateDescription = asyncHandler(async (req, res) => {
  const { title, tags = [] } = req.body;

  // 1. Validation
  if (!title || title.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: "እባክዎ መጀመሪያ የምርቱን ስም ያስገቡ",
    });
  }

  try {
    // 2. Initialize Groq
    const groq = getGroqAI();

    // 3. Build the Prompt (ለ AI የሚሰጥ ትዕዛዝ)
    const prompt =
      `Write a concise, catchy product description (2-3 sentences) for an Ethiopian artisan item titled "${title}". ` +
      (tags.length
        ? `Include these cultural aspects: ${tags.join(", ")}. `
        : "") +
      `Focus on craftsmanship and cultural significance.`;

    // 4. Call Groq API
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are an expert copywriter for EthioCraft Global. Write in a professional and culturally appreciative tone.",
        },
        { role: "user", content: prompt },
      ],
      model: process.env.GROQ_MODEL || "qwen/qwen3.8-27b",
      temperature: 0.7,
    });

    const description = chatCompletion.choices[0]?.message?.content || "";

    // 5. Send Result back to Dashboard
    res.json({
      success: true,
      description: description.trim(),
    });
  } catch (error) {
    console.error("❌ Groq Description Error:", error);
    res.status(500).json({
      success: false,
      message: "AI description service is temporarily unavailable",
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/zema-ai/retry
 * @desc    Failed የሆኑ የ AI ጥያቄዎችን እንደገና መሞከሪያ
 * @access  Private (Admin Only)
 */
exports.retryAI = asyncHandler(async (req, res) => {
  const { originalQuery, contextType } = req.body;

  if (!originalQuery) {
    return res
      .status(400)
      .json({ success: false, message: "ኦሪጅናል ጥያቄው አልተገኘም" });
  }

  try {
    const groq = getGroqAI();

    // ለ Admin Dashboard የሚሆን ልዩ System Prompt
    const systemPrompt = `You are ZemaAI Admin Monitor Assistant. 
    Analyze and respond to the following admin query professionally: ${originalQuery}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: originalQuery },
      ],
      model: process.env.GROQ_MODEL || "qwen/qwen3.8-27b",
    });

    const newResponse = chatCompletion.choices[0]?.message?.content || "";

    res.json({
      success: true,
      newResponse: newResponse.trim(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "እንደገና መሞከሩ አልተሳካም",
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/zema-ai/suggestions
 * @desc    Get AI-powered suggestions for the user
 * @access  Private
 */
exports.getSuggestions = asyncHandler(async (req, res) => {
  const suggestions = {
    general: [
      "What are my top-selling products?",
      "Which items are low in stock?",
      "Show me my recent orders",
      "What's my total inventory value?",
      "Give me pricing recommendations",
    ],
    artisan: [
      "How can I improve my product descriptions?",
      "What categories are most popular?",
      "Suggest new product ideas based on trends",
      "How should I price my new textile?",
      "Tips for photographing my crafts",
    ],
    customer: [
      "Tell me about Ethiopian traditional textiles",
      "What's the cultural significance of basketry?",
      "Recommend products for home decoration",
      "Explain the crafting process of leather goods",
      "What makes Ethiopian jewelry unique?",
    ],
    admin: [
      "Overall platform performance summary",
      "Which artisans need support?",
      "Product category distribution analysis",
      "Revenue trends and insights",
      "Inventory optimization recommendations",
    ],
  };

  const userSuggestions = suggestions[req.user.role] || suggestions.general;

  res.json({
    suggestions: userSuggestions,
    type: req.user.role,
  });
});

/**
 * @route   POST /api/zema-ai/analyze-product
 * @desc    Get AI analysis and recommendations for a specific product
 * @access  Private (Artisan/Admin)
 */
exports.analyzeProduct = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  console.log("📊 Product analysis request:", {
    productId,
    user: req.user._id,
  });

  if (!productId) {
    return res.status(400).json({
      error: "Validation failed",
      message: "Product ID is required",
      code: "MISSING_PRODUCT_ID",
    });
  }

  const product = await Product.findById(productId).populate(
    "artisan",
    "profile.firstName profile.lastName",
  );

  if (!product) {
    return res.status(404).json({
      error: "Not found",
      message: "Product not found",
      code: "PRODUCT_NOT_FOUND",
    });
  }

  if (
    req.user.role === "artisan" &&
    product.artisan._id.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({
      error: "Forbidden",
      message: "You can only analyze your own products",
      code: "FORBIDDEN",
    });
  }

  try {
    const genAI = getGeminiAI();
    const aiModelName = "gemini-1.5-flash";
    const model = genAI.getGenerativeModel({ model: aiModelName });

    const analysisPrompt = `Analyze this Ethiopian artisan product and provide recommendations:

Product: ${product.name}
Category: ${product.category}
Price: ${product.price} ETB
Description: ${product.description}
Inventory: ${product.inventory.quantity} units
Views: ${product.metrics.views}
Purchases: ${product.metrics.purchases}
Cart Adds: ${product.metrics.cartAdds}

Provide a brief analysis covering:
1. Pricing assessment (is it competitive?)
2. Description quality (is it compelling?)
3. Marketing suggestions (how to increase visibility)
4. Inventory recommendations (stock levels)
5. Cultural storytelling opportunities

Keep response under 250 words, be specific and actionable.`;

    console.log("⏳ Sending product analysis request to Gemini...");
    const result = await model.generateContent(analysisPrompt);
    const analysis = result.response.text();

    console.log("✅ Product analysis received");

    res.json({
      success: true,
      product: {
        id: product._id,
        name: product.name,
        category: product.category,
      },
      analysis,
      metrics: {
        views: product.metrics.views,
        purchases: product.metrics.purchases,
        cartAdds: product.metrics.cartAdds,
        conversionRate:
          product.metrics.views > 0
            ? (
                (product.metrics.purchases / product.metrics.views) *
                100
              ).toFixed(2) + "%"
            : "0%",
      },
    });
  } catch (error) {
    console.error("❌ Product analysis error:", {
      message: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: "Analysis failed",
      message: "Failed to analyze product. Please try again.",
      code: "ANALYSIS_ERROR",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   POST /api/zema-ai/analyze-reviews
 * @desc    Analyze product reviews and generate sentiment summary
 * @access  Public
 */
exports.analyzeReviews = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  console.log("📊 Review analysis request:", { productId });

  if (!productId) {
    return res.status(400).json({
      error: "Validation failed",
      message: "Product ID is required",
      code: "MISSING_PRODUCT_ID",
    });
  }

  const product = await Product.findById(productId).select(
    "name category reviews metrics.averageRating metrics.reviewCount",
  );

  if (!product) {
    return res.status(404).json({
      error: "Not found",
      message: "Product not found",
      code: "PRODUCT_NOT_FOUND",
    });
  }

  if (!product.reviews || product.reviews.length === 0) {
    return res.json({
      success: true,
      summary: "No reviews yet for this product.",
      sentiment: "neutral",
      badge: null,
      culturalContext: null,
    });
  }

  try {
    const genAI = getGeminiAI();
    const aiModelName = "gemini-1.5-flash";
    const model = genAI.getGenerativeModel({ model: aiModelName });

    const reviewsText = product.reviews
      .map((r, i) => `Review ${i + 1} (${r.rating}⭐): ${r.comment}`)
      .join("\n");

    const analysisPrompt = `Analyze these customer reviews for an Ethiopian ${product.category} product called "${product.name}":

${reviewsText}

Average Rating: ${product.metrics.averageRating.toFixed(1)}/5 (${product.reviews.length} reviews)

Provide:
1. A 1-2 sentence summary of overall customer sentiment
2. Key positive themes mentioned
3. Any concerns or negative feedback
4. Cultural context: How do customers appreciate the Ethiopian ${product.category} craftsmanship?
5. A short badge text (max 4 words) like "Top Rated by Customers" or "Authentic Craftsmanship" or "Highly Recommended"

Format your response as JSON:
{
  "summary": "brief overall sentiment",
  "positives": ["theme1", "theme2"],
  "concerns": ["concern1"] or [],
  "culturalContext": "how customers value the Ethiopian cultural aspect",
  "badge": "short badge text",
  "sentiment": "positive" or "neutral" or "negative"
}`;

    console.log("⏳ Sending review analysis request to Gemini...");
    const result = await model.generateContent(analysisPrompt);
    let analysisText = result.response.text();

    // Clean up the response to extract JSON
    analysisText = analysisText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.warn("⚠️  Failed to parse JSON, using fallback");
      analysis = {
        summary: analysisText.substring(0, 200),
        positives: [],
        concerns: [],
        culturalContext: `Customers appreciate the authentic Ethiopian ${product.category} craftsmanship.`,
        badge:
          product.metrics.averageRating >= 4.5
            ? "🔥 Top Rated"
            : "⭐ Customer Favorite",
        sentiment: product.metrics.averageRating >= 4 ? "positive" : "neutral",
      };
    }

    console.log("✅ Review analysis received");

    res.json({
      success: true,
      ...analysis,
      metrics: {
        averageRating: product.metrics.averageRating,
        reviewCount: product.reviews.length,
      },
    });
  } catch (error) {
    console.error("❌ Review analysis error:", {
      message: error.message,
      stack: error.stack,
    });

    // Fallback response
    res.json({
      success: true,
      summary: `Customers rate this ${product.category} product ${product.metrics.averageRating.toFixed(1)}/5 stars.`,
      sentiment: product.metrics.averageRating >= 4 ? "positive" : "neutral",
      badge:
        product.metrics.averageRating >= 4.5
          ? "🔥 Top Rated"
          : "⭐ Customer Favorite",
      culturalContext: `Authentic Ethiopian ${product.category} craftsmanship.`,
      positives: [],
      concerns: [],
      metrics: {
        averageRating: product.metrics.averageRating,
        reviewCount: product.reviews.length,
      },
    });
  }
});

module.exports = exports;
