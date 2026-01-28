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
// السماح لكل من user و admin بالوصول إلى /api/addresses
router.use(
  AuthService.Protect,
  AuthService.allowedTo("user", "admin")
);

router.route("/").post(addAdrress).get(getaddresses);
router.delete("/:addressId", removeaddress);
router.patch("/:addressId", updateAddress);

module.exports = router;
