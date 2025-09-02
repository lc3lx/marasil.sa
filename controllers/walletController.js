const asyncHandler = require("express-async-handler");
const multer = require("multer");
const axios = require("axios");
const Wallet = require("../models/walletModel");
const Transaction = require("../models/transactionModel");
const { uploadSingleImage } = require("../middlewares/uploadImageMiddleware");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");

const customer = require("../models/customerModel");
// const { response } = require("express");

// recharge wallet by moyasar

exports.getCustomerBalance = asyncHandler(async (req, res, next) => {
  let wallet = await Wallet.findOne({ customerId: req.customer._id });

  if (!wallet) {
    wallet = await Wallet.create({ customerId: req.customer._id });
  }
  res.json({ data: wallet.balance });
});

exports.getMyWallet = asyncHandler(async (req, res, next) => {
  let wallet = await Wallet.findOne({ customerId: req.customer._id });

  if (!wallet) {
    wallet = await Wallet.create({ customerId: req.customer._id });
  }

  res.status(200).json({ wallet });
});

exports.getOneWallet = asyncHandler(async (req, res, next) => {
  const wallet = await Wallet.findOne({ customerId: req.params.id });

  if (!wallet) {
    return res.status(404).json({ message: "Wallet not found" });
  }

  res.status(200).json({ wallet });
});

exports.getAllWallet = asyncHandler(async (req, res, next) => {
  const wallet = await Wallet.find({});

  if (!wallet) {
    return res.status(404).json({ message: "Wallet not found" });
  }

  res.status(200).json({ result: wallet });
});

