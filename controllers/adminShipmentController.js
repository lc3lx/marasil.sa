const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");

// @desc    Update Shipment Status (Admin)
// @route   PATCH /api/admin/shipments/:shipmentId/status
// @access  Private/Admin
exports.updateShipmentStatus = asyncHandler(async (req, res, next) => {
  const { shipmentId } = req.params;
  const { status, notes } = req.body;

  const allowedStatuses = [
    "Delivered",
    "IN_TRANSIT",
    "READY_FOR_PICKUP",
    "Canceled",
  ];

  if (!status || !allowedStatuses.includes(status)) {
    return next(new ApiError("حالة الشحنة غير صالحة", 400));
  }

  try {
    const Shipment = require("../models/shipmentModel");
    const Wallet = require("../models/walletModel");
    const Transaction = require("../models/transactionModel");
    const Notification = require("../models/notificationModel");
    const Customer = require("../models/customerModel");
    const sendmail = require("../utils/SendMail");

    // احضر الشحنة أولاً للتحقق من الحالة الحالية
    const existing = await Shipment.findById(shipmentId);
    if (!existing) {
      return next(new ApiError("الشحنة غير موجودة", 404));
    }

    // منع الإلغاء إلا إذا كانت الشحنة READY_FOR_PICKUP
    if (
      status === "Canceled" &&
      existing.shipmentstates !== "READY_FOR_PICKUP"
    ) {
      return next(
        new ApiError("لا يمكن إلغاء الشحنة إلا إذا كانت READY_FOR_PICKUP", 400)
      );
    }

    // نفّذ التحديث باستخدام findOneAndUpdate لتفعيل ال-hooks
    const shipment = await Shipment.findOneAndUpdate(
      { _id: shipmentId },
      { shipmentstates: status },
      { new: true, runValidators: true }
    );

    // تنفيذ الاسترجاع للمحفظة عند الإلغاء (الدفع المسبق فقط)
    let refund = { refunded: false, amount: 0 };
    if (status === "Canceled" && existing.paymentMathod === "Prepaid") {
      const amount = existing.ordervalue ?? existing.totalprice ?? 0;
      if (amount > 0 && existing.customerId) {
        // منع التكرار
        const existingTx = await Transaction.findOne({
          referenceId: existing._id,
          type: "credit",
          method: "shipment_cancel_refund",
        });
        if (!existingTx) {
          let wallet = await Wallet.findOne({
            customerId: existing.customerId,
          });
          if (!wallet) {
            wallet = await Wallet.create({
              customerId: existing.customerId,
              balance: 0,
              transactions: [],
            });
          }
          wallet.balance += amount;
          await wallet.save();

          const tx = await Transaction.create({
            customerId: existing.customerId,
            type: "credit",
            description: notes || `استرجاع مبلغ إلغاء الشحنة ${existing._id}`,
            amount,
            method: "shipment_cancel_refund",
            status: "completed",
            referenceId: existing._id.toString(),
            referenceType: "shipment",
            walletId: wallet._id,
          });
          try {
            if (Array.isArray(wallet.transactions)) {
              wallet.transactions.push(tx._id);
              await wallet.save();
            }
          } catch (_) {}

          // إشعار + بريد إلكتروني اختياري
          const message = `تم إلغاء شحنتك رقم ${existing._id} وتم استرجاع مبلغ ${amount} ريال إلى محفظتك`;
          await Notification.create({
            customerId: existing.customerId,
            type: "order",
            message,
          });
          try {
            const customer = await Customer.findById(existing.customerId);
            const email = customer?.email;
            if (email) {
              sendmail({
                to: email,
                subject: "إلغاء الشحنة واسترجاع المبلغ",
                text: message,
              });
            }
          } catch (_) {}

          refund = { refunded: true, amount };
        }
      }
    }

    return res.status(200).json({ success: true, data: shipment, refund });
  } catch (err) {
    return next(new ApiError("فشل تحديث حالة الشحنة", 500));
  }
});
