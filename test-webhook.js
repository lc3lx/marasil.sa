// ملف اختبار للـ webhook
// شغله بـ: node test-webhook.js

const axios = require("axios");

const MOYASAR_SECRET_TOKEN =
  process.env.MOYASAR_SECRET_TOKEN ||
  "pk_test_i1nUe4oTpPqdCa8zUcNZdALQR9WshHweEtfHdcmX";

// اختبار webhook لدفعة فاشلة
async function testFailedPaymentWebhook() {
  const failedPaymentPayload = {
    id: "ac650985-3a13-47bb-aaef-90eca3387fd8",
    type: "payment_failed",
    created_at: "2025-09-07T14:44:19+00:00",
    secret_token: MOYASAR_SECRET_TOKEN,
    account_name: "شركة مراسيل لخدمات الاعمال شركة شخص واحد",
    live: true,
    data: {
      id: "bad16060-8c86-4023-9383-a375a2f043c0",
      status: "failed",
      amount: 100000,
      fee: 0,
      currency: "SAR",
      refunded: 0,
      refunded_at: null,
      captured: 0,
      captured_at: null,
      voided_at: null,
      description: "شحن المحفظة - 1000 ريال سعودي",
      amount_format: "1,000.00 SAR",
      fee_format: "0.00 SAR",
      refunded_format: "0.00 SAR",
      captured_format: "0.00 SAR",
      invoice_id: null,
      ip: "103.125.235.22",
      callback_url: "https://www.marasil.site/",
      created_at: "2025-09-07T14:43:44.970Z",
      updated_at: "2025-09-07T14:44:19.184Z",
      metadata: {
        amount: 1000,
        source: "wallet_recharge",
        timestamp: "2025-09-07T14:43:21.020Z",
        customerId: "689e81d43d1269685093e62f",
      },
      source: {
        type: "creditcard",
        company: "mada",
        name: "Sari Altarjami",
        number: "4909-80XX-XXXX-9695",
        gateway_id: "moyasar_cc_w4xRjuDuVWMFupiAimf4Hzu",
        reference_number: "525014332363",
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
      amount: 50000, // 500 ريال
      fee: 0,
      currency: "SAR",
      refunded: 0,
      refunded_at: null,
      captured: 50000,
      captured_at: new Date().toISOString(),
      voided_at: null,
      description: "شحن المحفظة - 500 ريال سعودي",
      amount_format: "500.00 SAR",
      fee_format: "0.00 SAR",
      refunded_format: "0.00 SAR",
      captured_format: "500.00 SAR",
      invoice_id: null,
      ip: "127.0.0.1",
      callback_url: "https://www.marasil.site/",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        amount: 500,
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

// اختبار webhook لدفعة معلقة (تأكد من وجود معاملة pending مسبقاً)
async function testPendingTransactionWebhook() {
  const pendingPaymentPayload = {
    id: "pending-payment-id",
    type: "payment_completed",
    created_at: new Date().toISOString(),
    secret_token: MOYASAR_SECRET_TOKEN,
    account_name: "شركة مراسيل لخدمات الاعمال شركة شخص واحد",
    live: true,
    data: {
      id: "bad16060-8c86-4023-9383-a375a2f043c0", // نفس ID من الدفعة الفاشلة
      status: "paid",
      amount: 100000, // 1000 ريال
      fee: 0,
      currency: "SAR",
      refunded: 0,
      refunded_at: null,
      captured: 100000,
      captured_at: new Date().toISOString(),
      voided_at: null,
      description: "شحن المحفظة - 1000 ريال سعودي",
      amount_format: "1,000.00 SAR",
      fee_format: "0.00 SAR",
      refunded_format: "0.00 SAR",
      captured_format: "1,000.00 SAR",
      invoice_id: null,
      ip: "127.0.0.1",
      callback_url: "https://www.marasil.site/",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        amount: 1000,
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
        reference_number: "987654321",
        token: null,
        message: "APPROVED",
        transaction_url: null,
      },
    },
  };

  try {
    console.log("🧪 اختبار webhook لدفعة معلقة (pending -> completed)...");
    const response = await axios.post(
      "http://localhost:4000/api/wallet/webhook/moyasar",
      pendingPaymentPayload,
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

  console.log("\n3️⃣ اختبار الدفعة المعلقة (pending -> completed):");
  await testPendingTransactionWebhook();

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
