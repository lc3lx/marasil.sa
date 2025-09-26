// اختبار مبسط لـ SMSA webhook
const axios = require("axios");

const BASE_URL = "https://www.marasil.site/api";

// بيانات اختبار بسيطة
const testData = [
  {
    AWB: "TEST123456789",
    Reference: "REF1234567890",
    Pieces: 1,
    CODAmount: 0.0,
    ContentDesc: "Test shipment",
    RecipientName: "Test User",
    OriginCity: "Jeddah",
    OriginCountry: "SA",
    DesinationCity: "Riyadh",
    DesinationCountry: "SA",
    isDelivered: false,
    Scans: [
      {
        ReferenceID: 10611,
        City: "Riyadh",
        ScanType: "OD",
        ScanDescription: "Out for Delivery",
        ScanDateTime: new Date().toISOString(),
        ScanTimeZone: "+03:00",
      },
    ],
  },
];

async function testSMSAWebhook() {
  try {
    console.log("🧪 اختبار SMSA webhook...");
    console.log("📦 بيانات الاختبار:", JSON.stringify(testData, null, 2));

    const response = await axios.post(
      `${BASE_URL}/shipment/webhook-smsa`,
      testData,
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "SMSA-Webhook/1.0",
        },
        timeout: 15000,
      }
    );

    console.log("✅ استجابة الخادم:", response.data);
    return { success: true, response: response.data };
  } catch (error) {
    console.error("❌ خطأ في اختبار SMSA webhook:", {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data,
    });
    return { success: false, error: error.message };
  }
}

// تشغيل الاختبار
testSMSAWebhook();
