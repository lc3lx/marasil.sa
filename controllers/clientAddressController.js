const asyncHandler = require("express-async-handler");
const factory = require("./handlersFactory");
const Adddress = require("../models/clientAddressModel");
const ApiError = require("../utils/apiError");



// @desc    Get list of Address
// @access  protect/Admin-Manager-user
exports.getcleintAddress = asyncHandler(async (req, res, next) => {
  const clientAddress = await Adddress.find({ customer: req.customer._id });
  res.status(200).json({ results: clientAddress.length, data: clientAddress });
});

// @desc    Get specific cleintAddress by id
// @route   GET /api/cleintAddresss/:id
// @access  protect/Admin-Manager-user
exports.getoneCleintAddress = asyncHandler(async (req, res, next) => {
  // التحقق من أن العنوان ينتمي للمستخدم الحالي
  const address = await Adddress.findOne({
    _id: req.params.id,
    customer: req.customer._id
  });

  if (!address) {
    return next(
      new ApiError(`لا يمكن العثور على العنوان`, 404)
    );
  }

  res.status(200).json({ data: address });
});




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
exports.updatecleintAddress = asyncHandler(async (req, res, next) => {
  // التحقق من أن العنوان ينتمي للمستخدم الحالي
  const address = await Adddress.findOne({
    _id: req.params.id,
    customer: req.customer._id
  });

  if (!address) {
    return next(
      new ApiError(`لا يمكن العثور على العنوان أو أنت غير مصرح لتعديله`, 403)
    );
  }

  // تحديث العنوان
  const updatedAddress = await Adddress.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  res.status(200).json({ data: updatedAddress });
});

// @desc    Delete specific cleintAddress
// @route   DELETE /api/cleintAddresss/:id
// @access  protect/Admin-Manager-user
exports.deletecleintAddress = asyncHandler(async (req, res, next) => {
  // التحقق من أن العنوان ينتمي للمستخدم الحالي
  const address = await Adddress.findOne({
    _id: req.params.id,
    customer: req.customer._id
  });

  if (!address) {
    return next(
      new ApiError(`لا يمكن العثور على العنوان أو أنت غير مصرح لحذفه`, 403)
    );
  }

  // حذف العنوان
  await Adddress.findByIdAndDelete(req.params.id);

  res.status(200).json({ status: "success", message: "تم حذف العنوان بنجاح" });
});
