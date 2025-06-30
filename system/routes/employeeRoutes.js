const express = require("express");
const router = express.Router();
const auth = require("../../controllers/authController");
const {
  getAllEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  hardDeleteEmployee,
  uploadEmployeeFiles,
  ResizeEmployeeImage,
} = require("../controllers/employeeController");

// Protect all routes
router.use(auth.Protect)

// Employee routes
router
  .route("/")
  .get(getAllEmployees)
  .post(uploadEmployeeFiles, ResizeEmployeeImage, createEmployee);

router
  .route("/:id")
  .get(getEmployee)
  .patch(uploadEmployeeFiles, ResizeEmployeeImage,updateEmployee)

// Hard delete route (admin only)
router.delete("/:id", hardDeleteEmployee);

module.exports = router;
