// اختبار تشخيصي لرفع صورة البروفيل
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const API_BASE_URL = "http://localhost:4000/api/customer";

// إنشاء ملف اختبار
const testImagePath = "test-profile-image.jpg";
const testImageBuffer = Buffer.from("fake-image-data-for-testing");

// كتابة ملف اختبار
fs.writeFileSync(testImagePath, testImageBuffer);

async function testProfileImageUpload() {
  try {
    console.log("🧪 اختبار رفع صورة البروفيل...");
    console.log("📁 ملف الاختبار:", testImagePath);
    console.log("📁 حجم الملف:", fs.statSync(testImagePath).size, "bytes");

    const formData = new FormData();
    formData.append("profileImage", fs.createReadStream(testImagePath));

    console.log("📝 FormData created successfully");
    console.log("📝 FormData has profileImage:", formData.has("profileImage"));

    // اختبار بدون توكن أولاً
    console.log("🔧 اختبار بدون توكن...");
    const response = await axios.put(`${API_BASE_URL}/updateMe`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    console.log("✅ نجح رفع صورة البروفيل:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ فشل رفع صورة البروفيل:");
    console.error("Status:", error.response?.status);
    console.error("Data:", error.response?.data);
    console.error("Message:", error.message);
    return null;
  }
}

// تنظيف الملف المؤقت
process.on("exit", () => {
  if (fs.existsSync(testImagePath)) {
    fs.unlinkSync(testImagePath);
  }
});

// تشغيل الاختبار
if (require.main === module) {
  testProfileImageUpload().catch(console.error);
}

module.exports = { testProfileImageUpload };


