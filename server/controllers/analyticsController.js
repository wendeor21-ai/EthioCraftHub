const mongoose = require("../lib/mongoose");
const { prisma } = require("../lib/prisma");
const { toIdString } = require("../lib/mongoCompat/serialize");

const parseTimeRange = (tr) => {
  if (!tr) return 30;
  const map = {
    "7days": 7,
    "30days": 30,
    "90days": 90,
    "1year": 365,
  };
  return map[tr] || parseInt(tr, 10) || 30;
};

const CANCELLED_STATUSES = new Set([
  "cancelled",
  "rejected",
  "failed",
  "refunded",
]);
const EXCLUDED_FROM_REVENUE = new Set([
  ...CANCELLED_STATUSES,
  "pending",
]);

function itemBelongsToArtisan(item, artisanId) {
  if (!item) return false;
  const id = toIdString(item.artisan || item.artisanId);
  return id && String(id) === String(artisanId);
}

function itemLineTotal(item) {
  const price = Number(item?.price) || 0;
  const qty = Number(item?.quantity) || 0;
  return price * qty;
}

exports.getArtisanAnalytics = async (req, res, next) => {
  try {
    const { artisanId } = req.params;
    const { timeRange } = req.query;

    if (!mongoose.Types.ObjectId.isValid(artisanId)) {
      return res.status(400).json({ error: "Invalid artisan id" });
    }

    if (
      req.user &&
      req.user.role !== "admin" &&
      String(req.user._id) !== String(artisanId)
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const days = parseTimeRange(timeRange);
    const since = new Date();
    since.setDate(since.getDate() - days);

    console.log("Analytics request:", { artisanId, timeRange, days, since });

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: since } },
      select: {
        id: true,
        status: true,
        createdAt: true,
        customerId: true,
        items: true,
        shippingAddress: true,
      },
    });

    // Flatten to artisan line items
    const lines = [];
    for (const order of orders) {
      const items = Array.isArray(order.items) ? order.items : [];
      for (const item of items) {
        if (!itemBelongsToArtisan(item, artisanId)) continue;
        lines.push({
          orderId: order.id,
          status: order.status,
          createdAt: order.createdAt,
          customerId: order.customerId,
          shippingAddress: order.shippingAddress,
          productId: toIdString(item.product || item.productId),
          quantity: Number(item.quantity) || 0,
          lineTotal: itemLineTotal(item),
        });
      }
    }

    const revenueLines = lines.filter((l) => !EXCLUDED_FROM_REVENUE.has(l.status));
    const cancelledOrderIds = new Set(
      lines.filter((l) => CANCELLED_STATUSES.has(l.status)).map((l) => l.orderId)
    );
    const allOrderIds = new Set(lines.map((l) => l.orderId));
    const revenueOrderIds = new Set(revenueLines.map((l) => l.orderId));

    const totalRevenue = revenueLines.reduce((s, l) => s + l.lineTotal, 0);
    const totalItems = revenueLines.reduce((s, l) => s + l.quantity, 0);
    const totalOrders = revenueOrderIds.size;
    const totalCancelled = [...cancelledOrderIds].filter((id) =>
      allOrderIds.has(id)
    ).length;

    // Sales trend by day
    const salesByDay = new Map();
    for (const line of revenueLines) {
      const d = line.createdAt instanceof Date ? line.createdAt : new Date(line.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      salesByDay.set(key, (salesByDay.get(key) || 0) + line.lineTotal);
    }
    const salesData = [...salesByDay.entries()]
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }));

    // Top products
    const productAgg = new Map();
    for (const line of revenueLines) {
      if (!line.productId) continue;
      const cur = productAgg.get(line.productId) || { revenue: 0, quantity: 0 };
      cur.revenue += line.lineTotal;
      cur.quantity += line.quantity;
      productAgg.set(line.productId, cur);
    }
    const topProductIds = [...productAgg.entries()]
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 3)
      .map(([id]) => id);

    const products = topProductIds.length
      ? await prisma.product.findMany({
          where: { id: { in: topProductIds } },
          select: { id: true, name: true, images: true },
        })
      : [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    const topProducts = topProductIds.map((id) => {
      const stats = productAgg.get(id);
      const product = productMap.get(id);
      return {
        productId: id,
        name: product?.name || "Product",
        images: product?.images || [],
        revenue: Math.round((stats?.revenue || 0) * 100) / 100,
        quantity: stats?.quantity || 0,
      };
    });

    // Top locations
    const locationAgg = new Map();
    for (const line of revenueLines) {
      const city =
        (line.shippingAddress && line.shippingAddress.city) || "Unknown";
      if (!locationAgg.has(city)) locationAgg.set(city, new Set());
      locationAgg.get(city).add(line.orderId);
    }
    const topLocations = [...locationAgg.entries()]
      .map(([city, orderSet]) => ({ city, count: orderSet.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Peak hours
    const hourAgg = new Map();
    for (const line of revenueLines) {
      const d = line.createdAt instanceof Date ? line.createdAt : new Date(line.createdAt);
      const hour = d.getHours();
      hourAgg.set(hour, (hourAgg.get(hour) || 0) + 1);
    }
    const peakHours = [...hourAgg.entries()]
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);

    // Loyal customers
    const customerAgg = new Map();
    for (const line of revenueLines) {
      if (!line.customerId) continue;
      const cur = customerAgg.get(line.customerId) || {
        totalSpent: 0,
        orders: new Set(),
      };
      cur.totalSpent += line.lineTotal;
      cur.orders.add(line.orderId);
      customerAgg.set(line.customerId, cur);
    }
    const topCustomerIds = [...customerAgg.entries()]
      .sort((a, b) => {
        const orderDiff = b[1].orders.size - a[1].orders.size;
        if (orderDiff !== 0) return orderDiff;
        return b[1].totalSpent - a[1].totalSpent;
      })
      .slice(0, 5)
      .map(([id]) => id);

    const customers = topCustomerIds.length
      ? await prisma.user.findMany({
          where: { id: { in: topCustomerIds } },
          select: { id: true, email: true, profile: true },
        })
      : [];
    const customerMap = new Map(customers.map((c) => [c.id, c]));

    const loyalCustomers = topCustomerIds.map((id) => {
      const stats = customerAgg.get(id);
      const user = customerMap.get(id);
      const profile = user?.profile || {};
      const name = `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "Customer";
      return {
        customerId: id,
        name,
        email: user?.email || "",
        totalSpent: Math.round((stats?.totalSpent || 0) * 100) / 100,
        orders: stats?.orders?.size || 0,
      };
    });

    // Product views
    const artisanProducts = await prisma.product.findMany({
      where: { artisanId: String(artisanId) },
      select: { metrics: true },
    });
    const totalViews = artisanProducts.reduce((sum, p) => {
      const views = p.metrics && typeof p.metrics === "object" ? Number(p.metrics.views) || 0 : 0;
      return sum + views;
    }, 0);

    const avgOrderValue =
      totalOrders > 0 ? +(totalRevenue / totalOrders).toFixed(2) : 0;
    const returnRate =
      allOrderIds.size > 0
        ? +((totalCancelled / allOrderIds.size) * 100).toFixed(1)
        : 0;
    const conversionRate =
      totalViews > 0 ? +((totalOrders / totalViews) * 100).toFixed(2) : 0;

    const locationsChartData = {};
    topLocations.forEach((loc) => {
      locationsChartData[loc.city] = loc.count;
    });

    console.log("Analytics result sizes:", {
      overviewOrders: totalOrders,
      salesTrend: salesData.length,
      topProducts: topProducts.length,
    });

    return res.json({
      overview: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOrders,
        totalItems,
        totalViews,
        conversionRate,
        averageOrderValue: avgOrderValue,
        returnRate,
      },
      salesData,
      topProducts,
      topLocations,
      peakHours,
      loyalCustomers,
      trafficSources: locationsChartData,
    });
  } catch (err) {
    console.error("Analytics error:", err);
    next(err);
  }
};
