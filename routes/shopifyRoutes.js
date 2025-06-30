const express = require("express");
const router = express.Router();
const ShopifyController = require("../controllers/shopifyController");
const auth = require("../controllers/authController");

router.use(auth.Protect);

router.get("/auth", ShopifyController.getAuthUrl);
router.get("/auth/callback", ShopifyController.authCallback);

router.get("/orders/:storeId", ShopifyController.getOrders);

router.post('/webhook/orders/create', ShopifyController.handleOrderCreated);
// router.put("/orders/:storeId/:orderId", ShopifyController.updateOrderStatus);
module.exports = router;
