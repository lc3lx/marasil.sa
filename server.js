const path = require("path");
const express = require("express");
const http = require("http");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");
const crypto = require("crypto");
require("dotenv").config();
const axios = require("axios");
const asyncHandler = require("express-async-handler");

// Middlewares
const globalError = require("./middlewares/errormiddleware");

// Routes
const authRoutes = require("./routes/authRoutes");
const customerRoutes = require("./routes/adminRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const orderRoutes = require("./routes/orderRoutes");
const cityRoutes = require("./routes/cityRoutes");
const walletRoutes = require("./routes/walletRoutes");
const transactionsRoutes = require("./routes/transactitonsRoutes");
const sallaRoutes = require("./routes/sallaRoutes");
const shopifyRoutes = require("./routes/shopifyRoutes");
const zidRoutes = require("./routes/zidRoutes");
const wooCommerceRoutes = require("./routes/woocommerceRoutes");
const mnasatiRoutes = require("./routes/mnasatiRoutes");
const clientAddressRoutes = require("./routes/clientAddressRoutes");
const orderManuallyRoutes = require("./routes/orderManuallyRoutes");
const packageRoutes = require("./routes/packageRoutes");
const addressRotues = require("./routes/addressRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const shipmentRoutes = require("./routes/shipmentRoute");
const companyShipmentRoutes = require("./routes/shippingCompanyRoute");
const announcementRoutes = require("./routes/announcementRoutes");
const couponRoutes = require("./routes/couponRoutes");
const { MoyasarWebhook } = require("./controllers/walletController");
const bodyParser = require("body-parser");
const Transaction = require("./models/transactionModel");
const Wallet = require("./models/walletModel");
// Scheduled tasks
const { scheduleSalaryProcessing } = require("./utils/scheduler");
const { scheduleOmniLabelPolling } = require("./utils/omniLabelScheduler");
scheduleSalaryProcessing();
scheduleOmniLabelPolling();

// Initialize app and server
const app = express();
const server = http.createServer(app);

// CORS configuration
const allowedOrigins = [
  "https://www.marasil.site",
  "https://marasil.site",
  "http://localhost:3000",
  "http://localhost:3001",
];

// Enhanced CORS middleware
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked for origin: ${origin}`);
        callback(new Error("Not allowed by CORS"), false);
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// Handle preflight requests
app.options("*", cors());

// Additional CORS headers middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Origin", origin);
  }
  next();
});

// Socket.IO setup
const socketIo = require("socket.io");
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
  },
  transports: ["websocket", "polling"],
});

// Store active user connections
const activeUsers = new Map();

// MongoDB connection
mongoose
  .connect(process.env.DATABASE_URL)
  .then((conn) => console.log(`Database Connected: ${conn.connection.host}`))
  .catch((err) => {
    console.error(`Database Error: ${err.message}`);
    process.exit(1);
  });

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    store: MongoStore.create({ mongoUrl: process.env.DATABASE_URL }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Body parsers
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(express.static(path.join(__dirname, "uploads")));
app.use(express.static("public"));

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("New client connected", socket.id);

  socket.on("authenticate", (userId) => {
    activeUsers.set(userId, socket.id);
    socket.join(`user-${userId}`);
    console.log(`User ${userId} authenticated on socket ${socket.id}`);
  });

  socket.on("disconnect", () => {
    for (const [userId, sockId] of activeUsers.entries()) {
      if (sockId === socket.id) {
        activeUsers.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  });
});

// Expose io and activeUsers to routes
app.set("io", io);
app.set("activeUsers", activeUsers);
// Attach to each request
app.use((req, res, next) => {
  req.io = io;
  req.activeUsers = activeUsers;
  next();
});
// تم إزالة express.json() المكرر
// API Routes

// API endpoint لجلب تفاصيل الدفعات من Moyasar
app.get(
  "/api/admin/moyasar-payments",
  asyncHandler(async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        customerId,
        dateFrom,
        dateTo,
      } = req.query;

      // بناء استعلام البحث
      const query = { method: "moyasar" };

      if (status && status !== "all") {
        query.status = status;
      }

      if (customerId) {
        query.customerId = customerId;
      }

      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }

      // حساب إجمالي المعاملات
      const total = await Transaction.countDocuments(query);

      // جلب المعاملات مع معلومات العميل
      const transactions = await Transaction.find(query)
        .populate({
          path: "customerId",
          select:
            "firstName lastName email phone phoneNumber company_name_ar company_name_en",
        })
        .populate({
          path: "walletId",
          select: "balance",
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean();

      // تنسيق البيانات
      const formattedTransactions = transactions.map((transaction) => {
        const customer = transaction.customerId || {};
        const customerName =
          [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
          customer.company_name_ar ||
          customer.company_name_en ||
          customer.email ||
          "عميل غير معروف";

        const customerEmail = customer.email || "غير متوفر";
        const customerPhone =
          customer.phone || customer.phoneNumber || "غير متوفر";

        return {
          _id: transaction._id,
          moyasarPaymentId: transaction.moyasarPaymentId,
          amount: transaction.amount,
          status: transaction.status,
          description: transaction.description,
          customerId: transaction.customerId?._id || transaction.customerId,
          customerName,
          customerEmail,
          customerPhone,
          walletId: transaction.walletId?._id || transaction.walletId,
          walletBalance: transaction.walletId?.balance || 0,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt,
        };
      });

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: formattedTransactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        summary: {
          totalAmount: transactions.reduce(
            (sum, t) => sum + (t.amount || 0),
            0
          ),
          totalTransactions: total,
          statusCounts: await Transaction.aggregate([
            { $match: { method: "moyasar", ...query } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
          ]),
        },
      });
    } catch (error) {
      console.error("خطأ في جلب الدفعات من Moyasar:", error);
      res.status(500).json({
        success: false,
        error: "فشل في جلب بيانات الدفعات من Moyasar",
      });
    }
  })
);

// API endpoint لجلب تفاصيل دفعة محددة من Moyasar
app.get(
  "/api/admin/moyasar-payments/:paymentId",
  asyncHandler(async (req, res) => {
    try {
      const { paymentId } = req.params;

      // جلب المعاملة من قاعدة البيانات
      const transaction = await Transaction.findOne({
        moyasarPaymentId: paymentId,
      })
        .populate({
          path: "customerId",
          select:
            "firstName lastName email phone phoneNumber company_name_ar company_name_en",
        })
        .populate({
          path: "walletId",
          select: "balance",
        })
        .lean();

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: "الدفعة غير موجودة",
        });
      }

      // محاولة جلب التفاصيل من API Moyasar
      let moyasarDetails = null;
      try {
        const authHeader =
          "Basic " +
          Buffer.from(process.env.MOYASAR_SECRET_KEY + ":").toString("base64");
        const moyasarResponse = await axios.get(
          `https://api.moyasar.com/v1/payments/${paymentId}`,
          {
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
          }
        );
        moyasarDetails = moyasarResponse.data;
      } catch (moyasarError) {
        console.warn("تعذر جلب التفاصيل من Moyasar API:", moyasarError.message);
      }

      // تنسيق البيانات
      const customer = transaction.customerId || {};
      const formattedTransaction = {
        _id: transaction._id,
        moyasarPaymentId: transaction.moyasarPaymentId,
        amount: transaction.amount,
        status: transaction.status,
        description: transaction.description,
        customerId: transaction.customerId?._id || transaction.customerId,
        customerName:
          [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
          customer.company_name_ar ||
          customer.company_name_en ||
          customer.email ||
          "عميل غير معروف",
        customerEmail: customer.email || "غير متوفر",
        customerPhone: customer.phone || customer.phoneNumber || "غير متوفر",
        walletId: transaction.walletId?._id || transaction.walletId,
        walletBalance: transaction.walletId?.balance || 0,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        moyasarDetails: moyasarDetails
          ? {
              id: moyasarDetails.id,
              status: moyasarDetails.status,
              amount: moyasarDetails.amount,
              currency: moyasarDetails.currency,
              description: moyasarDetails.description,
              source: moyasarDetails.source,
              metadata: moyasarDetails.metadata,
              created_at: moyasarDetails.created_at,
              updated_at: moyasarDetails.updated_at,
            }
          : null,
      };

      res.json({
        success: true,
        data: formattedTransaction,
      });
    } catch (error) {
      console.error("خطأ في جلب تفاصيل الدفعة:", error);
      res.status(500).json({
        success: false,
        error: "فشل في جلب تفاصيل الدفعة",
      });
    }
  })
);

