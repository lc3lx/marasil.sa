const express = require("express");
const router = express.Router();

const {
  sendNotification,
  getNotificationCustomer,
  notificationIsRead,
  unreadCustomerNotification,
  getAllNotificationsAdmin,
  deleteNotification,
} = require("../controllers/notificationController");

const AuthService = require("../controllers/authController");

router.use(AuthService.Protect);

// Customer routes
router.get("/getMynotification", getNotificationCustomer);
router.put("/:notificationId/read", notificationIsRead);
router.get("/unread-count", unreadCustomerNotification);

// Admin routes
router.post("/", AuthService.allowedTo("admin"), sendNotification);
router.get("/admin/all", AuthService.allowedTo("admin"), getAllNotificationsAdmin);
router.delete("/:notificationId", AuthService.allowedTo("admin"), deleteNotification);

module.exports = router;
