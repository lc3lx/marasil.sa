// اختبار التحيات فقط
const { quickKeywordParse } = require('./services/geminiService');

console.log('🗣️ اختبار التحيات...\n');

const greetingTests = [
  "مرحبا",
  "مرحباً",
  "أهلا",
  "أهلاً",
  "هاي",
  "هلا",
  "السلام عليكم",
  "كيفك",
  "كيف حالك",
  "صباح الخير",
  "مساء الخير",
  "أهلين",
  "أهلين وسهلين",
  "ياعمري",
  "ياخي",
  "hello",
  "hi",
  "كيف",
  "مساعدة",
  "help",
];

greetingTests.forEach(test => {
  console.log(`\n🗣️ اختبار: "${test}"`);
  try {
    const result = quickKeywordParse(test);
    if (result && result.action === "CHAT_RESPONSE") {
      console.log(`✅ نجح: رد ترحيب`);
    } else {
      console.log(`❌ فشل: ${result ? result.action : 'null'}`);
    }
  } catch (error) {
    console.log(`❌ خطأ: ${error.message}`);
  }
});

console.log('\n🎉 انتهى اختبار التحيات!');
