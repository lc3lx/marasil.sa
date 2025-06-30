const express = require("express");
const router = express.Router();

const {
  sendNotification,
  getNotificationCustomer,
  notificationIsRead,
  unreadCustomerNotification,
} = require("../controllers/notificationController");

const AuthService = require("../controllers/authController");

router.use(AuthService.Protect);

router.get("/getMynotification", getNotificationCustomer);
router.put("/:notificationId/read", notificationIsRead);
router.get(
  "/unread-count",
  unreadCustomerNotification
);
router.post("/", AuthService.allowedTo("admin"), sendNotification);

module.exports = router;
