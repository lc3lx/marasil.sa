// اختبار استجابات الـ AI
require('dotenv').config();

const { sendToGemini } = require('./services/geminiService');

async function testAI() {
  console.log('🧪 اختبار استجابات الـ AI...\n');

  const testMessages = [
    "مرحبا",
    "كيف حالك",
    "تتبع الشحنة رقم 123456",
    "أريد إنشاء شحنة جديدة",
    "كم رصيدي",
    "عرض شحناتي",
    "ألغِ الشحنة رقم 789",
    "ما هي خدماتكم",
    "شكراً لك"
  ];

  for (const message of testMessages) {
    console.log(`\n📝 اختبار: "${message}"`);
    try {
      const response = await sendToGemini(message);
      console.log(`✅ رد: ${JSON.stringify(response, null, 2)}`);
    } catch (error) {
      console.log(`❌ خطأ: ${error.message}`);
    }
  }
}

testAI();
