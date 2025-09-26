// ملف اختبار شامل للـ webhooks لشركات الشحن
// شغله بـ: node test-shipping-webhooks.js

const axios = require("axios");

// إعدادات الاختبار
const BASE_URL = "https://www.marasil.site/api"; // أو http://localhost:4000/api للتطوير
const TEST_SHIPMENT_ID = "test-shipment-123";
const TEST_TRACKING_NUMBER = "TRK123456789";

// بيانات اختبار للشركات المختلفة
const testData = {
  smsa: {
    trackingNumber: "SMSA123456789",
    company: "smsa",
    newStatus: "IN_TRANSIT",
    description: "الشحنة في الطريق",
  },
  aramex: {
    trackingNumber: "ARAMEX987654321",
    company: "aramex",
    newStatus: "OUT_FOR_DELIVERY",
    description: "الشحنة جاهزة للتسليم",
  },
  redbox: {
    trackingNumber: "REDBOX555666777",
    company: "redbox",
    newStatus: "Delivered",
    description: "تم التسليم بنجاح",
  },
  omniclama: {
    trackingNumber: "OMNI111222333",
    company: "omniclama",
    newStatus: "READY_FOR_PICKUP",
    description: "الشحنة جاهزة للاستلام",
  },
};

// اختبار webhook عام لتحديث حالة الشحنة
async function testWebhookUpdateShipmentStatus(companyData) {
  const { trackingNumber, company, newStatus, description } = companyData;

  const payload = {
    trackingNumber,
    newStatus,
    company,
    description,
    timestamp: new Date().toISOString(),
    source: "shipping_company_api",
  };

  try {
    console.log(`🧪 اختبار webhook لشركة ${company.toUpperCase()}...`);
    console.log(`📦 رقم التتبع: ${trackingNumber}`);
    console.log(`📊 الحالة الجديدة: ${newStatus}`);

    const response = await axios.post(
      `${BASE_URL}/shipment/webhook-update-shipment-status`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "ShippingCompany-Webhook/1.0",
        },
        timeout: 10000, // 10 ثواني timeout
      }
    );

    console.log(`✅ استجابة الخادم (${company}):`, response.data);
    return { success: true, company, response: response.data };
  } catch (error) {
    console.error(`❌ خطأ في اختبار ${company}:`, {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data,
    });
    return { success: false, company, error: error.message };
  }
}

// اختبار webhook مع بيانات غير صحيحة
async function testInvalidWebhookData() {
  console.log("🧪 اختبار webhook مع بيانات غير صحيحة...");

  const invalidPayloads = [
    // بدون trackingNumber
    { newStatus: "IN_TRANSIT", company: "smsa" },
    // بدون newStatus
    { trackingNumber: "TEST123", company: "smsa" },
    // بدون company
    { trackingNumber: "TEST123", newStatus: "IN_TRANSIT" },
    // company غير موجود
    {
      trackingNumber: "TEST123",
      newStatus: "IN_TRANSIT",
      company: "unknown_company",
    },
  ];

  for (let i = 0; i < invalidPayloads.length; i++) {
    const payload = invalidPayloads[i];
    try {
      console.log(`📝 اختبار ${i + 1}: ${JSON.stringify(payload)}`);
      const response = await axios.post(
        `${BASE_URL}/shipment/webhook-update-shipment-status`,
        payload,
        { headers: { "Content-Type": "application/json" } }
      );
      console.log(`⚠️  استجابة غير متوقعة:`, response.data);
    } catch (error) {
      console.log(
        `✅ خطأ متوقع (${error.response?.status}):`,
        error.response?.data?.error
      );
    }
  }
}

// اختبار webhook مع شحنة غير موجودة
async function testNonExistentShipment() {
  console.log("🧪 اختبار webhook مع شحنة غير موجودة...");

  const payload = {
    trackingNumber: "NONEXISTENT123456789",
    newStatus: "IN_TRANSIT",
    company: "smsa",
  };

  try {
    const response = await axios.post(
      `${BASE_URL}/shipment/webhook-update-shipment-status`,
      payload,
      { headers: { "Content-Type": "application/json" } }
    );
    console.log("⚠️  استجابة غير متوقعة:", response.data);
  } catch (error) {
    console.log("✅ خطأ متوقع:", error.response?.data?.error);
  }
}

