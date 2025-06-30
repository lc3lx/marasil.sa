const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.ObjectId,
      required: true,
      ref: "Customer",
    }, // معرف الزبون
    balance: { type: Number, required: true, default: 0 }, // الرصيد الحالي
    // refundableAmount: { type: Number, required: true },
    transactions: [{ type: mongoose.Schema.ObjectId, ref: "Transaction" }], // قائمة المعاملات
  },
  {
    timestamps: true,
  }
);

const Wallet = mongoose.model("Wallet", walletSchema);

module.exports = Wallet;
