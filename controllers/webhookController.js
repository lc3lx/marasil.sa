const Transaction = require("../models/transactionModel");
const Wallet = require("../models/walletModel");
const crypto = require("crypto");
require("dotenv").config();

// معالجة webhook
exports.handleMoyasarWebhook = async (req, res) => {
  try {
    const event = req.body;
    const signature = req.headers["x-moyasar-signature"];
    const expectedSignature = crypto
      .createHmac("sha256", process.env.MOYASAR_WEBHOOK_SECRET)
      .update(JSON.stringify(event))
      .digest("hex");

    // التحقق من توقيع الحدث
    if (signature !== expectedSignature) {
      return res.status(401).json({ error: "Invalid webhook signature." });
    }

    // التحقق من نوع الحدث
    if (event.type === "payment.completed") {
      const payment = event.data.object;
      const transaction = await Transaction.findOne({
        moyasarPaymentId: payment.id,
      });

      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found." });
      }

      if (transaction.status === "completed") {
        return res
          .status(200)
          .json({ message: "Transaction already completed." });
      }

      // تحديث حالة المعاملة
      transaction.status = "completed";
      await transaction.save();

      // تحديث رصيد المحفظة
      const wallet = await Wallet.findById(transaction.walletId);
      wallet.balance += transaction.amount / 100; // تحويل هللة إلى SAR
      await wallet.save();

      res.json({ message: "Payment confirmed successfully.", wallet });
    } else {
      res.json({ message: "Webhook received but not processed." });
    }
  } catch (error) {
    console.error("Error handling webhook:", error.message);
    res.status(500).json({ error: "Failed to handle webhook." });
  }
};
