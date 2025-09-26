// اختبار التحقق من صحة SMSA webhook
const axios = require("axios");

const BASE_URL = "https://www.marasil.site/api";

async function testSMSAValidation() {
  try {
    console.log("🔍 اختبار التحقق من صحة SMSA webhook...");

    // بيانات التحقق
    const validationData = {
      AWB: "TEST123456789",
      Reference: "REF1234567890",
    };

    console.log("📦 بيانات التحقق:", JSON.stringify(validationData, null, 2));

    const response = await axios.post(
      `${BASE_URL}/shipment/webhook-smsa/validate`,
      validationData,
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "SMSA-Webhook/1.0",
        },
        timeout: 10000,
      }
    );

    console.log("✅ استجابة التحقق:", response.data);
    return { success: true, response: response.data };
  } catch (error) {
    console.error("❌ خطأ في التحقق:", {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data,
    });
    return { success: false, error: error.message };
  }
}

// تشغيل الاختبار
testSMSAValidation();
