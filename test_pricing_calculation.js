// اختبار حساب الأسعار الجديد
console.log('🧮 اختبار نظام حساب الأسعار الجديد...\n');

const geminiService = require('./services/geminiService');

const testUserInfo = { firstName: "أحمد" };

const testCases = [
  {
    name: "شحن عادي مع تفاصيل كاملة",
    message: "شحن عادي",
    context: "تمام ahmed، لحساب سعر الشحن شحن عادي بدقة أحتاج أعرف...",
    expectedIntent: "CHAT",
    expectedContains: "لحساب سعر الشحن شحن عادي"
  },
  {
    name: "تفاصيل الشحنة الكاملة",
    message: "وزن الشحنة 2 كيلو ودفع عند الاستلام",
    context: "تمام ahmed، خلني أحسب لك الأسعار فوراً...",
    expectedIntent: "CHAT",
    expectedContains: "حساب الأسعار لشحنتك"
  },
  {
    name: "تفاصيل غير كاملة",
    message: "وزن 3 كيلو",
    context: "تمام ahmed، خلني أحسب لك الأسعار فوراً...",
    expectedIntent: "CHAT",
    expectedContains: "ما قدرت أستخرج جميع التفاصيل"
  },
  {
    name: "شحن برو مع تفاصيل",
    message: "شحن برو 1.5 كيلو كاش",
    context: "تمام ahmed، خلني أحسب لك الأسعار فوراً...",
    expectedIntent: "CHAT",
    expectedContains: "الوزن: 1.5 كجم"
  }
];

async function testPricingCalculation() {
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

        console.log(`💬 الرد: "${result.message.substring(0, 100)}..."`);
      } else {
        console.log('⚡ Quick Parse: null (سيذهب لـ Gemini)');
      }

    } catch (error) {
      console.log(`❌ خطأ في الاختبار: ${error.message}`);
    }

    console.log('─'.repeat(60));
  }

  console.log('🎉 انتهى اختبار حساب الأسعار!');
}

testPricingCalculation().catch(console.error);
