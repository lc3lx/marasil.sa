// اختبار إصلاحات تتبع الشحنات
console.log('🧪 اختبار إصلاحات تتبع الشحنات...\n');

const geminiService = require('./services/geminiService');

// بيانات اختبار
const mockUserInfo = { firstName: "أحمد" };
const mockContext = "المستخدم سأل عن شحناته من قبل";

const testCases = [
  {
    name: "تتبع شحنة بالعامية السعودية",
    message: "شو الحل بدي اتبع شحنة",
    expectedIntent: "TRACK",
    expectedHasMissing: true
  },
  {
    name: "تتبع شحنة مع رقم",
    message: "تابع شحنتي رقم 123456",
    expectedIntent: "TRACK",
    expectedHasMissing: false
  },
  {
    name: "سؤال استمراري - وينها",
    message: "وينها",
    context: "المستخدم طلب قائمة الشحنات",
    expectedIntent: "LIST"
  },
  {
    name: "سؤال استمراري بدون سياق",
    message: "وينها",
    context: "سياق عام",
    expectedIntent: "CHAT"
  },
  {
    name: "قائمة شحنات بالعامية",
    message: "وريني شحناتي كلها",
    expectedIntent: "LIST"
  },
  {
    name: "سؤال عن حالة شحنة",
    message: "كيف حالة شحنتي",
    expectedIntent: "TRACK",
    expectedHasMissing: true
  }
];

async function testTrackingFixes() {
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

  console.log('🎉 انتهى اختبار إصلاحات التتبع!');
}

// تشغيل الاختبار
testTrackingFixes().catch(console.error);
