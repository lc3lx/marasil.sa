// اختبار سريع لـ Quick Parse
const { quickKeywordParse } = require("./services/geminiService");

console.log("🔧 اختبار Quick Parse...\n");

const testMessages = [
  "كيفك",
  "هاي",
  "السلام عليكم",
  "مين انت",
  "بتحكي عربي",
  "فيك تساعدني في شحناتي"
];

testMessages.forEach(msg => {
  console.log(`\n📝 اختبار: "${msg}"`);
  const result = quickKeywordParse(msg);
  console.log(`📋 النتيجة:`, result);
});
