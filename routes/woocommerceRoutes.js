const express = require("express");
const router = express.Router();
const wooCommerceController = require("../controllers/wooCommerceController");

// OAuth routes
router.get("/auth/url", wooCommerceController.getAuthUrl);
router.post("/auth/connect", wooCommerceController.connectStore);

// Store routes
router.get("/stores/:storeId/orders", wooCommerceController.getOrders);
router.put(
  "/stores/:storeId/orders/:orderId/status",
  wooCommerceController.updateOrderStatus
);

// Webhook route
// router.post(
//   "/webhooks/:storeId",
//   express.json(),
//   wooCommerceController.handleWebhook
// );

module.exports = router;
