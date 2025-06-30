const asyncHandler = require("express-async-handler");
const factory = require("./handlersFactory");
const Adddress = require("../models/clientAddressModel");



// @desc    Get list of Address
// @access  protect/Admin-Manager-user
exports.getcleintAddress = asyncHandler(async (req, res, next) => {
  const clientAddress = await Adddress.find({ customer: req.customer._id });
  res.status(200).json({ results: clientAddress.length, data: clientAddress });
});

// @desc    Get specific cleintAddress by id
// @route   GET /api/cleintAddresss/:id
// @access  protect/Admin-Manager-user
exports.getoneCleintAddress = factory.getOne(Adddress);




// @desc    Create cleintAddress
// @route   POST  /api/cleintAddresss
// @access  protect/Admin-Manager-user
exports.createcleintAddress = asyncHandler(async (req, res, next) => {
  const Addresse = await Adddress.create({
    customer: req.customer._id,
    ...req.body,
  });

  res.status(201).json({ status: "success", data: Addresse });
});

// @desc    Update specific cleintAddress
// @route   PUT /api/cleintAddresss/:id
// @access  protect/Admin-Manager-user
exports.updatecleintAddress = factory.updateOne(Adddress);

// @desc    Delete specific cleintAddress
// @route   DELETE /api/cleintAddresss/:id
// @access  protect/Admin-Manager-user
exports.deletecleintAddress = factory.deleteOne(Adddress);
