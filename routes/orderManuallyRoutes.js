const express = require("express");

const router = express.Router({ mergeParams: true });
const auth = require("../controllers/authController");
router.use(auth.Protect);

const {
  createOrders,
  getoneOrder,
  getOrders,
  updateOrders,
  deleteOrders,
  setclientAddressToBody,
  getStatusOrder,
  updateOrderStatus,
  TodayAndTotalOrder,
} = require("../controllers/orderManuallyController");
router.route("/").get(getOrders).post(setclientAddressToBody, createOrders);
router.route("/:id").get(getoneOrder).put(updateOrders).delete(deleteOrders);

router.get("/filter/status", getStatusOrder);
router.put("/:orderId/status", updateOrderStatus);
router.get("/orders/today", TodayAndTotalOrder);

module.exports = router;
