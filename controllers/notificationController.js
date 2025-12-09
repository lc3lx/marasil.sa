const asyncHandler = require("express-async-handler");
const Notification = require("../models/notificationModel");

exports.sendNotification = asyncHandler(async (req, res) => {
  try {
    const io = req.io;

    const { customerId, type, message, title } = req.body;

    if (!type || !message) {
      return res.status(400).json({ error: "Type and message are required" });
    }

    const notification = new Notification({
      customerId: customerId || null,
      type,
      title: title || 'إشعار',
      message,
      createdBy: req.customer?._id || null,
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

// Admin: Get all notifications
exports.getAllNotificationsAdmin = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', type = '', status = '', startDate = '', endDate = '' } = req.query;
    
    let query = {};
    
    // Filter by search
    if (search) {
      query.message = { $regex: search, $options: 'i' };
    }
    
    // Filter by type
    if (type) {
      if (type === 'all') {
        query.customerId = null;
      } else if (type === 'specific') {
        query.customerId = { $ne: null };
      }
    }

    // Filter by status (interpret as read status to reflect delivery/seen)
    if (status) {
      if (status === 'sent') query.readStatus = true;
      if (status === 'pending') query.readStatus = false;
    }

    // Date range filter
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const notifications = await Notification.find(query)
      .populate('customerId', 'firstName lastName email')
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);

    // Compute recipients count: broadcast -> all customers, targeted -> 1
    let recipientsBase = 0;
    try {
      const Customer = require("../models/customerModel");
      recipientsBase = await Customer.countDocuments({ role: { $ne: 'admin' } });
    } catch (e) {
      recipientsBase = 0;
    }

    const mapped = notifications.map((n) => {
      const obj = n.toObject();
      obj.recipientsCount = obj.customerId ? 1 : recipientsBase;
      return obj;
    });

    res.json({
      success: true,
      data: mapped,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Delete notification
exports.deleteNotification = asyncHandler(async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findByIdAndDelete(notificationId);

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({ success: true, message: "Notification deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
