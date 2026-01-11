// اختبار سريع لـ Gemini API
require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  console.log('🧪 اختبار Gemini API...\n');

  // التحقق من وجود المفتاح
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY غير موجود في ملف .env');
    console.log('📝 يرجى إضافة: GEMINI_API_KEY=your_api_key_here');
    return;
  }

  console.log('✅ GEMINI_API_KEY موجود');

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    console.log('🔄 جاري إرسال طلب اختبار...');

    const result = await model.generateContent('قل مرحبا بالعربية فقط');
    const response = await result.response;
    const text = response.text();

    console.log('✅ نجح الاتصال!');
    console.log('📝 رد Gemini:', text);

  } catch (error) {
    console.error('❌ فشل الاتصال:', error.message);

    if (error.message.includes('API_KEY')) {
      console.log('💡 تأكد من صحة مفتاح API');
    } else if (error.message.includes('model')) {
      console.log('💡 جرب نموذج آخر أو تحقق من توفر النموذج');
    } else {
      console.log('💡 تحقق من اتصال الإنترنت وحاول مرة أخرى');
    }
  }
}

testGemini();
