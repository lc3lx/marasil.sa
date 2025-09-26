// اختبار مباشر للـ database
const mongoose = require("mongoose");
const Customer = require("./models/customerModel");

mongoose
  .connect("mongodb://localhost:27017/marasil", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ Connected to MongoDB");

    const customerId = "689e81d43d1269685093e62f";

    console.log("🔍 البحث عن العميل:", customerId);

    // البحث عن العميل
    const customer = await Customer.findById(customerId);

    if (!customer) {
      console.log("❌ العميل غير موجود");
      process.exit(1);
    }

    console.log("✅ العميل موجود");
    console.log("📋 بيانات العميل:");
    console.log("- firstName:", customer.firstName);
    console.log("- lastName:", customer.lastName);
    console.log("- email:", customer.email);
    console.log("- profileImage:", customer.profileImage);
    console.log("- brand_logo:", customer.brand_logo);

    // التحقق من الـ raw data
    const rawCustomer = await Customer.findById(customerId).lean();
    console.log("\n🔍 Raw data من الـ database:");
    console.log("- raw profileImage:", rawCustomer.profileImage);
    console.log("- raw brand_logo:", rawCustomer.brand_logo);

    // التحقق من جميع الحقول
    console.log("\n📋 جميع الحقول المتاحة:");
    console.log(Object.keys(rawCustomer));

    // التحقق من وجود profileImage في الـ schema
    console.log("\n🔍 التحقق من الـ schema:");
    const schemaPaths = Customer.schema.paths;
    console.log("- profileImage في schema:", !!schemaPaths.profileImage);
    console.log("- brand_logo في schema:", !!schemaPaths.brand_logo);

    // محاولة تحديث profileImage يدوياً
    console.log("\n🧪 محاولة تحديث profileImage يدوياً:");
    const updateResult = await Customer.findByIdAndUpdate(
      customerId,
      { profileImage: "test-profile-image.jpg" },
      { new: true }
    );

    console.log("✅ تم التحديث:", updateResult.profileImage);

    // التحقق مرة أخرى
    const updatedCustomer = await Customer.findById(customerId);
    console.log("🔍 بعد التحديث:", updatedCustomer.profileImage);

    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
