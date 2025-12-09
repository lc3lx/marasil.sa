const asyncHandler = require("express-async-handler");
const Store = require("../models/Store");
const Order = require("../models/Order");

// GET /api/admin/platforms
exports.getPlatforms = asyncHandler(async (req, res) => {
  const stores = await Store.find().lean();
  const storeIds = stores.map((s) => s.storeId).filter(Boolean);

  // Aggregate orders by storeId
  let ordersAgg = [];
  if (storeIds.length) {
    ordersAgg = await Order.aggregate([
      { $match: { storeId: { $in: storeIds } } },
      {
        $group: {
          _id: "$storeId",
          orders: { $sum: 1 },
          revenue: { $sum: { $ifNull: ["$total.amount", 0] } },
          lastOrderAt: { $max: "$createdAt" },
        },
      },
    ]);
  }
  const byStoreId = new Map(ordersAgg.map((x) => [x._id, x]));

  const now = Date.now();
  const data = stores.map((s) => {
    const stats = byStoreId.get(s.storeId) || {};
    let status = s.isActive ? "متصل" : "غير متصل";
    const tokenExp = s.tokenExpiresAt ? new Date(s.tokenExpiresAt).getTime() : null;
    if (s.isActive && tokenExp && tokenExp < now) status = "تحذير";
    let health = s.isActive ? 98 : 0;
    if (status === "تحذير") health = 75;
    const settings = (s.storeInfo && s.storeInfo.settings) || {};

    return {
      _id: String(s._id),
      name: s.name,
      platform: s.platform,
      status,
      isActive: !!s.isActive,
      health,
      orders: stats.orders || 0,
      revenue: stats.revenue || 0,
      lastSync: (s.updatedAt || s.createdAt || new Date()).toISOString(),
      color: "#10b981",
      icon: "🛍️",
      image: s.storeInfo?.image || "",
      settings,
    };
  });

  res.status(200).json({ success: true, data });
});

// PUT /api/admin/platforms/:id/settings
exports.updatePlatformSettings = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { syncFrequency, notifications, apiKey, apiSecret, image, color, icon } = req.body || {};
  const store = await Store.findById(id);
  if (!store) return res.status(404).json({ success: false, message: "Store not found" });

  store.storeInfo = store.storeInfo || {};
  store.storeInfo.settings = store.storeInfo.settings || {};
  if (syncFrequency !== undefined) store.storeInfo.settings.syncFrequency = String(syncFrequency);
  if (notifications !== undefined) store.storeInfo.settings.notifications = !!notifications;
  if (apiKey !== undefined) store.storeInfo.settings.apiKey = apiKey;
  if (apiSecret !== undefined) store.storeInfo.settings.apiSecret = apiSecret;
  if (image !== undefined) store.storeInfo.image = image;
  if (color !== undefined) store.storeInfo.color = color;
  if (icon !== undefined) store.storeInfo.icon = icon;

  await store.save();
  res.json({ success: true, data: { id: store._id, settings: store.storeInfo.settings } });
});

// POST /api/admin/platforms/:id/disconnect
exports.disconnectPlatform = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const store = await Store.findById(id);
  if (!store) return res.status(404).json({ success: false, message: "Store not found" });
  store.isActive = false;
  await store.save();
  res.json({ success: true, message: "Disconnected" });
});

// POST /api/admin/platforms/sync-all
exports.syncAllPlatforms = asyncHandler(async (req, res) => {
  // Placeholder: in future we can trigger background sync for each platform
  res.json({ success: true, message: "Sync triggered" });
});
