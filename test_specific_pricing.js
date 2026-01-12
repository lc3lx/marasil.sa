// اختبار حساب الأسعار للشركات المحددة
console.log('🧮 اختبار حساب الأسعار للشركات المحددة...\n');

const geminiService = require('./services/geminiService');

const testUserInfo = { firstName: "أحمد" };

const testCases = [
  {
    name: "دي اعرف كم تكلفني - طلب مباشر",
    message: "دي اعرف كم تكلفني شحنة 10 كليو",
    expectedIntent: "CHAT",
    expectedContains: "حساب الأسعار لشحنتك"
  },
  {
    name: "وزن الشحنة ونوعها",
    message: "وزن الشحنة 10 كيلو نوعها شحن عادي",
    context: "تمام ahmed، خلني أحسب لك الأسعار فوراً...",
    expectedIntent: "CHAT",
    expectedContains: "الوزن: 10 كجم"
  },
  {
    name: "سعر شركة محددة",
    message: "كم سعر الشحنة في سمسا الاقتصادية",
    expectedIntent: "CHAT",
    expectedContains: "سمسا"
  },
  {
    name: "سعر مع نوع الشحن",
    message: "كم سعر شحنة 5 كيلو برو في أرامكس",
    expectedIntent: "CHAT",
    expectedContains: "أرامكس"
  },
  {
    name: "شحنة مع دفع عند الاستلام",
    message: "شحنة 8 كيلو دفع عند الاستلام",
    context: "تمام ahmed، خلني أحسب لك الأسعار فوراً...",
    expectedIntent: "CHAT",
    expectedContains: "دفع عند الاستلام"
  }
];

async function testSpecificPricing() {
  for (const testCase of testCases) {
    console.log(`📋 اختبار: ${testCase.name}`);
    console.log(`💬 الرسالة: "${testCase.message}"`);

    if (testCase.context) {
      console.log(`📝 السياق: "${testCase.context.substring(0, 80)}..."`);
    }

    try {
      const result = geminiService.quickKeywordParse(testCase.message, testUserInfo);

      if (result) {
        console.log(`✅ Quick Parse: ${result.intent} (confidence: ${result.confidence})`);

        if (result.intent === testCase.expectedIntent) {
          console.log(`🎯 Intent صحيح!`);
        } else {
          console.log(`❌ Intent خاطئ - متوقع: ${testCase.expectedIntent}, حصلت: ${result.intent}`);
        }

        if (testCase.expectedContains && result.message.includes(testCase.expectedContains)) {
          console.log(`✅ الرد يحتوي على النص المتوقع`);
        } else if (testCase.expectedContains) {
          console.log(`❌ الرد لا يحتوي على النص المتوقع`);
        }

        if (result.data && result.data.action === "CALCULATE_PRICING") {
          console.log(`✅ تم تعيين CALCULATE_PRICING action`);
        }

        console.log(`💬 الرد: "${result.message.substring(0, 150)}..."`);
      } else {
        console.log('⚡ Quick Parse: null (سيذهب لـ Gemini)');
      }

    } catch (error) {
      console.log(`❌ خطأ في الاختبار: ${error.message}`);
    }

    console.log('─'.repeat(80));
  }

  console.log('🎉 انتهى اختبار حساب الأسعار المحددة!');
}

testSpecificPricing().catch(console.error);
