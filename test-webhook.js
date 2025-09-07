// ملف اختبار للـ webhook
// شغله بـ: node test-webhook.js

const axios = require("axios");

const MOYASAR_SECRET_TOKEN =
  process.env.MOYASAR_SECRET_TOKEN ||
  "pk_test_i1nUe4oTpPqdCa8zUcNZdALQR9WshHweEtfHdcmX";

// اختبار webhook لدفعة فاشلة
async function testFailedPaymentWebhook() {
  const failedPaymentPayload = {
    id: "bc266536-6a1f-4fcf-9e89-ff808fe450ca",
    type: "payment_failed",
    created_at: "2025-09-07T13:09:11+00:00",
    secret_token: MOYASAR_SECRET_TOKEN,
    account_name: "شركة مراسيل لخدمات الاعمال شركة شخص واحد",
    live: true,
    data: {
      id: "09c51054-c548-4a3a-a68b-3e7bca455f8b",
      status: "failed",
      amount: 20000,
      fee: 0,
      currency: "SAR",
      refunded: 0,
      refunded_at: null,
      captured: 0,
      captured_at: null,
      voided_at: null,
      description: "شحن المحفظة - 200 ريال سعودي",
      amount_format: "200.00 SAR",
      fee_format: "0.00 SAR",
      refunded_format: "0.00 SAR",
      captured_format: "0.00 SAR",
      invoice_id: null,
      ip: "103.125.235.22",
      callback_url: "https://www.marasil.site/",
      created_at: "2025-09-07T13:08:30.635Z",
      updated_at: "2025-09-07T13:09:11.360Z",
      metadata: {
        amount: 200,
        source: "wallet_recharge",
        timestamp: "2025-09-07T13:08:18.302Z",
        customerId: "689e81d43d1269685093e62f",
      },
      source: {
        type: "creditcard",
        company: "mada",
        name: "Sari Altarjami",
        number: "4909-80XX-XXXX-9695",
        gateway_id: "moyasar_cc_YGHAJ1FLegRNQ2BKipSfhpv",
        reference_number: "525013388019",
        token: null,
        message: "INSUFFICIENT FUNDS",
        transaction_url: null,
      },
    },
  };

  try {
    console.log("🧪 اختبار webhook لدفعة فاشلة...");
    const response = await axios.post(
      "http://localhost:4000/api/wallet/webhook/moyasar",
      failedPaymentPayload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ استجابة الخادم:", response.data);
  } catch (error) {
    console.error("❌ خطأ في الاختبار:", error.response?.data || error.message);
  }
}

// اختبار webhook لدفعة ناجحة
async function testSuccessfulPaymentWebhook() {
  const successfulPaymentPayload = {
    id: "successful-payment-id",
    type: "payment_completed",
    created_at: new Date().toISOString(),
    secret_token: MOYASAR_SECRET_TOKEN,
    account_name: "شركة مراسيل لخدمات الاعمال شركة شخص واحد",
    live: true,
    data: {
      id: "successful-payment-data-id",
      status: "paid",
      amount: 10000, // 100 ريال
      fee: 0,
      currency: "SAR",
      refunded: 0,
      refunded_at: null,
      captured: 10000,
      captured_at: new Date().toISOString(),
      voided_at: null,
      description: "شحن المحفظة - 100 ريال سعودي",
      amount_format: "100.00 SAR",
      fee_format: "0.00 SAR",
      refunded_format: "0.00 SAR",
      captured_format: "100.00 SAR",
      invoice_id: null,
      ip: "127.0.0.1",
      callback_url: "https://www.marasil.site/",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        amount: 100,
        source: "wallet_recharge",
        timestamp: new Date().toISOString(),
        customerId: "689e81d43d1269685093e62f",
      },
      source: {
        type: "creditcard",
        company: "visa",
        name: "Test User",
        number: "4111-11XX-XXXX-1111",
        gateway_id: "test_gateway_id",
        reference_number: "123456789",
        token: null,
        message: "APPROVED",
        transaction_url: null,
      },
    },
  };

  try {
    console.log("🧪 اختبار webhook لدفعة ناجحة...");
    const response = await axios.post(
      "http://localhost:4000/api/wallet/webhook/moyasar",
      successfulPaymentPayload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ استجابة الخادم:", response.data);
  } catch (error) {
    console.error("❌ خطأ في الاختبار:", error.response?.data || error.message);
  }
}

// تشغيل الاختبارات
async function runTests() {
  console.log("🚀 بدء اختبارات الـ webhook...\n");

  console.log("1️⃣ اختبار الدفعة الفاشلة:");
  await testFailedPaymentWebhook();

  console.log("\n2️⃣ اختبار الدفعة الناجحة:");
  await testSuccessfulPaymentWebhook();

  console.log("\n✅ انتهت الاختبارات!");
}

// تشغيل الاختبارات إذا تم استدعاء الملف مباشرة
if (require.main === module) {
  runTests();
}

module.exports = {
  testFailedPaymentWebhook,
  testSuccessfulPaymentWebhook,
};
