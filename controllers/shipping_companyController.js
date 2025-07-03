const ShippingCompany = require("../models/shipping_company");
const asyncHandler = require("express-async-handler");

// 🔸 Get Shipping Companies with Essential Info
exports.getShippingCompaniesInfo = asyncHandler(async (req, res) => {
  const companies = await ShippingCompany.aggregate([
    {
      $project: {
        _id: 0,
        name: '$company',
        deliveryTime: 1,
        shippingTypes: {
          $map: {
            input: '$shippingTypes',
            as: 'type',
            in: {
              type: '$$type.type',
              price: {
                $add: ['$$type.basePrice', '$$type.profitPrice']
              },
              deliveryTime: '$deliveryTime'
            }
          }
        }
      }
    }
  ]);
  
  res.json(companies);
});

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

// @desc    Get all shipping companies with basic info
// @route   GET /api/v1/shipments/companies
// @access  Public
module.exports.getShippingCompanies = asyncHandler(async (req, res, next) => {
  // Get all enabled shipping companies
  const companies = await shappingCompany.find({ status: "Enabled" });

  // Map the companies to only include the required fields
  const companiesList = companies.map(company => ({
    id: company._id,
    name: company.company,
    deliveryTime: company.deliveryAt || '2-3 أيام عمل',
    shippingTypes: company.shippingTypes.map(type => ({
      type: type.type,
      price: type.basePrice + type.profitPrice, // Total price = base + profit
      deliveryTime: company.deliveryAt || '2-3 أيام عمل',
      codAvailable: type.COD,
      maxWeight: type.maxWeight,
      maxCodAmount: type.maxCodAmount
    }))
  }));

  res.status(200).json({
    status: 'success',
    results: companiesList.length,
    data: companiesList
  });
});