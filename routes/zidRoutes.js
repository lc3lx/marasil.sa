const express = require("express");
const router = express.Router();
const zidController = require("../controllers/zidController");
const auth = require("../controllers/authController");
// router.use(auth.Protect);
// OAuth routes
router.get("/auth/url", zidController.getAuthUrl);
router.get("/zid/callback", zidController.handleCallback);

router.get("/stores/:storeId/orders", zidController.getOrders);
router.put("/stores/:storeId/orders/:orderId/status", zidController.updateOrderStatus);

// ← هذا السطر يجب أن يكون آخر شيء
module.exports = router;

