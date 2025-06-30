const express = require("express");
const {
  getMyWallet,
  getOneWallet,
  getAllWallet,
  RechargeWallet,
  getPaymentStatus,
  refundBalance,
  addBalane,
  removeBalance,
  RechargeWalletbyBank,
  updatestatus,
  uplaodBankreceiptImage
} = require("../controllers/walletController");

const auth = require("../controllers/authController");

const router = express.Router();

router.use(auth.Protect);

router.get("/myWallet", getMyWallet);
router.get("/:id", getOneWallet);
router.get("/", getAllWallet);
// moyasar payment route
router.post("/rechargeWallet", RechargeWallet);
router.get("/paymentstatus/:paymentId", getPaymentStatus);
router.post("/refund/:paymentId", refundBalance);
router.post("/addbalance/:id", addBalane);
router.post("/removebalance/:id", removeBalance);

// bank_Transfer payment route
router.post(
  "/rechargeWalletbyBank",
  uplaodBankreceiptImage,
  RechargeWalletbyBank
);
router.put("/updatestatus/:id", updatestatus);

module.exports = router;
