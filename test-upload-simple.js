// اختبار بسيط لرفع صورة البروفيل
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

    const response = await axios.put(`${API_BASE_URL}/updateMe`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization:
          "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4OWU4MWQ0M2QxMjY5Njg1MDkzZTYyZiIsImlhdCI6MTczNTI5NzI4OCwiZXhwIjoxNzM1MzgzNjg4fQ.8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q", // توكن تجريبي
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
