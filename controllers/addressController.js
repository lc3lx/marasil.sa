const asyncHandler = require("express-async-handler");
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
  const customer = await Customer.findByIdAndUpdate(
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
    result: customer.addresses.length,
    data: customer.addresses,
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
  try {
    const { addressId } = req.params;
    const {
      alias,
      location,
      phone,
      detalis,
      postalCode,
      country,
      street,
      city,
      district,
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
    if (district) updateFields["addresses.$.district"] = district;

    const customer = await Customer.findOneAndUpdate(
      { _id: req.customer._id, "addresses._id": addressId },
      { $set: updateFields },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ message: "Customer or address not found" });
    }

    res.status(200).json({
      message: "Address updated successfully",
      data: customer.addresses,
    });
  } catch (error) {
    console.error("Error updating address:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});
