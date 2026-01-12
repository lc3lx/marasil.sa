// اختبار تحسينات فهم السياق والاستمرارية
console.log('🧪 اختبار تحسينات فهم السياق والاستمرارية...\n');

const geminiService = require('./services/geminiService');

const testUserInfo = { firstName: "أحمد" };

const testCases = [
  {
    name: "استمرارية بعد تتبع شحنة",
    message: "جبتها",
    context: "الحالة الحالية: المستخدم طلب تتبع شحنة وينتظر النتيجة - عندما يقول 'جبتها' أو 'وريني' يقصد عرض بيانات الشحنة",
    expectedIntent: "TRACK",
    expectedData: { tracking_number: undefined } // سيبحث في السياق
  },
  {
    name: "استمرارية بعد قائمة شحنات",
    message: "وريني",
    context: "الحالة الحالية: المستخدم طلب قائمة الشحنات وينتظر النتيجة",
    expectedIntent: "LIST"
  },
  {
    name: "استمرارية بعد رصيد",
    message: "شوفها",
    context: "الحالة الحالية: المستخدم طلب الرصيد وينتظر النتيجة",
    expectedIntent: "BALANCE"
  },
  {
    name: "استمرارية بدون سياق محدد",
    message: "جبتها",
    context: "سياق عام",
    expectedIntent: "CHAT"
  },
  {
    name: "أسئلة استمرارية مختلفة",
    message: "حصلت عليها",
    context: "الحالة الحالية: المستخدم طلب تتبع شحنة وينتظر النتيجة",
    expectedIntent: "TRACK"
  }
];

async function testContextImprovements() {
  for (const testCase of testCases) {
    console.log(`📋 اختبار: ${testCase.name}`);
    console.log(`💬 الرسالة: "${testCase.message}"`);
    console.log(`📝 السياق: "${testCase.context.substring(0, 100)}..."`);

    try {
      const result = geminiService.quickKeywordParse(testCase.message, testUserInfo);

      if (result) {
        console.log(`✅ Quick Parse: ${result.intent} (confidence: ${result.confidence})`);

        if (result.intent === testCase.expectedIntent) {
          console.log(`🎯 Intent صحيح!`);
        } else {
          console.log(`❌ Intent خاطئ - متوقع: ${testCase.expectedIntent}, حصلت: ${result.intent}`);
        }

        if (testCase.expectedData && testCase.expectedData.tracking_number !== undefined) {
          if (result.data && result.data.tracking_number) {
            console.log(`✅ رقم التتبع موجود: ${result.data.tracking_number}`);
          } else {
            console.log(`ℹ️ رقم التتبع لم يُحدد (سيتم البحث في السياق)`);
          }
        }

        console.log(`💬 الرد: "${result.message.substring(0, 80)}..."`);
      } else {
        console.log('⚡ Quick Parse: null (سيذهب لـ Gemini)');
      }

    } catch (error) {
      console.log(`❌ خطأ في الاختبار: ${error.message}`);
    }

    console.log('─'.repeat(60));
  }

  console.log('🎉 انتهى اختبار تحسينات السياق!');
}

testContextImprovements().catch(console.error);
