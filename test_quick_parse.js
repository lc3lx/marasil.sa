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
