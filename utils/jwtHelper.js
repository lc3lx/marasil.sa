// مساعد لاستخراج customerId من JWT token
const jwt = require("jsonwebtoken");

exports.getCustomerIdFromToken = (token) => {
  try {
    if (!token) return null;

    // إزالة 'Bearer ' من البداية إذا كان موجوداً
    const cleanToken = token.replace("Bearer ", "");

    // فك تشفير التوكن (افتراض أن المفتاح العام متاح)
    const decoded = jwt.decode(cleanToken);

    // البحث عن customerId في الحمولة
    return decoded?.customerId || decoded?.id || decoded?.customer_id || null;
  } catch (error) {
    console.error("Error decoding token:", error.message);
    return null;
  }
};

// نسخة للاستخدام في الفرونت إند
exports.getCustomerIdFromTokenFrontend = (token) => {
  try {
    if (!token) return null;

    // فك base64 للجزء الثاني من التوكن (payload)
    const payload = token.split(".")[1];
    const decodedPayload = JSON.parse(atob(payload));

    return (
      decodedPayload?.customerId ||
      decodedPayload?.id ||
      decodedPayload?.customer_id ||
      null
    );
  } catch (error) {
    console.error("Error decoding token in frontend:", error.message);
    return null;
  }
};
