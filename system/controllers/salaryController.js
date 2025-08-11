const asyncHandler = require("express-async-handler");
const Salary = require("../models/Salary");

// Get salaries filtered by month and year
exports.getSalaries = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide month and year parameters",
      });
    }

    // Convert to numbers
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    // Validate month and year
    if (monthNum < 1 || monthNum > 12 || isNaN(monthNum)) {
      return res.status(400).json({
        status: "fail",
        message: "Month must be between 1 and 12",
      });
    }

    if (yearNum < 2000 || yearNum > 2100 || isNaN(yearNum)) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide a valid year",
      });
    }

    // Create date range for the specified month
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0); // Last day of month

    // Find salaries within the date range
    const salaries = await Salary.find({
      salaryDate: { $gte: startDate, $lte: endDate },
    }).populate("employeeId", "fullName -_id");

    res.status(200).json({
      status: "success",
      results: salaries.length,
      data: {
        salaries,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: err.message,
    });
  }
};

exports.updateStatusTopaid = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  await Salary.findByIdAndUpdate(req.params.id, { isPaid: true }, { new: true });

  res.status(200).json({ message: "salary  is paid" });
});
