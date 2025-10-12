const asyncHandler = require("express-async-handler");
const Customer = require("../models/customerModel");
const ApiError = require("../utils/apiError");

// @desc    Get Dashboard Statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getDashboardStats = asyncHandler(async (req, res) => {
  // إحصائيات المستخدمين
  const totalUsers = await Customer.countDocuments();
  const activeUsers = await Customer.countDocuments({ active: true });
  const adminUsers = await Customer.countDocuments({ role: 'admin' });
  
  // إحصائيات الشحنات من قاعدة البيانات
  let totalShipments = 0, pendingShipments = 0, inTransitShipments = 0, deliveredShipments = 0, cancelledShipments = 0;
  try {
    const Shipment = require("../models/shipmentModel");
    totalShipments = await Shipment.countDocuments();
    pendingShipments = await Shipment.countDocuments({ status: 'pending' });
    inTransitShipments = await Shipment.countDocuments({ status: 'in_transit' });
    deliveredShipments = await Shipment.countDocuments({ status: 'delivered' });
    cancelledShipments = await Shipment.countDocuments({ status: 'cancelled' });
  } catch (error) {
    console.log('Shipment model not found, using default values');
  }
  
  // إحصائيات الطلبات من قاعدة البيانات
  let totalOrders = 0, pendingOrders = 0, approvedOrders = 0, rejectedOrders = 0, completedOrders = 0;
  try {
    const Order = require("../models/orderModel");
    totalOrders = await Order.countDocuments();
    pendingOrders = await Order.countDocuments({ status: 'pending' });
    approvedOrders = await Order.countDocuments({ status: 'approved' });
    rejectedOrders = await Order.countDocuments({ status: 'rejected' });
    completedOrders = await Order.countDocuments({ status: 'completed' });
  } catch (error) {
    console.log('Order model not found, using default values');
  }
  
  // إحصائيات المحافظ من قاعدة البيانات
  let totalBalance = 0, activeWallets = 0, totalTransactions = 0, totalDeposits = 0, totalWithdrawals = 0;
  try {
    const Wallet = require("../models/walletModel");
    const Transaction = require("../models/transactionModel");
    
    const wallets = await Wallet.find();
    totalBalance = wallets.reduce((sum, wallet) => sum + (wallet.balance || 0), 0);
    activeWallets = await Wallet.countDocuments({ balance: { $gt: 0 } });
    
    totalTransactions = await Transaction.countDocuments();
    const deposits = await Transaction.find({ type: 'deposit' });
    const withdrawals = await Transaction.find({ type: 'withdrawal' });
    totalDeposits = deposits.reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
    totalWithdrawals = withdrawals.reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
  } catch (error) {
    console.log('Wallet/Transaction models not found, using default values');
  }
  
  // إحصائيات العملاء (نفس المستخدمين لكن بتصنيف مختلف)
  const totalCustomers = await Customer.countDocuments({ role: { $ne: 'admin' } });
  const activeCustomers = await Customer.countDocuments({ active: true, role: { $ne: 'admin' } });
  const inactiveCustomers = totalCustomers - activeCustomers;
  
  // العملاء الجدد هذا الشهر
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const newCustomersThisMonth = await Customer.countDocuments({
    role: { $ne: 'admin' },
    createdAt: { $gte: startOfMonth }
  });

  res.status(200).json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        active: activeUsers,
        admins: adminUsers,
        regular: totalUsers - adminUsers
      },
      shipments: {
        total: totalShipments,
        pending: pendingShipments,
        inTransit: inTransitShipments,
        delivered: deliveredShipments,
        cancelled: cancelledShipments
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        approved: approvedOrders,
        rejected: rejectedOrders,
        completed: completedOrders
      },
      wallets: {
        totalBalance,
        totalTransactions,
        totalDeposits,
        totalWithdrawals,
        activeWallets
      },
      customers: {
        total: totalCustomers,
        active: activeCustomers,
        inactive: inactiveCustomers,
        newThisMonth: newCustomersThisMonth
      }
    }
  });
});

// @desc    Get All Users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = asyncHandler(async (req, res) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10;
  const skip = (page - 1) * limit;

  // البحث
  let searchQuery = {};
  if (req.query.search) {
    searchQuery = {
      $or: [
        { firstName: { $regex: req.query.search, $options: 'i' } },
        { lastName: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ]
    };
  }

  // فلترة حسب الدور
  if (req.query.role) {
    searchQuery.role = req.query.role;
  }

  // فلترة حسب الحالة
  if (req.query.status) {
    searchQuery.active = req.query.status === 'active';
  }

  const users = await Customer.find(searchQuery)
    .select('-password')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const total = await Customer.countDocuments(searchQuery);

  res.status(200).json({
    success: true,
    data: users,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit
    }
  });
});

