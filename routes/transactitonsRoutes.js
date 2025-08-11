const express = require("express");

const {
  getMyTransaction,
  getAllTransaction,
  laseWalletCharge,
  getTramsactionsforUser,
  deleteOneTransaction,
  deleteAllTransaction,
} = require("../controllers/transactionsController");
const auth = require("../controllers/authController");
const router = express.Router();

router.use(auth.Protect);

router.get("/my-transaction", getMyTransaction);
router.route("/").get(getAllTransaction).delete(deleteAllTransaction);
router.get("/last-wallet-charge",laseWalletCharge)
router.route("/:id").delete(deleteOneTransaction).get(getTramsactionsforUser);

module.exports = router;
