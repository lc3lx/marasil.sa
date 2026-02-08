const crypto = require("crypto");
const fs = require("fs");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const ApiError = require("../utils/apiError");
const createToken = require("../utils/createToken");
const { UploadArrayofImages } = require("../middlewares/uploadImageMiddleware");
const Customer = require("../models/customerModel");
const factory = require("./handlersFactory");

// Base URL للملفات الثابتة والصور
const BASE_URL = process.env.BASE_URL || "https://www.marasil.sa";

/**
 * يحول مسار الصورة النسبي إلى رابط كامل مع base URL
 */
const getImageFullUrl = (path) => {
  if (!path || typeof path !== "string") return path || "";
  const trimmed = path.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://"))
    return trimmed;
  const base = BASE_URL.replace(/\/$/, "");
  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${base}${normalizedPath}`;
};
// middleware
exports.UploadCustomerImage = UploadArrayofImages([
  { name: "profileImage", maxCount: 1 },
  { name: "brand_logo", maxCount: 1 },
  { name: "returnPageLogo", maxCount: 1 },
  { name: "replacementPageLogo", maxCount: 1 },
]);

exports.ResizeImage = asyncHandler(async (req, res, next) => {
  console.log("\n========== ResizeImage Middleware ==========");
  console.log("📁 req.files:", req.files);
  console.log("📝 req.body:", req.body);
  console.log("🔧 req.files type:", typeof req.files);
  console.log(
    "🔧 req.files keys:",
    req.files ? Object.keys(req.files) : "no files"
  );
  console.log("🔧 Content-Type:", req.headers["content-type"]);

  // طباعة تفاصيل req.files بالكامل
  if (req.files) {
    console.log(
      "🔧 Full req.files object:",
      JSON.stringify(req.files, null, 2)
    );
  }

  try {
    if (req.files && req.files.profileImage) {
      console.log("✅ profileImage found in req.files");
      console.log("🔧 profileImage array:", req.files.profileImage);
      console.log("🔧 profileImage length:", req.files.profileImage.length);

      if (req.files.profileImage[0]) {
        console.log("🔧 profileImage[0] details:", {
          fieldname: req.files.profileImage[0].fieldname,
          originalname: req.files.profileImage[0].originalname,
          encoding: req.files.profileImage[0].encoding,
          mimetype: req.files.profileImage[0].mimetype,
          size: req.files.profileImage[0].size,
          buffer: req.files.profileImage[0].buffer
            ? `Buffer(${req.files.profileImage[0].buffer.length} bytes)`
            : "missing",
        });

        const filename = `profileImage-${uuidv4()}-${Date.now()}.jpeg`;

        await sharp(req.files.profileImage[0].buffer)
          .resize(200, 200)
          .toFormat("jpeg")
          .jpeg({ quality: 95 })
          .toFile(`uploads/customers/${filename}`);

        req.body.profileImage = filename;
        console.log("✅ تم حفظ صورة البروفيل:", filename);
        console.log("✅ req.body.profileImage:", req.body.profileImage);
      } else {
        console.log("❌ req.files.profileImage[0] is undefined");
      }
    } else {
      console.log("❌ لا توجد صورة بروفيل في req.files");
      console.log("❌ req.files:", req.files);
    }

    if (req.files && req.files.brand_logo) {
      console.log("✅ brand_logo found in req.files");
      const filename = `brand_logo-${uuidv4()}-${Date.now()}.jpeg`;
      await sharp(req.files.brand_logo[0].buffer)
        .resize(200, 200)
        .toFormat("jpeg")
        .jpeg({ quality: 95 })
        .toFile(`uploads/Logo/${filename}`);

      req.body.brand_logo = filename;
      console.log("✅ تم حفظ شعار الشركة:", filename);
    }

    if (req.files && req.files.returnPageLogo) {
      console.log("✅ returnPageLogo found in req.files");
      const dir = "uploads/returnPageLogo";
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const filename = `returnPageLogo-${uuidv4()}-${Date.now()}.jpeg`;
      await sharp(req.files.returnPageLogo[0].buffer)
        .resize(400, 120)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(`${dir}/${filename}`);
      req.body.returnPageLogo = filename;
      console.log("✅ تم حفظ شعار صفحة الإرجاع:", filename);
    }

    if (req.files && req.files.replacementPageLogo) {
      console.log("✅ replacementPageLogo found in req.files");
      const dir = "uploads/replacementPageLogo";
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const filename = `replacementPageLogo-${uuidv4()}-${Date.now()}.jpeg`;
      await sharp(req.files.replacementPageLogo[0].buffer)
        .resize(400, 120)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(`${dir}/${filename}`);
      req.body.replacementPageLogo = filename;
      console.log("✅ تم حفظ شعار صفحة الاستبدال:", filename);
    }

    console.log("========== End ResizeImage Middleware ==========\n");
    next();
  } catch (error) {
    console.error("❌ خطأ في معالجة الصورة:", error);
    console.error("❌ Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return res.status(400).json({
      status: "error",
      message: "فشل في معالجة الصورة: " + error.message,
      details: {
        name: error.name,
        code: error.code,
      },
    });
  }
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
  const brandLogoPath = customer.brand_logo
    ? !customer.brand_logo.includes("/uploads/") &&
      !customer.brand_logo.startsWith("http")
      ? `/uploads/Logo/${customer.brand_logo}`
      : customer.brand_logo
    : null;
  const info = {
    brand_color: customer.brand_color,
    brand_logo: brandLogoPath
      ? getImageFullUrl(brandLogoPath)
      : customer.brand_logo,
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
  console.log("\n========== getMe Controller ==========");
  const customer = await Customer.findById(req.customer._id);

  if (!customer) {
    console.log("❌ العميل غير موجود");
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

  // إضافة المسار الكامل مع base URL للصور
  const customerData = customer.toObject();
  if (customerData.profileImage) {
    if (
      !customerData.profileImage.includes("/uploads/") &&
      !customerData.profileImage.startsWith("http")
    ) {
      customerData.profileImage = getImageFullUrl(
        `/uploads/customers/${customerData.profileImage}`
      );
    } else {
      customerData.profileImage = getImageFullUrl(customerData.profileImage);
    }
    console.log("✅ profileImage مع base URL:", customerData.profileImage);
  }
  if (customerData.brand_logo) {
    if (
      !customerData.brand_logo.includes("/uploads/") &&
      !customerData.brand_logo.startsWith("http")
    ) {
      customerData.brand_logo = getImageFullUrl(
        `/uploads/Logo/${customerData.brand_logo}`
      );
    } else {
      customerData.brand_logo = getImageFullUrl(customerData.brand_logo);
    }
    console.log("✅ brand_logo مع base URL:", customerData.brand_logo);
  }
  if (customerData.trackingSettings?.logo) {
    customerData.trackingSettings.logo = getImageFullUrl(
      customerData.trackingSettings.logo
    );
  }
  if (customerData.returnPageSettings?.logoUrl) {
    const logo = customerData.returnPageSettings.logoUrl;
    if (!logo.includes("/uploads/") && !logo.startsWith("http")) {
      customerData.returnPageSettings.logoUrl = getImageFullUrl(
        `/uploads/returnPageLogo/${logo}`
      );
    } else {
      customerData.returnPageSettings.logoUrl = getImageFullUrl(
        logo.startsWith("/") ? logo : `/${logo}`
      );
    }
  }
  if (customerData.replacementPageSettings?.logoUrl) {
    const logo = customerData.replacementPageSettings.logoUrl;
    if (!logo.includes("/uploads/") && !logo.startsWith("http")) {
      customerData.replacementPageSettings.logoUrl = getImageFullUrl(
        `/uploads/replacementPageLogo/${logo}`
      );
    } else {
      customerData.replacementPageSettings.logoUrl = getImageFullUrl(
        logo.startsWith("/") ? logo : `/${logo}`
      );
    }
  }

  console.log("========== End getMe Controller ==========\n");

  res.status(200).json({
    data: customerData,
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
  console.log("\n========== updateLoggedCustomerdata Controller ==========");
  console.log("📝 req.body:", req.body);
  console.log("📝 req.files:", req.files);
  console.log("📝 req.body.profileImage:", req.body.profileImage);
  console.log("📝 req.body.brand_logo:", req.body.brand_logo);

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
    console.log(
      "✅ سيتم تحديث profileImage في الـ database:",
      req.body.profileImage
    );
  } else {
    console.log("❌ لا يوجد profileImage في req.body");
  }

  // تحديث شعار الشركة (إذا تم رفعه)
  if (req.body.brand_logo) {
    updateData.brand_logo = req.body.brand_logo;
    console.log(
      "✅ سيتم تحديث brand_logo في الـ database:",
      req.body.brand_logo
    );
  } else {
    console.log("❌ لا يوجد brand_logo في req.body");
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

  // تحديث إعدادات الإشعارات
  if (req.body.notificationPreferences) {
    updateData.notificationPreferences = req.body.notificationPreferences;
    console.log(
      "✅ سيتم تحديث notificationPreferences:",
      req.body.notificationPreferences
    );
  }

  // تحديث إعدادات الأمان
  if (req.body.securitySettings) {
    updateData.securitySettings = req.body.securitySettings;
    console.log("✅ سيتم تحديث securitySettings:", req.body.securitySettings);
  }

  // تحديث إعدادات تخصيص التتبع
  if (req.body.trackingSettings) {
    updateData.trackingSettings = req.body.trackingSettings;
    console.log("✅ سيتم تحديث trackingSettings:", req.body.trackingSettings);
  }

  // تحديث شعار صفحة الإرجاع (إذا تم رفعه) و/أو إعدادات صفحة الاسترجاع
  if (req.body.returnPageLogo) {
    const customer = await Customer.findById(req.customer._id)
      .select("returnPageSettings")
      .lean();
    const current =
      customer?.returnPageSettings &&
      typeof customer.returnPageSettings === "object"
        ? { ...customer.returnPageSettings }
        : {};
    const logoPath =
      req.body.returnPageLogo.includes("/") ||
      req.body.returnPageLogo.startsWith("http")
        ? req.body.returnPageLogo
        : `uploads/returnPageLogo/${req.body.returnPageLogo}`;
    const logoUrl = getImageFullUrl(
      logoPath.startsWith("/") ? logoPath : `/${logoPath}`
    );
    const fromBody =
      req.body.returnPageSettings !== undefined
        ? typeof req.body.returnPageSettings === "string"
          ? JSON.parse(req.body.returnPageSettings)
          : req.body.returnPageSettings
        : {};
    updateData.returnPageSettings = { ...current, ...fromBody, logoUrl };
    console.log("✅ سيتم تحديث returnPageSettings (مع logoUrl من رفع الشعار)");
  } else if (req.body.returnPageSettings !== undefined) {
    updateData.returnPageSettings =
      typeof req.body.returnPageSettings === "string"
        ? JSON.parse(req.body.returnPageSettings)
        : req.body.returnPageSettings;
    const existing = await Customer.findById(req.customer._id)
      .select("returnPageSlug")
      .lean();
    if (!existing?.returnPageSlug) {
      const slug = crypto.randomBytes(8).toString("base64url");
      updateData.returnPageSlug = slug;
      console.log("✅ تم إنشاء returnPageSlug للعميل:", slug);
    }
    console.log("✅ سيتم تحديث returnPageSettings");
  }

  // تحديث شعار صفحة الاستبدال و/أو إعدادات صفحة الاستبدال
  if (req.body.replacementPageLogo) {
    const cust = await Customer.findById(req.customer._id)
      .select("replacementPageSettings")
      .lean();
    const current =
      cust?.replacementPageSettings &&
      typeof cust.replacementPageSettings === "object"
        ? { ...cust.replacementPageSettings }
        : {};
    const logoPath =
      req.body.replacementPageLogo.includes("/") ||
      req.body.replacementPageLogo.startsWith("http")
        ? req.body.replacementPageLogo
        : `uploads/replacementPageLogo/${req.body.replacementPageLogo}`;
    const logoUrl = getImageFullUrl(
      logoPath.startsWith("/") ? logoPath : `/${logoPath}`
    );
    const fromBody =
      req.body.replacementPageSettings !== undefined
        ? typeof req.body.replacementPageSettings === "string"
          ? JSON.parse(req.body.replacementPageSettings)
          : req.body.replacementPageSettings
        : {};
    updateData.replacementPageSettings = { ...current, ...fromBody, logoUrl };
    console.log(
      "✅ سيتم تحديث replacementPageSettings (مع logoUrl من رفع الشعار)"
    );
  } else if (req.body.replacementPageSettings !== undefined) {
    updateData.replacementPageSettings =
      typeof req.body.replacementPageSettings === "string"
        ? JSON.parse(req.body.replacementPageSettings)
        : req.body.replacementPageSettings;
    const existingRep = await Customer.findById(req.customer._id)
      .select("replacementPageSlug")
      .lean();
    if (!existingRep?.replacementPageSlug) {
      const slug = crypto.randomBytes(8).toString("base64url");
      updateData.replacementPageSlug = slug;
      console.log("✅ تم إنشاء replacementPageSlug للعميل:", slug);
    }
    console.log("✅ سيتم تحديث replacementPageSettings");
  }

  console.log("📝 بيانات التحديث النهائية (updateData):", updateData);

  console.log("🔄 جاري تحديث العميل في الـ database...");
  const customer = await Customer.findByIdAndUpdate(
    req.customer._id,
    updateData,
    {
      new: true,
    }
  );

  if (!customer) {
    console.log("❌ العميل غير موجود");
    return next(new ApiError("العميل غير موجود", 404));
  }

  console.log("✅ تم تحديث العميل في الـ database");
  console.log("✅ profileImage في الـ database:", customer.profileImage);
  console.log("✅ brand_logo في الـ database:", customer.brand_logo);

  // التحقق من الـ raw data
  const rawCustomer = await Customer.findById(req.customer._id).lean();
  console.log("🔍 Raw data من الـ database:");
  console.log("🔍 raw profileImage:", rawCustomer.profileImage);
  console.log("🔍 raw brand_logo:", rawCustomer.brand_logo);

  // إزالة كلمة المرور من الاستجابة
  customer.password = undefined;

  // إضافة المسار الكامل مع base URL للصور
  const customerData = customer.toObject();
  if (customerData.profileImage) {
    if (
      !customerData.profileImage.includes("/uploads/") &&
      !customerData.profileImage.startsWith("http")
    ) {
      customerData.profileImage = getImageFullUrl(
        `/uploads/customers/${customerData.profileImage}`
      );
    } else {
      customerData.profileImage = getImageFullUrl(customerData.profileImage);
    }
    console.log("✅ profileImage مع base URL:", customerData.profileImage);
  }
  if (customerData.brand_logo) {
    if (
      !customerData.brand_logo.includes("/uploads/") &&
      !customerData.brand_logo.startsWith("http")
    ) {
      customerData.brand_logo = getImageFullUrl(
        `/uploads/Logo/${customerData.brand_logo}`
      );
    } else {
      customerData.brand_logo = getImageFullUrl(customerData.brand_logo);
    }
    console.log("✅ brand_logo مع base URL:", customerData.brand_logo);
  }
  if (customerData.trackingSettings?.logo) {
    customerData.trackingSettings.logo = getImageFullUrl(
      customerData.trackingSettings.logo
    );
  }
  if (customerData.returnPageSettings?.logoUrl) {
    const logo = customerData.returnPageSettings.logoUrl;
    if (!logo.includes("/uploads/") && !logo.startsWith("http")) {
      customerData.returnPageSettings.logoUrl = getImageFullUrl(
        `/uploads/returnPageLogo/${logo}`
      );
    } else {
      customerData.returnPageSettings.logoUrl = getImageFullUrl(
        logo.startsWith("/") ? logo : `/${logo}`
      );
    }
  }
  if (customerData.replacementPageSettings?.logoUrl) {
    const logo = customerData.replacementPageSettings.logoUrl;
    if (!logo.includes("/uploads/") && !logo.startsWith("http")) {
      customerData.replacementPageSettings.logoUrl = getImageFullUrl(
        `/uploads/replacementPageLogo/${logo}`
      );
    } else {
      customerData.replacementPageSettings.logoUrl = getImageFullUrl(
        logo.startsWith("/") ? logo : `/${logo}`
      );
    }
  }

  console.log(
    "========== End updateLoggedCustomerdata Controller ==========\n"
  );

  res.status(200).json({
    status: "success",
    data: customerData,
  });
});

// @desc Update notification preferences
// @route PUT /api/customer/updateNotificationPreferences
// @access private/protected
exports.updateNotificationPreferences = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findByIdAndUpdate(
    req.customer._id,
    { notificationPreferences: req.body.notificationPreferences },
    { new: true }
  );

  if (!customer) {
    return next(new ApiError("العميل غير موجود", 404));
  }

  res.status(200).json({
    status: "success",
    data: customer.notificationPreferences,
  });
});

// @desc Update security settings
// @route PUT /api/customer/updateSecuritySettings
// @access private/protected
exports.updateSecuritySettings = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findByIdAndUpdate(
    req.customer._id,
    { securitySettings: req.body.securitySettings },
    { new: true }
  );

  if (!customer) {
    return next(new ApiError("العميل غير موجود", 404));
  }

  res.status(200).json({
    status: "success",
    data: customer.securitySettings,
  });
});

// @desc Update tracking page customization settings
// @route PUT /api/customer/updateTrackingSettings
// @access private/protected
exports.updateTrackingSettings = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findByIdAndUpdate(
    req.customer._id,
    { trackingSettings: req.body.trackingSettings },
    { new: true }
  );

  if (!customer) {
    return next(new ApiError("العميل غير موجود", 404));
  }

  res.status(200).json({
    status: "success",
    data: customer.trackingSettings,
  });
});

// @desc جلب تخصيص صفحة الاسترجاع بالرابط الفريد (للعرض العام للعملاء غير المسجلين)
// @route GET /api/customer/return-page/:slug
// @access public
exports.getReturnPageBySlug = asyncHandler(async (req, res, next) => {
  const { slug } = req.params;
  if (!slug) {
    return next(new ApiError("رابط صفحة الاسترجاع مطلوب", 400));
  }
  const customer = await Customer.findOne({ returnPageSlug: slug })
    .select("returnPageSettings returnPageSlug")
    .lean();
  if (!customer) {
    return next(
      new ApiError("صفحة الاسترجاع غير موجودة أو الرابط غير صحيح", 404)
    );
  }
  const raw = customer.returnPageSettings || {};
  const settings = { ...raw };
  if (settings.logoUrl) {
    const logo = settings.logoUrl;
    if (!logo.includes("/uploads/") && !logo.startsWith("http")) {
      settings.logoUrl = getImageFullUrl(`/uploads/returnPageLogo/${logo}`);
    } else {
      settings.logoUrl = getImageFullUrl(
        logo.startsWith("/") ? logo : `/${logo}`
      );
    }
  }
  res.status(200).json({
    status: "success",
    data: settings,
  });
});

// @desc جلب تخصيص صفحة الاستبدال بالرابط الفريد (للعرض العام للعملاء غير المسجلين)
// @route GET /api/customer/replacement-page/:slug
// @access public
exports.getReplacementPageBySlug = asyncHandler(async (req, res, next) => {
  const { slug } = req.params;
  if (!slug) {
    return next(new ApiError("رابط صفحة الاستبدال مطلوب", 400));
  }
  const customer = await Customer.findOne({ replacementPageSlug: slug })
    .select("replacementPageSettings replacementPageSlug")
    .lean();
  if (!customer) {
    return next(
      new ApiError("صفحة الاستبدال غير موجودة أو الرابط غير صحيح", 404)
    );
  }
  const raw = customer.replacementPageSettings || {};
  const settings = { ...raw };
  if (settings.logoUrl) {
    const logo = settings.logoUrl;
    if (!logo.includes("/uploads/") && !logo.startsWith("http")) {
      settings.logoUrl = getImageFullUrl(
        `/uploads/replacementPageLogo/${logo}`
      );
    } else {
      settings.logoUrl = getImageFullUrl(
        logo.startsWith("/") ? logo : `/${logo}`
      );
    }
  }
  res.status(200).json({
    status: "success",
    data: settings,
  });
});
