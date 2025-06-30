const mongoose = require("mongoose");

const salarySchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: [true, "Employee ID is required"],
    },
    salaryDate: {
      type: Date,
      required: [true, "Salary date is required"],
      default: Date.now,
    },
    baseSalary: {
      type: Number,
      required: true
    },
    totalSalary: {
      type: Number,
      required: [true, "Amount is required"],
      min: 0,
    },
    bonus: {
      type: Number,
      default: 0
    },
    deduction: {
      type: Number,
      default: 0
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying by date
salarySchema.index({ salaryDate: 1, employeeId: 1 });

const Salary = mongoose.model("Salary", salarySchema);

module.exports = Salary;
