const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Employee = require("../models/employeeModel");

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
  if (!emp) return res.status(404).json({ success: false, message: "لم يتم العثور على الموظف" });
  res.json({ success: true, data: emp });
});

// POST /api/admin/employees
exports.createEmployee = asyncHandler(async (req, res) => {
  const payload = req.body || {};
  const emp = await Employee.create(payload);
  res.status(201).json({ success: true, data: emp });
});

// PUT /api/admin/employees/:id
exports.updateEmployee = asyncHandler(async (req, res) => {
  const update = req.body || {};
  const emp = await Employee.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!emp) return res.status(404).json({ success: false, message: "لم يتم العثور على الموظف" });
  res.json({ success: true, data: emp });
});

// DELETE /api/admin/employees/:id
exports.deleteEmployee = asyncHandler(async (req, res) => {
  const emp = await Employee.findByIdAndDelete(req.params.id);
  if (!emp) return res.status(404).json({ success: false, message: "لم يتم العثور على الموظف" });
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
  if (!emp) return res.status(404).json({ success: false, message: "لم يتم العثور على الموظف" });
  res.json({ success: true, data: emp });
});

// PATCH /api/admin/employees/:id/permissions
exports.updateEmployeePermissions = asyncHandler(async (req, res) => {
  const permissions = Array.isArray(req.body.permissions) ? req.body.permissions : [];
  const emp = await Employee.findByIdAndUpdate(
    req.params.id,
    { permissions },
    { new: true, runValidators: true }
  );
  if (!emp) return res.status(404).json({ success: false, message: "لم يتم العثور على الموظف" });
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
  if (!emp) return res.status(404).json({ success: false, message: "لم يتم العثور على الموظف" });
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
  if (!emp) return res.status(404).json({ success: false, message: "لم يتم العثور على الموظف" });
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
  const suspendedEmployees = employees.filter((e) => e.status === "موقوف").length;

  const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))];
  const roles = [...new Set(employees.map((e) => e.role).filter(Boolean))];

  const averageSalary = totalEmployees
    ? Math.round(employees.reduce((sum, e) => sum + Number(e.salary || 0), 0) / totalEmployees)
    : 0;

  const averageTenure = totalEmployees
    ? Math.round(
        employees.reduce((sum, e) => {
          const jd = e.joinDate ? new Date(e.joinDate) : new Date();
          const now = new Date();
          const months = (now.getFullYear() - jd.getFullYear()) * 12 + (now.getMonth() - jd.getMonth());
          return sum + months;
        }, 0) / totalEmployees
      )
    : 0;

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const recentHires = employees.filter((e) => new Date(e.joinDate) >= threeMonthsAgo).length;

  const totalPresent = employees.reduce((sum, e) => sum + (e.attendance?.present || 0), 0);
  const totalAbsent = employees.reduce((sum, e) => sum + (e.attendance?.absent || 0), 0);
  const totalLate = employees.reduce((sum, e) => sum + (e.attendance?.late || 0), 0);
  const avgAttendanceRate = totalEmployees
    ? Math.round(
        employees.reduce((sum, e) => {
          const pres = e.attendance?.present || 0;
          const days = e.attendance?.totalDays || 0;
          return sum + (days > 0 ? (pres / days) * 100 : 0);
        }, 0) / totalEmployees
      )
    : 0;

  const totalPayroll = employees.reduce((sum, e) => sum + (e.payroll?.netSalary || 0), 0);
  const totalBonuses = employees.reduce((sum, e) => sum + (e.payroll?.bonuses || 0), 0);
  const totalDeductions = employees.reduce((sum, e) => sum + (e.payroll?.deductions || 0), 0);
  const pendingPayments = employees.filter((e) => (e.payroll?.paymentStatus || "") === "معلق").length;

  const departmentBreakdown = departments.map((dept) => {
    const count = employees.filter((e) => e.department === dept).length;
    const percentage = totalEmployees ? Math.round((count / totalEmployees) * 100) : 0;
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
