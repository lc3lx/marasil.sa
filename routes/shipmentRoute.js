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
  getShipmentStatistics,
  acountingShipmentPrice,
  printShipmentInvoice,
} = require("../controllers/shapmentController");
const auth = require("../controllers/authController");
const shipmentReturnController = require("../controllers/shipmentReturenController");

const router = express.Router();

// Customer routes (requires authentication)
router.get("/stats", auth.Protect, getShipmentsStats);
router.get("/statistics", auth.Protect, getShipmentStatistics);
router.get("/my-shipments", auth.Protect, getCustomerShipments);
router.get("/my-shipment/:id", auth.Protect, getShipment);
router.get("/search", auth.Protect, searchShipments);

// Webhook: update shipment status from shipping company
const {
  webhookUpdateShipmentStatus,
} = require("../controllers/shapmentController");
router.post("/webhook-update-shipment-status", webhookUpdateShipmentStatus);

// SMSA specific webhook
const {
  smsaWebhookHandler,
  testSMSAWebhook,
  validateSMSAWebhook,
} = require("../controllers/smsaWebhookController");
router.post("/webhook-smsa", smsaWebhookHandler);
router.post("/webhook-smsa/test", testSMSAWebhook);
router.post("/webhook-smsa/validate", validateSMSAWebhook);

// RedBox specific webhook
const {
  redboxWebhookHandler,
  testRedBoxWebhook,
  validateRedBoxWebhook,
} = require("../controllers/redboxWebhookController");
router.post("/webhook-redbox", redboxWebhookHandler);
router.post("/webhook-redbox/test", testRedBoxWebhook);
router.post("/webhook-redbox/validate", validateRedBoxWebhook);

// OmniLama specific webhook
const {
  omnilamaWebhookHandler,
  testOmniLamaWebhook,
  validateOmniLamaWebhook,
} = require("../controllers/omnilamaWebhookController");
router.post("/webhook-omnilama", omnilamaWebhookHandler);
router.post("/webhook-omnilama/test", testOmniLamaWebhook);
router.post("/webhook-omnilama/validate", validateOmniLamaWebhook);

// Aramex specific webhook
const {
  aramexWebhookHandler,
  testAramexWebhook,
  validateAramexWebhook,
} = require("../controllers/aramexWebhookController");
router.post("/webhook-aramex", aramexWebhookHandler);
router.post("/webhook-aramex/test", testAramexWebhook);
router.post("/webhook-aramex/validate", validateAramexWebhook);

router.post("/createshipment", auth.Protect, createShapment);
router.post("/traking", auth.Protect, trackingShipment);
router.post("/cancel/:trackingNumber", auth.Protect, cancelShipment);
router.post("/accountingshipmentprice", auth.Protect, acountingShipmentPrice);
router.post("/printShipmentInvoice", auth.Protect, printShipmentInvoice);

// مسارات نظام الاسترجاع (بدون تسجيل دخول)
router.post("/return/request-otp", shipmentReturnController.requestEmailOTP);
router.post("/return/verify-otp", shipmentReturnController.verifyEmailOTP);
router.get(
  "/return/shipments",
  shipmentReturnController.getShipmentsByReceiver
);
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
