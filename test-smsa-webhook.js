// ملف اختبار مخصص لـ SMSA webhook
// شغله بـ: node test-smsa-webhook.js

const axios = require("axios");

// إعدادات الاختبار
const BASE_URL = "https://www.marasil.site/api"; // أو http://localhost:4000/api للتطوير

// بيانات اختبار SMSA webhook
const smsaWebhookData = [
  {
    AWB: "231200021000",
    Reference: "REF1234567890",
    Pieces: 1,
    CODAmount: 0.0,
    ContentDesc: "Shipment contents description",
    RecipientName: "Abdulaziz",
    OriginCity: "Jeddah",
    OriginCountry: "SA",
    DesinationCity: "Riyadh",
    DesinationCountry: "SA",
    isDelivered: true,
    Scans: [
      {
        ReferenceID: 10611,
        ReceivedBy: "Abdulaziz",
        City: "Riyadh",
        ScanType: "DL",
        ScanDescription: "Delivered",
        ScanDateTime: "2024-01-10T11:00:00",
        ScanTimeZone: "+03:00",
      },
      {
        ReferenceID: 10541,
        City: "Riyadh",
        ScanType: "OD",
        ScanDescription: "Out for Delivery",
        ScanDateTime: "2024-01-10T10:00:00",
        ScanTimeZone: "+03:00",
      },
      {
        ReferenceID: 10354,
        City: "Jeddah",
        ScanType: "AF",
        ScanDescription: "Arrived Delivery Facility",
        ScanDateTime: "2024-01-10T09:00:00",
        ScanTimeZone: "+03:00",
      },
    ],
  },
  {
    AWB: "231200022000",
    Reference: "REF1234567891",
    Pieces: 1,
    CODAmount: 0.0,
    ContentDesc: "Shipment contents description",
    RecipientName: "Ahmed",
    OriginCity: "Jeddah",
    OriginCountry: "SA",
    DesinationCity: "Riyadh",
    DesinationCountry: "SA",
    Scans: [
      {
        ReferenceID: 10545,
        City: "Riyadh",
        ScanType: "OD",
        ScanDescription: "Out for Delivery",
        ScanDateTime: "2024-01-10T10:00:00",
        ScanTimeZone: "+03:00",
      },
      {
        ReferenceID: 10360,
        City: "Jeddah",
        ScanType: "AF",
        ScanDescription: "Arrived Delivery Facility",
        ScanDateTime: "2024-01-10T09:00:00",
        ScanTimeZone: "+03:00",
      },
    ],
  },
];

// اختبار webhook SMSA
async function testSMSAWebhook() {
  try {
    console.log("🧪 اختبار SMSA webhook...");
    console.log(
      "📦 بيانات الاختبار:",
      JSON.stringify(smsaWebhookData, null, 2)
    );

    const response = await axios.post(
      `${BASE_URL}/shipment/webhook-smsa`,
      smsaWebhookData,
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "SMSA-Webhook/1.0",
        },
        timeout: 15000, // 15 ثانية timeout
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

// اختبار webhook SMSA مع بيانات واحدة
async function testSingleSMSAShipment() {
  const singleShipment = [
    {
      AWB: "TEST123456789",
      Reference: "TEST_REF_123",
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
          ReferenceID: 99999,
          City: "Riyadh",
          ScanType: "OD",
          ScanDescription: "Out for Delivery",
          ScanDateTime: new Date().toISOString(),
          ScanTimeZone: "+03:00",
        },
      ],
    },
  ];

  try {
    console.log("🧪 اختبار شحنة واحدة من SMSA...");

    const response = await axios.post(
      `${BASE_URL}/shipment/webhook-smsa`,
      singleShipment,
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "SMSA-Webhook/1.0",
        },
      }
    );

    console.log("✅ استجابة الخادم:", response.data);
    return { success: true, response: response.data };
  } catch (error) {
    console.error(
      "❌ خطأ في اختبار شحنة واحدة:",
      error.response?.data || error.message
    );
    return { success: false, error: error.message };
  }
}

// اختبار webhook SMSA مع بيانات غير صحيحة
async function testInvalidSMSAWebhook() {
  const invalidData = [
    // بدون AWB و Reference
    {
      Pieces: 1,
      CODAmount: 0.0,
      ContentDesc: "Invalid shipment",
    },
    // بدون Scans
    {
      AWB: "INVALID123",
      Reference: "INVALID_REF",
      Pieces: 1,
      CODAmount: 0.0,
      ContentDesc: "Invalid shipment",
    },
  ];

  try {
    console.log("🧪 اختبار SMSA webhook مع بيانات غير صحيحة...");

    const response = await axios.post(
      `${BASE_URL}/shipment/webhook-smsa`,
      invalidData,
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "SMSA-Webhook/1.0",
        },
      }
    );

    console.log("⚠️  استجابة غير متوقعة:", response.data);
    return { success: true, response: response.data };
  } catch (error) {
    console.log("✅ خطأ متوقع:", error.response?.data?.error || error.message);
    return { success: false, error: error.message };
  }
}

