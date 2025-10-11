const mongoose = require("mongoose");
require("dotenv").config();

// الاتصال بقاعدة البيانات
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log("✅ Connected to database"))
  .catch((err) => {
    console.error("❌ Database connection error:", err);
    process.exit(1);
  });

const Customer = require("../models/customerModel");

async function cleanImagePaths() {
  try {
    console.log("\n========== بدء تنظيف مسارات الصور ==========\n");

    // جلب جميع العملاء
    const customers = await Customer.find({});
    console.log(`📊 عدد العملاء: ${customers.length}`);

    let updatedCount = 0;

    for (const customer of customers) {
      let needsUpdate = false;
      const updates = {};

      // تنظيف profileImage
      if (customer.profileImage) {
        console.log(`\n🔍 العميل: ${customer.email}`);
        console.log(`📝 profileImage الحالي: ${customer.profileImage}`);

        // إزالة المسار الكامل والاحتفاظ باسم الملف فقط
        if (
          customer.profileImage.includes("/uploads/") ||
          customer.profileImage.includes("/customers/") ||
          customer.profileImage.startsWith("http")
        ) {
          // استخراج اسم الملف فقط
          const filename = customer.profileImage.split("/").pop();
          updates.profileImage = filename;
          needsUpdate = true;
          console.log(`✅ سيتم تحديث profileImage إلى: ${filename}`);
        }
      }

      // تنظيف brand_logo
      if (customer.brand_logo) {
        console.log(`📝 brand_logo الحالي: ${customer.brand_logo}`);

        // إزالة المسار الكامل والاحتفاظ باسم الملف فقط
        if (
          customer.brand_logo.includes("/uploads/") ||
          customer.brand_logo.includes("/Logo/") ||
          customer.brand_logo.startsWith("http")
        ) {
          // استخراج اسم الملف فقط
          const filename = customer.brand_logo.split("/").pop();
          updates.brand_logo = filename;
          needsUpdate = true;
          console.log(`✅ سيتم تحديث brand_logo إلى: ${filename}`);
        }
      }

      // تحديث العميل إذا لزم الأمر
      if (needsUpdate) {
        await Customer.findByIdAndUpdate(customer._id, updates);
        updatedCount++;
        console.log(`✅ تم تحديث العميل: ${customer.email}`);
      }
    }

    console.log(`\n========== انتهى التنظيف ==========`);
    console.log(`✅ تم تحديث ${updatedCount} عميل من أصل ${customers.length}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ خطأ في تنظيف المسارات:", error);
    process.exit(1);
  }
}

cleanImagePaths();
