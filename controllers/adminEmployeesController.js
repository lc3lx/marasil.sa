const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { sendEmployeeWelcomeEmail } = require("../utils/SendMail");
const Employee = require("../models/employeeModel");
const Wallet = require("../models/walletModel");
const Transaction = require("../models/transactionModel");
const Customer = require("../models/customerModel");
const Order = require("../models/orderModel");
const Shipment = require("../models/shipmentModel");

const mapStatus = (s) => {
  if (!s) return undefined;
  const v = String(s).trim().toLowerCase();
  if (["active", "نشط"].includes(v)) return "نشط";
  if (["leave", "إجازة", "on_leave"].includes(v)) return "إجازة";
  if (["suspended", "موقوف"].includes(v)) return "موقوف";
  return s; // fallback to user-provided
};

// GET /api/admin/employees
exports.getEmployees = asyncHandler(async (req, res) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10;
  const skip = (page - 1) * limit;

  const searchQuery = {};

  if (req.query.search) {
    const rx = new RegExp(String(req.query.search), "i");
    searchQuery.$or = [
      { name: { $regex: rx } },
      { email: { $regex: rx } },
      { phone: { $regex: rx } },
      { role: { $regex: rx } },
      { department: { $regex: rx } },
    ];
  }

  const status = mapStatus(req.query.status);
  if (status) searchQuery.status = status;
  if (req.query.department) searchQuery.department = req.query.department;
  if (req.query.role) searchQuery.role = req.query.role;

  const { startDate, endDate } = req.query;
  if (startDate || endDate) {
    searchQuery.joinDate = {};
    if (startDate) searchQuery.joinDate.$gte = new Date(startDate);
    if (endDate) searchQuery.joinDate.$lte = new Date(endDate);
  }

  const employees = await Employee.find(searchQuery)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .lean();

  const total = await Employee.countDocuments(searchQuery);

  res.status(200).json({
    success: true,
    data: employees,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit,
    },
  });
});

// GET /api/admin/employees/:id
exports.getEmployeeById = asyncHandler(async (req, res) => {
  const emp = await Employee.findById(req.params.id).lean();
  if (!emp)
    return res
      .status(404)
      .json({ success: false, message: "لم يتم العثور على الموظف" });
  res.json({ success: true, data: emp });
});

// POST /api/admin/employees
exports.createEmployee = asyncHandler(async (req, res) => {
  const payload = req.body || {};

  // إنشاء كلمة مرور مؤقتة عشوائية
  const tempPassword =
    Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  // إضافة كلمة المرور المشفرة إلى البيانات
  payload.password = hashedPassword;

  // إنشاء الموظف
  const emp = await Employee.create(payload);

  try {
    // إرسال البريد الإلكتروني مع كلمة المرور المؤقتة
    await sendEmployeeWelcomeEmail({
      name: emp.name || emp.email,
      email: emp.email,
      tempPassword: tempPassword,
    });

    console.log(`✅ تم إرسال البريد الإلكتروني للموظف الجديد: ${emp.email}`);
  } catch (emailError) {
    console.error(
      `❌ فشل في إرسال البريد الإلكتروني للموظف ${emp.email}:`,
      emailError
    );
    // لا نعيد الخطأ لأن الموظف تم إنشاؤه بنجاح
  }

  res.status(201).json({
    success: true,
    data: emp,
    message:
      "تم إنشاء الموظف بنجاح وإرسال بيانات تسجيل الدخول إلى بريده الإلكتروني",
  });
});

// PUT /api/admin/employees/:id
exports.updateEmployee = asyncHandler(async (req, res) => {
  const update = req.body || {};
  const emp = await Employee.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  });
  if (!emp)
    return res
      .status(404)
      .json({ success: false, message: "لم يتم العثور على الموظف" });
  res.json({ success: true, data: emp });
});

