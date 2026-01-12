// اختبار استدعاء APIs من processGeminiResponse
console.log('🧪 اختبار استدعاء APIs من processGeminiResponse...\n');

const geminiService = require('./services/geminiService');

// Mock services
const mockServices = {
  shipmentService: {
    trackShipment: async (trackingNumber) => {
      console.log(`📦 [Mock] Tracking shipment: ${trackingNumber}`);
      return {
        success: true,
        trackingNumber,
        status: 'جاري التوصيل',
        createdAt: new Date(),
        receiver: { name: 'أحمد محمد', phone: '0501234567' },
        details: { weight: 2, totalPrice: 35 }
      };
    },
    getUserShipments: async () => {
      console.log('📋 [Mock] Getting user shipments');
      return {
        success: true,
        shipments: [
          { trackingId: 'MRSL001', status: 'مكتمل', totalPrice: 25 },
          { trackingId: 'MRSL002', status: 'جاري التوصيل', totalPrice: 45 }
        ]
      };
    }
  },
  walletService: {
    getBalance: async () => {
      console.log('💰 [Mock] Getting balance');
      return {
        success: true,
        balance: 1500,
        currency: 'SAR'
      };
    }
  },
  generalService: {
    getCompanyInfo: async () => ({
      success: true,
      companyInfo: { name: 'مراسيل', description: 'منصة شحن' }
    })
  }
};

const testCases = [
  {
    name: "تتبع شحنة من Quick Parse",
    geminiResponse: {
      intent: "TRACK",
      confidence: 0.95,
      data: { tracking_number: "50724610926" },
      message: "تمام، خلني أجيبلك بيانات الشحنة"
    }
  },
  {
    name: "الحصول على الرصيد",
    geminiResponse: {
      intent: "BALANCE",
      confidence: 0.9,
      data: {},
      message: "تمام، خلني أجيبلك رصيدك"
    }
  },
  {
    name: "قائمة الشحنات",
    geminiResponse: {
      intent: "LIST",
      confidence: 0.85,
      data: {},
      message: "تمام، خلني أجيبلك قائمة شحناتك"
    }
  },
  {
    name: "رسالة ترحيب - لا API",
    geminiResponse: {
      intent: "CHAT",
      confidence: 0.95,
      message: "أهلاً! كيف أقدر أساعدك؟"
    }
  }
];

async function testAPICalls() {
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

      if (result.intent === testCase.geminiResponse.intent) {
        console.log(`🎯 Intent صحيح`);
      } else {
        console.log(`❌ Intent خاطئ: متوقع ${testCase.geminiResponse.intent}, حصلت ${result.intent}`);
      }

      if (result.message) {
        console.log(`💬 الرسالة: "${result.message.substring(0, 100)}..."`);
      }

      if (result.result && result.result.success) {
        console.log(`✅ API call ناجح`);
      }

    } catch (error) {
      console.log(`❌ خطأ في الاختبار: ${error.message}`);
    }

    console.log('─'.repeat(60));
  }

  console.log('🎉 انتهى اختبار استدعاء APIs!');
}

// تشغيل الاختبار
testAPICalls().catch(console.error);
