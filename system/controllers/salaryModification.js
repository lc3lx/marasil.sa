const SalaryModification = require("../models/SalaryModification");
const Employee = require("../models/Employee");
const factory = require("../../controllers/handlersFactory");


// Add bonus
exports.addBonus = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { amount, reason, month } = req.body;

    // Check if employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        status: "fail",
        message: "No employee found with that ID",
      });
    }

    // Create bonus
    const lastModification = await SalaryModification
    .findOne({ employee: employeeId })
    .sort({ createdAt: -1 }); // الأحدث أولاً
  
  const baseSalary = lastModification
    ? lastModification.totalSalary
    : employee.salary;
  
  const bonus = await SalaryModification.create({
    employee: employeeId,
    type: "bonus",
    amount,
    reason,
    totalSalary: baseSalary + amount,
    admin: req.customer.firstName,
  });
    // Update employee salary by adding the bonus amount
    // employee.salary += amount;
    // await employee.save();

    res.status(201).json({
      status: "success",
      data: {
        bonus,
        basicSalary: employee.salary,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: err.message,
    });
  }
};

exports.addDeduction = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { amount, reason, month } = req.body;

    // Check if employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        status: "fail",
        message: "No employee found with that ID",
      });
    }
    const lastModification = await SalaryModification
    .findOne({ employee: employeeId })
    .sort({ createdAt: -1 }); // الأحدث أولاً
  
  const baseSalary = lastModification
    ? lastModification.totalSalary
    : employee.salary;
  
  const deduction = await SalaryModification.create({
    employee: employeeId,
    type: "deduction",
    amount,
    reason,
    totalSalary: baseSalary - amount,
    admin: req.customer.firstName,
  });

    // Update employee salary by subtracting the deduction amount
    // employee.salary -= amount;
    // await employee.save();

    res.status(201).json({
      status: "success",
      data: {
        deduction,
        basicSalary: employee.salary,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: err.message,
    });
  }
};

// get all salary modifaction

exports.getAllsalaryModifaction = factory.getAll(SalaryModification)