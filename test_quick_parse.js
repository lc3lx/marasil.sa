// اختبار Quick Parse فقط
const { quickKeywordParse } = require('./services/geminiService');

console.log('🧪 اختبار Quick Parse...\n');

const testCases = [
  // تتبع شحنة
  { input: "تتبع الشحنة رقم 123456", expected: "TRACK_SHIPMENT" },
  { input: "track shipment 987654", expected: "TRACK_SHIPMENT" },
  { input: "أريد تتبع الشحنة 111222", expected: "TRACK_SHIPMENT" },

  // إنشاء شحنة
  { input: "أريد إنشاء شحنة جديدة", expected: "CREATE_SHIPMENT" },
  { input: "create new shipment", expected: "CREATE_SHIPMENT" },
  { input: "أحتاج شحنة جديدة", expected: "CREATE_SHIPMENT" },

  // رصيد المحفظة
  { input: "كم رصيدي", expected: "GET_WALLET_BALANCE" },
  { input: "what is my balance", expected: "GET_WALLET_BALANCE" },
  { input: "رصيد المحفظة", expected: "GET_WALLET_BALANCE" },

  // قائمة الشحنات
  { input: "عرض شحناتي", expected: "LIST_SHIPMENTS" },
  { input: "show my shipments", expected: "LIST_SHIPMENTS" },
  { input: "قائمة الشحنات", expected: "LIST_SHIPMENTS" },

  // إلغاء شحنة
  { input: "ألغِ الشحنة رقم 789", expected: "CANCEL_SHIPMENT" },
  { input: "cancel shipment 456", expected: "CANCEL_SHIPMENT" },

  // تحيات
  { input: "مرحبا", expected: "CHAT_RESPONSE" },
  { input: "hello", expected: "CHAT_RESPONSE" },
  { input: "كيف حالك", expected: "CHAT_RESPONSE" },

  // شكر
  { input: "شكراً لك", expected: "CHAT_RESPONSE" },
  { input: "thanks", expected: "CHAT_RESPONSE" },

  // أسئلة عن الشركة
  { input: "ما هي مراسيل", expected: "CHAT_RESPONSE" },
  { input: "عن الشركة", expected: "CHAT_RESPONSE" },
  { input: "who is marasil", expected: "CHAT_RESPONSE" },

  // أسئلة عن شركات الشحن
  { input: "ما هي شركات الشحن المتوفرة", expected: "CHAT_RESPONSE" },
  { input: "shipping companies", expected: "CHAT_RESPONSE" },

  // أسئلة عن الخدمات
  { input: "ما هي خدماتكم", expected: "CHAT_RESPONSE" },
  { input: "what services do you offer", expected: "CHAT_RESPONSE" },

  // أسئلة عن الأسعار
  { input: "كم تكلفة الشحن", expected: "CHAT_RESPONSE" },
  { input: "what are your prices", expected: "CHAT_RESPONSE" },

  // أسئلة عن التتبع
  { input: "كيف أتتبع شحنتي", expected: "CHAT_RESPONSE" },
  { input: "how to track", expected: "CHAT_RESPONSE" },

  // أسئلة عن الدعم
  { input: "أحتاج مساعدة", expected: "CHAT_RESPONSE" },
  { input: "I need support", expected: "CHAT_RESPONSE" },

  // أسئلة عن التسجيل
  { input: "كيف أسجل حساب", expected: "CHAT_RESPONSE" },
  { input: "how to register", expected: "CHAT_RESPONSE" },

  // أسئلة عن المناطق
  { input: "أين تشحنون", expected: "CHAT_RESPONSE" },
  { input: "what areas do you cover", expected: "CHAT_RESPONSE" },

  // أسئلة عن الأمان
  { input: "هل شحنتي آمنة", expected: "CHAT_RESPONSE" },
  { input: "is shipping safe", expected: "CHAT_RESPONSE" },

  // أسئلة عن العروض
  { input: "ما هي العروض الحالية", expected: "CHAT_RESPONSE" },
  { input: "current offers", expected: "CHAT_RESPONSE" },

  // أسئلة عن التطبيق
  { input: "هل لديكم تطبيق", expected: "CHAT_RESPONSE" },
  { input: "do you have an app", expected: "CHAT_RESPONSE" },

  // أسئلة عن أوقات التوصيل
  { input: "كم يستغرق التوصيل", expected: "CHAT_RESPONSE" },
  { input: "delivery time", expected: "CHAT_RESPONSE" },

  // أسئلة عن الإلغاء
  { input: "كيف ألغي الشحنة", expected: "CHAT_RESPONSE" },
  { input: "how to cancel", expected: "CHAT_RESPONSE" },

  // غير معروف (يجب أن يرجع null)
  { input: "ما هو الطقس اليوم", expected: null },
  { input: "random text", expected: null },
];

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const result = quickKeywordParse(test.input);
  const actual = result ? result.action : null;

  if (actual === test.expected) {
    console.log(`✅ Test ${index + 1}: "${test.input}" → ${actual}`);
    passed++;
  } else {
    console.log(`❌ Test ${index + 1}: "${test.input}"`);
    console.log(`   Expected: ${test.expected}`);
    console.log(`   Actual: ${actual}`);
    failed++;
  }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All tests passed!');
} else {
  console.log('⚠️  Some tests failed. Check the logic.');
}