// اختبار التحقق من صحة webhook SMSA
async function testSMSAWebhookValidation() {
  const validationData = {
    AWB: "231200021000",
    Reference: "REF1234567890",
  };

  try {
    console.log("🧪 اختبار التحقق من صحة SMSA webhook...");

    const response = await axios.post(
      `${BASE_URL}/shipment/webhook-smsa/validate`,
      validationData,
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "SMSA-Webhook/1.0",
        },
      }
    );

    console.log("✅ استجابة التحقق:", response.data);
    return { success: true, response: response.data };
  } catch (error) {
    console.error("❌ خطأ في التحقق:", error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

// اختبار webhook SMSA للاختبار
async function testSMSAWebhookTest() {
  try {
    console.log("🧪 اختبار SMSA webhook test endpoint...");

    const response = await axios.post(
      `${BASE_URL}/shipment/webhook-smsa/test`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "SMSA-Webhook/1.0",
        },
      }
    );

    console.log("✅ استجابة الاختبار:", response.data);
    return { success: true, response: response.data };
  } catch (error) {
    console.error(
      "❌ خطأ في اختبار test endpoint:",
      error.response?.data || error.message
    );
    return { success: false, error: error.message };
  }
}

// اختبار الأداء لـ SMSA webhook
async function testSMSAWebhookPerformance() {
  console.log("🧪 اختبار أداء SMSA webhook...");

  const startTime = Date.now();
  const promises = [];

  // إرسال 5 طلبات متزامنة
  for (let i = 0; i < 5; i++) {
    const testData = [
      {
        AWB: `PERF${i}${Date.now()}`,
        Reference: `PERF_REF_${i}`,
        Pieces: 1,
        CODAmount: 0.0,
        ContentDesc: `Performance test shipment ${i}`,
        RecipientName: `Test User ${i}`,
        OriginCity: "Jeddah",
        OriginCountry: "SA",
        DesinationCity: "Riyadh",
        DesinationCountry: "SA",
        Scans: [
          {
            ReferenceID: 99999 + i,
            City: "Riyadh",
            ScanType: "OD",
            ScanDescription: "Out for Delivery",
            ScanDateTime: new Date().toISOString(),
            ScanTimeZone: "+03:00",
          },
        ],
      },
    ];

    promises.push(
      axios
        .post(`${BASE_URL}/shipment/webhook-smsa`, testData, {
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "SMSA-Webhook/1.0",
          },
        })
        .catch((err) => ({ error: err.message }))
    );
  }

  const results = await Promise.all(promises);
  const endTime = Date.now();
  const duration = endTime - startTime;

  const successCount = results.filter((r) => !r.error).length;
  const errorCount = results.filter((r) => r.error).length;

  console.log(`📊 نتائج اختبار الأداء:`);
  console.log(`⏱️  المدة الإجمالية: ${duration}ms`);
  console.log(`✅ نجح: ${successCount}/5`);
  console.log(`❌ فشل: ${errorCount}/5`);
  console.log(`⚡ متوسط الوقت: ${Math.round(duration / 5)}ms لكل طلب`);

  return { success: true, duration, successCount, errorCount };
}

// تشغيل جميع اختبارات SMSA webhook
async function runSMSAWebhookTests() {
  console.log("🚀 بدء اختبارات SMSA webhook...\n");

  try {
    // 1. اختبار webhook test endpoint
    console.log("1️⃣ اختبار SMSA webhook test endpoint:");
    await testSMSAWebhookTest();

    // 2. اختبار التحقق من الصحة
    console.log("\n2️⃣ اختبار التحقق من الصحة:");
    await testSMSAWebhookValidation();

    // 3. اختبار شحنة واحدة
    console.log("\n3️⃣ اختبار شحنة واحدة:");
    await testSingleSMSAShipment();

    // 4. اختبار webhook كامل
    console.log("\n4️⃣ اختبار SMSA webhook كامل:");
    await testSMSAWebhook();

    // 5. اختبار البيانات غير الصحيحة
    console.log("\n5️⃣ اختبار البيانات غير الصحيحة:");
    await testInvalidSMSAWebhook();

    // 6. اختبار الأداء
    console.log("\n6️⃣ اختبار الأداء:");
    await testSMSAWebhookPerformance();

    console.log("\n" + "=".repeat(60));
    console.log("📊 انتهت اختبارات SMSA webhook!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("💥 خطأ في تشغيل اختبارات SMSA webhook:", error.message);
  }
}

// تشغيل الاختبارات إذا تم استدعاء الملف مباشرة
if (require.main === module) {
  runSMSAWebhookTests();
}

module.exports = {
  testSMSAWebhook,
  testSingleSMSAShipment,
  testInvalidSMSAWebhook,
  testSMSAWebhookValidation,
  testSMSAWebhookTest,
  testSMSAWebhookPerformance,
  runSMSAWebhookTests,
};