exports.RechargeWallet = asyncHandler(async (req, res) => {
  try {
    const customerId = req.customer._id;
    const { token, amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // إنشاء عملية دفع عند ميسر
    const response = await axios.post(
      "https://api.moyasar.com/v1/payments",
      {
        amount: amount, // لازم بالـ halalas (مثلاً 100 ريال = 10000)
        currency: "SAR",
        source: {
          type: "token",
          token: token,
        },
        description: description || "Wallet recharge",
        callback_url: `${process.env.BASE_URL}/api/wallet/payment-callback`,
      },
      {
        auth: {
          username: process.env.MOYASAR_SECRET_KEY, // sk_test أو sk_live
          password: "",
        },
      }
    );

    const payment = response.data;

    // إذا الدفع بده 3DS (redirect)
    if (payment.status === "initiated" && payment.transaction_url) {
      return res.json({
        success: true,
        transaction_url: payment.transaction_url,
      });
    }

    // إذا الدفع تم مباشرةً (مثلاً Apple Pay أو بطاقة مقبولة فوراً)
    if (payment.status === "paid") {
      const wallet = await Wallet.findOne({ customerId });
      if (!wallet) {
        throw new Error("Wallet not found");
      }

      // خصم رسوم (مثال 3%)
      const fee = (3 / 100) * payment.amount;
      const netAmount = payment.amount - fee;

      wallet.balance += netAmount / 100; // لأنه halalas → ريال
      await wallet.save();

      const transaction = await Transaction.create({
        type: "credit",
        customerId,
        description,
        amount: netAmount / 100,
        status: "completed",
        method: "moyasar",
        moyasarPaymentId: payment.id,
        walletId: wallet._id,
      });

      await Wallet.findByIdAndUpdate(wallet._id, {
        $push: { transactions: transaction._id },
      });

      return res.json({
        success: true,
        message: "Wallet recharged successfully",
        balance: wallet.balance,
      });
    }

    // في حال حالة غير متوقعة
    return res.json({
      success: true,
      status: payment.status,
      payment,
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(400).json({ error: err.response?.data || err.message });
  }
});

////////////////////////
// Callback من ميسر بعد الدفع
exports.paymentCallback = async (req, res) => {
  try {
    const { id } = req.query; // ميسر بيرجع id تبع عملية الدفع

    if (!id) {
      return res.status(400).send("Payment ID is missing");
    }

    // استعلام عن العملية من ميسر
    const response = await axios.get(
      `https://api.moyasar.com/v1/payments/${id}`,
      {
        auth: {
          username: process.env.MOYASAR_SECRET_KEY, // sk_test أو sk_live
          password: "",
        },
      }
    );

    const payment = response.data;

    // إذا الدفع ناجح
    if (payment.status === "paid") {
      const customerId = payment.metadata?.customerId;
      // نصيحة: خزن customerId بـ metadata لما تعمل الدفع من السيرفر

      if (customerId) {
        const wallet = await Wallet.findOne({ customerId });
        if (wallet) {
          const netAmount = payment.amount;

          wallet.balance += netAmount / 100; // halalas → ريال
          await wallet.save();

          const transaction = await Transaction.create({
            type: "credit",
            customerId,
            description: "Recharge Wallet",
            amount: netAmount / 100,
            status: "completed",
            method: "moyasar",
            moyasarPaymentId: payment.id,
            walletId: wallet._id,
          });

          await Wallet.findByIdAndUpdate(wallet._id, {
            $push: { transactions: transaction._id },
          });
        }
      }
    }

    // تحويل المستخدم لواجهة معينة عندك (نجاح أو فشل)
    if (payment.status === "paid") {
      return res.redirect(
        `/wallet?status=success&amount=${payment.amount / 100}`
      );
    } else {
      return res.redirect(`/wallet?status=failed`);
    }
  } catch (err) {
    console.error("Payment callback error:", err.message);
    return res.redirect(`/wallet?status=error`);
  }
}; /////////////

exports.getPaymentStatus = asyncHandler(async (req, res, next) => {
  const { paymentId } = req.params;

  try {
    const response = await axios.get(
      `https://api.moyasar.com/v1/payments/${paymentId}`,
      {
        auth: {
          username: process.env.MOYASAR_SECRET_KEY,
          password: "",
        },
      }
    );

    const payment = response.data;

    if (payment.status === "paid") {
      const wallet = await Wallet.findOne({ customerId: req.customer._id });

      if (!wallet) {
        throw new Error("Wallet not found!");
      }

      const fee = (3 / 100) * payment.amount;
      const netAmount = payment.amount - fee;
      const totalAmount = netAmount / 100;

      wallet.balance += netAmount / 100;
      await wallet.save();

      const transaction = await Transaction.create({
        type: "credit",
        customerId: req.customer._id,
        description: "Recharge Wallet",
        amount: netAmount / 100,
        status: "completed",
        method: "moyasar",
        moyasarPaymentId: payment.id,
        walletId: wallet._id,
      });

      await Wallet.findByIdAndUpdate(wallet._id, {
        $push: { transactions: transaction._id },
      });
    }
    res.json({
      success: true,
      status: payment.status,
      payment,
    });
  } catch (err) {
    res.status(400).json({ err: err.response?.data || err.message });
  }
});

exports.MoyasarWebhook = asyncHandler(async (req, res) => {
  try {
    const secret = process.env.MOYASAR_SECRET_KEY;
    const signature = req.headers["x-moyasar-signature"];

    // ناخد البودي raw (Buffer) ونحوّله نص
    const rawBody = req.body.toString("utf8");

    // نحسب التوقيع
    const hash = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    // if (hash !== signature) {
    //   console.error("❌ فشل التحقق من التوقيع");
    //   return res.status(400).json({ error: "توقيع غير صالح" });
    // }

    // نعمل parse بعد التأكد
    const payment = JSON.parse(rawBody);

    if (payment.status !== "paid") {
      return res
        .status(200)
        .json({ message: "تم استلام الإشعار لكن الحالة ليست مدفوعة" });
    }

    const customerId = payment.metadata?.customerId;
    const netAmount = parseFloat(payment.metadata?.netAmount || 0);

    if (!customerId || !netAmount) {
      return res.status(400).json({ error: "بيانات ناقصة في الإشعار" });
    }

    // تحديث أو إنشاء المحفظة
    const wallet = await Wallet.findOne;
    AndUpdate(
      { customerId },
      { $inc: { balance: netAmount } },
      { upsert: true, new: true }
    );

    // إنشاء معاملة
    const transaction = await Transaction.create({
      type: "credit",
      customerId: customerId,
      description: "Recharge Wallet",
      amount: netAmount / 100,
      status: "completed",
      method: "moyasar",
      moyasarPaymentId: payment.id,
      walletId: wallet._id,
    });

    // ربط المعاملة بالمحفظة
    await Wallet.findByIdAndUpdate(wallet._id, {
      $push: { transactions: transaction._id },
    });

    console.log(
      "✅ تم شحن محفظة العميل ${customerId} بمبلغ ${netAmount / 100} ريال"
    );

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("خطأ في Webhook:", err);
    res.status(500).json({ error: "حدث خطأ في المعالجة" });
  }
});

exports.refundBalance = asyncHandler(async (req, res, next) => {
  const { refundAmount, customer } = req.body;
  const { paymentId } = req.params;

  if (!paymentId || !refundAmount || refundAmount <= 0) {
    return res.status(400).json({ message: "Invalid request" });
  }

  const wallet = await Wallet.findOne({ customerId: customer });
  const transaction = await Transaction.findOne({
    moyasarPaymentId: paymentId,
  });

  if (!wallet || !transaction) {
    return res.status(404).json({ message: "Wallet or transaction not found" });
  }

  try {
    const paymentResponse = await axios.get(
      `https://api.moyasar.com/v1/payments/${paymentId}`,
      {
        auth: { username: process.env.MOYASAR_SECRET_KEY, password: "" },
      }
    );
    const refundableAmount = transaction.refundableAmount;

    // const payment = paymentResponse.data;
    // const fee = (3 / 100) * payment.amount;
    // const netAmount = payment.amount - fee;
    // const totalAmount = netAmount / 100;
    // const alreadyRefunded = payment.refunded / 100;
    // const refundableAmount = totalAmount - alreadyRefunded;

    if (refundAmount > refundableAmount) {
      return res.status(400).json({
        message: `Refund amount exceeds available balance , the blance available to refundable is  ${refundableAmount}`,
      });
    }

    const response = await axios.post(
      `https://api.moyasar.com/v1/payments/${paymentId}/refund`,
      { amount: refundAmount * 100 },
      {
        auth: { username: process.env.MOYASAR_SECRET_KEY, password: "" },
        headers: { "Content-Type": "application/json" },
      }
    );

    // transaction.status =
    //   alreadyRefunded + refundAmount === totalAmount
    //     ? "refunded"
    //     : "partially_refunded";
    // await transaction.save();

    res.status(200).json({
      message: "Refund request submitted, processing takes 3-7 days",
      refundPayment: response.data,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error submitting refund request", error: err.message });
  }
});
exports.moyasarWebhook = asyncHandler(async (req, res, next) => {
  const { paymentId, status, refunded } = req.body;

  try {
    const transaction = await Transaction.findOne({
      moyasarPaymentId: paymentId,
    });

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const paymentResponse = await axios.get(
      `https://api.moyasar.com/v1/payments/${paymentId}`,
      { auth: { username: process.env.MOYASAR_SECRET_KEY, password: "" } }
    );

    // const payment = paymentResponse.data;
    // const fee = (3 / 100) * payment.amount;
    // const netAmount = payment.amount - fee;
    // const totalAmount = netAmount / 100;
    // const alreadyRefunded = payment.refunded / 100;
    // const refundableAmount = totalAmount - alreadyRefunded;

    if (status === "refunded") {
      transaction.status = "refunded";
      transaction.refundableAmount -= refunded;
      await transaction.save();

      const wallet = await Wallet.findById(transaction.walletId);

      if (wallet) {
        wallet.balance -= refunded / 100;

        await wallet.save();
      }
    }

    return res
      .status(200)
      .json({ message: "Webhook processed successfully", refundableAmount });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

exports.addBalane = asyncHandler(async (req, res, next) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: "Invalid request" });
  }
  const wallet = await Wallet.findOne({ customerId: req.params.id });
  if (!wallet) {
    return res.status(404).json({ message: "Wallet not found" });
  }
  wallet.balance += amount;
  await wallet.save();

  const transaction = await Transaction.create({
    type: "credit",
    description: "Manual balance addition by admin",
    amount,
    method: "manual_addition",
    moyasarPaymentId: null,
    status: "completed",
    walletId: wallet._id,
  });

  await Wallet.findByIdAndUpdate(wallet._id, {
    $push: { transactions: transaction._id },
  });
  res.status(200).json({ message: "Balance added successfully", wallet });
});
exports.removeBalance = asyncHandler(async (req, res, next) => {
  const { amount, paymentId } = req.body;
  const wallet = await Wallet.findOne({ customerId: req.params.id });

  if (!wallet) {
    return res.status(404).json({ message: "Wallet not found" });
  }
  const transaction = await Transaction.findOne({
    moyasarPaymentId: paymentId,
  });

  if (transaction.refundableAmount < amount) {
    return res.status(400).json({
      message: "amount greater than refundableAmount",
    });
  }

  wallet.balance -= amount;
  await wallet.save();

  transaction.refundableAmount -= amount;
  transaction.method = "manual_removal";
  await transaction.save();

  // const transaction = await Transaction.create({
  //   type: "debit",
  //   description: "Manual balance removal by admin",
  //   amount,
  //   method: "manual_removal",
  //   moyasarPaymentId: null,
  //   status: "completed",
  //   walletId: wallet._id,
  //   refundableAmount: wallet.refundableAmount,
  // });

  await Wallet.findByIdAndUpdate(wallet._id, {
    $push: { transactions: transaction._id },
  });

  res.status(200).json({
    message: "Balance removed successfully",
    wallet,
  });
});

// recharge wallet by bancK_transfer

const multerstorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "uploads/bankReceipt";
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const extract = file.mimetype.split("/")[1];
    const filename = `bankRecipt-${uuidv4()}-${Date.now()}.${extract}`;
    cb(null, filename);
  },
});

const upload = multer({ storage: multerstorage });
exports.uplaodBankreceiptImage = upload.single("bankReceipt");

exports.RechargeWalletbyBank = asyncHandler(async (req, res, next) => {
  try {
    const { amount } = req.body;
    const bankReceipt = req.file ? req.file.filename : null;

    const transaction = new Transaction({
      customerId: req.customer._id,
      amount,
      type: "credit",
      method: "bank_transfer",
      bankReceipt,
    });
    await transaction.save();

    await Wallet.findOneAndUpdate(
      { customerId: transaction.customerId },
      { $push: { transactions: transaction._id } },
      { new: true, upsert: true }
    );

    res.json({ success: true, message: "تم رفع طلب الشحن بنجاح!" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "حدث خطأ أثناء الشحن", err });
  }
});

// exports.getTransactions = asyncHandler(async (req, res, next) => {
//   const transactions = await Transaction.findOne({ _id: req.params.id });

//   if (!transactions) {
//     return res.status(404).json({ message: "There's no transactions" });
//   }
//   res.json({ transactions });
// });

exports.updatestatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;

  const transaction = await Transaction.findOne({ _id: req.params.id });
  if (!transaction) {
    return res.status(404).json({ message: "Transaction not found" });
  }

  transaction.status = status;
  await transaction.save();

  if (transaction.status === "approved") {
    const wallet = await Wallet.findOne({ customerId: transaction.customerId });
    if (wallet) {
      const fee = (3 / 100) * transaction.amount;
      const netAmount = transaction.amount - fee;
      wallet.balance += netAmount;
      await wallet.save();
    }
  }

  if (transaction.status === "rejected") {
    return res.json({ message: "admin rejected this transaction" });
  }

  res.json({ message: "Transaction status updated successfully" });
});