// DELETE /api/admin/employees/:id
exports.deleteEmployee = asyncHandler(async (req, res) => {
  const emp = await Employee.findByIdAndDelete(req.params.id);
  if (!emp)
    return res
      .status(404)
      .json({ success: false, message: "لم يتم العثور على الموظف" });
  res.json({ success: true, message: "تم الحذف" });
});

// PATCH /api/admin/employees/:id/status
exports.updateEmployeeStatus = asyncHandler(async (req, res) => {
  const status = mapStatus(req.body.status);
  const emp = await Employee.findByIdAndUpdate(
    req.params.id,
    { status: status || "نشط" },
    { new: true, runValidators: true }
  );
  if (!emp)
    return res
      .status(404)
      .json({ success: false, message: "لم يتم العثور على الموظف" });
  res.json({ success: true, data: emp });
});

// PATCH /api/admin/employees/:id/permissions
exports.updateEmployeePermissions = asyncHandler(async (req, res) => {
  const permissions = Array.isArray(req.body.permissions)
    ? req.body.permissions
    : [];
  const emp = await Employee.findByIdAndUpdate(
    req.params.id,
    { permissions },
    { new: true, runValidators: true }
  );
  if (!emp)
    return res
      .status(404)
      .json({ success: false, message: "لم يتم العثور على الموظف" });
  res.json({ success: true, data: emp });
});

// PATCH /api/admin/employees/:id/payroll
exports.updateEmployeePayroll = asyncHandler(async (req, res) => {
  const p = req.body || {};
  const emp = await Employee.findByIdAndUpdate(
    req.params.id,
    {
      "payroll.baseSalary": p.baseSalary,
      "payroll.bonuses": p.bonuses,
      "payroll.deductions": p.deductions,
      "payroll.lastPayment": p.lastPayment,
      "payroll.paymentStatus": p.paymentStatus,
    },
    { new: true, runValidators: true }
  );
  if (!emp)
    return res
      .status(404)
      .json({ success: false, message: "لم يتم العثور على الموظف" });
  res.json({ success: true, data: emp });
});

// PATCH /api/admin/employees/:id/attendance
exports.updateEmployeeAttendance = asyncHandler(async (req, res) => {
  const a = req.body || {};
  const emp = await Employee.findByIdAndUpdate(
    req.params.id,
    {
      "attendance.present": a.present,
      "attendance.absent": a.absent,
      "attendance.late": a.late,
      "attendance.onTime": a.onTime,
      "attendance.totalDays": a.totalDays,
    },
    { new: true, runValidators: true }
  );
  if (!emp)
    return res
      .status(404)
      .json({ success: false, message: "لم يتم العثور على الموظف" });
  res.json({ success: true, data: emp });
});