// @desc    Get Recent Activity
// @route   GET /api/admin/activity
// @access  Private/Admin
exports.getRecentActivity = asyncHandler(async (req, res) => {
  const limit = req.query.limit * 1 || 10;
  
  // جلب الأنشطة الحقيقية من قاعدة البيانات
  const activities = [];
  
  // آخر المستخدمين المسجلين
  const recentUsers = await Customer.find()
    .sort({ createdAt: -1 })
    .limit(3)
    .select('firstName lastName createdAt');
  
  recentUsers.forEach(user => {
    activities.push({
      id: `user_${user._id}`,
      type: 'new_user',
      message: `انضم مستخدم جديد: ${user.firstName} ${user.lastName}`,
      timestamp: user.createdAt,
      userId: user._id
    });
  });
  
  // آخر المعاملات
  try {
    const Transaction = require("../models/transactionModel");
    const recentTransactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('customerId', 'firstName lastName');
    
    recentTransactions.forEach(transaction => {
      activities.push({
        id: `transaction_${transaction._id}`,
        type: transaction.type === 'deposit' ? 'payment_received' : 'payment_sent',
        message: `${transaction.type === 'deposit' ? 'إيداع' : 'سحب'} بقيمة ${transaction.amount} ريال`,
        timestamp: transaction.createdAt,
        amount: transaction.amount,
        userId: transaction.customerId?._id
      });
    });
  } catch (error) {
    console.log('Transaction model not found, skipping transaction activities');
  }
  
  // آخر الطلبات
  try {
    const Order = require("../models/orderModel");
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(2)
      .populate('customerId', 'firstName lastName');
    
    recentOrders.forEach(order => {
      activities.push({
        id: `order_${order._id}`,
        type: 'new_order',
        message: `طلب جديد من ${order.customerId?.firstName || 'عميل'} ${order.customerId?.lastName || ''}`,
        timestamp: order.createdAt,
        orderId: order._id,
        userId: order.customerId?._id
      });
    });
  } catch (error) {
    console.log('Order model not found, skipping order activities');
  }
  
  // ترتيب الأنشطة حسب التاريخ
  activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.status(200).json({
    success: true,
    data: activities.slice(0, limit)
  });
});

// @desc    Update User Status
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
exports.updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const user = await Customer.findByIdAndUpdate(
    id,
    { active: status === 'active' },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    return next(new ApiError(`لا يوجد مستخدم بهذا المعرف ${id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update User Role
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
exports.updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  const user = await Customer.findByIdAndUpdate(
    id,
    { role },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    return next(new ApiError(`لا يوجد مستخدم بهذا المعرف ${id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Get All Shipments
// @route   GET /api/admin/shipments
// @access  Private/Admin
exports.getAllShipments = asyncHandler(async (req, res) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10;
  const skip = (page - 1) * limit;

  let searchQuery = {};
  if (req.query.search) {
    searchQuery = {
      $or: [
        { trackingNumber: { $regex: req.query.search, $options: 'i' } },
        { recipientName: { $regex: req.query.search, $options: 'i' } }
      ]
    };
  }

  if (req.query.status) {
    searchQuery.status = req.query.status;
  }

  // filter by specific user if provided
  if (req.query.userId) {
    searchQuery.customerId = req.query.userId;
  }

  // filter by specific user if provided
  if (req.query.userId) {
    searchQuery.customerId = req.query.userId;
  }

  try {
    const Shipment = require("../models/shipmentModel");
    const shipments = await Shipment.find(searchQuery)
      .populate('customerId', 'firstName lastName email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Shipment.countDocuments(searchQuery);

    res.status(200).json({
      success: true,
      data: shipments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      data: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: limit
      }
    });
  }
});

// @desc    Get All Orders
// @route   GET /api/admin/orders
// @access  Private/Admin
exports.getAllOrders = asyncHandler(async (req, res) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10;
  const skip = (page - 1) * limit;

  let searchQuery = {};
  if (req.query.search) {
    searchQuery = {
      $or: [
        { orderNumber: { $regex: req.query.search, $options: 'i' } }
      ]
    };
  }

  if (req.query.status) {
    searchQuery.status = req.query.status;
  }

  try {
    const Order = require("../models/orderModel");
    const orders = await Order.find(searchQuery)
      .populate('customerId', 'firstName lastName email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Order.countDocuments(searchQuery);

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      data: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: limit
      }
    });
  }
});
