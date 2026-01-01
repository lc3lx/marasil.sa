const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const Customer = require("../models/customerModel");

// @desc  add  addresses
// @route post/api/addresses
// @access private/protect/Customer

exports.addAdrress = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findByIdAndUpdate(
    req.customer._id,
    {
      $addToSet: { addresses: req.body },
    },
    {
      new: true,
    }
  );

  res.status(201).json({
    message: "address added successfully",
    data: customer.addresses,
  });
});

// @desc  remove addresses
// @route delete/api/addresses/adrressId
// @access private/protect/Customer

exports.removeaddress = asyncHandler(async (req, res, next) => {
  console.log("Delete Address Debug:", {
    addressId: req.params.addressId,
    customerId: req.customer._id,
    customerIdType: typeof req.customer._id,
    addressIdType: typeof req.params.addressId,
    params: req.params,
  });

  // التحقق من أن العنوان ينتمي للمستخدم الحالي
  const customer = await Customer.findOne({
    _id: req.customer._id,
    "addresses._id": req.params.addressId,
  });

  console.log("Customer found for delete:", !!customer);

  if (!customer) {
    console.log("Address not found or unauthorized for delete:", {
      customerId: req.customer._id,
      addressId: req.params.addressId,
    });
    return next(
      new ApiError(`لا يمكن العثور على العنوان أو أنت غير مصرح لحذفه`, 403)
    );
  }

  // حذف العنوان
  const updatedCustomer = await Customer.findByIdAndUpdate(
    req.customer._id,
    {
      $pull: { addresses: { _id: req.params.addressId } },
    },
    {
      new: true,
    }
  );

  res.status(200).json({
    message: "addresse removed successfully",
    result: updatedCustomer.addresses.length,
    data: updatedCustomer.addresses,
  });
});

// @desc  get logged Customer addresses
// @route get/api/addresses
// @access private/protect/Customer

exports.getaddresses = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findById(req.customer._id).populate(
    "addresses"
  );

  res.status(200).json({
    message: "Customer's addresses",
    result: customer.addresses.length,
    data: customer.addresses,
  });
});

// @desc  update specific addresses
// @route delete/api/addresses/adrressId
// @access private/protect/Customer

exports.updateAddress = asyncHandler(async (req, res, next) => {
  const { addressId } = req.params;

  console.log("Update Address Debug:", {
    addressId: addressId,
    customerId: req.customer._id,
    customerIdType: typeof req.customer._id,
    addressIdType: typeof addressId,
    params: req.params,
    body: req.body,
  });

  // التحقق من أن العنوان ينتمي للمستخدم الحالي
  const customer = await Customer.findOne({
    _id: req.customer._id,
    "addresses._id": addressId,
  });

  console.log("Customer found for address:", !!customer);

  if (!customer) {
    console.log("Address not found or unauthorized:", {
      customerId: req.customer._id,
      addressId: addressId,
    });
    return next(
      new ApiError(`لا يمكن العثور على العنوان أو أنت غير مصرح لتعديله`, 403)
    );
  }

  const {
    alias,
    location,
    phone,
    detalis,
    postalCode,
    country,
    street,
    city,
    addressDetails,
  } = req.body;

  const updateFields = {};

  if (alias) updateFields["addresses.$.alias"] = alias;
  if (location) updateFields["addresses.$.location"] = location;
  if (phone) updateFields["addresses.$.phone"] = phone;
  if (detalis) updateFields["addresses.$.detalis"] = detalis;
  if (postalCode) updateFields["addresses.$.postalCode"] = postalCode;
  if (country) updateFields["addresses.$.country"] = country;
  if (street) updateFields["addresses.$.street"] = street;
  if (city) updateFields["addresses.$.city"] = city;
  if (addressDetails) updateFields["addresses.$.addressDetails"] = addressDetails;

  const updatedCustomer = await Customer.findOneAndUpdate(
    { _id: req.customer._id, "addresses._id": addressId },
    { $set: updateFields },
    { new: true }
  );

  res.status(200).json({
    message: "Address updated successfully",
    data: updatedCustomer.addresses,
  });
});
