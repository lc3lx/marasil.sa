const express = require("express");
const {
  getDashboardStats,
  getAllUsers,
  getRecentActivity,
  updateUserStatus,
  updateUserRole,
  getAllShipments,
  getAllOrders
} = require("../controllers/dashboardController");

const {
  addBalanceToUser,
  getUserWallet,
  deleteUser,
  getUserActivity,
  approveBankTransfer,
  getPendingBankTransfers
} = require("../controllers/adminWalletController");

const { updateShipmentStatus } = require("../controllers/adminShipmentController");

const auth = require("../controllers/authController");

const router = express.Router();

// تطبيق middleware المصادقة على جميع الطرق
router.use(auth.Protect);
router.use(auth.allowedTo("admin"));

// Dashboard Statistics
router.get("/stats", getDashboardStats);

// Recent Activity
router.get("/activity", getRecentActivity);

// Users Management
router.get("/users", getAllUsers);
router.put("/users/:id/status", updateUserStatus);
router.put("/users/:id/role", updateUserRole);
router.delete("/users/:userId", deleteUser);
router.get("/users/:userId/wallet", getUserWallet);
router.get("/users/:userId/activity", getUserActivity);

// Wallet Management (Admin)
router.post("/wallets/:userId/add-balance", addBalanceToUser);
router.get("/wallets/pending-transfers", getPendingBankTransfers);
router.put("/wallets/approve-bank-transfer/:transactionId", approveBankTransfer);

// Shipments Management
router.get("/shipments", getAllShipments);
router.patch("/shipments/:shipmentId/status", updateShipmentStatus);

// Orders Management
router.get("/orders", getAllOrders);

module.exports = router;