app.post(
  "/api/wallet/webhook/moyasar",
  asyncHandler(async (req, res) => {
    try {
      const secret = process.env.MOYASAR_SECRET_TOKEN;
      const payload = req.body;

      console.log("📥 Webhook Payload:", JSON.stringify(payload, null, 2));

      // ✅ تحقق من السر (secret_token)
      if (!payload.secret_token || payload.secret_token !== secret) {
        console.error("❌ فشل التحقق من التوقيع (secret_token غير صحيح)");
        return res.status(400).json({ error: "Invalid secret_token" });
      }

      const payment = payload.data;
      const webhookType = payload.type;

      console.log("💳 Payment Data:", {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        metadata: payment.metadata,
        webhookType: webhookType,
        message: payment.source?.message,
      });

      console.log("🔍 Webhook Analysis:");
      console.log(`   - Type: ${webhookType}`);
      console.log(`   - Status: ${payment.status}`);
      console.log(`   - CustomerId: ${payment.metadata?.customerId}`);
      console.log(`   - Message: ${payment.source?.message}`);

      // ✅ التحقق من customerId في metadata
      const customerId = payment.metadata?.customerId;
      if (!customerId) {
        console.error("❌ customerId مفقود في metadata");
        return res
          .status(400)
          .json({ error: "بيانات ناقصة - customerId مفقود في metadata" });
      }

      // 🔄 التحقق من نوع الـ webhook
      if (webhookType === "payment_failed" || payment.status === "failed") {
        console.log("❌ معالجة دفعة فاشلة");

        // تحديث حالة المعاملة إلى failed
        console.log(`🔄 تحديث معاملة فاشلة: ${payment.id}`);
        const failedTransaction = await Transaction.findOneAndUpdate(
          { moyasarPaymentId: payment.id },
          {
            status: "failed",
            description: `فشل الدفع - ${
              payment.source?.message || "سبب غير محدد"
            }`,
          },
          { upsert: true, new: true }
        );

        console.log("❌ تم تسجيل معاملة فاشلة:", failedTransaction._id);
        console.log("📝 سبب الفشل:", payment.source?.message || "غير محدد");
        console.log("📊 حالة المعاملة الجديدة:", failedTransaction.status);

        return res.status(200).json({
          success: false,
          message: "تم تسجيل فشل الدفع",
          failureReason: payment.source?.message || "سبب غير محدد",
          transactionId: failedTransaction._id,
        });
      }

      // ✅ معالجة الدفعات الناجحة
      if (
        webhookType === "payment_completed" ||
        webhookType === "payment_paid" ||
        payment.status === "paid"
      ) {
        console.log("✅ معالجة دفعة ناجحة");

        // 🔍 التحقق من الدفع عبر API ميسر
        console.log("🔍 Verifying payment with Moyasar API...");
        const authHeader =
          "Basic " +
          Buffer.from(process.env.MOYASAR_SECRET_KEY + ":").toString("base64");

        const moyasarResponse = await axios.get(
          `https://api.moyasar.com/v1/payments/${payment.id}`,
          {
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
          }
        );

        const verifiedPayment = moyasarResponse.data;
        console.log("✅ Moyasar API Response:", {
          status: verifiedPayment.status,
          amount: verifiedPayment.amount,
          currency: verifiedPayment.currency,
        });

        // ✅ التحقق من حالة الدفع من API ميسر
        if (verifiedPayment.status !== "paid") {
          console.log("❌ Payment not paid according to Moyasar API");

          // تحديث حالة المعاملة إلى failed إذا كانت موجودة
          await Transaction.findOneAndUpdate(
            { moyasarPaymentId: payment.id },
            {
              status: "failed",
              description: `فشل الدفع - ${
                verifiedPayment.source?.message || "Unknown error"
              }`,
            }
          );

          return res
            .status(200)
            .json({ message: "تم التحقق - الدفع غير مكتمل" });
        }

        // ✅ التحقق من التكرار (idempotency)
        const existingTransaction = await Transaction.findOne({
          moyasarPaymentId: payment.id,
          status: "completed",
        });

        if (existingTransaction) {
          console.log("⚠️ Payment already processed:", existingTransaction._id);
          return res.status(200).json({ message: "تمت المعالجة سابقًا" });
        }

        console.log(`🔄 البحث عن معاملة موجودة: ${payment.id}`);
        const pendingTransaction = await Transaction.findOne({
          moyasarPaymentId: payment.id,
          status: "pending",
        });

        if (pendingTransaction) {
          console.log(
            "📝 وُجدت معاملة معلقة:",
            pendingTransaction._id,
            "- سيتم تحديثها"
          );
        } else {
          console.log("📝 لم توجد معاملة معلقة - سيتم إنشاء جديدة");
        }

        // 🔹 تحديث أو إنشاء المحفظة
        const wallet = await Wallet.findOneAndUpdate(
          { customerId },
          { $inc: { balance: verifiedPayment.amount / 100 } }, // تحويل من هللة إلى ريال
          { upsert: true, new: true }
        );

        // 🔹 تحديث المعاملة الموجودة أو إنشاء جديدة
        console.log(`💾 إنشاء/تحديث المعاملة: ${payment.id}`);
        const transaction = await Transaction.findOneAndUpdate(
          { moyasarPaymentId: payment.id },
          {
            type: "credit",
            customerId,
            description: verifiedPayment.description || "شحن المحفظة",
            amount: verifiedPayment.amount / 100,
            status: "completed",
            method: "moyasar",
            moyasarPaymentId: payment.id,
            walletId: wallet._id,
          },
          {
            upsert: true,
            new: true,
          }
        );

        console.log("✅ تم إنشاء/تحديث المعاملة:", transaction._id);
        console.log("📊 حالة المعاملة:", transaction.status);
        console.log("💰 مبلغ المعاملة:", transaction.amount);

        // 🔹 ربط المعاملة بالمحفظة
        await Wallet.findByIdAndUpdate(wallet._id, {
          $addToSet: { transactions: transaction._id },
        });

        console.log(
          `✅ تم شحن محفظة ${customerId} بمبلغ ${
            verifiedPayment.amount / 100
          } ريال`
        );
        console.log(`📊 رصيد المحفظة الجديد: ${wallet.balance}`);

        return res.status(200).json({
          success: true,
          message: "تم شحن المحفظة بنجاح",
          amount: verifiedPayment.amount / 100,
          walletBalance: wallet.balance,
          transactionId: transaction._id,
        });
      }

      // 🔄 نوع webhook غير معروف
      console.log("⚠️ Unknown webhook type:", webhookType);
      return res.status(200).json({
        message: `تم استلام webhook من نوع غير معروف: ${webhookType}`,
      });
    } catch (err) {
      console.error("❌ Webhook Error:", err.message, err.stack);
      if (err.response) {
        console.error("Moyasar API Error:", err.response.data);
      }
      return res.status(500).json({ error: "حدث خطأ في المعالجة" });
    }
  })
);
app.use("/api/auth", authRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/admin", dashboardRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/salla", sallaRoutes);
app.use("/api/shopify", shopifyRoutes);
app.use("/api/zid", zidRoutes);
app.use("/api/woocommerce", wooCommerceRoutes);
app.use("/api/mnasati", mnasatiRoutes);
app.use("/api/clientaddress", clientAddressRoutes);
app.use("/api/orderManually", orderManuallyRoutes);
app.use("/api/package", packageRoutes);
app.use("/api/addresses", addressRotues);
app.use("/api/notifications", notificationRoutes);
app.use("/api/shipment", shipmentRoutes);
app.use("/api/shipmentcompany", companyShipmentRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/cities", cityRoutes);

// Global error handler
app.use(globalError);

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Allowed CORS origins: ${allowedOrigins.join(", ")}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