// اختبار الأداء (load testing)
async function testWebhookPerformance() {
  console.log("🧪 اختبار أداء الـ webhook...");

  const startTime = Date.now();
  const promises = [];

  // إرسال 10 طلبات متزامنة
  for (let i = 0; i < 10; i++) {
    const payload = {
      trackingNumber: `PERF${i}${Date.now()}`,
      newStatus: "IN_TRANSIT",
      company: "smsa",
    };

    promises.push(
      axios
        .post(`${BASE_URL}/shipment/webhook-update-shipment-status`, payload, {
          headers: { "Content-Type": "application/json" },
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
  console.log(`✅ نجح: ${successCount}/10`);
  console.log(`❌ فشل: ${errorCount}/10`);
  console.log(`⚡ متوسط الوقت: ${Math.round(duration / 10)}ms لكل طلب`);
}

// اختبار webhook مع headers مختلفة
async function testWebhookWithHeaders() {
  console.log("🧪 اختبار webhook مع headers مختلفة...");

  const payload = {
    trackingNumber: "HEADER_TEST_123",
    newStatus: "IN_TRANSIT",
    company: "smsa",
  };

  const testHeaders = [
    { "Content-Type": "application/json" },
    {
      "Content-Type": "application/json",
      "X-Webhook-Signature": "test-signature",
      "User-Agent": "ShippingCompany/1.0",
    },
    {
      "Content-Type": "application/json",
      Authorization: "Bearer test-token",
    },
  ];

  for (let i = 0; i < testHeaders.length; i++) {
    try {
      console.log(`📝 اختبار headers ${i + 1}:`, testHeaders[i]);
      const response = await axios.post(
        `${BASE_URL}/shipment/webhook-update-shipment-status`,
        payload,
        { headers: testHeaders[i] }
      );
      console.log(`✅ نجح:`, response.data);
    } catch (error) {
      console.log(`❌ فشل:`, error.response?.data || error.message);
    }
  }
}

// اختبار جميع الشركات
async function testAllCompanies() {
  console.log("🚀 بدء اختبار webhooks لجميع شركات الشحن...\n");

  const results = [];

  for (const [company, data] of Object.entries(testData)) {
    console.log(`\n${"=".repeat(50)}`);
    console.log(`🏢 اختبار شركة ${company.toUpperCase()}`);
    console.log(`${"=".repeat(50)}`);

    const result = await testWebhookUpdateShipmentStatus(data);
    results.push(result);

    // انتظار ثانية بين الاختبارات
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return results;
}

// تشغيل جميع الاختبارات
async function runAllTests() {
  console.log("🚀 بدء اختبارات الـ webhooks الشاملة...\n");

  try {
    // 1. اختبار جميع الشركات
    console.log("1️⃣ اختبار جميع شركات الشحن:");
    const companyResults = await testAllCompanies();

    // 2. اختبار البيانات غير الصحيحة
    console.log("\n2️⃣ اختبار البيانات غير الصحيحة:");
    await testInvalidWebhookData();

    // 3. اختبار شحنة غير موجودة
    console.log("\n3️⃣ اختبار شحنة غير موجودة:");
    await testNonExistentShipment();

    // 4. اختبار الأداء
    console.log("\n4️⃣ اختبار الأداء:");
    await testWebhookPerformance();

    // 5. اختبار Headers
    console.log("\n5️⃣ اختبار Headers:");
    await testWebhookWithHeaders();

    // ملخص النتائج
    console.log("\n" + "=".repeat(60));
    console.log("📊 ملخص النتائج:");
    console.log("=".repeat(60));

    const successCount = companyResults.filter((r) => r.success).length;
    const totalCount = companyResults.length;

    console.log(`✅ نجح: ${successCount}/${totalCount} شركات`);
    console.log(`❌ فشل: ${totalCount - successCount}/${totalCount} شركات`);

    if (successCount === totalCount) {
      console.log("🎉 جميع الاختبارات نجحت!");
    } else {
      console.log("⚠️  بعض الاختبارات فشلت - تحقق من الإعدادات");
    }
  } catch (error) {
    console.error("💥 خطأ في تشغيل الاختبارات:", error.message);
  }
}

// تشغيل الاختبارات إذا تم استدعاء الملف مباشرة
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testWebhookUpdateShipmentStatus,
  testInvalidWebhookData,
  testNonExistentShipment,
  testWebhookPerformance,
  testWebhookWithHeaders,
  testAllCompanies,
  runAllTests,
};
