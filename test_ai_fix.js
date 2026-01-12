/**
 * اختبار سريع للذكاء الاصطناعي بعد الإصلاحات
 */

// استيراد الخدمات
const geminiService = require("./services/geminiService");

async function testAI() {
  console.log("🤖 بدء اختبار الذكاء الاصطناعي...\n");

  // بيانات المستخدم للاختبار
  const userInfo = {
    firstName: "أحمد",
    lastName: "محمد",
    email: "ahmed@example.com",
    phone: "+966501234567",
  };

  // اختبارات مختلفة
  const testCases = [
    { message: "كيفك", description: "تحية كيفك" },
    { message: "بدي مساعدة", description: "طلب مساعدة" },
    { message: "بدي اتبع شحنتي 50724610926", description: "تتبع شحنة" },
    { message: "كيف أنشئ شحنة جديدة؟", description: "سؤال تعليمي" },
    { message: "ما هي خدماتكم؟", description: "أسئلة عن الخدمات" },
    { message: "كم رصيدي", description: "استعلام الرصيد" },
  ];

  for (const testCase of testCases) {
    console.log(`📝 اختبار: ${testCase.description}`);
    console.log(`💬 رسالة: "${testCase.message}"`);

    try {
      // اختبار quickKeywordParse
      console.log("⚡ اختبار Quick Parse...");
      const quickResult = geminiService.quickKeywordParse(
        testCase.message,
        userInfo
      );
      console.log("✅ Quick Result:", JSON.stringify(quickResult, null, 2));

      if (quickResult) {
        console.log("🎯 تم التعرف عليها بواسطة Quick Parse");
      } else {
        console.log("🤔 لم يتم التعرف عليها، ستذهب إلى Gemini");
      }
    } catch (error) {
      console.error("❌ خطأ في Quick Parse:", error.message);
    }

    console.log("─".repeat(50));
  }

  console.log("\n✅ انتهى الاختبار!");
}

// تشغيل الاختبار
testAI().catch(console.error);
