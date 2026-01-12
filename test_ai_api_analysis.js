/**
 * اختبار تحسينات الذكاء الاصطناعي في تحليل الـ APIs
 * Test file for AI API analysis enhancements
 */

const geminiService = require('./services/geminiService');

console.log('🧪 بدء اختبار تحسينات الذكاء الاصطناعي...\n');

// بيانات مستخدم وهمية للاختبار
const mockUserInfo = {
  firstName: "أحمد",
  lastName: "المحمد",
  email: "ahmed@test.com"
};

// اختبارات مختلفة للتحقق من فهم الذكاء
const testCases = [
  {
    name: "تتبع شحنة",
    message: "وين شحنتي رقم 50724610926",
    expectedIntent: "TRACK",
    expectedAPI: "trackShipment"
  },
  {
    name: "رصيد المحفظة",
    message: "كم فلوسي بالمحفظة",
    expectedIntent: "BALANCE",
    expectedAPI: "getBalance"
  },
  {
    name: "إنشاء شحنة",
    message: "أريد أشحن شيء لمحمد",
    expectedIntent: "CREATE",
    expectedAPI: null // يحتاج بيانات إضافية
  },
  {
    name: "معلومات الشركة",
    message: "ما هي مراسيل",
    expectedIntent: "CHAT",
    expectedAPI: null // رد دردشة
  },
  {
    name: "شركات الشحن",
    message: "أي شركات شحن متوفرة",
    expectedIntent: "CHAT",
    expectedAPI: null // رد دردشة
  },
  {
    name: "حساب الأسعار",
    message: "كم تكلفة شحنة 3 كيلو",
    expectedIntent: "CHAT",
    expectedAPI: null // رد دردشة
  },
  {
    name: "قائمة الشحنات",
    message: "شحناتي",
    expectedIntent: "LIST",
    expectedAPI: "getUserShipments"
  },
  {
    name: "إلغاء شحنة",
    message: "أريد ألغي شحنتي",
    expectedIntent: "CANCEL",
    expectedAPI: null // يحتاج معرف الشحنة
  },
  {
    name: "ترحيب",
    message: "السلام عليكم",
    expectedIntent: "CHAT",
    expectedAPI: null // رد ترحيب
  }
];

async function runTests() {
  console.log('🔍 اختبار Quick Parse...\n');

  for (const testCase of testCases) {
    console.log(`📋 اختبار: ${testCase.name}`);
    console.log(`💬 السؤال: "${testCase.message}"`);

    try {
      // اختبار Quick Parse
      const quickResult = geminiService.quickKeywordParse(testCase.message, mockUserInfo);

      if (quickResult) {
        console.log(`✅ Quick Parse: ${quickResult.intent} (confidence: ${quickResult.confidence})`);

        if (quickResult.intent === testCase.expectedIntent) {
          console.log(`🎯 Intent صحيح!`);
        } else {
          console.log(`❌ Intent خاطئ - متوقع: ${testCase.expectedIntent}, حصلت: ${quickResult.intent}`);
        }

        if (quickResult.api_call && testCase.expectedAPI) {
          if (quickResult.api_call.name === testCase.expectedAPI) {
            console.log(`🔧 API صحيح: ${quickResult.api_call.name}`);
          } else {
            console.log(`❌ API خاطئ - متوقع: ${testCase.expectedAPI}, حصلت: ${quickResult.api_call.name}`);
          }
        }
      } else {
        console.log('⚡ Quick Parse: null (سيذهب لـ Gemini)');
      }

    } catch (error) {
      console.log(`❌ خطأ في الاختبار: ${error.message}`);
    }

    console.log('─'.repeat(50));
  }

  console.log('\n🎉 انتهى اختبار Quick Parse!\n');

  // اختبار واحد مع Gemini (إذا كان متوفراً)
  console.log('🤖 اختبار مع Gemini (اختياري)...\n');

  try {
    const geminiTest = testCases[0]; // تتبع شحنة
    console.log(`📋 اختبار Gemini: ${geminiTest.message}`);

    // محاكاة context
    const mockContext = "المستخدم سأل سابقاً عن شحناته";

    const geminiResult = await geminiService.sendToGemini(
      geminiTest.message,
      mockContext,
      "test_user_id",
      mockUserInfo
    );

    console.log('✅ Gemini Response:', JSON.stringify(geminiResult, null, 2));

  } catch (error) {
    console.log(`⚠️  Gemini غير متوفر أو خطأ: ${error.message}`);
    console.log('هذا طبيعي إذا لم يكن GEMINI_API_KEY مُعد');
  }

  console.log('\n🏆 انتهى الاختبار الكامل!');
}

// تشغيل الاختبارات
runTests().catch(console.error);
