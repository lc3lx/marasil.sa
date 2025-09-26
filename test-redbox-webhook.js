// ملف اختبار مخصص لـ RedBox webhook
// شغله بـ: node test-redbox-webhook.js

const axios = require("axios");

// إعدادات الاختبار
const BASE_URL = "https://www.marasil.site/api"; // أو http://localhost:4000/api للتطوير

// بيانات اختبار RedBox webhook
const redboxWebhookData = {
  shipment_id: "TEST123456789",
  tracking_number: "TRK123456789",
  status_name: "Out for Delivery",
  status_label: "Out for Delivery",
  status_code: "out_for_delivery",
  date: new Date().toISOString(),
  customer_message: "Your shipment is out for delivery",
};

// اختبار webhook RedBox
async function testRedBoxWebhook() {
  try {
    console.log("🧪 اختبار RedBox webhook...");
    console.log(
      "📦 بيانات الاختبار:",
      JSON.stringify(redboxWebhookData, null, 2)
    );

    const response = await axios.post(
      `${BASE_URL}/shipment/webhook-redbox`,
      redboxWebhookData,
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "RedBox-Webhook/1.0",
        },
        timeout: 15000, // 15 ثانية timeout
      }
    );

    console.log("✅ استجابة الخادم:", response.data);
    return { success: true, response: response.data };
  } catch (error) {
    console.error("❌ خطأ في اختبار RedBox webhook:", {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data,
    });
    return { success: false, error: error.message };
  }
}

// اختبار webhook RedBox مع حالات مختلفة
async function testRedBoxWebhookStatuses() {
  const testStatuses = [
    {
      shipment_id: "TEST123456789",
      tracking_number: "TRK123456789",
      status_name: "Delivered",
      status_label: "Delivered",
      status_code: "delivered",
      date: new Date().toISOString(),
      customer_message: "Your shipment has been delivered",
    },
    {
      shipment_id: "TEST123456790",
      tracking_number: "TRK123456790",
      status_name: "In Transit",
      status_label: "In Transit",
      status_code: "in_transit",
      date: new Date().toISOString(),
      customer_message: "Your shipment is in transit",
    },
    {
      shipment_id: "TEST123456791",
      tracking_number: "TRK123456791",
      status_name: "Processing",
      status_label: "Processing",
      status_code: "processing",
      date: new Date().toISOString(),
      customer_message: "Your shipment is being processed",
    },
  ];

  console.log("🧪 اختبار RedBox webhook مع حالات مختلفة...");

  for (let i = 0; i < testStatuses.length; i++) {
    const statusData = testStatuses[i];
    try {
      console.log(`\n📊 اختبار الحالة ${i + 1}: ${statusData.status_name}`);
      console.log("📦 بيانات الاختبار:", JSON.stringify(statusData, null, 2));

      const response = await axios.post(
        `${BASE_URL}/shipment/webhook-redbox`,
        statusData,
        {
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "RedBox-Webhook/1.0",
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

// اختبار webhook RedBox مع بيانات غير صحيحة
async function testInvalidRedBoxWebhook() {
  const invalidData = [
    // بدون shipment_id و tracking_number
    {
      status_name: "Out for Delivery",
      status_code: "out_for_delivery",
    },
    // بدون status_code
    {
      shipment_id: "TEST123456789",
      tracking_number: "TRK123456789",
      status_name: "Out for Delivery",
    },
    // بيانات فارغة
    {},
  ];

  console.log("🧪 اختبار RedBox webhook مع بيانات غير صحيحة...");

  for (let i = 0; i < invalidData.length; i++) {
    const data = invalidData[i];
    try {
      console.log(`\n📝 اختبار ${i + 1}: ${JSON.stringify(data)}`);
      const response = await axios.post(
        `${BASE_URL}/shipment/webhook-redbox`,
        data,
        {
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "RedBox-Webhook/1.0",
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

// اختبار التحقق من صحة webhook RedBox
async function testRedBoxWebhookValidation() {
  const validationData = {
    shipment_id: "TEST123456789",
    tracking_number: "TRK123456789",
  };

  try {
    console.log("🧪 اختبار التحقق من صحة RedBox webhook...");

    const response = await axios.post(
      `${BASE_URL}/shipment/webhook-redbox/validate`,
      validationData,
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "RedBox-Webhook/1.0",
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

// اختبار webhook RedBox للاختبار
async function testRedBoxWebhookTest() {
  try {
    console.log("🧪 اختبار RedBox webhook test endpoint...");

    const response = await axios.post(
      `${BASE_URL}/shipment/webhook-redbox/test`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "RedBox-Webhook/1.0",
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

// اختبار الأداء لـ RedBox webhook
async function testRedBoxWebhookPerformance() {
  console.log("🧪 اختبار أداء RedBox webhook...");

  const startTime = Date.now();
  const promises = [];

  // إرسال 5 طلبات متزامنة
  for (let i = 0; i < 5; i++) {
    const testData = {
      shipment_id: `PERF${i}${Date.now()}`,
      tracking_number: `PERF_TRK_${i}`,
      status_name: "Out for Delivery",
      status_label: "Out for Delivery",
      status_code: "out_for_delivery",
      date: new Date().toISOString(),
      customer_message: `Performance test shipment ${i}`,
    };

    promises.push(
      axios
        .post(`${BASE_URL}/shipment/webhook-redbox`, testData, {
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "RedBox-Webhook/1.0",
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

// تشغيل جميع اختبارات RedBox webhook
async function runRedBoxWebhookTests() {
  console.log("🚀 بدء اختبارات RedBox webhook...\n");

  try {
    // 1. اختبار webhook test endpoint
    console.log("1️⃣ اختبار RedBox webhook test endpoint:");
    await testRedBoxWebhookTest();

    // 2. اختبار التحقق من الصحة
    console.log("\n2️⃣ اختبار التحقق من الصحة:");
    await testRedBoxWebhookValidation();

    // 3. اختبار webhook مع حالات مختلفة
    console.log("\n3️⃣ اختبار webhook مع حالات مختلفة:");
    await testRedBoxWebhookStatuses();

    // 4. اختبار webhook كامل
    console.log("\n4️⃣ اختبار RedBox webhook كامل:");
    await testRedBoxWebhook();

    // 5. اختبار البيانات غير الصحيحة
    console.log("\n5️⃣ اختبار البيانات غير الصحيحة:");
    await testInvalidRedBoxWebhook();

    // 6. اختبار الأداء
    console.log("\n6️⃣ اختبار الأداء:");
    await testRedBoxWebhookPerformance();

    console.log("\n" + "=".repeat(60));
    console.log("📊 انتهت اختبارات RedBox webhook!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("💥 خطأ في تشغيل اختبارات RedBox webhook:", error.message);
  }
}

// تشغيل الاختبارات إذا تم استدعاء الملف مباشرة
if (require.main === module) {
  runRedBoxWebhookTests();
}

module.exports = {
  testRedBoxWebhook,
  testRedBoxWebhookStatuses,
  testInvalidRedBoxWebhook,
  testRedBoxWebhookValidation,
  testRedBoxWebhookTest,
  testRedBoxWebhookPerformance,
  runRedBoxWebhookTests,
};
