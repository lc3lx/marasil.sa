const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const ApiError = require("../utils/apiError");
const createToken = require("../utils/createToken");
const { UploadArrayofImages } = require("../middlewares/uploadImageMiddleware");
const Customer = require("../models/customerModel");
const factory = require("./handlersFactory");
// middleware
exports.UploadCustomerImage = UploadArrayofImages([
  { name: "profileImage", maxCount: 1 },
  { name: "brand_logo", maxCount: 1 },
]);

exports.ResizeImage = asyncHandler(async (req, res, next) => {
  if (req.files.profileImage) {
    const filename = `profileImage-${uuidv4()}-${Date.now()}.jpeg`;

    await sharp(req.files.profileImage[0].buffer)
      .resize(200, 200)
      .toFormat("jpeg")
      .jpeg({ quality: 95 })
      .toFile(`uploads/customers/${filename}`);
    req.body.profileImage = filename;
  }
  if (req.files.brand_logo) {
    const filename = `brand_logo-${uuidv4()}-${Date.now()}.jpeg`;
    await sharp(req.files.brand_logo[0].buffer)
      .resize(200, 200)
      .toFormat("jpeg")
      .jpeg({ quality: 95 })
      .toFile(`uploads/Logo/${filename}`);

    req.body.brand_logo = filename;
  }
  // console.log(req.files);

  next();
});
// @desc  createCustomer
// @route post/api/Customers
// @access private
exports.createCustomer = factory.createOne(Customer);

// @desc  get all list of customers
// @route get /api/customers
// @acess private
exports.getCustomers = factory.getAll(Customer);

// @desc  get a specific  customer by id
// @route get /api/brand/:id
// @acess private
exports.getCustomer = factory.getOne(Customer);

// @desc  update a specific customers id
// @route put /api/customers/:id
// @acess private
exports.updateCustomer = asyncHandler(async (req, res, next) => {
  const document = await Customer.findByIdAndUpdate(
    req.params.id,
    {
      active: req.body.active,
      role: req.body.role,
    },
    {
      new: true,
    }
  );
  if (!document) {
    return next(new ApiError(`no document for this id ${req.params.id}`, 404));
  }
  res.status(200).json({ data: document });
});

// exports.changeCustomerPassword = asyncHandler(async (req, res, next) => {
//   const document = await Customer.findByIdAndUpdate(
//     req.params.id,
//     {
//       password: await bcrypt.hash(req.body.password, 12),
//       passwordChangedAt: Date.now(),
//     },
//     {
//       new: true,
//     }
//   );
//   if (!document) {
//     return next(new ApiError(`no document for this id ${req.params.id}`, 404));
//   }
//   res.status(200).json({ data: document });
// });

// @desc  delete a specific Customer by id
// @route delate /api/Customers/:id
// @acess private
exports.deleteCustomer = factory.deleteOne(Customer);

// @desc  get logged Customer data
// @route delate /api/Customers/getMe
// @acess private/protected

exports.getLoggedCustomerData = asyncHandler(async (req, res, next) => {
  req.params.id = req.customer._id;
  next();
});

// @desc updpatelogged Customer password
// @route delate /api/Customers/change
// @acess private/protected

exports.updateLoggedCustomerPassword = asyncHandler(async (req, res, next) => {
  // 1) Update user password based user payload (req.user._id)
  const customer = await Customer.findByIdAndUpdate(
    req.customer._id,
    {
      password: await bcrypt.hash(req.body.password, 12),
      passwordChangedAt: Date.now(),
    },
    {
      new: true,
    }
  );
  const token = createToken(customer._id);  // gernerate token

  res.status(200).json({ data: customer, token });
});

// @desc updpatelogged user data   (wihout password,role)
// @route delate /api/customer/Updateme
// @acess private/protected
exports.updateLoggedCustomerdata = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findByIdAndUpdate(
    req.customer._id,
    {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      profileImage: req.body.profileImage,
      phone: req.body.phone,
      brand_color: req.body.brand_color,
      brand_logo: req.body.brand_logo,
      company_name_ar: req.body.company_name_ar,
      company_name_en: req.body.company_name_en,
      brand_email: req.body.brand_email,
      brand_website: req.body.brand_website,
      commercial_registration_number: req.body.commercial_registration_number,
      tax_number: req.body.tax_number,
      additional_info: req.body.additional_info,
    },
    {
      new: true,
    }
  );
  res.status(200).json({ data: customer });
});