// GET /api/admin/employees/stats
exports.getEmployeesStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const filter = {};
  if (startDate || endDate) {
    filter.joinDate = {};
    if (startDate) filter.joinDate.$gte = new Date(startDate);
    if (endDate) filter.joinDate.$lte = new Date(endDate);
  }

  const employees = await Employee.find(filter).lean();

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.status === "نشط").length;
  const onLeaveEmployees = employees.filter((e) => e.status === "إجازة").length;
  const suspendedEmployees = employees.filter(
    (e) => e.status === "موقوف"
  ).length;

  const departments = [
    ...new Set(employees.map((e) => e.department).filter(Boolean)),
  ];
  const roles = [...new Set(employees.map((e) => e.role).filter(Boolean))];

  const averageSalary = totalEmployees
    ? Math.round(
        employees.reduce((sum, e) => sum + Number(e.salary || 0), 0) /
          totalEmployees
      )
    : 0;

  const averageTenure = totalEmployees
    ? Math.round(
        employees.reduce((sum, e) => {
          const jd = e.joinDate ? new Date(e.joinDate) : new Date();
          const now = new Date();
          const months =
            (now.getFullYear() - jd.getFullYear()) * 12 +
            (now.getMonth() - jd.getMonth());
          return sum + months;
        }, 0) / totalEmployees
      )
    : 0;

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const recentHires = employees.filter(
    (e) => new Date(e.joinDate) >= threeMonthsAgo
  ).length;

  const totalPresent = employees.reduce(
    (sum, e) => sum + (e.attendance?.present || 0),
    0
  );
  const totalAbsent = employees.reduce(
    (sum, e) => sum + (e.attendance?.absent || 0),
    0
  );
  const totalLate = employees.reduce(
    (sum, e) => sum + (e.attendance?.late || 0),
    0
  );
  const avgAttendanceRate = totalEmployees
    ? Math.round(
        employees.reduce((sum, e) => {
          const pres = e.attendance?.present || 0;
          const days = e.attendance?.totalDays || 0;
          return sum + (days > 0 ? (pres / days) * 100 : 0);
        }, 0) / totalEmployees
      )
    : 0;

  const totalPayroll = employees.reduce(
    (sum, e) => sum + (e.payroll?.netSalary || 0),
    0
  );
  const totalBonuses = employees.reduce(
    (sum, e) => sum + (e.payroll?.bonuses || 0),
    0
  );
  const totalDeductions = employees.reduce(
    (sum, e) => sum + (e.payroll?.deductions || 0),
    0
  );
  const pendingPayments = employees.filter(
    (e) => (e.payroll?.paymentStatus || "") === "معلق"
  ).length;

  const departmentBreakdown = departments.map((dept) => {
    const count = employees.filter((e) => e.department === dept).length;
    const percentage = totalEmployees
      ? Math.round((count / totalEmployees) * 100)
      : 0;
    return { name: dept, count, percentage };
  });

  const roleBreakdown = roles.map((r) => ({
    name: r,
    count: employees.filter((e) => e.role === r).length,
  }));

  res.json({
    success: true,
    data: {
      overview: {
        totalEmployees,
        activeEmployees,
        onLeaveEmployees,
        suspendedEmployees,
        departmentCount: departments.length,
        roles: roles.length,
        averageSalary,
        averageTenure,
        recentHires,
      },
      breakdowns: {
        departments: departmentBreakdown,
        roles: roleBreakdown,
      },
      attendance: {
        totalPresent,
        totalAbsent,
        totalLate,
        averageAttendanceRate: avgAttendanceRate,
      },
      payroll: {
        totalPayroll,
        totalBonuses,
        totalDeductions,
        pendingPayments,
      },
    },
  });
});

// PATCH /api/admin/employees/:id/change-password
exports.changeEmployeePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "كلمة المرور الحالية وكلمة المرور الجديدة مطلوبة",
    });
  }

  // التحقق من طول كلمة المرور الجديدة
  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل",
    });
  }

  // العثور على الموظف
  const emp = await Employee.findById(req.params.id);
  if (!emp) {
    return res.status(404).json({
      success: false,
      message: "لم يتم العثور على الموظف",
    });
  }

  // التحقق من كلمة المرور الحالية
  const isCurrentPasswordValid = await bcrypt.compare(
    currentPassword,
    emp.password
  );
  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      success: false,
      message: "كلمة المرور الحالية غير صحيحة",
    });
  }

  // تشفير كلمة المرور الجديدة
  const hashedNewPassword = await bcrypt.hash(newPassword, 12);

  // تحديث كلمة المرور
  emp.password = hashedNewPassword;
  await emp.save();

  console.log(`🔐 تم تغيير كلمة مرور الموظف: ${emp.email}`);

  res.json({
    success: true,
    message: "تم تغيير كلمة المرور بنجاح",
  });
});

