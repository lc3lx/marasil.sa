const ShippingCompany = require("../models/shipping_company");
const asyncHandler = require("express-async-handler");

// 🔸 Create Shipping Company
exports.createShippingCompany = asyncHandler(async (req, res) => {
  const { shippingTypes } = req.body;

  if (shippingTypes) {
    const types = shippingTypes.map((t) => t.type);
    const hasDuplicates = new Set(types).size !== types.length;
    if (hasDuplicates) {
      return res
        .status(400)
        .json({ error: "Duplicate shippingTypes.type found" });
    }
  }

  const company = await ShippingCompany.create(req.body);
  res.status(201).json(company);
});

// 🔸 Get All
exports.getAllShippingCompanies = asyncHandler(async (req, res) => {
  const companies = await ShippingCompany.find();
  res.json(companies);
});

// 🔸 Get by ID
exports.getShippingCompanyById = asyncHandler(async (req, res) => {
  const company = await ShippingCompany.findById(req.params.id);
  if (!company) return res.status(404).json({ message: "Company not found" });
  res.json(company);
});

// 🔸 Get by Name (from body)
exports.getShippingCompanyByNameFromBody = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Name is required" });

  const company = await ShippingCompany.findOne({ company: name });
  if (!company) return res.status(404).json({ message: "Company not found" });
  res.json(company);
});

// 🔸 Update Shipping Company
exports.updateShippingCompany = asyncHandler(async (req, res) => {
  const { shippingTypes } = req.body;

  if (shippingTypes) {
    const types = shippingTypes.map((t) => t.type);
    const hasDuplicates = new Set(types).size !== types.length;
    if (hasDuplicates) {
      return res
        .status(400)
        .json({ error: "Duplicate shippingTypes.type found" });
    }
  }

  const updated = await ShippingCompany.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );
  if (!updated) return res.status(404).json({ message: "Company not found" });

  res.json(updated);
});

// 🔸 Delete Shipping Company
exports.deleteShippingCompany = asyncHandler(async (req, res) => {
  const deleted = await ShippingCompany.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: "Company not found" });

  res.json({ message: "Company deleted successfully" });
});

// 🔸 Get Specific Shipping Type for a Company
exports.getShippingTypeForCompany = asyncHandler(async (req, res) => {
  const { companyName, shippingType } = req.params;

  if (!companyName || !shippingType) {
    return res
      .status(400)
      .json({ error: "companyName and shippingType are required" });
  }

  const company = await ShippingCompany.findOne({ company: companyName });
  if (!company) {
    return res.status(404).json({ message: "Company not found" });
  }

  const typeDetails = company.shippingTypes.find(
    (t) => t.type === shippingType
  );
  if (!typeDetails) {
    return res
      .status(404)
      .json({ message: "Shipping type not found for this company" });
  }

  res.json({
    company: company.company,
    shippingType: shippingType,
    details: typeDetails,
  });
});
