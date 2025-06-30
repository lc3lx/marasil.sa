const asyncHandler = require("express-async-handler");
const Wallet = require("../models/walletModel");
const Transaction = require("../models/transactionModel");

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
