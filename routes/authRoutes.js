const express = require("express");

const {
  SignUp,
  LogIn,
  forgotPassword,
  verfiypassRestCode,
  resetpassword,
} = require("../controllers/authController");
const {
  SignUpValidator,
  LogInValidator,
} = require("../utils/validators/authValidator");

const router = express.Router();

router.post("/signup", SignUpValidator, SignUp);
router.post("/login", LogInValidator, LogIn);
router.post("/forgotpassword", forgotPassword);
router.post("/verfiypassword", verfiypassRestCode);
router.put("/resetpassword", resetpassword);

module.exports = router;
