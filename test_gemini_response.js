// اختبار استجابة Gemini للتأكد من عدم إرجاع undefined
console.log('🧪 اختبار استجابة sendToGemini...\n');

const geminiService = require('./services/geminiService');

// بيانات اختبار
const testUserInfo = {
  firstName: "أحمد",
  lastName: "محمد",
  email: "ahmed@test.com"
};

const testCases = [
  {
    name: "ترحيب - يجب أن يعمل مع Quick Parse",
    message: "كيفك",
    expectedIntent: "CHAT"
  },
  {
    name: "تتبع شحنة - يجب أن يعمل مع Quick Parse",
    message: "تتبع شحنتي رقم 123456",
    expectedIntent: "TRACK"
  },
  {
    name: "رسالة عشوائية - قد تذهب لـ Gemini",
    message: "ما هو أفضل وقت للشحن؟",
    expectedIntent: "CHAT"
  }
];

async function testGeminiResponse() {
  for (const testCase of testCases) {
    console.log(`📋 اختبار: ${testCase.name}`);
    console.log(`💬 الرسالة: "${testCase.message}"`);

    try {
      const response = await geminiService.sendToGemini(
        testCase.message,
        "سياق سابق للاختبار",
        "test_user_id",
        testUserInfo
      );

      console.log(`✅ الاستجابة:`, JSON.stringify(response, null, 2));

      if (!response) {
        console.log(`❌ خطأ: الاستجابة undefined`);
        continue;
      }

      if (typeof response !== 'object') {
        console.log(`❌ خطأ: الاستجابة ليست كائن`);
        continue;
      }

      if (!response.intent) {
        console.log(`❌ خطأ: لا يوجد intent في الاستجابة`);
        continue;
      }

      if (response.intent === testCase.expectedIntent) {
        console.log(`🎯 Intent صحيح: ${response.intent}`);
      } else {
        console.log(`⚠️ Intent مختلف: متوقع ${testCase.expectedIntent}, حصلت ${response.intent}`);
      }

      if (!response.message) {
        console.log(`❌ خطأ: لا يوجد message في الاستجابة`);
        continue;
      }

      console.log(`💬 الرسالة: "${response.message.substring(0, 50)}..."`);

    } catch (error) {
      console.log(`❌ خطأ في الاختبار: ${error.message}`);
    }

    console.log('─'.repeat(60));
  }

  console.log('🎉 انتهى الاختبار!');
}

// تشغيل الاختبار
testGeminiResponse().catch(console.error);
