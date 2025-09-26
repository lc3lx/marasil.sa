// ملف اختبار مخصص لـ Aramex webhook
// شغله بـ: node test-aramex-webhook.js

const axios = require("axios");

// إعدادات الاختبار
const BASE_URL = "https://www.marasil.site/api"; // أو http://localhost:4000/api للتطوير

// بيانات اختبار Aramex webhook
const aramexWebhookData = {
  tracking_number: "TEST123456789",
  awb_number: "AWB123456789",
  status: "Out for Delivery",
  status_description: "Out for Delivery",
  status_code: "OUT_FOR_DELIVERY",
  location: "Riyadh",
  timestamp: new Date().toISOString(),
  event_type: "status_update",
  shipment_id: "TEST123456789",
};

// اختبار webhook Aramex
async function testAramexWebhook() {
  try {
    console.log("🧪 اختبار Aramex webhook...");
    console.log(
      "📦 بيانات الاختبار:",
      JSON.stringify(aramexWebhookData, null, 2)
    );

    const response = await axios.post(
      `${BASE_URL}/shipment/webhook-aramex`,
      aramexWebhookData,
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Aramex-Webhook/1.0",
        },
        timeout: 15000, // 15 ثانية timeout
      }
    );

    console.log("✅ استجابة الخادم:", response.data);
    return { success: true, response: response.data };
  } catch (error) {
    console.error("❌ خطأ في اختبار Aramex webhook:", {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data,
    });
    return { success: false, error: error.message };
  }
}

// اختبار webhook Aramex مع حالات مختلفة
async function testAramexWebhookStatuses() {
  const testStatuses = [
    {
      tracking_number: "TEST123456789",
      awb_number: "AWB123456789",
      status: "Picked Up",
      status_description: "Picked Up",
      status_code: "PICKED_UP",
      location: "Jeddah",
      timestamp: new Date().toISOString(),
      event_type: "status_update",
      shipment_id: "TEST123456789",
    },
    {
      tracking_number: "TEST123456790",
      awb_number: "AWB123456790",
      status: "In Transit",
      status_description: "In Transit",
      status_code: "IN_TRANSIT",
      location: "Riyadh",
      timestamp: new Date().toISOString(),
      event_type: "status_update",
      shipment_id: "TEST123456790",
    },
    {
      tracking_number: "TEST123456791",
      awb_number: "AWB123456791",
      status: "Delivered",
      status_description: "Delivered",
      status_code: "DELIVERED",
      location: "Dammam",
      timestamp: new Date().toISOString(),
      event_type: "status_update",
      shipment_id: "TEST123456791",
    },
    {
      tracking_number: "TEST123456792",
      awb_number: "AWB123456792",
      status: "Failed Delivery",
      status_description: "Failed Delivery",
      status_code: "FAILED_DELIVERY",
      location: "Khobar",
      timestamp: new Date().toISOString(),
      event_type: "status_update",
      shipment_id: "TEST123456792",
    },
    {
      tracking_number: "TEST123456793",
      awb_number: "AWB123456793",
      status: "Returned",
      status_description: "Returned",
      status_code: "RETURNED",
      location: "Jubail",
      timestamp: new Date().toISOString(),
      event_type: "status_update",
      shipment_id: "TEST123456793",
    },
  ];

  console.log("🧪 اختبار Aramex webhook مع حالات مختلفة...");

  for (let i = 0; i < testStatuses.length; i++) {
    const statusData = testStatuses[i];
    try {
      console.log(`\n📊 اختبار الحالة ${i + 1}: ${statusData.status}`);
      console.log("📦 بيانات الاختبار:", JSON.stringify(statusData, null, 2));

      const response = await axios.post(
        `${BASE_URL}/shipment/webhook-aramex`,
        statusData,
        {
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Aramex-Webhook/1.0",
          },
          timeout: 15000,
        }
      );

      console.log("✅ استجابة الخادم:", response.data);
    } catch (error) {
      console.error("❌ خطأ في اختبار الحالة:", {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        data: error.response?.data,
      });
    }

    // انتظار ثانية بين الاختبارات
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

// اختبار webhook Aramex مع بيانات غير صحيحة
async function testInvalidAramexWebhook() {
  const invalidData = [
    // بدون tracking_number و awb_number و shipment_id
    {
      status: "Out for Delivery",
      status_code: "OUT_FOR_DELIVERY",
    },
    // بدون status
    {
      tracking_number: "TEST123456789",
      awb_number: "AWB123456789",
    },
    // بيانات فارغة
    {},
  ];

  console.log("🧪 اختبار Aramex webhook مع بيانات غير صحيحة...");

  for (let i = 0; i < invalidData.length; i++) {
    const data = invalidData[i];
    try {
      console.log(`\n📝 اختبار ${i + 1}: ${JSON.stringify(data)}`);
      const response = await axios.post(
        `${BASE_URL}/shipment/webhook-aramex`,
        data,
        {
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Aramex-Webhook/1.0",
          },
        }
      );
      console.log("⚠️  استجابة غير متوقعة:", response.data);
    } catch (error) {
      console.log(
        "✅ خطأ متوقع:",
        error.response?.data?.error || error.message
      );
    }
  }
}