// PATCH /api/admin/wallets/:userId/add-balance
exports.addUserBalance = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { amount, description } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: "المبلغ يجب أن يكون أكبر من صفر",
    });
  }

  // البحث عن المستخدم (يمكن أن يكون عميل أو موظف)
  let user = await Customer.findById(userId);
  let userType = "customer";

  if (!user) {
    user = await Employee.findById(userId);
    userType = "employee";
  }

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "لم يتم العثور على المستخدم",
    });
  }

  // البحث عن المحفظة أو إنشاؤها إذا لم تكن موجودة
  let wallet = await Wallet.findOne({ customerId: userId });
  if (!wallet) {
    wallet = new Wallet({
      customerId: userId,
      balance: 0,
      currency: "SAR",
    });
  }

  // تحديث رصيد المحفظة
  wallet.balance += Number(amount);
  await wallet.save();

  // إنشاء معاملة جديدة
  const transaction = new Transaction({
    customerId: userId,
    walletId: wallet._id,
    type: "credit",
    amount: Number(amount),
    description:
      description ||
      `إضافة رصيد من ${req.userType === "employee" ? "الموظف" : "الإدارة"}`,
    method: req.userType === "employee" ? "employee_credit" : "admin_credit",
    status: "completed",
    createdAt: new Date(),
  });

  await transaction.save();

  // ربط المعاملة بالمحفظة
  await Wallet.findByIdAndUpdate(wallet._id, {
    $push: { transactions: transaction._id },
  });

  console.log(
    `${req.userType === "employee" ? "الموظف" : "الإداري"} ${
      req.user.name || req.user.email
    } أضاف ${amount} ريال للمستخدم ${user.name || user.email}`
  );

  res.json({
    success: true,
    message: "تمت إضافة الرصيد بنجاح",
    data: {
      wallet: {
        balance: wallet.balance,
        currency: wallet.currency,
      },
      transaction: {
        id: transaction._id,
        amount: transaction.amount,
        description: transaction.description,
        createdAt: transaction.createdAt,
      },
    },
  });
});

// PATCH /api/admin/wallets/:userId/subtract-balance
exports.subtractUserBalance = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { amount, description } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: "المبلغ يجب أن يكون أكبر من صفر",
    });
  }

  // البحث عن المستخدم (يمكن أن يكون عميل أو موظف)
  let user = await Customer.findById(userId);
  let userType = "customer";

  if (!user) {
    user = await Employee.findById(userId);
    userType = "employee";
  }

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "لم يتم العثور على المستخدم",
    });
  }

  // البحث عن المحفظة
  const wallet = await Wallet.findOne({ customerId: userId });
  if (!wallet) {
    return res.status(404).json({
      success: false,
      message: "لم يتم العثور على محفظة المستخدم",
    });
  }

  // التحقق من أن الرصيد كافي
  if (wallet.balance < amount) {
    return res.status(400).json({
      success: false,
      message: "رصيد المحفظة غير كافي",
    });
  }

  // تحديث رصيد المحفظة
  wallet.balance -= Number(amount);
  await wallet.save();

  // إنشاء معاملة جديدة
  const transaction = new Transaction({
    customerId: userId,
    walletId: wallet._id,
    type: "debit",
    amount: Number(amount),
    description:
      description ||
      `خصم رصيد من ${req.userType === "employee" ? "الموظف" : "الإدارة"}`,
    method: req.userType === "employee" ? "employee_debit" : "admin_debit",
    status: "completed",
    createdAt: new Date(),
  });

  await transaction.save();

  // ربط المعاملة بالمحفظة
  await Wallet.findByIdAndUpdate(wallet._id, {
    $push: { transactions: transaction._id },
  });

  console.log(
    `${req.userType === "employee" ? "الموظف" : "الإداري"} ${
      req.user.name || req.user.email
    } خصم ${amount} ريال من المستخدم ${user.name || user.email}`
  );

  res.json({
    success: true,
    message: "تم خصم الرصيد بنجاح",
    data: {
      wallet: {
        balance: wallet.balance,
        currency: wallet.currency,
      },
      transaction: {
        id: transaction._id,
        amount: transaction.amount,
        description: transaction.description,
        createdAt: transaction.createdAt,
      },
    },
  });
});

