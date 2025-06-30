const express = require("express");

const {
  addAdrress,
  removeaddress,
  getaddresses,
  updateAddress,
} = require("../controllers/addressController");

const AuthService = require("../controllers/authController");

const router = express.Router();

// apply protect and auth at all routes
router.use(AuthService.Protect, AuthService.allowedTo("user"));

router.route("/").post(addAdrress).get(getaddresses);
router.delete("/:addressId", removeaddress);
router.patch("/:addressId", updateAddress);

module.exports = router;
