const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");

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

exports.getArtisanAnalytics = async (req, res, next) => {
  try {
    const { artisanId } = req.params;
    const { timeRange } = req.query;

    if (!mongoose.Types.ObjectId.isValid(artisanId)) {
      return res.status(400).json({ error: "Invalid artisan id" });
    }

    // Only allow artisans to view their own analytics (admins may view any)
    if (
      req.user &&
      req.user.role !== "admin" &&
      req.user._id.toString() !== artisanId
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const days = parseTimeRange(timeRange);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const artisanObjectId = new mongoose.Types.ObjectId(artisanId);

    console.log("Analytics request:", { artisanId, timeRange, days, since });

    const facetPipeline = [
      // Only consider orders in the time window
      {
        $match: { createdAt: { $gte: since } },
      },
      { $unwind: "$items" },
      { $match: { "items.artisan": artisanObjectId } },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalRevenue: {
                  $sum: {
                    $cond: [
                      { $in: ["$status", ["cancelled", "rejected", "failed", "refunded", "pending"]] },
                      0,
                      { $multiply: ["$items.price", "$items.quantity"] }
                    ]
                  }
                },
                totalItems: { $sum: "$items.quantity" },
                orders: { $addToSet: "$_id" },
                cancelledOrders: {
                  $addToSet: {
                    $cond: [
                      { $in: ["$status", ["cancelled", "rejected", "failed", "refunded"]] },
                      "$_id",
                      "$$REMOVE"
                    ]
                  }
                }
              },
            },
            {
              $project: {
                _id: 0,
                totalRevenue: { $round: ["$totalRevenue", 2] },
                totalItems: 1,
                totalOrders: { $size: "$orders" },
                totalCancelled: { $size: "$cancelledOrders" }
              },
            },
          ],
          salesTrend: [
            {
              $match: { status: { $nin: ["cancelled", "rejected", "failed", "refunded", "pending"] } }
            },
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
                revenue: {
                  $sum: { $multiply: ["$items.price", "$items.quantity"] },
                },
              },
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, date: "$_id", revenue: 1 } },
          ],
          topProducts: [
            {
              $match: { status: { $nin: ["cancelled", "rejected", "failed", "refunded", "pending"] } }
            },
            {
              $group: {
                _id: "$items.product",
                revenue: {
                  $sum: { $multiply: ["$items.price", "$items.quantity"] },
                },
                quantity: { $sum: "$items.quantity" },
              },
            },
            {
              $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "product",
              },
            },
            { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                productId: "$_id",
                name: "$product.name",
                images: "$product.images",
                revenue: { $round: ["$revenue", 2] },
                quantity: 1,
              },
            },
            { $sort: { revenue: -1 } },
            { $limit: 3 },
          ],
          topLocations: [
            {
              $match: { status: { $nin: ["cancelled", "rejected", "failed", "refunded", "pending"] } }
            },
            {
              $group: {
                _id: "$shippingAddress.city",
                orders: { $addToSet: "$_id" }
              }
            },
            {
              $project: {
                _id: 0,
                city: { $ifNull: ["$_id", "Unknown"] },
                count: { $size: "$orders" }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
          ],
          peakHours: [
            {
              $match: { status: { $nin: ["cancelled", "rejected", "failed", "refunded", "pending"] } }
            },
            {
              $group: {
                _id: { hour: { $hour: "$createdAt" } },
                count: { $sum: 1 },
              },
            },
            { $project: { _id: 0, hour: "$_id.hour", count: 1 } },
            { $sort: { hour: 1 } },
          ],
          loyalCustomers: [
            {
              $match: { status: { $nin: ["cancelled", "rejected", "failed", "refunded", "pending"] } }
            },
            {
              $group: {
                _id: "$customer",
                totalSpent: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
                orderCount: { $addToSet: "$_id" }
              }
            },
            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "customerData"
              }
            },
            { $unwind: { path: "$customerData", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                customerId: "$_id",
                name: { $concat: ["$customerData.profile.firstName", " ", "$customerData.profile.lastName"] },
                email: "$customerData.email",
                totalSpent: { $round: ["$totalSpent", 2] },
                orders: { $size: "$orderCount" }
              }
            },
            { $sort: { orders: -1, totalSpent: -1 } },
            { $limit: 5 }
          ]
        },
      },
    ];

    let agg;
    try {
      agg = await Order.aggregate(facetPipeline).allowDiskUse(true);
    } catch (aggErr) {
      console.error("Analytics aggregation error:", aggErr);
      return next(aggErr);
    }

    const data = (agg && agg[0]) || {};

    console.log("Analytics result sizes:", {
      overview: (data.overview && data.overview.length) || 0,
      salesTrend: (data.salesTrend && data.salesTrend.length) || 0,
      topProducts: (data.topProducts && data.topProducts.length) || 0,
    });

    const overview = (data.overview && data.overview[0]) || {
      totalRevenue: 0,
      totalItems: 0,
      totalOrders: 0,
      totalCancelled: 0,
    };

    const avgOrderValue =
      overview.totalOrders > 0
        ? +(overview.totalRevenue / overview.totalOrders).toFixed(2)
        : 0;
        
    const returnRate = 
      overview.totalOrders > 0
        ? +((overview.totalCancelled / overview.totalOrders) * 100).toFixed(1)
        : 0;

    // Fetch total views for the artisan's products
    const productViewsAggr = await Product.aggregate([
      { $match: { artisan: artisanObjectId } },
      { $group: { _id: null, totalViews: { $sum: { $ifNull: ["$metrics.views", 0] } } } }
    ]);
    const totalViews = productViewsAggr[0]?.totalViews || 0;
    
    const conversionRate = 
      totalViews > 0
        ? +((overview.totalOrders / totalViews) * 100).toFixed(2)
        : 0;

    const salesData = (data.salesTrend || []).map((row) => ({
      date: row.date,
      revenue: row.revenue,
    }));
    const topProducts = data.topProducts || [];
    const topLocations = data.topLocations || [];
    const peakHours = data.peakHours || [];
    const loyalCustomers = data.loyalCustomers || [];

    // Formatted Traffic sources/locations for pie charts
    const locationsChartData = {};
    topLocations.forEach(loc => {
      locationsChartData[loc.city] = loc.count;
    });

    return res.json({
      overview: {
        totalRevenue: overview.totalRevenue || 0,
        totalOrders: overview.totalOrders || 0,
        totalItems: overview.totalItems || 0,
        totalViews: totalViews,
        conversionRate: conversionRate,
        averageOrderValue: avgOrderValue,
        returnRate: returnRate,
      },
      salesData,
      topProducts,
      topLocations,
      peakHours,
      loyalCustomers,
      trafficSources: locationsChartData,
    });
  } catch (err) {
    next(err);
  }
};
