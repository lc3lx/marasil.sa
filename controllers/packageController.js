const asyncHandler = require("express-async-handler");
const factory = require("./handlersFactory");
const Package = require("../models/packageModel");

// @desc    Get list packege
// @route   GET /api/packege
// @access   Private/Admin/user
exports.getPackages = asyncHandler(async (req, res, next) => {
  const package = await Package.find({
    $or: [{ isPublic: true }, { customer: req.customer._id }],
  });
  res
    .status(200)
    .json({ status: "success", results: package.length, data: package });
});

// @desc    Get specific package id
// @route   GET /api/Package/:id
// @access   Private/Admin/user
exports.getOnePackage = factory.getOne(Package);

// @desc    Create Package
// @route   POST  /api/Package
// @access    Private/Admin/user
exports.createPackage = asyncHandler(async (req, res, next) => {
  let package;
  if (req.customer.role === "user") {
    package = await Package.create({
      customer: req.customer._id,
      ...req.body,
      isPublic: false,
    });
  } else {
    package = await Package.create({
 customer: req.customer._id,
      ...req.body,
      isPublic: true,
    });
  }

  res.status(201).json({ status: "success", data: package });
});
// @desc    Update specific package
// @route   Update /api/:id
// @access   Private/Admin/user

exports.updatePackage = factory.updateOne(Package);
// @desc    Delete specific package
// @route   DELETE /api/:id
// @access   Private/Admin/user
exports.deletePackage = factory.deleteOne(Package);
