const path = require("path");
const express = require("express");
const http = require("http");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");
const crypto = require("crypto");
require("dotenv").config();

// Middlewares
const globalError = require("./middlewares/errormiddleware");

// Routes
const authRoutes = require("./routes/authRoutes");
const customerRoutes = require("./routes/adminRoutes");
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
const { MoyasarWebhook } = require("./controllers/walletController");
const bodyParser = require("body-parser");
// Scheduled tasks
const { scheduleSalaryProcessing } = require("./utils/scheduler");
scheduleSalaryProcessing();

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

app.use(express.urlencoded({ extended: true }));
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

// API Routes
app.post(
  "/api/wallet/webhook/moyasar",
  express.raw({ type: "application/json" }), // مهم: raw body
  async (req, res) => {
    try {
      const secret = process.env.MOYASAR_SECRET_KEY; // sk_live_xxx أو sk_test_xxx
      const signature = req.headers["x-moyasar-signature"];
      const body = req.body.toString("utf8"); // raw body كنص

      console.log("جسم الطلب:", body);
      console.log("التوقيع المستلم:", signature);

      // احسب HMAC SHA256
      const hash = crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("hex");

      console.log("التجزئة المحسوبة:", hash);

      if (hash !== signature) {
        console.error("❌ فشل التحقق من التوقيع في Webhook");
        return res.status(400).json({ error: "توقيع غير صالح" });
      }

      // ✅ إذا التوقيع صحيح: حلّل JSON
      const payload = JSON.parse(body);
      const payment = payload.data;

      if (payment.status !== "paid") {
        return res.status(200).json({
          message: "تم استلام الإشعار لكن الحالة ليست مدفوعة",
        });
      }

      const customerId = payment.metadata?.customerId;
      const netAmount = parseFloat(payment.metadata?.netAmount || 0);

      if (!customerId || !netAmount) {
        return res.status(400).json({ error: "بيانات ناقصة في الإشعار" });
      }

      // 🔹 تحديث أو إنشاء المحفظة
      const wallet = await Wallet.findOneAndUpdate(
        { customerId },
        { $inc: { balance: netAmount } },
        { upsert: true, new: true }
      );

      // 🔹 إنشاء معاملة
      const transaction = await Transaction.create({
        type: "credit",
        customerId: customerId,
        description: "Recharge Wallet",
        amount: netAmount / 100, // إذا netAmount بالـ halalas
        status: "completed",
        method: "moyasar",
        moyasarPaymentId: payment.id,
        walletId: wallet._id,
      });

      // 🔹 ربط المعاملة بالمحفظة
      await Wallet.findByIdAndUpdate(wallet._id, {
        $push: { transactions: transaction._id },
      });

      console.log(
        `✅ تم شحن محفظة العميل ${customerId} بمبلغ ${
          netAmount / 100
        } ريال بعد الخصم`
      );

      res.status(200).json({ success: true });
    } catch (err) {
      console.error("خطأ في Webhook:", err);
      res.status(500).json({ error: "حدث خطأ في المعالجة" });
    }
  }
);
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/customer", customerRoutes);
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
