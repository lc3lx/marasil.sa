const express = require("express");
const {
  getDashboardStats,
  getAllUsers,
  getRecentActivity,
  updateUserStatus,
  updateUserRole,
  getAllShipments,
  getAllOrders,
  getCarrierStats
} = require("../controllers/dashboardController");

const {
  addBalanceToUser,
  getUserWallet,
  deleteUser,
  getUserActivity,
  approveBankTransfer,
  getPendingBankTransfers,
  getBankTransfers,
  subtractBalanceFromUser,
} = require("../controllers/adminWalletController");

const { updateShipmentStatus } = require("../controllers/adminShipmentController");
const { getInvoices } = require("../controllers/adminInvoiceController");
const {
  getPlatforms,
  updatePlatformSettings,
  disconnectPlatform,
  syncAllPlatforms,
} = require("../controllers/adminPlatformsController");

const {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  updateEmployeeStatus,
  updateEmployeePermissions,
  updateEmployeePayroll,
  updateEmployeeAttendance,
  getEmployeesStats,
  changeEmployeePassword,
  loginEmployee,
  addUserBalance,
  subtractUserBalance,
  getUserWalletDetails,
  getUserActivityDetails,
} = require("../controllers/adminEmployeesController");

const auth = require("../controllers/authController");

const router = express.Router();

// تطبيق middleware المصادقة على جميع الطرق
router.use(auth.ProtectEmployee);
router.use(auth.allowedToEmployee("admin", "employee"));

// Dashboard Statistics
router.get("/stats", getDashboardStats);
router.get("/carriers/stats", getCarrierStats);

// Recent Activity
router.get("/activity", getRecentActivity);

// Invoices
router.get("/invoices", getInvoices);

// Platforms
router.get("/platforms", getPlatforms);
router.put("/platforms/:id/settings", updatePlatformSettings);
router.post("/platforms/:id/disconnect", disconnectPlatform);
router.post("/platforms/sync-all", syncAllPlatforms);

// Users Management
router.get("/users", getAllUsers);
router.put("/users/:id/status", updateUserStatus);
router.put("/users/:id/role", updateUserRole);
router.delete("/users/:userId", deleteUser);
router.get("/users/:userId/wallet", getUserWalletDetails);
router.get("/users/:userId/activity", getUserActivityDetails);

// Wallet Management (Admin)
router.post("/wallets/:userId/add-balance", addUserBalance);
router.post("/wallets/:userId/subtract-balance", subtractUserBalance);
router.get("/wallets/pending-transfers", getPendingBankTransfers);
router.put("/wallets/approve-bank-transfer/:transactionId", approveBankTransfer);
router.get("/wallets/transfers", getBankTransfers);

// Shipments Management
router.get("/shipments", getAllShipments);
router.patch("/shipments/:shipmentId/status", updateShipmentStatus);

// Orders Management
router.get("/orders", getAllOrders);

// Employees Management
router.get("/employees", getEmployees);
router.get("/employees/stats", getEmployeesStats);
router.get("/employees/:id", getEmployeeById);
router.post("/employees", createEmployee);
router.put("/employees/:id", updateEmployee);
router.delete("/employees/:id", deleteEmployee);
router.patch("/employees/:id/status", updateEmployeeStatus);
router.patch("/employees/:id/permissions", updateEmployeePermissions);
router.patch("/employees/:id/payroll", updateEmployeePayroll);
router.patch("/employees/:id/attendance", updateEmployeeAttendance);
router.patch("/employees/:id/change-password", changeEmployeePassword);
router.post("/employees/login", loginEmployee);

module.exports = router;
