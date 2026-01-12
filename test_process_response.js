// اختبار دالة processGeminiResponse للتأكد من عدم إرجاع undefined
console.log('🧪 اختبار processGeminiResponse...\n');

const geminiService = require('./services/geminiService');

// Mock services
const mockServices = {
  shipmentService: {
    trackShipment: async (trackingNumber) => ({
      success: true,
      message: `تم العثور على شحنة ${trackingNumber}`,
      status: 'جاري التوصيل'
    })
  },
  walletService: {
    getBalance: async () => ({
      success: true,
      balance: 1500,
      currency: 'SAR'
    })
  }
};

// بيانات اختبار
const testCases = [
  {
    name: "ترحيب - CHAT intent",
    geminiResponse: {
      intent: "CHAT",
      confidence: 0.95,
      message: "أهلاً! كيف أقدر أساعدك؟",
      data: {}
    }
  },
  {
    name: "تتبع شحنة - TRACK intent",
    geminiResponse: {
      intent: "TRACK",
      confidence: 0.95,
      message: "تمام، خلني أجيبلك بيانات الشحنة",
      data: { tracking_number: "123456" }
    }
  },
  {
    name: "رصيد المحفظة - BALANCE intent",
    geminiResponse: {
      intent: "BALANCE",
      confidence: 0.9,
      message: "تمام، خلني أجيبلك رصيدك",
      data: {}
    }
  }
];

async function testProcessResponse() {
  for (const testCase of testCases) {
    console.log(`📋 اختبار: ${testCase.name}`);
    console.log(`🎯 Intent: ${testCase.geminiResponse.intent}`);

    try {
      const result = await geminiService.processGeminiResponse(
        testCase.geminiResponse,
        mockServices,
        "test_user_id",
        { firstName: "أحمد" }
      );

      console.log(`✅ النتيجة:`, JSON.stringify(result, null, 2));

      if (!result) {
        console.log(`❌ خطأ: النتيجة undefined`);
        continue;
      }

      if (typeof result !== 'object') {
        console.log(`❌ خطأ: النتيجة ليست كائن`);
        continue;
      }

      if (!result.hasOwnProperty('success')) {
        console.log(`❌ خطأ: لا يوجد success في النتيجة`);
        continue;
      }

      if (!result.message) {
        console.log(`❌ خطأ: لا يوجد message في النتيجة`);
        continue;
      }

      console.log(`💬 الرسالة: "${result.message}"`);
      console.log(`✅ Intent: ${result.intent}`);
      console.log(`✅ Success: ${result.success}`);

    } catch (error) {
      console.log(`❌ خطأ في الاختبار: ${error.message}`);
    }

    console.log('─'.repeat(60));
  }

  console.log('🎉 انتهى الاختبار!');
}

// تشغيل الاختبار
testProcessResponse().catch(console.error);
