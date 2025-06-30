const express = require("express");
const router = express.Router();
const salaryController = require("../controllers/salaryModification");
const auth = require("../../controllers/authController");

// Protect all routes
router.use(auth.Protect);

// Bonus routes
router.post("/:employeeId/bonus", salaryController.addBonus);

// Deduction routes
router.post("/:employeeId/deduction", salaryController.addDeduction);

router.get("/",salaryController.getAllsalaryModifaction)

module.exports = router;
