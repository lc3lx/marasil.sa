const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    present: { type: Number, default: 0 },
    absent: { type: Number, default: 0 },
    late: { type: Number, default: 0 },
    onTime: { type: Number, default: 0 },
    totalDays: { type: Number, default: 0 },
  },
  { _id: false }
);

const payrollSchema = new mongoose.Schema(
  {
    baseSalary: { type: Number, default: 0 },
    bonuses: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },
    lastPayment: { type: Date },
    paymentStatus: { type: String, default: "معلق" },
  },
  { _id: false }
);

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true, unique: true },
    phone: { type: String, trim: true, index: true },
    password: { type: String, required: true, select: false },
    role: { type: String, trim: true, index: true },
    department: { type: String, trim: true, index: true },
    status: { type: String, enum: ["نشط", "إجازة", "موقوف"], default: "نشط", index: true },
    joinDate: { type: Date, default: Date.now, index: true },
    avatar: { type: String, default: "👤" },
    color: { type: String, default: "#6366f1" },
    permissions: [{ type: String }],
    salary: { type: Number, default: 0 },

    address: { type: String },
    nationalId: { type: String },
    contractType: { type: String },
    emergencyContact: { type: String },
    emergencyPhone: { type: String },

    shift: { type: String },
    startTime: { type: String },
    endTime: { type: String },
    workingDays: [{ type: String }],
    breakDuration: { type: String },

    attendance: { type: attendanceSchema, default: () => ({}) },
    payroll: { type: payrollSchema, default: () => ({}) },
  },
  { timestamps: true }
);

employeeSchema.pre("save", function (next) {
  if (this.payroll) {
    const base = Number(this.payroll.baseSalary || 0);
    const bonuses = Number(this.payroll.bonuses || 0);
    const deductions = Number(this.payroll.deductions || 0);
    this.payroll.netSalary = Math.round(base + bonuses - deductions);
  }
  next();
});

employeeSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() || {};
  const hasPayrollChange =
    update["payroll.baseSalary"] != null ||
    update["payroll.bonuses"] != null ||
    update["payroll.deductions"] != null ||
    update.payroll;

  if (hasPayrollChange) {
    const p = update.payroll || {};
    const base = update["payroll.baseSalary"] ?? p.baseSalary ?? 0;
    const bonuses = update["payroll.bonuses"] ?? p.bonuses ?? 0;
    const deductions = update["payroll.deductions"] ?? p.deductions ?? 0;
    const net = Math.round(Number(base) + Number(bonuses) - Number(deductions));
    this.setUpdate({ ...update, "payroll.netSalary": net });
  }

  next();
});

// Use a distinct model name and collection to avoid clashing with existing system Employee model
module.exports =
  mongoose.models.AdminEmployee || mongoose.model("AdminEmployee", employeeSchema, "admin_employees");
