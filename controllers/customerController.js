// const asyncHandler = require("express-async-handler");
// const { v4: uuidv4 } = require("uuid");
// const sharp = require("sharp");
// const factory = require("./handlersFactory");
// const { uploadSingleImage } = require("../middlewares/uploadImageMiddleware");
// const Customer = require("../models/customerModel");
// const PrsonealInfo = require("../models/prsonealInfoModel");
// const BankInfo = require("../models/BankInfoModel");
// const ApiError = require("../utils/apiError");
// exports.getIdformreq = (req, res, next) => {
//   if (!req.body.customerId) {
//     req.body.customerId = req.customer._id;
//     next();
//   }
// };
// // Upload single image
// exports.uploadCustomerImage = uploadSingleImage("profileImg");
// exports.uploadCustomerFile = uploadSingleImage("ibanFile");

// // Image processing
// exports.resizeImage = asyncHandler(async (req, res, next) => {
//   const filename = `Customer-${uuidv4()}-${Date.now()}.jpeg`;

//   if (req.file) {
//     await sharp(req.file.buffer)
//       .resize(600, 600)
//       .toFormat("jpeg")
//       .jpeg({ quality: 95 })
//       .toFile(`uploads/customers/profileImage/${filename}`);

//     // Save image into our db
//     req.body.profileImg = filename;
//   }

//   next();
// });
// exports.setcustmerIdTobody = (req, res, next) => {
//   if (!req.body.customerId) req.body.customer = req.params.customerId;
//   next();
// };
// // File processing
// exports.resizeFile = asyncHandler(async (req, res, next) => {
//   const filename = `Customer-${uuidv4()}-${Date.now()}.pdf`;

//   if (req.file) {
//     await sharp(req.file.buffer)
//       .toFormat("pdf")
//       .toFile(`uploads/customers/ibanFile/${filename}`);

//     // Save image into our db
//     req.body.ibanFile = filename;
//   }

//   next();
// });
// // @desc    Get list of users
// // @route   GET /api/v1/users
// // @access  Private/Admin
// exports.getCustomer = factory.getAll(Customer);

// // @desc    Get specific Customer by id
// // @route   GET /api/v1/Customer/:id
// // @access  Private/Admin
// exports.getOneCustomer = factory.getOne(Customer);

// // @desc    Create Customer
// // @route   POST  /api/v1/Customer
// // @access  Private/Admin
// exports.createCustomer = factory.createOne(Customer);
// // @desc    Delete specific user
// // @route   DELETE /api/v1/users/:id
// // @access  Private/Admin
// exports.deleteCustomer = factory.deleteOne(Customer);

// // @desc    Create Customerprofile
// // @route   POST  /api/v1/Customer/createProfile
// // @access  Private/customer
// exports.createProfile = factory.createOne(PrsonealInfo);
// // @desc    get Customerprofile
// // @route   GET  /api/v1/Customer/getProfile
// // @access  Private/customer
// exports.getOneProfile = asyncHandler(async (req, res, next) => {
//   const profil = await PrsonealInfo.findOne(req.body.customerId);
//   if (!profil) {
//     return next(
//       new ApiError(
//         "no profile for this user plesase create one and trye agane ",
//         404
//       )
//     );
//   }
//   res.status(200).json({ data: profil });
// });
// // @desc    get Customerprofile
// // @route   PUT  /api/v1/Customer/updateProfile
// // @access  Private/customer
// exports.updateOneProfile = factory.updateOne(PrsonealInfo);
// // @desc    get Customerprofile
// // @route   Delete  /api/v1/Customer/deleteProfile
// // @access  Private/customer
// exports.deleteOneProfile = factory.deleteOne(PrsonealInfo);
// //////////
// // @desc    Create Customerprofile
// // @route   POST  /api/v1/Customer/createBankInfo
// // @access  Private/customer
// exports.createBankInfo = factory.createOne(BankInfo);
// // @desc    get Customerprofile
// // @route   GET  /api/v1/Customer/getBankInfo
// // @access  Private/customer
// exports.getOneBankInfo = asyncHandler(async (req, res, next) => {
//   const bankInfo = await BankInfo.findOne(req.body.customerId);
//   if (!bankInfo) {
//     return next(
//       new ApiError(
//         "no profile for this user plesase create one and trye agane ",
//         404
//       )
//     );
//   }
//   res.status(200).json({ data: bankInfo });
// });
// // @desc    get Customerprofile
// // @route   PUT  /api/v1/Customer/updateBankInfo
// // @access  Private/customer
// exports.updateOneBankInfo = factory.updateOne(BankInfo);
// // @desc    get Customerprofile
// // @route   Delete  /api/v1/Customer/deleteBankInfo
// // @access  Private/customer
// exports.deleteOneBankInfo = factory.deleteOne(BankInfo);

// exports.getLoggedData = asyncHandler(async (req, res, next) => {
//   req.params.id = req.customer._id;
//   next();
// });
