const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

// إنشاء طلب جديد
router.post("/create", orderController.createOrder);

// عرض جميع الطلبات المرتبطة بمتجر معين
router.get("/store/:storeId", orderController.getOrdersByStore);

// عرض طلب محدد
router.get("/:orderId", orderController.getOrderById);

// تحديث طلب موجود
router.put("/:orderId", orderController.updateOrder);

// حذف طلب
router.delete("/:orderId", orderController.deleteOrder);
// البحث برقم الطلب
router.get("/search-by-order-id", orderController.searchOrderByOrderId);

// البحث بمعلومات العميل
router.get(
  "/search-by-customer-info",
  orderController.searchOrdersByCustomerInfo
);

// البحث بفلاتر متعددة
router.get("/search", orderController.searchOrders);

// Order management routes
router.post("/webhook/salla", orderController.createOrderFromSalla);
router.post("/:orderId/process", orderController.processOrder);
router.get("/:orderId/track", orderController.trackOrder);

module.exports = router;
