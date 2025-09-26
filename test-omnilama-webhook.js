// ملف اختبار مخصص لـ OmniLama webhook
// شغله بـ: node test-omnilama-webhook.js

const axios = require("axios");

// إعدادات الاختبار
const BASE_URL = "https://www.marasil.site/api"; // أو http://localhost:4000/api للتطوير

// بيانات اختبار OmniLama webhook
const omnilamaWebhookData = {
  event: "order.change_status",
  data: {
    order_number: "8200521059",
    uid: "b26e28bd004a4d51a7b0b33fecc20d01",
    vendor_number: "221123412312114",
    vendor_uid: "c738984db4b14edbb5ab71b78bade8d3",
    logistician_order_number: "1261043503",
    logistician_order_uid: "727530344a934142ad974448c236cdba",
    description: "Hi-Tech in da box",
    created_at: "2022-04-29T15:15:53",
    updated_at: "2022-04-29T15:15:53",
    status: 50,
    initiator_status_code: "111",
    initiator_status_name: "Order accepted",
    status_changed_at: "2025-05-15T17:00:01.347703+03:00",
  },
};

// اختبار webhook OmniLama
async function testOmniLamaWebhook() {
  try {
    console.log("🧪 اختبار OmniLama webhook...");
    console.log(
      "📦 بيانات الاختبار:",
      JSON.stringify(omnilamaWebhookData, null, 2)
    );

    const response = await axios.post(
      `${BASE_URL}/shipment/webhook-omnilama`,
      omnilamaWebhookData,
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "OmniLama-Webhook/1.0",
        },
        timeout: 15000, // 15 ثانية timeout
      }
    );

    console.log("✅ استجابة الخادم:", response.data);
    return { success: true, response: response.data };
  } catch (error) {
    console.error("❌ خطأ في اختبار OmniLama webhook:", {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data,
    });
    return { success: false, error: error.message };
  }
}