// GET /api/admin/users/:userId/activity
exports.getUserActivityDetails = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // البحث عن المستخدم (يمكن أن يكون عميل أو موظف)
  let user = await Customer.findById(userId);
  let userType = "customer";

  if (!user) {
    user = await Employee.findById(userId);
    userType = "employee";
  }

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "لم يتم العثور على المستخدم",
    });
  }

  const activity = {
    orders: [],
    shipments: [],
  };

  try {
    // جلب طلبات المستخدم
    activity.orders = await Order.find({ customerId: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("_id orderNumber createdAt status");
  } catch (error) {
    console.log("Order model not available:", error.message);
  }

  try {
    // جلب شحنات المستخدم
    activity.shipments = await Shipment.find({ customerId: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select(
        "_id trackingId companyshipmentid createdAt ordervalue totalprice"
      );
  } catch (error) {
    console.log("Shipment model not available:", error.message);
  }

  res.json({
    success: true,
    data: {
      activity: {
        orders: activity.orders.map((order) => ({
          _id: order._id,
          orderNumber: order.orderNumber,
          createdAt: order.createdAt,
          status: order.status,
        })),
        shipments: activity.shipments.map((shipment) => ({
          _id: shipment._id,
          trackingId: shipment.trackingId,
          companyshipmentid: shipment.companyshipmentid,
          createdAt: shipment.createdAt,
          ordervalue: shipment.ordervalue,
          totalprice: shipment.totalprice,
        })),
      },
    },
  });
});

// GET /api/admin/users/:userId/wallet
exports.getUserWalletDetails = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // البحث عن المستخدم (يمكن أن يكون عميل أو موظف)
  let user = await Customer.findById(userId).select("-password");
  let userType = "customer";

  if (!user) {
    user = await Employee.findById(userId).select("-password");
    userType = "employee";
  }

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "لم يتم العثور على المستخدم",
    });
  }

  // جلب محفظة المستخدم
  const wallet = await Wallet.findOne({ customerId: userId });

  // جلب آخر المعاملات
  const transactions = await Transaction.find({ customerId: userId })
    .sort({ createdAt: -1 })
    .limit(20);

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        name:
          userType === "employee"
            ? user.name
            : `${user.firstName} ${user.lastName || ""}`.trim(),
        email: user.email,
        phone: user.phone,
        active: user.active || user.status === "نشط",
      },
      wallet: wallet
        ? {
            balance: wallet.balance,
            currency: wallet.currency || "SAR",
          }
        : {
            balance: 0,
            currency: "SAR",
          },
      transactions: transactions.map((tx) => ({
        id: tx._id,
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        status: tx.status,
        createdAt: tx.createdAt,
        method: tx.method,
      })),
    },
  });
});

// POST /api/admin/employees/login
exports.loginEmployee = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "البريد الإلكتروني وكلمة المرور مطلوبة",
    });
  }

  // العثور على الموظف بالبريد الإلكتروني
  const employee = await Employee.findOne({ email: email.toLowerCase() });
  if (!employee) {
    return res.status(401).json({
      success: false,
      message: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    });
  }

  // التحقق من كلمة المرور
  const isPasswordValid = await bcrypt.compare(password, employee.password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    });
  }

  // التحقق من حالة الموظف
  if (employee.status !== "نشط") {
    return res.status(403).json({
      success: false,
      message: "حسابك غير نشط. يرجى التواصل مع الإدارة.",
    });
  }

  // إنشاء token JWT
  const jwt = require("jsonwebtoken");
  const token = jwt.sign(
    {
      id: employee._id,
      email: employee.email,
      name: employee.name,
      role: "employee", // لتمييز الموظف عن المدير
      permissions: employee.permissions || [],
    },
    process.env.JWT_SECRET || "fallback-secret",
    { expiresIn: "7d" }
  );

  console.log(`✅ تسجيل دخول موظف ناجح: ${employee.email}`);

  res.json({
    success: true,
    token,
    data: {
      _id: employee._id,
      name: employee.name,
      email: employee.email,
      role: "employee",
      department: employee.department,
      permissions: employee.permissions || [],
      avatar: employee.avatar,
    },
  });
});
