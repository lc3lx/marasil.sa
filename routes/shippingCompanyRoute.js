const express = require("express");
const router = express.Router();

const shippingCtrl = require("../controllers/shipping_companyController");

router.post("/", shippingCtrl.createShippingCompany);
router.get("/", shippingCtrl.getAllShippingCompanies);
router.get("/:id", shippingCtrl.getShippingCompanyById);
router.post("/search-by-name", shippingCtrl.getShippingCompanyByNameFromBody);
router.put("/:id", shippingCtrl.updateShippingCompany);
router.delete("/:id", shippingCtrl.deleteShippingCompany);

module.exports = router;
