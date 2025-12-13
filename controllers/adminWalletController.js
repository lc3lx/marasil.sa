const asyncHandler = require("express-async-handler");
const Customer = require("../models/customerModel");
const ApiError = require("../utils/apiError");
const Transaction = require("../models/transactionModel");
const Wallet = require("../models/walletModel");

// @desc    Add Balance to User Wallet (Admin Only)
// @route   POST /api/admin/wallets/:userId/add-balance
// @access  Private/Admin
exports.addBalanceToUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { amount, reason } = req.body;

  if (!amount || amount <= 0) {
    return next(new ApiError("المبلغ يجب أن يكون أكبر من صفر", 400));
  }

  const user = await Customer.findById(userId);
  if (!user) {
    return next(new ApiError(`لا يوجد مستخدم بهذا المعرف ${userId}`, 404));
  }

  try {
    let wallet = await Wallet.findOne({ customerId: userId });
    if (!wallet) {
      wallet = new Wallet({ customerId: userId, balance: 0 });
    }

    wallet.balance += Number(amount);
    await wallet.save();

    const transaction = new Transaction({
      customerId: userId,
      walletId: wallet._id,
      type: "deposit",
      amount: Number(amount),
      status: "completed",
      description: reason || `إضافة رصيد من الإدارة`,
      paymentMethod: "admin_add",
      adminId: req.customer._id,
    });
    await transaction.save();

    res.status(200).json({
      success: true,
      message: `تم إضافة ${amount} ريال لمحفظة ${user.firstName} ${user.lastName}`,
      data: { wallet, transaction },
    });
  } catch (error) {
    return next(new ApiError("خطأ في إضافة الرصيد", 500));
  }
});

// @desc    Subtract Balance from User Wallet (Admin Only)
// @route   POST /api/admin/wallets/:userId/subtract-balance
// @access  Private/Admin
exports.subtractBalanceFromUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { amount, reason } = req.body;

  if (!amount || amount <= 0) {
    return next(new ApiError("المبلغ يجب أن يكون أكبر من صفر", 400));
  }

  const user = await Customer.findById(userId);
  if (!user) {
    return next(new ApiError(`لا يوجد مستخدم بهذا المعرف ${userId}`, 404));
  }

  try {
    let wallet = await Wallet.findOne({ customerId: userId });
    if (!wallet) {
      wallet = new Wallet({ customerId: userId, balance: 0 });
    }

    if (Number(wallet.balance) < Number(amount)) {
      return next(new ApiError("الرصيد غير كافٍ", 400));
    }

    wallet.balance -= Number(amount);
    await wallet.save();

    const transaction = new Transaction({
      customerId: userId,
      walletId: wallet._id,
      type: "withdrawal",
      amount: Number(amount),
      status: "completed",
      description: reason || "خصم رصيد من الإدارة",
      paymentMethod: "admin_deduct",
      adminId: req.customer._id,
    });
    await transaction.save();

    res.status(200).json({
      success: true,
      message: `تم خصم ${amount} ريال من محفظة ${user.firstName} ${user.lastName}`,
      data: { wallet, transaction },
    });
  } catch (error) {
    return next(new ApiError("خطأ في خصم الرصيد", 500));
  }
});

// @desc    Get User Wallet Details (Admin Only)
// @route   GET /api/admin/users/:userId/wallet
// @access  Private/Admin
exports.getUserWallet = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  // التحقق من وجود المستخدم
  const user = await Customer.findById(userId).select("-password");
  if (!user) {
    return next(new ApiError(`لا يوجد مستخدم بهذا المعرف ${userId}`, 404));
  }

  try {
    const Wallet = require("../models/walletModel");
    const Transaction = require("../models/transactionModel");

    // جلب محفظة المستخدم
    const wallet = await Wallet.findOne({ customerId: userId });

    // جلب آخر المعاملات
    const transactions = await Transaction.find({ customerId: userId })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone: user.phone,
          active: user.active,
        },
        wallet: wallet || { balance: 0, customerId: userId },
        transactions,
      },
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone: user.phone,
          active: user.active,
        },
        wallet: { balance: 0, customerId: userId },
        transactions: [],
      },
    });
  }
});

// @desc    Delete User (Admin Only)
// @route   DELETE /api/admin/users/:userId
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  const user = await Customer.findById(userId);
  if (!user) {
    return next(new ApiError(`لا يوجد مستخدم بهذا المعرف ${userId}`, 404));
  }

  // منع حذف المديرين
  if (user.role === "admin") {
    return next(new ApiError("لا يمكن حذف المديرين", 403));
  }

  try {
    // حذف المستخدم والبيانات المرتبطة به
    await Customer.findByIdAndDelete(userId);

    // حذف المحفظة إن وجدت
    const Wallet = require("../models/walletModel");
    await Wallet.deleteOne({ customerId: userId });

    // حذف المعاملات
    const Transaction = require("../models/transactionModel");
    await Transaction.deleteMany({ customerId: userId });

    res.status(200).json({
      success: true,
      message: `تم حذف المستخدم ${user.firstName} ${user.lastName} وجميع بياناته`,
    });
  } catch (error) {
    await Customer.findByIdAndDelete(userId);
    res.status(200).json({
      success: true,
      message: `تم حذف المستخدم ${user.firstName} ${user.lastName}`,
    });
  }
});

