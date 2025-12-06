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
  let totalShipments = 0,
    pendingShipments = 0,
    inTransitShipments = 0,
    deliveredShipments = 0,
    cancelledShipments = 0;
  try {
    const Shipment = require("../models/shipmentModel");
    const shipmentStatusCounts = await Shipment.aggregate([
      {
        $group: {
          _id: { $toUpper: "$shipmentstates" },
          count: { $sum: 1 }
        }
      }
    ]);

    const shipmentStatusMap = shipmentStatusCounts.reduce((acc, cur) => {
      acc[cur._id] = cur.count;
      return acc;
    }, {});

    totalShipments = shipmentStatusCounts.reduce((sum, cur) => sum + cur.count, 0);
    pendingShipments =
      shipmentStatusMap.READY_FOR_PICKUP ||
      shipmentStatusMap.PENDING ||
      shipmentStatusMap["READY FOR PICKUP"] ||
      0;
    inTransitShipments = shipmentStatusMap.IN_TRANSIT || shipmentStatusMap.TRANSIT || 0;
    deliveredShipments = shipmentStatusMap.DELIVERED || 0;
    cancelledShipments =
      shipmentStatusMap.CANCELED ||
      shipmentStatusMap.CANCELLED ||
      shipmentStatusMap.CANCELLED ||
      0;
  } catch (error) {
    console.log('Shipment model not found, using default values');
  }

  // إحصائيات الطلبات من قاعدة البيانات
  let totalOrders = 0,
    pendingOrders = 0,
    approvedOrders = 0,
    rejectedOrders = 0,
    completedOrders = 0;
  try {
    const Order = require("../models/orderModel");
    const orderStatusCounts = await Order.aggregate([
      {
        $group: {
          _id: { $toUpper: "$status" },
          count: { $sum: 1 }
        }
      }
    ]);

    const orderStatusMap = orderStatusCounts.reduce((acc, cur) => {
      acc[cur._id] = cur.count;
      return acc;
    }, {});

    totalOrders = orderStatusCounts.reduce((sum, cur) => sum + cur.count, 0);
    pendingOrders = orderStatusMap.PENDING || 0;
    approvedOrders = orderStatusMap.APPROVED || orderStatusMap.ACCEPTED || 0;
    rejectedOrders = orderStatusMap.REJECTED || orderStatusMap.DENIED || 0;
    completedOrders = orderStatusMap.COMPLETED || orderStatusMap.DELIVERED || 0;
  } catch (error) {
    console.log('Order model not found, using default values');
  }

  // إحصائيات المحافظ من قاعدة البيانات
  let totalBalance = 0,
    activeWallets = 0,
    totalTransactions = 0,
    totalDeposits = 0,
    totalWithdrawals = 0;
  try {
    const Wallet = require("../models/walletModel");
    const Transaction = require("../models/transactionModel");

    const wallets = await Wallet.find();
    totalBalance = wallets.reduce((sum, wallet) => sum + (wallet.balance || 0), 0);
    activeWallets = await Wallet.countDocuments({ balance: { $gt: 0 } });

    totalTransactions = await Transaction.countDocuments();
    const transactionSums = await Transaction.aggregate([
      {
        $group: {
          _id: { $toUpper: "$type" },
          amount: { $sum: { $ifNull: ["$amount", 0] } }
        }
      }
    ]);

    const transactionMap = transactionSums.reduce((acc, cur) => {
      acc[cur._id] = cur.amount;
      return acc;
    }, {});

    totalDeposits =
      (transactionMap.CREDIT || 0) +
      (transactionMap.DEPOSIT || 0) +
      (transactionMap.APPROVED || 0); // بعض الأنظمة القديمة قد تعتمد على نوع العملية للموافقة
    totalWithdrawals = (transactionMap.DEBIT || 0) + (transactionMap.WITHDRAWAL || 0);
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

  const userDocs = await Customer.find(searchQuery)
    .select('-password')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const total = await Customer.countDocuments(searchQuery);

  let users = userDocs;
  try {
    const Wallet = require("../models/walletModel");
    const ids = userDocs.map((u) => u._id);
    const wallets = await Wallet.find({ customerId: { $in: ids } })
      .select('customerId balance')
      .lean();
    const balanceMap = new Map(wallets.map((w) => [String(w.customerId), Number(w.balance) || 0]));
    users = userDocs.map((u) => {
      const o = u.toObject();
      o.balance = balanceMap.get(String(u._id)) || 0;
      return o;
    });
  } catch (e) {
    users = userDocs.map((u) => ({ ...u.toObject(), balance: 0 }));
  }

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
        { trackingId: { $regex: req.query.search, $options: 'i' } },
        { companyshipmentid: { $regex: req.query.search, $options: 'i' } }
      ]
    };
  }

  if (req.query.status) {
    // model uses 'shipmentstates' enum: Delivered, IN_TRANSIT, READY_FOR_PICKUP, Canceled
    searchQuery.shipmentstates = req.query.status;
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

exports.getCarrierStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);

  const Shipment = require("../models/shipmentModel");
  const ShippingCompany = require("../models/shipping_company");

  const companies = await ShippingCompany.find().lean();
  const companyTypeMaxMap = new Map();
  for (const c of companies) {
    const map = {};
    for (const t of (c.shippingTypes || [])) map[t.type] = t.maxWeight;
    companyTypeMaxMap.set(c.company, map);
  }

  const query = {};
  if (dateFilter.$gte || dateFilter.$lte) {
    query.createdAt = {};
    if (dateFilter.$gte) query.createdAt.$gte = dateFilter.$gte;
    if (dateFilter.$lte) query.createdAt.$lte = dateFilter.$lte;
  }

  const shipments = await Shipment.find(query)
    .select(
      "shapmentCompany shapmentingType weight paymentMathod shipmentstates totalprice shapmentPrice shapmentType isReturnShipment createdAt"
    )
    .lean();

  const stats = {};
  const ensure = (k) => {
    if (!stats[k]) {
      stats[k] = {
        total: 0,
        delivered: 0,
        inTransit: 0,
        readyForPickup: 0,
        canceled: 0,
        returns: 0,
        overweightKg: 0,
        overweightChargesBase: 0,
        overweightProfit: 0,
        codCount: 0,
        codBaseFeesTotal: 0,
        codProfitTotal: 0,
        totalRevenue: 0,
        payableToCarrier: 0,
        ourProfit: 0,
      };
    }
    return stats[k];
  };

  const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

  for (const s of shipments) {
    const company = s.shapmentCompany || "unknown";
    const st = ensure(company);
    st.total += 1;
    if (s.shipmentstates === "Delivered") st.delivered += 1;
    if (s.shipmentstates === "IN_TRANSIT") st.inTransit += 1;
    if (s.shipmentstates === "READY_FOR_PICKUP") st.readyForPickup += 1;
    if (s.shipmentstates === "Canceled" || s.shipmentstates === "CANCELLED") st.canceled += 1;

    const isReturn = Boolean(s.isReturnShipment) || s.shapmentType === "reverse";
    if (isReturn) st.returns += 1;

    const typeMaxMap = companyTypeMaxMap.get(company) || {};
    const maxWeight = typeMaxMap[s.shapmentingType] || 0;
    const weight = Number(s.weight) || 0;
    const overweightKg = maxWeight > 0 ? Math.max(0, Math.ceil(weight - maxWeight)) : 0;
    st.overweightKg += overweightKg;

    const sp = s.shapmentPrice || {};
    const baseAdditional = Number(sp.baseAdditionalweigth) || 0;
    const profitAdditional = Number(sp.profitAdditionalweigth) || 0;
    const basePrice = Number(sp.basePrice) || 0;
    const profitPrice = Number(sp.profitPrice) || 0;
    const baseCOD = Number(sp.baseCODfees) || 0;
    const profitCOD = Number(sp.profitCODfees) || 0;
    const baseRTO = Number(sp.baseRTOprice) || 0;
    const profitRTO = Number(sp.profitRTOprice) || 0;

    let payable = basePrice + overweightKg * baseAdditional;
    let profit = profitPrice + overweightKg * profitAdditional;

    if (s.paymentMathod === "COD") {
      payable += baseCOD;
      profit += profitCOD;
      st.codCount += 1;
      st.codBaseFeesTotal += baseCOD;
      st.codProfitTotal += profitCOD;
    }

    if (isReturn) {
      payable += baseRTO;
      profit += profitRTO;
    }

    st.overweightChargesBase += overweightKg * baseAdditional;
    st.overweightProfit += overweightKg * profitAdditional;

    const total = Number(s.totalprice) || payable + profit;
    st.totalRevenue += total;
    st.payableToCarrier += payable;
    st.ourProfit += profit;
  }

  const byCarrier = Object.entries(stats).map(([company, v]) => ({
    company,
    totals: {
      total: v.total,
      delivered: v.delivered,
      inTransit: v.inTransit,
      readyForPickup: v.readyForPickup,
      canceled: v.canceled,
      returns: v.returns,
    },
    financials: {
      totalRevenue: r2(v.totalRevenue),
      payableToCarrier: r2(v.payableToCarrier),
      ourProfit: r2(v.ourProfit),
      overweightKg: v.overweightKg,
      overweightChargesBase: r2(v.overweightChargesBase),
      overweightProfit: r2(v.overweightProfit),
      codCount: v.codCount,
      codBaseFeesTotal: r2(v.codBaseFeesTotal),
      codProfitTotal: r2(v.codProfitTotal),
    },
  }));

  const overall = byCarrier.reduce(
    (acc, c) => {
      acc.totals.total += c.totals.total;
      acc.totals.delivered += c.totals.delivered;
      acc.totals.inTransit += c.totals.inTransit;
      acc.totals.readyForPickup += c.totals.readyForPickup;
      acc.totals.canceled += c.totals.canceled;
      acc.totals.returns += c.totals.returns;
      acc.financials.totalRevenue = r2(acc.financials.totalRevenue + c.financials.totalRevenue);
      acc.financials.payableToCarrier = r2(acc.financials.payableToCarrier + c.financials.payableToCarrier);
      acc.financials.ourProfit = r2(acc.financials.ourProfit + c.financials.ourProfit);
      acc.financials.overweightKg += c.financials.overweightKg;
      acc.financials.overweightChargesBase = r2(acc.financials.overweightChargesBase + c.financials.overweightChargesBase);
      acc.financials.overweightProfit = r2(acc.financials.overweightProfit + c.financials.overweightProfit);
      acc.financials.codCount += c.financials.codCount;
      acc.financials.codBaseFeesTotal = r2(acc.financials.codBaseFeesTotal + c.financials.codBaseFeesTotal);
      acc.financials.codProfitTotal = r2(acc.financials.codProfitTotal + c.financials.codProfitTotal);
      return acc;
    },
    {
      totals: { total: 0, delivered: 0, inTransit: 0, readyForPickup: 0, canceled: 0, returns: 0 },
      financials: {
        totalRevenue: 0,
        payableToCarrier: 0,
        ourProfit: 0,
        overweightKg: 0,
        overweightChargesBase: 0,
        overweightProfit: 0,
        codCount: 0,
        codBaseFeesTotal: 0,
        codProfitTotal: 0,
      },
    }
  );

  res.status(200).json({
    success: true,
    data: { byCarrier, overall },
    filters: { startDate: startDate || null, endDate: endDate || null },
  });
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

  // filter by specific user if provided
  if (req.query.userId) {
    searchQuery.customerId = req.query.userId;
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
