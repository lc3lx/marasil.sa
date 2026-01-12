// اختبار الاستجابات باللهجة السعودية
const { quickKeywordParse } = require('./services/geminiService');

console.log('🕌 اختبار الاستجابات باللهجة السعودية...\n');

const testCases = [
  // تحيات
  { input: "مرحبا", expectContains: "أهلاً وسهلاً فيك" },
  { input: "كيفك", expectContains: "أهلاً وسهلاً فيك" },
  { input: "هاي", expectContains: "أهلاً وسهلاً فيك" },

  // أسئلة عن الشركة
  { input: "ما هي مراسيل", expectContains: "منصة الشحن الذكية في السعودية" },
  { input: "عن الشركة", expectContains: "رؤيتنا" },

  // شركات الشحن
  { input: "ما هي شركات الشحن", expectContains: "ARAMEX - الأسرع" },
  { input: "شركات متوفرة", expectContains: "نختار لك الأحسن" },

  // الخدمات
  { input: "ما هي خدماتكم", expectContains: "راح تحبها" },
  { input: "مميزاتكم", expectContains: "سهلة وبسيطة زي الماء" },

  // الأسعار
  { input: "كم التكلفة", expectContains: "تنافسية وواضحة" },
  { input: "كم سعر الشحن", expectContains: "حساب التكلفة التلقائي" },

  // شكر
  { input: "شكراً لك", expectContains: "العفو ياعمري" },
  { input: "thanks", expectContains: "يسعدني أساعدك" },
];

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const result = quickKeywordParse(test.input);
  const response = result && result.message ? result.message : '';

  if (response.includes(test.expectContains)) {
    console.log(`✅ Test ${index + 1}: "${test.input}" → اللهجة السعودية`);
    passed++;
  } else {
    console.log(`❌ Test ${index + 1}: "${test.input}"`);
    console.log(`   Expected to contain: "${test.expectContains}"`);
    console.log(`   Response preview: ${response.substring(0, 50)}...`);
    failed++;
  }
});

console.log(`\n📊 Saudi Dialect Test Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All Saudi dialect responses working perfectly!');
  console.log('🇸🇦 AI now speaks Saudi Arabic fluently!');
} else {
  console.log('⚠️  Some tests failed. Check the Saudi dialect logic.');
}
