// اختبار تحسينات نظام حساب الأسعار
console.log('🧮 اختبار تحسينات نظام حساب الأسعار...\n');

const geminiService = require('./services/geminiService');

const testUserInfo = { firstName: "أحمد" };

const testCases = [
  {
    name: "زبط الوضع - طلب معلومات إضافية",
    message: "زبط الوضع شو عندك شركات شحن",
    expectedIntent: "CHAT",
    expectedContains: "مراسيل هي منصة"
  },
  {
    name: "بدي اعرف كم تكلفني - طلب أسعار مباشر",
    message: "بدي اعرف كم تكلفني شحنة 10 كليو",
    expectedIntent: "CHAT",
    expectedContains: "حساب الأسعار لشحنتك"
  },
  {
    name: "شحن عادي - نوع الشحن",
    message: "شحن عادي",
    context: "عندنا عدة شركات شحن موثوقة: سمسا (اقتصادي وبرو)، أرامكس برو، ريد بوكس، ولما بوكس. كل شركة لها مميزاتها حسب نوع الشحنة. أي نوع شحنة عندك؟",
    expectedIntent: "CHAT",
    expectedContains: "لحساب سعر الشحن شحن عادي"
  },
  {
    name: "تفاصيل مع كلمة كليو",
    message: "شحنة 10 كليو",
    context: "تمام ahmed، خلني أحسب لك الأسعار فوراً...",
    expectedIntent: "CHAT",
    expectedContains: "الوزن: 10 كجم"
  },
  {
    name: "تفاصيل بدون طريقة دفع - يفترض COD",
    message: "5 كيلو",
    context: "تمام ahmed، خلني أحسب لك الأسعار فوراً...",
    expectedIntent: "CHAT",
    expectedContains: "الوزن: 5 كجم"
  }
];

async function testPricingImprovements() {
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

        console.log(`💬 الرد: "${result.message.substring(0, 100)}..."`);
      } else {
        console.log('⚡ Quick Parse: null (سيذهب لـ Gemini)');
      }

    } catch (error) {
      console.log(`❌ خطأ في الاختبار: ${error.message}`);
    }

    console.log('─'.repeat(60));
  }

  console.log('🎉 انتهى اختبار تحسينات نظام الأسعار!');
}

testPricingImprovements().catch(console.error);
