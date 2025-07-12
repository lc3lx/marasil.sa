const path = require("path");
const express = require("express");
const http = require("http");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");
require("dotenv").config();

// Middlewares
const globalError = require("./middlewares/errormiddleware");

// Models
//const Notification = require("./models/notificationModel");

// Routes
const authRoutes = require("./routes/authRoutes");
const customerRoutes = require("./routes/adminRoutes");
const orderRoutes = require("./routes/orderRoutes");
// const bankInfoRoutes = require("./routes/bankInfoRoutes");

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

// schedule salary processing
const { scheduleSalaryProcessing } = require("./utils/scheduler");
scheduleSalaryProcessing();

//  run function schedule
require("./controllers/sallaController");
require("./controllers/shopifyController");
require("./controllers/zidController");
require("./controllers/wooCommerceController");
require("./controllers/mnasatiController");

const { webhookCheckout } = require("./controllers/walletController");

// Initialize app and server
const app = express();
const server = http.createServer(app);

// Socket.IO setup
const socketIo = require("socket.io");

const io = socketIo(server, {
  cors: {
    origin: "*", // السماح بكل النطاقات
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: false, // لا حاجة لـ credentials مع origin: "*"
    allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
  },
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
    cookie: { secure: process.env.NODE_ENV === "production" },
  })
);

const allowedOrigins = [
  process.env.FRONTEND_URL, // e.g., 'https://marasil.netlify.app'
  "http://localhost:3000",
  "http://localhost:3001",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false); // Just reject, don't throw error
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.static(path.join(__dirname, "uploads")));
app.use(express.static("public"));

// Socket.IO connection handling (merge all listeners)
io.on("connection", (socket) => {
  console.log("New client connected", socket.id);

  // Authentication mapping
  socket.on("authenticate", (userId) => {
    activeUsers.set(userId, socket.id);
    socket.join(`user-${userId}`);
    console.log(`User ${userId} authenticated on socket ${socket.id}`);
  });

  // Admin broadcast
  socket.on("adminBroadcast", async (data) => {
    try {
      await Notification.create(data);
      io.emit("notification", data);
    } catch (err) {
      console.error("Failed to save notification:", err);
    }
  });

  // Handle disconnect
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

// تحميل الروابط

app.use("/api/auth", authRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/order", orderRoutes);

app.use("/api/wallet", walletRoutes);
app.use("/api/tranactions", transactionsRoutes);
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

// sysytem routes
const employeeRoutes = require("./system/routes/employeeRoutes");
const salaryModifactionRoutes = require("./system/routes/salaryModificationRoutes");
const salaryRoutes = require("./system/routes/salaryRoutes");

// Webhook endpoint
app.post("/webhook/moyasar", webhookCheckout);

// Global error handler
app.use(globalError);

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
