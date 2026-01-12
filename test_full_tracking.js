// اختبار شامل لتتبع الشحنات
console.log('🧪 اختبار شامل لتتبع الشحنات...\n');

const geminiService = require('./services/geminiService');

// بيانات اختبار
const mockUserInfo = { firstName: "أحمد" };

const testCases = [
  {
    name: "رقم مستقل",
    message: "50724610926",
    expectedIntent: "TRACK",
    expectedData: { tracking_number: "50724610926" }
  },
  {
    name: "هاي الرقم (يجب ألا يُعامل كتحية)",
    message: "هاي الرقم 50724610926",
    expectedIntent: "TRACK",
    expectedData: { tracking_number: "50724610926" }
  },
  {
    name: "هاي فقط (يجب أن يكون تحية)",
    message: "هاي",
    expectedIntent: "CHAT"
  },
  {
    name: "هاي مع سياق آخر",
    message: "هاي كيفك",
    expectedIntent: "CHAT"
  },
  {
    name: "رقم مع كلمة رقم",
    message: "رقم 50724610926",
    expectedIntent: "TRACK",
    expectedData: { tracking_number: "50724610926" }
  },
  {
    name: "اتبع شحنة مع رقم",
    message: "اتبع شحنتي 50724610926",
    expectedIntent: "TRACK",
    expectedData: { tracking_number: "50724610926" }
  }
];

async function testFullTracking() {
  console.log('🔍 اختبار Quick Parse...\n');

  for (const testCase of testCases) {
    console.log(`📋 اختبار: ${testCase.name}`);
    console.log(`💬 الرسالة: "${testCase.message}"`);

    try {
      const result = geminiService.quickKeywordParse(testCase.message, mockUserInfo);

      if (result) {
        console.log(`✅ Quick Parse: ${result.intent} (confidence: ${result.confidence})`);

        if (result.intent === testCase.expectedIntent) {
          console.log(`🎯 Intent صحيح!`);
        } else {
          console.log(`❌ Intent خاطئ - متوقع: ${testCase.expectedIntent}, حصلت: ${result.intent}`);
        }

        if (testCase.expectedData) {
          const hasExpectedData = JSON.stringify(result.data) === JSON.stringify(testCase.expectedData);
          if (hasExpectedData) {
            console.log(`✅ البيانات صحيحة:`, result.data);
          } else {
            console.log(`❌ البيانات خاطئة - متوقع:`, testCase.expectedData, `حصلت:`, result.data);
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

  console.log('🎉 انتهى اختبار Quick Parse!\n');
}

testFullTracking().catch(console.error);
