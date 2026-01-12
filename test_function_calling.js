/**
 * اختبار تحسينات Function Calling في الذكاء الاصطناعي
 * تاريخ الإنشاء: 12 يناير 2026
 */

const { quickKeywordParse, sendToGemini, processGeminiResponse } = require('./services/geminiService');

// Mock services للاختبار
const mockServices = {
  shipmentService: {
    trackShipment: async (trackingNumber) => {
      console.log(`📦 [Mock] تتبع الشحنة: ${trackingNumber}`);
      return {
        success: true,
        message: `تم العثور على الشحنة ${trackingNumber}`,
        data: {
          status: "في الطريق",
          location: "الرياض",
          estimated_delivery: "2026-01-15"
        }
      };
    },
    createShipmentFromAI: async (data) => {
      console.log(`📦 [Mock] إنشاء شحنة:`, data);
      return {
        success: true,
        message: "تم إنشاء الشحنة بنجاح",
        data: { shipment_id: "SHIP123456" }
      };
    },
    cancelShipment: async (shipmentId) => {
      console.log(`❌ [Mock] إلغاء شحنة: ${shipmentId}`);
      return {
        success: true,
        message: "تم إلغاء الشحنة"
      };
    },
    getUserShipments: async () => {
      console.log(`📋 [Mock] جلب شحنات المستخدم`);
      return {
        success: true,
        message: "تم جلب الشحنات",
        data: [
          { id: "SHIP1", status: "مكتملة" },
          { id: "SHIP2", status: "في الطريق" }
        ]
      };
    }
  },
  walletService: {
    getBalance: async () => {
      console.log(`💰 [Mock] جلب رصيد المحفظة`);
      return {
        success: true,
        message: "تم جلب الرصيد",
        data: { balance: 1500.50 }
      };
    }
  },
  generalService: {
    getCompanyInfo: async () => {
      console.log(`🏢 [Mock] جلب معلومات الشركة`);
      return {
        success: true,
        message: "مراسيل هي منصة شحن إلكترونية",
        data: {
          name: "مراسيل",
          description: "منصة شحن إلكترونية للتجار",
          founded: "2020"
        }
      };
    },
    getShippingCompanies: async () => {
      console.log(`🚛 [Mock] جلب شركات الشحن`);
      return {
        success: true,
        message: "شركات الشحن المتاحة",
        data: [
          { name: "سمسا", type: "اقتصادي/برو" },
          { name: "ريد بوكس", type: "سريع" },
          { name: "لاما", type: "سريع" }
        ]
      };
    },
    getPricingInfo: async (data) => {
      console.log(`💵 [Mock] حساب الأسعار:`, data);
      const basePrice = data.weight * 10;
      return {
        success: true,
        message: `التكلفة التقريبية: ${basePrice} ريال`,
        data: {
          weight: data.weight,
          price: basePrice,
          currency: "SAR"
        }
      };
    }
  }
};

async function testFunctionCalling() {
  console.log("🧪 بدء اختبار تحسينات Function Calling\n");

  // اختبار 1: Quick Parse للتتبع
  console.log("=== اختبار 1: Quick Parse للتتبع ===");
  const trackResult = quickKeywordParse("تابع شحنتي 123456", { name: "أحمد" });
  console.log("نتيجة Quick Parse:", JSON.stringify(trackResult, null, 2));

  // اختبار 2: Quick Parse لمعلومات الشركة
  console.log("\n=== اختبار 2: Quick Parse لمعلومات الشركة ===");
  const companyResult = quickKeywordParse("ما هي مراسيل", { name: "فاطمة" });
  console.log("نتيجة Quick Parse:", JSON.stringify(companyResult, null, 2));

  // اختبار 3: Quick Parse للأسعار
  console.log("\n=== اختبار 3: Quick Parse للأسعار ===");
  const pricingResult = quickKeywordParse("كم التكلفة", { name: "محمد" });
  console.log("نتيجة Quick Parse:", JSON.stringify(pricingResult, null, 2));

  // اختبار 4: API Call simulation للتتبع
  console.log("\n=== اختبار 4: API Call للتتبع ===");
  const apiCallResult = {
    intent: "API_CALL",
    api_call: {
      name: "trackShipment",
      params: { tracking_number: "123456" }
    }
  };

  const processedResult = await processGeminiResponse(
    apiCallResult,
    mockServices,
    "user123",
    { name: "سارة" }
  );
  console.log("نتيجة API Call:", JSON.stringify(processedResult, null, 2));

  // اختبار 5: API Call simulation للرصيد
  console.log("\n=== اختبار 5: API Call للرصيد ===");
  const balanceCallResult = {
    intent: "API_CALL",
    api_call: {
      name: "getBalance",
      params: {}
    }
  };

  const balanceProcessed = await processGeminiResponse(
    balanceCallResult,
    mockServices,
    "user123",
    { name: "خالد" }
  );
  console.log("نتيجة API Call للرصيد:", JSON.stringify(balanceProcessed, null, 2));

  // اختبار 6: API Call simulation لمعلومات الشركة
  console.log("\n=== اختبار 6: API Call لمعلومات الشركة ===");
  const companyCallResult = {
    intent: "API_CALL",
    api_call: {
      name: "getCompanyInfo",
      params: {}
    }
  };

  const companyProcessed = await processGeminiResponse(
    companyCallResult,
    mockServices,
    "user123",
    { name: "نورة" }
  );
  console.log("نتيجة API Call للشركة:", JSON.stringify(companyProcessed, null, 2));

  console.log("\n✅ انتهى الاختبار بنجاح!");
}

// تشغيل الاختبار
if (require.main === module) {
  testFunctionCalling().catch(console.error);
}

module.exports = { testFunctionCalling };
