const asyncHandler = require("express-async-handler");
const Notification = require("../models/notificationModel");

exports.sendNotification = asyncHandler(async (req, res) => {
  try {
    const io = req.io;

    const { customerId, type, message } = req.body;

    if (!type || !message) {
      return res.status(400).json({ error: "Type and message are required" });
    }

    const notification = new Notification({
      customerId: customerId || null,
      type,
      message,
    });

    await notification.save();

    if (notification.customerId) {
      io.to(`user_${notification.customerId}`).emit(
        "new_notification",
        notification
      );
    } else {
      // Broadcast notification
      io.emit("new_notification", notification);
    }

    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.getNotificationCustomer = asyncHandler(async (req, res) => {
  try {
    // const { customerId } = req.params;

    const notifications = await Notification.find({
      $or: [{ customerId: req.customer._id }, { customerId: null }],
    }).sort({ timestamp: -1 });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.notificationIsRead = asyncHandler(async (req, res) => {
  try {
    const io = req.io;
    const { notificationId } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { readStatus: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    // Emit read status update via WebSocket
    if (notification.customerId) {
      io.to(`user_${notification.customerId}`).emit("notification_read", {
        notificationId: notification._id,
        readStatus: true,
      });
    } else {
      io.emit("notification_read", {
        notificationId: notification._id,
        readStatus: true,
      });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.unreadCustomerNotification = asyncHandler(async (req, res) => {
  try {
    // const { customerId } = req.params;

    const unreadCount = await Notification.countDocuments({
      $or: [{ customerId: req.customer._id }, { customerId: null }],
      readStatus: false,
    });

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
