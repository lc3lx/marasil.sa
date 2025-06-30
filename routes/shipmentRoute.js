const express = require("express");
const {
  cancelShipment,
  getShipmentsStats,
  createShapment,
  trackingShipment,
  getCustomerShipments,
  getShipment,
  getAllShipments,
  getShipmentAdmin,
  updateShipment,
  deleteShipment,
  searchShipments,
} = require("../controllers/shapmentController");
const auth = require("../controllers/authController");
const shipmentReturnController = require("../controllers/shipmentReturenController");

const router = express.Router();

// Customer routes (requires authentication)
router.get("/stats", auth.Protect, getShipmentsStats);
router.get("/my-shipments", auth.Protect, getCustomerShipments);
router.get("/my-shipment/:id", auth.Protect, getShipment);
router.get("/search", auth.Protect, searchShipments);

router.post("/createshipment", auth.Protect, createShapment);
router.post("/traking", auth.Protect, trackingShipment);
router.post("/cancel/:trackingNumber", auth.Protect, cancelShipment);

// مسارات نظام الاسترجاع (بدون تسجيل دخول)
router.post("/return/request-otp", shipmentReturnController.requestEmailOTP);
router.post("/return/verify-otp", shipmentReturnController.verifyEmailOTP);
router.get("/return/shipments", shipmentReturnController.getShipmentsByReceiver);
router.post(
  "/return/create-request",
  shipmentReturnController.createReturnRequest
);

// مسار موافقة أو رفض صاحب الحساب (محمي)
router.post(
  "/return/handle-approval",
  auth.Protect,
  shipmentReturnController.handleReturnApproval
);

// الحصول على جميع طلبات الإرجاع للعميل المسجل
router.get(
  "/return/my-returns",
  auth.Protect,
  shipmentReturnController.getAllreturnshipment
);

// Admin routes (requires admin authentication)
router.get("/all", auth.Protect, auth.allowedTo("admin"), getAllShipments);
router.get(
  "/admin/:id",
  auth.Protect,
  auth.allowedTo("admin"),
  getShipmentAdmin
);
router.put(
  "/admin/:id",
  auth.Protect,
  auth.allowedTo("admin", "superadmin"),
  updateShipment
);
router.delete(
  "/admin/:id",
  auth.Protect,
  auth.allowedTo("admin", "superadmin"),
  deleteShipment
);
router.get("/admin/search", searchShipments);


module.exports = router;