// @desc    Get User Orders and Shipments (Admin Only)
// @route   GET /api/admin/users/:userId/activity
// @access  Private/Admin
exports.getUserActivity = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  // التحقق من وجود المستخدم
  const user = await Customer.findById(userId).select("-password");
  if (!user) {
    return next(new ApiError(`لا يوجد مستخدم بهذا المعرف ${userId}`, 404));
  }

  const activity = {
    orders: [],
    shipments: [],
  };

  try {
    // جلب طلبات المستخدم
    const Order = require("../models/orderModel");
    activity.orders = await Order.find({ customerId: userId })
      .sort({ createdAt: -1 })
      .limit(10);
  } catch (error) {
    console.log("Order model not found");
  }

  try {
    // جلب شحنات المستخدم
    const Shipment = require("../models/shipmentModel");
    activity.shipments = await Shipment.find({ customerId: userId })
      .sort({ createdAt: -1 })
      .limit(10);
  } catch (error) {
    console.log("Shipment model not found");
  }

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone,
      },
      activity,
    },
  });
});

// @desc    Approve Bank Transfer (Admin Only)
// @route   PUT /api/admin/wallets/approve-bank-transfer/:transactionId
// @access  Private/Admin
exports.approveBankTransfer = asyncHandler(async (req, res, next) => {
  const { transactionId } = req.params;
  const { approved, notes } = req.body;

  try {
    // البحث عن المعاملة بدون populate أولاً للحصول على customerId كـ ObjectId
    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      return next(
        new ApiError(`لا توجد معاملة بهذا المعرف ${transactionId}`, 404)
      );
    }

    if (transaction.status !== "pending") {
      return next(new ApiError("هذه المعاملة تم معالجتها مسبقاً", 400));
    }

    // الحصول على customerId كـ ObjectId
    const customerId = transaction.customerId;

    // جلب معلومات العميل للرسالة
    const customer = await Customer.findById(customerId).select(
      "firstName lastName email"
    );

    if (approved) {
      // الموافقة على المعاملة
      transaction.status = "completed";
      transaction.approvedBy = req.customer._id;
      transaction.approvedAt = new Date();
      transaction.notes = notes || "";

      // إضافة المبلغ للمحفظة
      let wallet = await Wallet.findOne({ customerId: customerId });
      if (!wallet) {
        wallet = new Wallet({
          customerId: customerId,
          balance: 0,
        });
      }
      wallet.balance += Number(transaction.amount);
      await wallet.save();

      await transaction.save();

      // Populate للعرض فقط
      await transaction.populate("customerId", "firstName lastName email");

      res.status(200).json({
        success: true,
        message: `تم الموافقة على المعاملة وإضافة ${
          transaction.amount
        } ريال لمحفظة ${customer ? customer.firstName : "العميل"}`,
        data: {
          transaction,
          wallet,
        },
      });
    } else {
      // رفض المعاملة
      transaction.status = "rejected";
      transaction.rejectedBy = req.customer._id;
      transaction.rejectedAt = new Date();
      transaction.notes = notes || "تم رفض المعاملة من قبل الإدارة";

      await transaction.save();

      // Populate للعرض فقط
      await transaction.populate("customerId", "firstName lastName email");

      res.status(200).json({
        success: true,
        message: `تم رفض المعاملة`,
        data: {
          transaction,
        },
      });
    }
  } catch (error) {
    console.error("Error in approveBankTransfer:", error);
    return next(new ApiError(`خطأ في معالجة المعاملة: ${error.message}`, 500));
  }
});

// @desc    Get Pending Bank Transfers (Admin Only)
// @route   GET /api/admin/wallets/pending-transfers
// @access  Private/Admin
const MAX_BANK_TRANSFER_LIMIT = 100;

const fetchBankTransfers = async ({ status = "all", page = 1, limit = 20 }) => {
  const numericPage = Math.max(parseInt(page, 10) || 1, 1);
  const numericLimit = Math.min(
    Math.max(parseInt(limit, 10) || 20, 1),
    MAX_BANK_TRANSFER_LIMIT
  );
  const filters = { method: "bank_transfer" };
  if (status && status !== "all") {
    filters.status = status;
  }

  const skip = (numericPage - 1) * numericLimit;
  const query = Transaction.find(filters)
    .populate(
      "customerId",
      "firstName lastName email phone company_name_ar company_name_en"
    )
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(numericLimit);

  const [items, total, statusAggregation] = await Promise.all([
    query,
    Transaction.countDocuments(filters),
    Transaction.aggregate([
      { $match: { method: "bank_transfer" } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const statusCounts = statusAggregation.reduce(
    (acc, entry) => {
      acc[entry._id] = entry.count;
      return acc;
    },
    {
      pending: 0,
      completed: 0,
      rejected: 0,
      approved: 0,
      failed: 0,
    }
  );

  return {
    items,
    pagination: {
      total,
      page: numericPage,
      pages: Math.ceil(total / numericLimit),
      limit: numericLimit,
    },
    statusCounts,
  };
};

exports.getPendingBankTransfers = asyncHandler(async (req, res, next) => {
  try {
    const data = await fetchBankTransfers({
      status: "pending",
      page: req.query.page,
      limit: req.query.limit,
    });
    res.status(200).json({
      success: true,
      data: data.items,
      pagination: data.pagination,
      statusCounts: data.statusCounts,
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      data: [],
      pagination: {
        total: 0,
        page: 1,
        pages: 1,
        limit: Number(req.query.limit) || 20,
      },
      statusCounts: {
        pending: 0,
        completed: 0,
        rejected: 0,
        approved: 0,
        failed: 0,
      },
    });
  }
});

exports.getBankTransfers = asyncHandler(async (req, res, next) => {
  const data = await fetchBankTransfers({
    status: req.query.status,
    page: req.query.page,
    limit: req.query.limit,
  });

  res.status(200).json({
    success: true,
    data: data.items,
    pagination: data.pagination,
    statusCounts: data.statusCounts,
  });
});
