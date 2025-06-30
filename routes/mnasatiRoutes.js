const express = require("express");
const router = express.Router();
const mnasatiController = require("../controllers/mnasatiController");

// OAuth routes
router.get("/auth/url", mnasatiController.getAuthUrl);
router.get("/auth/callback", mnasatiController.handleCallback);
// router.post("/connectstore",mnasatiController.connectStore)

// router.get("/auth/refresh", mnasatiController.refreshAccessToken); // I updated it to refresh token automitic

// Order management routes
router.get("/stores/:storeId/orders", mnasatiController.getStoreOrders);
// router.post("/stores/:storeId/sync-orders", mnasatiController.syncOrders);
router.put(
  "/stores/:storeId/orders/:orderId/status",
  mnasatiController.updateOrderStatus
);

module.exports = router;