// اختبار التحقق من صحة webhook Aramex
async function testAramexWebhookValidation() {
  const validationData = {
    tracking_number: "TEST123456789",
    awb_number: "AWB123456789",
    shipment_id: "TEST123456789",
  };

  try {
    console.log("🧪 اختبار التحقق من صحة Aramex webhook...");

    const response = await axios.post(
      `${BASE_URL}/shipment/webhook-aramex/validate`,
      validationData,
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Aramex-Webhook/1.0",
        },
        timeout: 10000,
      }
    );

    console.log("✅ استجابة التحقق:", response.data);
    return { success: true, response: response.data };
  } catch (error) {
    console.error("❌ خطأ في التحقق:", error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

// اختبار webhook Aramex للاختبار
async function testAramexWebhookTest() {
  try {
    console.log("🧪 اختبار Aramex webhook test endpoint...");

    const response = await axios.post(
      `${BASE_URL}/shipment/webhook-aramex/test`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Aramex-Webhook/1.0",
        },
        timeout: 10000,
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

// اختبار الأداء لـ Aramex webhook
async function testAramexWebhookPerformance() {
  console.log("🧪 اختبار أداء Aramex webhook...");

  const startTime = Date.now();
  const promises = [];

  // إرسال 5 طلبات متزامنة
  for (let i = 0; i < 5; i++) {
    const testData = {
      tracking_number: `PERF${i}${Date.now()}`,
      awb_number: `PERF_AWB_${i}`,
      status: "Out for Delivery",
      status_description: "Out for Delivery",
      status_code: "OUT_FOR_DELIVERY",
      location: `City ${i}`,
      timestamp: new Date().toISOString(),
      event_type: "status_update",
      shipment_id: `PERF${i}${Date.now()}`,
    };

    promises.push(
      axios
        .post(`${BASE_URL}/shipment/webhook-aramex`, testData, {
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Aramex-Webhook/1.0",
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

// تشغيل جميع اختبارات Aramex webhook
async function runAramexWebhookTests() {
  console.log("🚀 بدء اختبارات Aramex webhook...\n");

  try {
    // 1. اختبار webhook test endpoint
    console.log("1️⃣ اختبار Aramex webhook test endpoint:");
    await testAramexWebhookTest();

    // 2. اختبار التحقق من الصحة
    console.log("\n2️⃣ اختبار التحقق من الصحة:");
    await testAramexWebhookValidation();

    // 3. اختبار webhook مع حالات مختلفة
    console.log("\n3️⃣ اختبار webhook مع حالات مختلفة:");
    await testAramexWebhookStatuses();

    // 4. اختبار webhook كامل
    console.log("\n4️⃣ اختبار Aramex webhook كامل:");
    await testAramexWebhook();

    // 5. اختبار البيانات غير الصحيحة
    console.log("\n5️⃣ اختبار البيانات غير الصحيحة:");
    await testInvalidAramexWebhook();

    // 6. اختبار الأداء
    console.log("\n6️⃣ اختبار الأداء:");
    await testAramexWebhookPerformance();

    console.log("\n" + "=".repeat(60));
    console.log("📊 انتهت اختبارات Aramex webhook!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("💥 خطأ في تشغيل اختبارات Aramex webhook:", error.message);
  }
}

// تشغيل الاختبارات إذا تم استدعاء الملف مباشرة
if (require.main === module) {
  runAramexWebhookTests();
}

module.exports = {
  testAramexWebhook,
  testAramexWebhookStatuses,
  testInvalidAramexWebhook,
  testAramexWebhookValidation,
  testAramexWebhookTest,
  testAramexWebhookPerformance,
  runAramexWebhookTests,
};
