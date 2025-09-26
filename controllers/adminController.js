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
  console.log("📁 الملفات المستلمة:", req.files);
  console.log("📝 البيانات المستلمة:", req.body);

  if (req.files && req.files.profileImage) {
    const filename = `profileImage-${uuidv4()}-${Date.now()}.jpeg`;

    await sharp(req.files.profileImage[0].buffer)
      .resize(200, 200)
      .toFormat("jpeg")
      .jpeg({ quality: 95 })
      .toFile(`uploads/customers/${filename}`);
    req.body.profileImage = filename;
    console.log("✅ تم حفظ صورة البروفيل:", filename);
  }

  if (req.files && req.files.brand_logo) {
    const filename = `brand_logo-${uuidv4()}-${Date.now()}.jpeg`;
    await sharp(req.files.brand_logo[0].buffer)
      .resize(200, 200)
      .toFormat("jpeg")
      .jpeg({ quality: 95 })
      .toFile(`uploads/Logo/${filename}`);

    req.body.brand_logo = filename;
    console.log("✅ تم حفظ شعار الشركة:", filename);
  }

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

// @desc  Get company info for a customer (admin)
// @route GET /api/admin/company-info/:id
// @access admin
exports.getCompanyInfo = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const customer = await Customer.findById(id);
  if (!customer) {
    return res.status(404).json({ error: "Customer not found" });
  }
  const info = {
    brand_color: customer.brand_color,
    brand_logo: customer.brand_logo,
    company_name_ar: customer.company_name_ar,
    company_name_en: customer.company_name_en,
    brand_email: customer.brand_email,
    brand_website: customer.brand_website,
    commercial_registration_number: customer.commercial_registration_number,
    additional_info: customer.additional_info,
  };
  res.status(200).json({ company: info });
});

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

// دالة مخصصة لـ getMe بدون كلمة المرور
exports.getMe = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findById(req.customer._id);

  if (!customer) {
    return next(new ApiError("العميل غير موجود", 404));
  }

  console.log("🔍 Customer data from database:");
  console.log("profileImage:", customer.profileImage);
  console.log("brand_logo:", customer.brand_logo);
  console.log("All fields:", Object.keys(customer.toObject()));

  // التحقق من الـ raw data من الـ database
  const rawCustomer = await Customer.findById(req.customer._id).lean();
  console.log("🔍 Raw customer data from database:");
  console.log("raw profileImage:", rawCustomer.profileImage);
  console.log("raw brand_logo:", rawCustomer.brand_logo);

  // إزالة كلمة المرور من الاستجابة
  customer.password = undefined;

  res.status(200).json({
    data: customer,
  });
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
  const token = createToken(customer._id); // gernerate token

  res.status(200).json({ data: customer, token });
});

// @desc updpatelogged user data   (wihout password,role)
// @route delate /api/customer/Updateme
// @acess private/protected
exports.updateLoggedCustomerdata = asyncHandler(async (req, res, next) => {
  console.log("📝 البيانات المستلمة في updateLoggedCustomerdata:", req.body);

  // إنشاء object للتحديث مع التحقق من وجود القيم
  const updateData = {};

  // تحديث البيانات الأساسية
  if (req.body.firstName) updateData.firstName = req.body.firstName;
  if (req.body.lastName) updateData.lastName = req.body.lastName;
  if (req.body.email) updateData.email = req.body.email;
  if (req.body.phone) updateData.phone = req.body.phone;

  // تحديث صورة البروفيل (إذا تم رفعها)
  if (req.body.profileImage) {
    updateData.profileImage = req.body.profileImage;
    console.log("✅ تم العثور على profileImage:", req.body.profileImage);
  }

  // تحديث شعار الشركة (إذا تم رفعه)
  if (req.body.brand_logo) {
    updateData.brand_logo = req.body.brand_logo;
  }

  // تحديث معلومات الشركة
  if (req.body.brand_color) updateData.brand_color = req.body.brand_color;
  if (req.body.company_name_ar)
    updateData.company_name_ar = req.body.company_name_ar;
  if (req.body.company_name_en)
    updateData.company_name_en = req.body.company_name_en;
  if (req.body.brand_email) updateData.brand_email = req.body.brand_email;
  if (req.body.brand_website) updateData.brand_website = req.body.brand_website;
  if (req.body.commercial_registration_number)
    updateData.commercial_registration_number =
      req.body.commercial_registration_number;
  if (req.body.tax_number) updateData.tax_number = req.body.tax_number;
  if (req.body.additional_info)
    updateData.additional_info = req.body.additional_info;

  console.log("📝 البيانات المرسلة:", req.body);
  console.log("📝 بيانات التحديث:", updateData);

  console.log("📝 بيانات التحديث:", updateData);

  const customer = await Customer.findByIdAndUpdate(
    req.customer._id,
    updateData,
    {
      new: true,
    }
  );

  if (!customer) {
    return next(new ApiError("العميل غير موجود", 404));
  }

  console.log("✅ العميل بعد التحديث:");
  console.log("profileImage:", customer.profileImage);
  console.log("brand_logo:", customer.brand_logo);

  // إزالة كلمة المرور من الاستجابة
  customer.password = undefined;

  res.status(200).json({
    status: "success",
    data: customer,
  });
});
