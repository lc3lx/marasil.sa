// اختبار رفع صورة البروفيل
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const API_BASE_URL = "http://localhost:4000/api/customer";

// إنشاء ملف اختبار
const testImagePath = "test-image.jpg";
const testImageBuffer = Buffer.from("fake-image-data");

// كتابة ملف اختبار
fs.writeFileSync(testImagePath, testImageBuffer);

async function testProfileImageUpload() {
  try {
    console.log("🧪 اختبار رفع صورة البروفيل...");

    const formData = new FormData();
    formData.append("profileImage", fs.createReadStream(testImagePath));

    const response = await axios.put(`${API_BASE_URL}/updateMe`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: "Bearer YOUR_TOKEN_HERE", // ضع التوكن هنا
      },
    });

    console.log("✅ نجح رفع صورة البروفيل:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ فشل رفع صورة البروفيل:",
      error.response?.data || error.message
    );
    return null;
  }
}

async function testGetMe() {
  try {
    console.log("🧪 اختبار getMe...");

    const response = await axios.get(`${API_BASE_URL}/getMe`, {
      headers: {
        Authorization: "Bearer YOUR_TOKEN_HERE", // ضع التوكن هنا
      },
    });

    console.log("✅ نجح getMe:", response.data);

    // التحقق من وجود profileImage
    if (response.data.data.profileImage) {
      console.log("✅ profileImage موجود:", response.data.data.profileImage);
    } else {
      console.log("❌ profileImage غير موجود");
    }

    return response.data;
  } catch (error) {
    console.error("❌ فشل getMe:", error.response?.data || error.message);
    return null;
  }
}

// تشغيل الاختبارات
async function runTests() {
  console.log("🚀 بدء اختبارات البروفيل...\n");

  // اختبار 1: رفع صورة البروفيل
  console.log("1. اختبار رفع صورة البروفيل:");
  await testProfileImageUpload();
  console.log("\n" + "=".repeat(50) + "\n");

  // اختبار 2: getMe
  console.log("2. اختبار getMe:");
  await testGetMe();
  console.log("\n" + "=".repeat(50) + "\n");

  console.log("✅ انتهت الاختبارات");
  console.log("\n📝 ملاحظات:");
  console.log("- تأكد من وضع التوكن الصحيح في Authorization header");
  console.log("- تأكد من أن الـ server يعمل على البورت 4000");
  console.log("- تحقق من الـ console logs في الباك");
}

// تنظيف الملف المؤقت
process.on("exit", () => {
  if (fs.existsSync(testImagePath)) {
    fs.unlinkSync(testImagePath);
  }
});

// تشغيل الاختبارات إذا تم استدعاء الملف مباشرة
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testProfileImageUpload,
  testGetMe,
  runTests,
};
