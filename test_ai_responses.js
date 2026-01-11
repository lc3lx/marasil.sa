// اختبار استجابات الـ AI
require('dotenv').config();

const { sendToGemini } = require('./services/geminiService');

// اختبار الـ quick parsing فقط
const { quickKeywordParse } = require('./services/geminiService');

async function testAI() {
  console.log('🧪 اختبار Quick Parsing...\n');

  const testMessages = [
    "مرحبا",
    "كيف حالك",
    "تتبع الشحنة رقم 123456",
    "أريد إنشاء شحنة جديدة",
    "كم رصيدي",
    "عرض شحناتي",
    "ألغِ الشحنة رقم 789",
    "ما هي خدماتكم",
    "شكراً لك",
    "track shipment 987654",
    "create new shipment",
    "what is my balance",
    "show my shipments",
    "cancel shipment 321"
  ];

  for (const message of testMessages) {
    console.log(`\n📝 اختبار: "${message}"`);
    try {
      const quickResult = quickKeywordParse(message);
      if (quickResult) {
        console.log(`⚡ Quick Parse: ${JSON.stringify(quickResult, null, 2)}`);
      } else {
        console.log(`🤖 Using Gemini...`);
        const response = await sendToGemini(message);
        console.log(`✅ Gemini رد: ${JSON.stringify(response, null, 2)}`);
      }
    } catch (error) {
      console.log(`❌ خطأ: ${error.message}`);
    }
  }
}

testAI();
