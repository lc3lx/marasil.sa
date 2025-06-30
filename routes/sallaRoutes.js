const express = require("express");
const sallaController = require("../controllers/sallaController");

const router = express.Router();

const auth = require("../controllers/authController");
router.use(auth.Protect);

// OAuth routes
router.get("/auth/url", sallaController.getAuthUrl);
router.get("/auth/callback", sallaController.handleCallback);

// Order management routes
router.get("/stores/:storeId/orders", sallaController.getStoreOrders);
router.post(
  "/stores/:storeId/orders/:orderId/status",
  sallaController.updateOrderStatus
);
router.post("/webhook", sallaController.handleOrderCreated);

module.exports = router;
