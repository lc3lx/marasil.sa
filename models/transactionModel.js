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
    enum: ["bank_transfer", "moyasar", "manual_addition", "manual_removal"],
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
      "approved"
    ],
    default: "pending",
  },
  bankReceipt: String, // للتحويل البنكي
  moyasarPaymentId: String, // معرف الدفع في Moyasar
  createdAt: { type: Date, default: Date.now },
  walletId: { type: String, ref: "Wallet" },
});


const SetImageUrl = (doc) => {
   if (doc.bankReceipt) {
    const ImageUrl = `${process.env.BASE_URL}/bankReceipt/${doc.bankReceipt}`;
    doc.bankReceipt = ImageUrl;
  }

};

transactionSchema.post("init", function (doc) {
  SetImageUrl(doc);
});

transactionSchema.post("save", (doc) => {
  SetImageUrl(doc);
});
const Transaction = mongoose.model("Transaction", transactionSchema);
module.exports = Transaction;