// اختبار webhook OmniLama مع أحداث مختلفة
async function testOmniLamaWebhookEvents() {
  const testEvents = [
    {
      event: "order.create",
      data: {
        order_number: "TEST123456789",
        uid: "test-uid-123",
        vendor_number: "VENDOR123",
        description: "Test order",
        created_at: new Date().toISOString(),
        status: 40,
      },
    },
    {
      event: "order.update",
      data: {
        order_number: "TEST123456789",
        uid: "test-uid-123",
        description: "Updated test order",
        updated_at: new Date().toISOString(),
      },
    },
    {
      event: "order.change_status",
      data: {
        order_number: "TEST123456789",
        uid: "test-uid-123",
        status: 60,
        initiator_status_code: "222",
        initiator_status_name: "Order in transit",
        status_changed_at: new Date().toISOString(),
      },
    },
    {
      event: "bid.create",
      data: {
        uid: "bid-uid-123",
        call_number: "CALL123456789",
        company: "Test Company",
        pickup_date: "2024-01-15",
        contact_fio: "John Doe",
        contact_phone: "+1234567890",
        status: 20,
      },
    },
  ];

  console.log("🧪 اختبار OmniLama webhook مع أحداث مختلفة...");

  for (let i = 0; i < testEvents.length; i++) {
    const eventData = testEvents[i];
    try {
      console.log(`\n📊 اختبار الحدث ${i + 1}: ${eventData.event}`);
      console.log("📦 بيانات الاختبار:", JSON.stringify(eventData, null, 2));

      const response = await axios.post(
        `${BASE_URL}/shipment/webhook-omnilama`,
        eventData,
        {
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "OmniLama-Webhook/1.0",
          },
          timeout: 15000,
        }
      );

      console.log("✅ استجابة الخادم:", response.data);
    } catch (error) {
      console.error("❌ خطأ في اختبار الحدث:", {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        data: error.response?.data,
      });
    }

    // انتظار ثانية بين الاختبارات
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

// اختبار webhook OmniLama مع بيانات غير صحيحة
async function testInvalidOmniLamaWebhook() {
  const invalidData = [
    // بدون event
    {
      data: {
        order_number: "TEST123456789",
        status: 50,
      },
    },
    // بدون data
    {
      event: "order.create",
    },
    // event غير صحيح
    {
      event: "unknown.event",
      data: {
        order_number: "TEST123456789",
      },
    },
    // بيانات فارغة
    {},
  ];

  console.log("🧪 اختبار OmniLama webhook مع بيانات غير صحيحة...");

  for (let i = 0; i < invalidData.length; i++) {
    const data = invalidData[i];
    try {
      console.log(`\n📝 اختبار ${i + 1}: ${JSON.stringify(data)}`);
      const response = await axios.post(
        `${BASE_URL}/shipment/webhook-omnilama`,
        data,
        {
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "OmniLama-Webhook/1.0",
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

// اختبار التحقق من صحة webhook OmniLama
async function testOmniLamaWebhookValidation() {
  const validationData = {
    order_number: "TEST123456789",
    uid: "test-uid-123",
  };

  try {
    console.log("🧪 اختبار التحقق من صحة OmniLama webhook...");

    const response = await axios.post(
      `${BASE_URL}/shipment/webhook-omnilama/validate`,
      validationData,
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "OmniLama-Webhook/1.0",
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

// اختبار webhook OmniLama للاختبار
async function testOmniLamaWebhookTest() {
  try {
    console.log("🧪 اختبار OmniLama webhook test endpoint...");

    const response = await axios.post(
      `${BASE_URL}/shipment/webhook-omnilama/test`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "OmniLama-Webhook/1.0",
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

// اختبار الأداء لـ OmniLama webhook
async function testOmniLamaWebhookPerformance() {
  console.log("🧪 اختبار أداء OmniLama webhook...");

  const startTime = Date.now();
  const promises = [];

  // إرسال 5 طلبات متزامنة
  for (let i = 0; i < 5; i++) {
    const testData = {
      event: "order.change_status",
      data: {
        order_number: `PERF${i}${Date.now()}`,
        uid: `perf-uid-${i}`,
        status: 50 + i,
        initiator_status_code: "111",
        initiator_status_name: `Performance test ${i}`,
        status_changed_at: new Date().toISOString(),
      },
    };

    promises.push(
      axios
        .post(`${BASE_URL}/shipment/webhook-omnilama`, testData, {
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "OmniLama-Webhook/1.0",
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

// تشغيل جميع اختبارات OmniLama webhook
async function runOmniLamaWebhookTests() {
  console.log("🚀 بدء اختبارات OmniLama webhook...\n");

  try {
    // 1. اختبار webhook test endpoint
    console.log("1️⃣ اختبار OmniLama webhook test endpoint:");
    await testOmniLamaWebhookTest();

    // 2. اختبار التحقق من الصحة
    console.log("\n2️⃣ اختبار التحقق من الصحة:");
    await testOmniLamaWebhookValidation();

    // 3. اختبار webhook مع أحداث مختلفة
    console.log("\n3️⃣ اختبار webhook مع أحداث مختلفة:");
    await testOmniLamaWebhookEvents();

    // 4. اختبار webhook كامل
    console.log("\n4️⃣ اختبار OmniLama webhook كامل:");
    await testOmniLamaWebhook();

    // 5. اختبار البيانات غير الصحيحة
    console.log("\n5️⃣ اختبار البيانات غير الصحيحة:");
    await testInvalidOmniLamaWebhook();

    // 6. اختبار الأداء
    console.log("\n6️⃣ اختبار الأداء:");
    await testOmniLamaWebhookPerformance();

    console.log("\n" + "=".repeat(60));
    console.log("📊 انتهت اختبارات OmniLama webhook!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("💥 خطأ في تشغيل اختبارات OmniLama webhook:", error.message);
  }
}

// تشغيل الاختبارات إذا تم استدعاء الملف مباشرة
if (require.main === module) {
  runOmniLamaWebhookTests();
}

module.exports = {
  testOmniLamaWebhook,
  testOmniLamaWebhookEvents,
  testInvalidOmniLamaWebhook,
  testOmniLamaWebhookValidation,
  testOmniLamaWebhookTest,
  testOmniLamaWebhookPerformance,
  runOmniLamaWebhookTests,
};
