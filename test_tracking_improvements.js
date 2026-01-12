// اختبار تحسينات تتبع الشحنات والاستمرارية
console.log('🧪 اختبار تحسينات تتبع الشحنات والاستمرارية...\n');

const geminiService = require('./services/geminiService');

const testUserInfo = { firstName: "أحمد" };

const testCases = [
  {
    name: "رقم تتبع مستقل",
    message: "50724610926",
    expectedIntent: "TRACK",
    expectedData: { tracking_number: "50724610926" }
  },
  {
    name: "رقم تتبع مع كلمات",
    message: "هاي رقم التتبع 50724610926",
    expectedIntent: "TRACK",
    expectedData: { tracking_number: "50724610926" }
  },
  {
    name: "سؤال استمراري بعد تتبع شحنة",
    message: "وينها",
    context: "الموضوع الحالي: تتبع شحنة محددة - المستخدم ينتظر معلومات عن شحنة مع رقم التتبع 50724610926",
    expectedIntent: "TRACK",
    expectedData: { tracking_number: "50724610926" }
  },
  {
    name: "سؤال استمراري بعد قائمة شحنات",
    message: "بعتلك ايه",
    context: "الموضوع الحالي: قائمة الشحنات - المستخدم يريد رؤية شحناته",
    expectedIntent: "LIST"
  },
  {
    name: "سؤال استمراري بدون سياق واضح",
    message: "وينها",
    context: "سياق عام",
    expectedIntent: "CHAT"
  },
  {
    name: "سؤال تتبع بالعامية",
    message: "زبط الوضع بدي اتبع شحنة",
    expectedIntent: "TRACK",
    expectedHasMissing: true
  },
  {
    name: "تتبع مع رقم",
    message: "اتبع شحنتي 50724610926",
    expectedIntent: "TRACK",
    expectedData: { tracking_number: "50724610926" }
  }
];

async function testTrackingImprovements() {
  for (const testCase of testCases) {
    console.log(`📋 اختبار: ${testCase.name}`);
    console.log(`💬 الرسالة: "${testCase.message}"`);

    try {
      const result = geminiService.quickKeywordParse(testCase.message, testUserInfo);

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

        if (testCase.expectedHasMissing !== undefined) {
          const hasMissing = result.missing_fields && result.missing_fields.length > 0;
          if (hasMissing === testCase.expectedHasMissing) {
            console.log(`✅ Missing fields: ${hasMissing ? 'نعم' : 'لا'} (صحيح)`);
          } else {
            console.log(`❌ Missing fields: ${hasMissing ? 'نعم' : 'لا'} (خطأ)`);
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

  console.log('🎉 انتهى اختبار تحسينات التتبع!');
}

// تشغيل الاختبار
testTrackingImprovements().catch(console.error);
