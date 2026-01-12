// اختبار أسئلة الرصيد
const { quickKeywordParse } = require("./services/geminiService");

console.log("💰 اختبار أسئلة الرصيد...\n");

const balanceQuestions = [
  "كم رصيدي",
  "رصيدي كم",
  "فلوسي كم",
  "رصيد محفظتي",
  "رصيد محفظتك",
  "كم معي رصيد بالمحفظة",
  "رصيد المحفظة كم",
  "كم رصيد محفظتي"
];

balanceQuestions.forEach(question => {
  console.log(`\n❓ "${question}"`);
  const result = quickKeywordParse(question);
  if (result && result.action === "GET_WALLET_BALANCE") {
    console.log(`✅ نجح: ${result.action}`);
  } else {
    console.log(`❌ فشل: ${result ? result.action : 'null'}`);
  }
});

console.log("\n✅ انتهى الاختبار");
