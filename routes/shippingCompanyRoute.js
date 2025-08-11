const express = require("express");
const router = express.Router();

const shippingCtrl = require("../controllers/shipping_companyController");

// Create and update routes
router.post("/", shippingCtrl.createShippingCompany);
router.put("/:id", shippingCtrl.updateShippingCompany);
router.delete("/:id", shippingCtrl.deleteShippingCompany);

// Get routes
router.get("/", shippingCtrl.getAllShippingCompanies);
router.get("/info", shippingCtrl.getShippingCompaniesInfo); // New endpoint for simplified info
router.get("/:id", shippingCtrl.getShippingCompanyById);
router.get("/compnyd", shippingCtrl.getShippingCompanies);

// Search routes
router.post("/search-by-name", shippingCtrl.getShippingCompanyByNameFromBody);

module.exports = router;
