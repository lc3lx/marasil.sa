const asyncHandler = require("express-async-handler");
const Wallet = require("../models/walletModel");
const Transaction = require("../models/transactionModel");

const getLastWalletChargeTime = async (customerId) => {
  const lastCreditTransaction = await Transaction.findOne({
    customerId,
    type: "credit",
    status: "completed",
  }).sort({ createdAt: -1 });

  if (!lastCreditTransaction) {
    return "لا يوجد شحن سابق";
  }

  const diffText = timeAgo(lastCreditTransaction.createdAt);
  return `آخر معاملة منذ ${diffText}`;
};

const timeAgo = (date) => {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return "ثوانٍ قليلة";
  if (diff < 3600) return `${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ساعة`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} يوم`;
  return `${Math.floor(diff / 604800)} أسبوع`;
};

exports.laseWalletCharge = asyncHandler(async (req, res) => {
  try {
    const customerId = req.customer._id; 
    const message = await getLastWalletChargeTime(customerId);
    res.json({ message });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "حدث خطأ أثناء جلب المعاملة الأخيرة" });
  }
});

exports.getMyTransaction = asyncHandler(async (req, res, next) => {
  const wallet = await Wallet.findOne({
    customerId: req.customer._id,
  }).populate("transactions");
  if (!wallet) {
    return res.status(404).json({ message: "No wallet found" });
  }
  res.status(200).json({
    message: "success",
    result: wallet.transactions.length,
    data: wallet.transactions,
  });
});

exports.getTramsactionsforUser = asyncHandler(async (req, res, next) => {
  const transaction = await Transaction.find({
    customerId: req.params.id,
  }).sort({ createdAt: -1 });
  res.status(200).json({ message: "success", result: transaction });
});

exports.getAllTransaction = asyncHandler(async (req, res, next) => {
  const transactions = await Transaction.find({});
  res.status(200).json({
    message: "success",
    result: transactions.length,
    data: transactions,
  });
});
exports.deleteOneTransaction = asyncHandler(async (req, res, next) => {
  const transaction = await Transaction.findByIdAndDelete(req.params.id);
  if (!transaction) {
    return res.status(404).json({ message: "Transaction not found" });
  }
  res.status(200).send();
});
exports.deleteAllTransaction = asyncHandler(async (req, res, next) => {
  const wallet = await Wallet.findOne({
    customerId: req.customer._id,
  });

  await Transaction.deleteMany({});
  await Wallet.updateMany({}, { $set: { transactions: [] } });

  await wallet.save();
  res.status(200).send();
});
