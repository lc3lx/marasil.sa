const express = require("express");

const {
  createPackage,
  getOnePackage,
  getPackages,
  updatePackage,
  deletePackage,
} = require("../controllers/packageController");
const {
  updatePackagealidator,
} = require("../utils/validators/packageValidator");
const auth = require("../controllers/authController");
const router = express.Router();

router.use(auth.Protect);

router.route("/").get(getPackages).post(createPackage);

router
  .route("/:id")
  .get(getOnePackage)
  .put(updatePackagealidator, updatePackage)
  .delete(updatePackagealidator, deletePackage);

module.exports = router;
