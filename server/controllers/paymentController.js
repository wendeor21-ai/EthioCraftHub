/**
 * Payment Controller for EthioCraft Global
 *
 * Handles payment processing with Chapa payment gateway
 * Features:
 * - Initialize payment with Chapa
 * - Verify payment callback
 * - Create order after successful payment
 * - Handle payment webhooks
 */

const User = require("../models/User");
const Order = require("../models/Order");
const Product = require("../models/Product");
const axios = require("axios");
const crypto = require("crypto");

// Chapa API configuration
const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY;
const CHAPA_API_URL = "https://api.chapa.co/v1";
const CALLBACK_URL =
  process.env.CHAPA_CALLBACK_URL || "http://localhost:3000/payment/callback";
const RETURN_URL =
  process.env.CHAPA_RETURN_URL || "http://localhost:3000/payment/success";

// Validate Chapa configuration on module load
if (!CHAPA_SECRET_KEY) {
  console.error(
    "❌ CRITICAL: CHAPA_SECRET_KEY is missing from environment variables!",
  );
  console.error(
    "❌ Payment initialization will fail. Please add CHAPA_SECRET_KEY to your .env file",
  );
}

/**
 * Initialize payment with Chapa
 * @route POST /api/payment/initialize
 * @access Private
 */
exports.initializePayment = async (req, res) => {
  try {
    // Validate Chapa API key is configured
    if (!CHAPA_SECRET_KEY) {
      console.error("❌ CHAPA_SECRET_KEY is not configured");
      return res.status(500).json({
        success: false,
        message: "Payment system is not configured. Please contact support.",
      });
    }

    const { shippingAddressId, items, paymentMethod = 'CHAPA', cartId } = req.body; // FIX: Accept items, method, and cartId
    const userId = req.user._id;

    console.log("💳 Initialize payment - User ID:", userId);
    console.log("📦 Shipping Address ID:", shippingAddressId);
    console.log("🛒 Items from frontend:", items?.length || 0);
    // Debug: log full request body (safe to remove in production)
    console.log("📥 Full initialize request body:", JSON.stringify(req.body));

    // Validate shipping address
    if (!shippingAddressId) {
      return res.status(400).json({
        success: false,
        message: "Shipping address is required",
      });
    }

    // Validate items from frontend
    if (!items || items.length === 0) {
      console.log("❌ No items provided in request");
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    // Get user for shipping address validation
    const user = await User.findById(userId);

    console.log("👤 User found:", user ? user.email : "Not found");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Validate shipping address exists and is valid
    if (!shippingAddressId) {
      return res.status(400).json({
        success: false,
        message: "Shipping address ID is required",
      });
    }

    const shippingAddress = user.shippingAddresses.id(shippingAddressId);
    if (!shippingAddress) {
      return res.status(404).json({
        success: false,
        message: "Shipping address not found",
      });
    }

    // FIX 1: Extract product IDs safely from items
    const productIds = items
      .map((item) => {
        // Handle different possible structures - frontend sends { productId, quantity, price }
        if (item.productId) return item.productId;
        if (item._id) return item._id;
        if (item.product && item.product._id) return item.product._id;
        return null;
      })
      .filter((id) => id !== null); // Remove any null values

    console.log("🔍 Product IDs to fetch:", productIds);
    console.log(
      "📦 Items structure:",
      items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    );

    // FIX 2: Fetch products and verify they exist
    const products = await Product.find({ _id: { $in: productIds } }).select(
      "_id name price status inventory artisan",
    );

    console.log("📦 Products fetched from DB:", products.length);
    console.log(
      "📦 Product IDs from DB:",
      products.map((p) => p._id.toString()),
    );

    // FIX 3: Ensure products were found
    if (products.length === 0) {
      console.log("❌ No products found in database for IDs:", productIds);
      return res.status(400).json({
        success: false,
        message:
          "No valid products found in database. Please refresh your cart.",
      });
    }

    // Create a map for quick lookup
    const productMap = {};
    products.forEach((p) => {
      productMap[p._id.toString()] = p;
    });

    console.log("📦 Product IDs in map:", Object.keys(productMap));

    // FIX: Validate all products and calculate totals using DB prices safely
    const unavailableProducts = [];
    let subtotal = 0;

    for (const item of items) {
      // FIX: Extract product ID - frontend sends { productId, quantity, price }
      let itemId = null;

      if (item.productId) {
        itemId =
          typeof item.productId === "string"
            ? item.productId
            : item.productId.toString();
      } else if (item._id) {
        itemId = typeof item._id === "string" ? item._id : item._id.toString();
      } else if (item.product && item.product._id) {
        itemId =
          typeof item.product._id === "string"
            ? item.product._id
            : item.product._id.toString();
      }

      if (!itemId) {
        console.log("❌ Item has no valid product ID:", JSON.stringify(item));
        unavailableProducts.push(`Invalid product data`);
        continue;
      }

      console.log("🔍 Looking for product ID:", itemId);
      const product = productMap[itemId];

      if (!product) {
        console.log("❌ Product not found in map for ID:", itemId);
        console.log("❌ Available IDs in map:", Object.keys(productMap));
        unavailableProducts.push(`Product not found (ID: ${itemId})`);
        continue;
      }

      console.log("✅ Product found:", product.name, "Price:", product.price);
      console.log("📊 Product status:", product.status);
      console.log("📦 Product inventory:", product.inventory);
      console.log("🔢 Requested quantity:", item.quantity);

      if (product.status !== "active") {
        console.log(
          "❌ Product status check failed:",
          product.status,
          "!== active",
        );
        unavailableProducts.push(`${product.name} is no longer available`);
        continue;
      }

      if (product.inventory.quantity < item.quantity) {
        console.log(
          "❌ Inventory check failed:",
          product.inventory.quantity,
          "<",
          item.quantity,
        );
        unavailableProducts.push(
          `${product.name} (only ${product.inventory.quantity} available)`,
        );
        continue;
      }

      console.log("✅ All validations passed for:", product.name);

      // Use price from database, not from frontend (security)
      subtotal += product.price * item.quantity;
      console.log(
        "💰 Added to subtotal:",
        product.price * item.quantity,
        "New subtotal:",
        subtotal,
      );
    }

    if (unavailableProducts.length > 0) {
      console.log("❌ Unavailable products detected:", unavailableProducts);
      return res.status(400).json({
        success: false,
        message: "Some products are no longer available",
        unavailableProducts,
      });
    }

    console.log("✅ All products validated successfully!");

    // Calculate totals
    const shipping = subtotal >= 1000 ? 0 : 50;
    const tax = Math.round(subtotal * 0.15 * 100) / 100;
    const total = subtotal + shipping + tax;

    console.log("💰 Totals:", { subtotal, shipping, tax, total });

    // Generate unique transaction reference
    const txRef = `EC-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    // FIX: Safely prepare items for metadata
    const metaItems = items.map((item) => {
      let productId = item.productId || item._id;
      if (productId && typeof productId !== "string") {
        productId = productId.toString();
      }
      return {
        productId: productId,
        quantity: item.quantity,
        selectedOptions: item.selectedOptions || {},
        selectedColor: item.selectedColor || null,
        selectedSize: item.selectedSize || null
      };
    });

    // Validate required fields for payment gateway
    if (!user.email) {
      console.error("❌ Missing user email for payment");
      return res.status(400).json({
        success: false,
        message: "User email is required for payment",
      });
    }

    // Validate email format before sending to Chapa (simple RFC-like check)
    const isValidEmail = (email) => {
      if (!email || typeof email !== "string") return false;
      // basic validation: local@domain.tld (no spaces)
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
    };

    if (!isValidEmail(user.email)) {
      console.error("❌ Invalid user email format for payment:", user.email);
      return res.status(400).json({
        success: false,
        message:
          "Invalid email address for payment. Please update your account email.",
        detail: { field: "email", value: user.email },
      });
    }

    // Prepare numeric amount (ensure number, not string)
    const amountNumber = Number((Math.round(total * 100) / 100).toFixed(2));
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      console.error("❌ Invalid payment amount:", amountNumber);
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment amount" });
    }

    // Supported currencies (extend if needed)
    const currency = "ETB";
    const supportedCurrencies = ["ETB", "USD"];
    if (!supportedCurrencies.includes(currency)) {
      console.error("❌ Unsupported currency:", currency);
      return res
        .status(400)
        .json({ success: false, message: "Unsupported currency" });
    }

    // Prepare Chapa payment request (amount is a number)
    const chapaPayload = {
      amount: amountNumber,
      currency,
      email: user.email,
      first_name: shippingAddress.firstName,
      last_name: shippingAddress.lastName,
      phone_number:
        shippingAddress && shippingAddress.phone
          ? shippingAddress.phone.replace(/\+/g, "")
          : "",
      tx_ref: txRef,
      callback_url: `${CALLBACK_URL}?tx_ref=${txRef}`,
      return_url: `${RETURN_URL}?tx_ref=${txRef}`,
      description: `Order payment for ${items.length} item(s) - EthioCraft Global`,
      meta: {
        userId: userId.toString(),
        shippingAddressId: shippingAddressId.toString(),
        itemCount: items.length,
        subtotal: subtotal.toFixed(2),
        shipping: shipping.toFixed(2),
        tax: tax.toFixed(2),
        items: JSON.stringify(metaItems),
      },
    };

    console.log("📤 Chapa payload prepared:", {
      amount: chapaPayload.amount,
      email: chapaPayload.email,
      phone: chapaPayload.phone_number,
      txRef,
      hasMeta: !!chapaPayload.meta,
    });

    // Check for existing pending order with the same cartId to prevent duplicates
    let order;
    if (cartId) {
      order = await Order.findOne({ 
        customer: userId, 
        cartId: cartId, 
        status: 'pending' 
      });
      
      if (order) {
        console.log("🔄 Found existing pending order, updating instead of creating:", order._id);
        order.items = items.map((item) => {
          let pid = item.productId || item._id || (item.product && item.product._id);
          if (pid && typeof pid !== "string") pid = pid.toString();
          const product = productMap[pid];
          return {
            product: pid,
            artisan: item.artisan || product?.artisan || null,
            quantity: item.quantity,
            price: product ? product.price : 0,
            status: "pending",
            selectedOptions: item.selectedOptions ? Object.entries(item.selectedOptions).map(([k, v]) => ({ name: k, value: v })) : [],
            color: item.selectedColor || null,
            size: item.selectedSize || null
          };
        });
        order.totals = { subtotal, tax, shipping, total };
        order.shippingAddress = {
          firstName: shippingAddress.firstName,
          lastName: shippingAddress.lastName,
          street: shippingAddress.street,
          city: shippingAddress.city,
          region: shippingAddress.region,
          country: shippingAddress.country,
          postalCode: shippingAddress.postalCode || "",
          phone: shippingAddress.phone,
        };
        order.payment = {
          method: paymentMethod,
          status: paymentMethod === 'COD' ? 'unpaid' : 'pending',
          transactionId: paymentMethod === 'CHAPA' ? txRef : `EC-${Date.now()}`,
          amount: total,
          currency: "ETB",
        };
        await order.save();
      }
    }

    if (!order) {
      order = await Order.create({
        customer: userId,
        cartId,
        items: items.map((item) => {
          let pid = item.productId || item._id || (item.product && item.product._id);
          if (pid && typeof pid !== "string") pid = pid.toString();
          const product = productMap[pid];
          return {
            product: pid,
            artisan: item.artisan || product?.artisan || null,
            quantity: item.quantity,
            price: product ? product.price : 0,
            status: "pending",
            selectedOptions: item.selectedOptions ? Object.entries(item.selectedOptions).map(([k, v]) => ({ name: k, value: v })) : [],
            color: item.selectedColor || null,
            size: item.selectedSize || null
          };
        }),
        totals: {
          subtotal,
          tax,
          shipping,
          total,
        },
        shippingAddress: {
          firstName: shippingAddress.firstName,
          lastName: shippingAddress.lastName,
          street: shippingAddress.street,
          city: shippingAddress.city,
          region: shippingAddress.region,
          country: shippingAddress.country,
          postalCode: shippingAddress.postalCode || "",
          phone: shippingAddress.phone,
        },
        payment: {
          method: paymentMethod,
          status: paymentMethod === 'COD' ? 'unpaid' : 'pending',
          transactionId: paymentMethod === 'CHAPA' ? txRef : `EC-${Date.now()}`,
          amount: total,
          currency: "ETB",
        },
        status: "pending",
      });
    }

    const pendingOrder = order;

    console.log("📝 Order created:", pendingOrder._id, "Method:", paymentMethod);

    // If it's NOT CHAPA, we are done - return success so frontend can redirect to success page
    if (paymentMethod !== 'CHAPA') {
      // Update product inventory immediately for non-online payments
      for (const item of items) {
        let pid = item.productId || item._id || (item.product && item.product._id);
        await Product.findByIdAndUpdate(pid, {
          $inc: { "inventory.quantity": -item.quantity }
        });
      }

      return res.status(200).json({
        success: true,
        message: "Order placed successfully",
        data: {
          order: pendingOrder,
          orderNumber: pendingOrder.orderNumber,
          redirect: '/order-success'
        }
      });
    }

    // Initialize payment with Chapa
    const chapaResponse = await axios.post(
      `${CHAPA_API_URL}/transaction/initialize`,
      chapaPayload,
      {
        headers: {
          Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (chapaResponse.data.status === "success") {
      console.log("✅ Payment initialized successfully");

      res.status(200).json({
        success: true,
        message: "Payment initialized successfully",
        data: {
          checkoutUrl: chapaResponse.data.data.checkout_url,
          txRef: txRef,
        },
      });
    } else {
      throw new Error("Failed to initialize payment with Chapa");
    }
  } catch (error) {
    console.error("❌ Payment initialization error:", error.message || error);

    // Log detailed Chapa error response
    if (error.response) {
      console.error("📛 Chapa Error Response:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    }

    const statusCode = error.response?.status || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to initialize payment",
      detail: error.response?.data || null,
    });
  }
};

/**
 * Verify payment and create order
 * @route GET /api/payment/verify/:txRef
 * @access Private
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { txRef } = req.params;
    const userId = req.user._id;

    console.log("\n═══════════════════════════════════════");
    console.log("🔍 PAYMENT VERIFICATION STARTED");
    console.log("═══════════════════════════════════════");
    console.log("👤 User ID:", userId);
    console.log("📝 Transaction Ref:", txRef);
    console.log("⏰ Timestamp:", new Date().toISOString());

    // Verify payment with Chapa
    console.log("📡 Calling Chapa API to verify payment...");
    const chapaResponse = await axios.get(
      `${CHAPA_API_URL}/transaction/verify/${txRef}`,
      {
        headers: {
          Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
        },
      },
    );

    console.log("📥 Chapa Response Status:", chapaResponse.data.status);
    console.log("💳 Payment Status:", chapaResponse.data.data?.status);
    console.log(
      "💰 Amount:",
      chapaResponse.data.data?.amount,
      chapaResponse.data.data?.currency,
    );

    if (
      chapaResponse.data.status === "success" &&
      chapaResponse.data.data.status === "success"
    ) {
      const paymentData = chapaResponse.data.data;

      console.log("✅ Payment verified successfully!");
      console.log("📦 Payment Method:", paymentData.method);
      console.log("📧 Customer Email:", paymentData.email);

      // Branch for Custom Order
      if (txRef.startsWith("CUST-")) {
          const CustomOrder = require("../models/CustomOrder");
          const customOrderId = paymentData.meta?.customOrderId;
          const order = await CustomOrder.findById(customOrderId);
          if (order) {
              order.status = "paid";
              await order.save();

              // Create shadow Order for integration
              let newOrder = await Order.findOne({ cartId: `custom-${customOrderId}` });
              if (!newOrder) {
                  const user = await User.findById(order.customer);
                  const shippingAddressId = paymentData.meta?.shippingAddressId;
                  
                  // Robust shipping address resolution
                  let shippingAddress = user && shippingAddressId ? user.shippingAddresses.id(shippingAddressId) : null;
                  if (!shippingAddress && user && user.shippingAddresses?.length > 0) {
                      // Fallback to default or first address if specified one is missing
                      shippingAddress = user.shippingAddresses.find(a => a.isDefault) || user.shippingAddresses[0];
                  }

                  if (!shippingAddress) {
                    console.error("❌ Critical: No shipping address found for custom order shadow creation");
                    // We still create it with placeholder to avoid losing the payment record, 
                    // but ideally, this shouldn't happen due to initialization check.
                  }

                  newOrder = await Order.create({
                      customer: order.customer,
                      cartId: `custom-${customOrderId}`,
                      items: [{
                          product: order.product || null,
                          artisan: order.artisan,
                          quantity: 1,
                          price: order.price,
                          status: 'pending',
                          isCustomOrder: true,
                          customOrderId: order._id
                      }],
                      totals: {
                        subtotal: order.price,
                        tax: Math.round(order.price * 0.15 * 100) / 100,
                        shipping: 0,
                        total: Math.round(order.price * 1.15 * 100) / 100,
                        platformCommission: order.commission,
                        artisanEarning: order.artisanEarning
                      },
                      shippingAddress: shippingAddress ? {
                        firstName: shippingAddress.firstName,
                        lastName: shippingAddress.lastName,
                        street: shippingAddress.street,
                        city: shippingAddress.city,
                        region: shippingAddress.region,
                        country: shippingAddress.country,
                        postalCode: shippingAddress.postalCode || "",
                        phone: shippingAddress.phone,
                      } : {
                        firstName: user?.profile?.firstName || "Customer",
                        lastName: user?.profile?.lastName || "Order",
                        street: "Address not found - Update Required",
                        city: "Pending",
                        region: "Pending",
                        country: "Ethiopia",
                        phone: user?.profile?.phone || "0000000000"
                      },
                      payment: {
                        method: "chapa",
                        status: "paid",
                        transactionId: paymentData.tx_ref,
                        amount: Math.round(order.price * 1.15 * 100) / 100,
                        currency: "ETB",
                        processedAt: new Date(),
                      },
                      status: "processing",
                      isCustom: true,
                      photos: order.photos
                  });
              }

              // Notify artisan
              const io = req.app.get('io');
              if (io && order.artisan) {
                io.to(`user_${order.artisan.toString()}`).emit('customOrderPaid', {
                   orderId: order._id,
                   message: 'Customer has completed payment. You can start production!'
                });
              }

              return res.status(200).json({
                success: true,
                message: "Custom order payment verified successfully",
                data: {
                  order: { ...order.toObject(), totals: { total: Math.round(order.price * 1.15 * 100) / 100 } },
                  orderNumber: newOrder.orderNumber,
                },
              });
          }
      }

      // Parse items from metadata
      let metaItems = [];
      try {
        if (paymentData.meta?.items) {
          metaItems = JSON.parse(paymentData.meta.items);
          console.log("🛒 Items from payment metadata:", metaItems.length);
          console.log("📦 Items:", metaItems);
        } else {
          console.log("⚠️  No items in payment metadata");
        }
      } catch (parseError) {
        console.error(
          "❌ Error parsing items from metadata:",
          parseError.message,
        );
        return res.status(400).json({
          success: false,
          message: "Invalid payment metadata",
        });
      }

      if (metaItems.length === 0) {
        console.log("❌ No items found in payment metadata");
        return res.status(400).json({
          success: false,
          message: "No items found in payment data",
        });
      }

      // Get user
      const user = await User.findById(userId);
      if (!user) {
        console.log("❌ User not found");
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      console.log("👤 User found:", user.email);

      // Get shipping address from payment metadata
      const shippingAddressId = paymentData.meta?.shippingAddressId;

      if (!shippingAddressId) {
        console.log("❌ No shipping address ID in payment metadata");
        return res.status(400).json({
          success: false,
          message: "Shipping address not found in payment data",
        });
      }

      const shippingAddress = user.shippingAddresses.id(shippingAddressId);

      if (!shippingAddress) {
        console.log("❌ Shipping address not found for ID:", shippingAddressId);
        return res.status(404).json({
          success: false,
          message: "Shipping address not found",
        });
      }

      console.log(
        "📍 Shipping address:",
        `${shippingAddress.city}, ${shippingAddress.region}`,
      );

      // Fetch products from database
      const productIds = metaItems.map((item) => item.productId);
      const products = await Product.find({ _id: { $in: productIds } }).select(
        "_id name price artisan",
      );

      console.log("📦 Products fetched:", products.length);

      // Prepare order items
      const orderItems = metaItems.map((metaItem) => {
        const product = products.find(
          (p) => p._id.toString() === metaItem.productId,
        );
        return {
          product: product._id,
          artisan: product.artisan,
          quantity: metaItem.quantity,
          price: product.price,
          status: "pending",
          selectedOptions: metaItem.selectedOptions ? Object.entries(metaItem.selectedOptions).map(([k, v]) => ({ name: k, value: v })) : [],
          color: metaItem.selectedColor || null,
          size: metaItem.selectedSize || null
        };
      });

      // Get totals from metadata with validation
      const subtotal = paymentData.meta?.subtotal
        ? parseFloat(paymentData.meta.subtotal)
        : 0;
      const shipping = paymentData.meta?.shipping
        ? parseFloat(paymentData.meta.shipping)
        : 0;
      const tax = paymentData.meta?.tax ? parseFloat(paymentData.meta.tax) : 0;
      const total = subtotal + shipping + tax;

      console.log("💰 Order Totals from metadata:", {
        subtotal,
        shipping,
        tax,
        total,
      });
      console.log("💰 Payment Amount from Chapa:", paymentData.amount);

      // Verify the total matches the payment amount
      const paymentAmount = parseFloat(paymentData.amount);
      if (Math.abs(total - paymentAmount) > 0.01) {
        console.log("⚠️  Warning: Total mismatch!", {
          calculated: total,
          paid: paymentAmount,
        });
        // Use the amount actually paid
        console.log("ℹ️  Using payment amount from Chapa:", paymentAmount);
      }

      // Check if order already created during initialization
      let order = await Order.findOne({ 
        customer: userId, 
        "payment.transactionId": txRef 
      });

      if (order) {
        console.log("🔄 Found existing pending order, updating payment status...");
        order.payment.status = "paid";
        order.payment.processedAt = new Date();
        order.status = "processing";
        // Ensure shipping address and items are up to date if meta changed
        // But usually initialization is sufficient
        await order.save();
      } else {
        console.log("📝 No existing order found, creating new one...");
        order = await Order.create({
          customer: userId,
          items: orderItems,
          totals: {
            subtotal,
            tax,
            shipping,
            total,
          },
          shippingAddress: {
            firstName: shippingAddress.firstName,
            lastName: shippingAddress.lastName,
            street: shippingAddress.street,
            city: shippingAddress.city,
            region: shippingAddress.region,
            country: shippingAddress.country,
            postalCode: shippingAddress.postalCode || "",
            phone: shippingAddress.phone,
          },
          payment: {
            method: "chapa",
            status: "paid",
            transactionId: paymentData.tx_ref,
            amount: total,
            currency: "ETB",
            processedAt: new Date(),
          },
          status: "confirmed",
        });
      }

      console.log("✅ Order created successfully!");
      console.log("📋 Order Number:", order.orderNumber);
      console.log("🆔 Order ID:", order._id);
      console.log("📊 Order Status:", order.status);
      console.log("💳 Payment Status:", order.payment.status);

      // Update product inventory and metrics
      console.log("📦 Updating product inventory...");
      for (const item of orderItems) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: {
            "inventory.quantity": -item.quantity,
            "metrics.purchases": item.quantity,
          },
        });
        console.log(`  ✅ Updated inventory for product ${item.product}`);
      }

      console.log("═══════════════════════════════════════");
      console.log("✅ PAYMENT VERIFICATION COMPLETED");
      console.log("═══════════════════════════════════════\n");

      res.status(200).json({
        success: true,
        message: "Payment verified and order created successfully",
        data: {
          order: order.summary,
          orderNumber: order.orderNumber,
        },
      });
    } else {
      console.log("❌ Payment verification failed");
      console.log("Status:", chapaResponse.data.data?.status);
      console.log("═══════════════════════════════════════\n");

      res.status(400).json({
        success: false,
        message: "Payment verification failed",
        status: chapaResponse.data.data?.status,
      });
    }
  } catch (error) {
    console.error("❌ Payment verification error:", error.message);
    console.error("Stack:", error.stack);
    console.log("═══════════════════════════════════════\n");

    res.status(500).json({
      success: false,
      message: "Failed to verify payment",
      error: error.message,
    });
  }
};

/**
 * Handle Chapa webhook callback
 * @route POST /api/payment/webhook
 * @access Public (but verified with signature)
 */
exports.handleWebhook = async (req, res) => {
  try {
    console.log("\n═══════════════════════════════════════");
    console.log("🔔 WEBHOOK RECEIVED FROM CHAPA");
    console.log("═══════════════════════════════════════");
    console.log("⏰ Timestamp:", new Date().toISOString());
    console.log("📦 Webhook Body:", JSON.stringify(req.body, null, 2));
    console.log("🔑 Headers:", JSON.stringify(req.headers, null, 2));

    const signature = req.headers["chapa-signature"];
    const payload = JSON.stringify(req.body);

    console.log("🔐 Verifying webhook signature...");
    console.log("📝 Signature from header:", signature);

    // Verify webhook signature
    const hash = crypto
      .createHmac("sha256", CHAPA_SECRET_KEY)
      .update(payload)
      .digest("hex");

    console.log("🔐 Computed hash:", hash);

    if (signature !== hash) {
      console.log("❌ Webhook signature verification FAILED!");
      console.log("═══════════════════════════════════════\n");
      return res.status(401).json({
        success: false,
        message: "Invalid webhook signature",
      });
    }

    console.log("✅ Webhook signature verified successfully!");

    const event = req.body;
    console.log("📋 Event Type:", event.event);
    console.log("📝 Transaction Ref:", event.data?.tx_ref);

    // Handle different event types
    switch (event.event) {
      case "charge.success":
        console.log("✅ PAYMENT SUCCESS EVENT");
        console.log("💰 Amount:", event.data?.amount, event.data?.currency);
        console.log("📧 Customer:", event.data?.email);
        console.log("📝 TX Ref:", event.data?.tx_ref);
        console.log("💳 Payment Method:", event.data?.method);
        console.log("📊 Status:", event.data?.status);

        // Note: Order should already be created by verify endpoint
        // This webhook is for confirmation/logging purposes
        console.log("ℹ️  Order should already be created via verify endpoint");
        break;

      case "charge.failed":
        console.log("❌ PAYMENT FAILED EVENT");
        console.log("📝 TX Ref:", event.data?.tx_ref);
        console.log("❌ Reason:", event.data?.message || "Unknown");
        console.log("📧 Customer:", event.data?.email);
        break;

      case "charge.pending":
        console.log("⏳ PAYMENT PENDING EVENT");
        console.log("📝 TX Ref:", event.data?.tx_ref);
        console.log("📧 Customer:", event.data?.email);
        break;

      default:
        console.log("❓ UNKNOWN WEBHOOK EVENT:", event.event);
        console.log("📦 Event Data:", JSON.stringify(event.data, null, 2));
    }

    console.log("═══════════════════════════════════════");
    console.log("✅ WEBHOOK PROCESSED SUCCESSFULLY");
    console.log("═══════════════════════════════════════\n");

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Webhook handling error:", error.message);
    console.error("Stack:", error.stack);
    console.log("═══════════════════════════════════════\n");

    res.status(500).json({
      success: false,
      message: "Webhook handling failed",
      error: error.message,
    });
  }
};

/**
 * Get payment status
 * @route GET /api/payment/status/:txRef
 * @access Private
 */
exports.getPaymentStatus = async (req, res) => {
  try {
    const { txRef } = req.params;

    console.log("📊 Checking payment status for:", txRef);

    const chapaResponse = await axios.get(
      `${CHAPA_API_URL}/transaction/verify/${txRef}`,
      {
        headers: {
          Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
        },
      },
    );

    if (chapaResponse.data.status === "success") {
      console.log(
        "✅ Payment status retrieved:",
        chapaResponse.data.data.status,
      );

      res.status(200).json({
        success: true,
        data: {
          status: chapaResponse.data.data.status,
          amount: chapaResponse.data.data.amount,
          currency: chapaResponse.data.data.currency,
          txRef: chapaResponse.data.data.tx_ref,
          method: chapaResponse.data.data.method,
          email: chapaResponse.data.data.email,
        },
      });
    } else {
      console.log("❌ Payment not found");
      res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }
  } catch (error) {
    console.error("❌ Get payment status error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to get payment status",
      error: error.message,
    });
  }
};

/**
 * Handle payment callback (when user returns from Chapa)
 * @route GET /api/payment/callback
 * @access Public
 */
exports.handleCallback = async (req, res) => {
  try {
    const { tx_ref, status } = req.query;

    console.log("\n═══════════════════════════════════════");
    console.log("🔙 PAYMENT CALLBACK RECEIVED");
    console.log("═══════════════════════════════════════");
    console.log("📝 Transaction Ref:", tx_ref);
    console.log("📊 Status:", status);
    console.log("⏰ Timestamp:", new Date().toISOString());
    console.log("🌐 Query Params:", JSON.stringify(req.query, null, 2));

    if (!tx_ref) {
      console.log("❌ Missing transaction reference");
      console.log("═══════════════════════════════════════\n");
      return res.status(400).json({
        success: false,
        message: "Transaction reference is required",
      });
    }

    // Verify payment status with Chapa
    console.log("📡 Verifying payment with Chapa...");
    const chapaResponse = await axios.get(
      `${CHAPA_API_URL}/transaction/verify/${tx_ref}`,
      {
        headers: {
          Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
        },
      },
    );

    const paymentData = chapaResponse.data.data;
    console.log("💳 Payment Status:", paymentData.status);
    console.log("💰 Amount:", paymentData.amount, paymentData.currency);
    console.log("📧 Customer:", paymentData.email);
    console.log("💳 Method:", paymentData.method);

    console.log("═══════════════════════════════════════");
    console.log("✅ CALLBACK PROCESSED");
    console.log("═══════════════════════════════════════\n");

    res.status(200).json({
      success: true,
      message: "Callback received",
      data: {
        txRef: tx_ref,
        status: paymentData.status,
        amount: paymentData.amount,
        currency: paymentData.currency,
      },
    });
  } catch (error) {
    console.error("❌ Callback handling error:", error.message);
    console.log("═══════════════════════════════════════\n");

    res.status(500).json({
      success: false,
      message: "Failed to handle callback",
      error: error.message,
    });
  }
};

/**
 * Initialize payment for Custom Orders
 * @route POST /api/payment/custom-initialize
 * @access Private
 */
exports.initializeCustomPayment = async (req, res) => {
  try {
    const { customOrderId, paymentMethod = 'CHAPA', shippingAddressId } = req.body;
    const userId = req.user._id;
    
    const CustomOrder = require("../models/CustomOrder");
    const order = await CustomOrder.findById(customOrderId).populate('customer').populate('artisan');

    if (!order) return res.status(404).json({ success: false, message: "Custom order not found" });
    if (order.customer._id.toString() !== userId.toString()) return res.status(403).json({ success: false, message: "Unauthorized" });
    if (!['price_quoted', 'accepted'].includes(order.status)) return res.status(400).json({ success: false, message: "Invalid order status for payment" });
    if (!order.price || order.price <= 0) return res.status(400).json({ success: false, message: "Order price must be set before payment" });

    const subtotal = order.price;
    const tax = Math.round(subtotal * 0.15 * 100) / 100;
    const total = subtotal + tax;

    const commissionFee = subtotal * 0.10;
    const artisanShare = subtotal - commissionFee;

    // Validate shipping address before modifying CustomOrder
    if (!shippingAddressId) {
      return res.status(400).json({ success: false, message: "Shipping address is required" });
    }

    const User = require("../models/User");
    const user = await User.findById(userId);
    const shippingAddress = user ? user.shippingAddresses.id(shippingAddressId) : null;

    if (!shippingAddress) {
      return res.status(404).json({ success: false, message: "Shipping address not found" });
    }

    if (paymentMethod !== 'CHAPA') {
      // Create shadow official Order FIRST to ensure everything is valid
      const newOrder = await Order.create({
        customer: order.customer._id || order.customer,
        cartId: `custom-${order._id}`,
        items: [{
          product: order.product || null,
          artisan: order.artisan._id || order.artisan,
          quantity: 1,
          price: order.price,
          status: 'pending',
          isCustomOrder: true,
          customOrderId: order._id
        }],
        totals: {
          subtotal: subtotal,
          tax: tax,
          shipping: 0,
          total: total,
          platformCommission: commissionFee,
          artisanEarning: artisanShare
        },
        shippingAddress: {
          firstName: shippingAddress.firstName,
          lastName: shippingAddress.lastName,
          street: shippingAddress.street,
          city: shippingAddress.city,
          region: shippingAddress.region,
          country: shippingAddress.country,
          postalCode: shippingAddress.postalCode || "",
          phone: shippingAddress.phone,
        },
        payment: {
          method: paymentMethod,
          status: paymentMethod === 'COD' ? "unpaid" : "unpaid", // Both should be unpaid initially
          transactionId: paymentMethod === 'COD' ? `COD-${Date.now()}` : `MAN-${Date.now()}`,
          amount: total,
          currency: "ETB",
        },
        status: "confirmed",
        isCustom: true,
        photos: order.photos
      });

      // Now update the CustomOrder
      order.status = paymentMethod === 'COD' ? 'accepted' : 'accepted'; // Keep as accepted until paid
      order.commission = commissionFee;
      order.artisanEarning = artisanShare;
      order.paymentMethod = paymentMethod;
      order.transactionId = newOrder.payment.transactionId;
      await order.save();

      // Alert Artisan
      const io = req.app.get('io');
      if (io && order.artisan) {
        io.to(`user_${order.artisan._id ? order.artisan._id.toString() : order.artisan.toString()}`).emit('customOrderPaid', {
          orderId: order._id,
          message: paymentMethod === 'COD' 
            ? 'New COD Custom Order confirmed! You can start production.' 
            : 'Custom order confirmed. Once you verify payment, you can start production.'
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          orderId: newOrder._id,
          orderNumber: newOrder.orderNumber,
          order: { totals: newOrder.totals },
          redirect: '/order-success'
        }
      });
    }

    // Chapa Payment
    const txRef = `CUST-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const amountNumber = Number((Math.round(total * 100) / 100).toFixed(2));
    
    order.commission = commissionFee;
    order.artisanEarning = artisanShare;
    order.paymentMethod = 'CHAPA';
    order.transactionId = txRef;
    await order.save();

    const chapaPayload = {
      amount: amountNumber,
      currency: "ETB",
      email: order.customer.email,
      first_name: order.customer.profile?.firstName || "Customer",
      last_name: order.customer.profile?.lastName || "",
      tx_ref: txRef,
      callback_url: `${CALLBACK_URL}?tx_ref=${txRef}`,
      return_url: `${RETURN_URL}?tx_ref=${txRef}`,
      description: `Payment for Custom Design Order`,
      meta: {
        userId: userId.toString(),
        customOrderId: order._id.toString(),
        shippingAddressId: shippingAddressId ? shippingAddressId.toString() : ""
      },
    };

    const chapaResponse = await axios.post(
      `${CHAPA_API_URL}/transaction/initialize`,
      chapaPayload,
      { headers: { Authorization: `Bearer ${CHAPA_SECRET_KEY}`, "Content-Type": "application/json" } }
    );

    if (chapaResponse.data.status === "success") {
      res.status(200).json({
        success: true,
        data: {
          checkoutUrl: chapaResponse.data.data.checkout_url,
          txRef: txRef,
        },
      });
    } else {
      throw new Error("Failed to initialize payment with Chapa");
    }

  } catch (error) {
    console.error("Custom Payment initialization error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = exports;
