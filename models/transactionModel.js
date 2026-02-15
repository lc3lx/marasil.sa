const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.ObjectId,
    required: true,
    ref: "Customer",
  },
  type: {
    type: String,
    enum: ["credit", "debit"],
    required: true,
  },
  description: {
    type: String,
    default: "",
  },

  amount: { type: Number, required: true }, // المبلغ بالهللة (مثال: 500 SAR = 50000 هللة)
  refundableAmount: { type: Number },
  method: {
    type: String,
    enum: [
      "bank_transfer",
      "moyasar",
      "manual_addition",
      "manual_removal",
      "shipment_payment",
      "shipment_cancel_refund",
      "return_shipment",
      "return_shipment_refund",
      "package_purchase",
      "package_cancel_refund",
      "coupon_credit",
      "admin_credit",
      "admin_debit",
    ],
    default: "moyasar",
    required: true,
  },
  status: {
    type: String,
    enum: [
      "pending",
      "completed",
      "failed",
      "refunded",
      "partially_refunded",
      "rejected",
      "approved",
    ],
    default: "pending",
  },
  bankReceipt: String, // للتحويل البنكي
  moyasarPaymentId: String, // معرف الدفع في Moyasar
  referenceId: { type: String }, // معرف المرجع (shipmentId, orderId, packageId)
  referenceType: {
    type: String,
    enum: [
      "shipment",
      "return_shipment",
      "package",
      "admin_credit",
      "wallet_recharge",
      "shipment_cancel_refund",
      "coupon",
      "order",
    ],
  }, // نوع المرجع
  notes: {
    type: String,
    default: "",
  },
  approvedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "Customer",
  },
  approvedAt: Date,
  rejectedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "Customer",
  },
  rejectedAt: Date,
  createdAt: { type: Date, default: Date.now },
  walletId: { type: mongoose.Schema.ObjectId, ref: "Wallet" },
});

const SetImageUrl = (doc) => {
  if (!doc.bankReceipt || typeof doc.bankReceipt !== "string") return;
  const val = doc.bankReceipt.trim();
  if (val.startsWith("http://") || val.startsWith("https://")) return;
  const base = (process.env.BASE_URL || "https://www.marasil.sa").replace(/\/$/, "");
  doc.bankReceipt = `${base}/bankReceipt/${val}`;
};

transactionSchema.post("init", function (doc) {
  SetImageUrl(doc);
});

transactionSchema.post("save", (doc) => {
  SetImageUrl(doc);
});

transactionSchema.post("find", function (docs) {
  docs.forEach((doc) => SetImageUrl(doc));
});
const Transaction = mongoose.model("Transaction", transactionSchema);
module.exports = Transaction;
