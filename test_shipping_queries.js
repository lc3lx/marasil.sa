// اختبار تحسينات أسئلة الشحن والأسعار
console.log('🧪 اختبار تحسينات أسئلة الشحن والأسعار...\n');

const geminiService = require('./services/geminiService');

const testUserInfo = { firstName: "أحمد" };

const testCases = [
  {
    name: "سؤال عن شركات الشحن بالعامية",
    message: "زبط هدول كمان شو في شركات شحن",
    expectedIntent: "CHAT",
    expectedContains: "مراسيل هي منصة"
  },
  {
    name: "سؤال عن الأسعار بالعامية",
    message: "شو اسعار شركات الشحن عندكم",
    expectedIntent: "CHAT",
    expectedContains: "لحساب التكلفة"
  },
  {
    name: "نوع شحنة - استمرارية للأسعار",
    message: "شحن عادي",
    context: "عندنا عدة شركات شحن موثوقة: سمسا (اقتصادي وبرو)، أرامكس برو، ريد بوكس، ولما بوكس. كل شركة لها مميزاتها حسب نوع الشحنة. أي نوع شحنة عندك؟",
    expectedIntent: "CHAT",
    expectedContains: "للشحن شحن عادي"
  },
  {
    name: "أسئلة الأسعار المختلفة",
    message: "شو اسعار الشركات طيب",
    expectedIntent: "CHAT",
    expectedContains: "لحساب التكلفة"
  },
  {
    name: "شحن سريع",
    message: "شحن سريع",
    context: "أي نوع شحنة عندك؟",
    expectedIntent: "CHAT",
    expectedContains: "للشحن شحن سريع"
  },
  {
    name: "شحن برو",
    message: "شحن برو",
    context: "كل شركة لها مميزاتها حسب نوع الشحنة",
    expectedIntent: "CHAT",
    expectedContains: "للشحن شحن برو"
  }
];

async function testShippingQueries() {
  for (const testCase of testCases) {
    console.log(`📋 اختبار: ${testCase.name}`);
    console.log(`💬 الرسالة: "${testCase.message}"`);

    if (testCase.context) {
      console.log(`📝 السياق: "${testCase.context.substring(0, 100)}..."`);
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

  console.log('🎉 انتهى اختبار أسئلة الشحن!');
}

testShippingQueries().catch(console.error);
