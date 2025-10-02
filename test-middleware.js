// اختبار الـ middleware
const { UploadArrayofImages } = require("./middlewares/uploadImageMiddleware");

console.log("🧪 اختبار الـ middleware...");

// إنشاء middleware
const uploadMiddleware = UploadArrayofImages([
  { name: "profileImage", maxCount: 1 },
  { name: "brand_logo", maxCount: 1 },
]);

console.log("✅ تم إنشاء الـ middleware:", typeof uploadMiddleware);

// محاكاة request
const mockReq = {
  headers: {
    "content-type":
      "multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW",
  },
  body: {},
  files: undefined,
};

const mockRes = {};
const mockNext = (err) => {
  if (err) {
    console.error("❌ Middleware error:", err);
  } else {
    console.log("✅ Middleware completed successfully");
    console.log("📁 req.files:", mockReq.files);
  }
};

console.log("🔧 اختبار الـ middleware...");
uploadMiddleware(mockReq, mockRes, mockNext);
