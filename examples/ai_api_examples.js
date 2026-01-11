/**
 * أمثلة على استخدام AI Assistant API
 * يمكن تشغيل هذه الأمثلة بـ Node.js أو استخدامها في Postman
 */

const axios = require('axios');

// إعدادات API
const API_BASE_URL = 'http://localhost:5000/api';
const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // استبدل بالتوكن الحقيقي
const USER_ID = 'YOUR_USER_ID_HERE'; // استبدل بمعرف المستخدم الحقيقي

// Headers للمصادقة
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${JWT_TOKEN}`
};

/**
 * مثال 1: التحقق من رصيد المحفظة
 */
async function checkWalletBalance() {
  try {
    const response = await axios.post(`${API_BASE_URL}/ai/chat`, {
      message: "كم رصيدي",
      user_id: USER_ID,
      session_id: "example_session_1"
    }, { headers });

    console.log('✅ رد رصيد المحفظة:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ خطأ في رصيد المحفظة:', error.response?.data || error.message);
  }
}

/**
 * مثال 2: إنشاء شحنة جديدة
 */
async function createNewShipment() {
  try {
    const response = await axios.post(`${API_BASE_URL}/ai/chat`, {
      message: "أريد إنشاء شحنة إلى الرياض وزن 2 كيلو",
      user_id: USER_ID,
      session_id: "example_session_2"
    }, { headers });

    console.log('✅ رد إنشاء الشحنة:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ خطأ في إنشاء الشحنة:', error.response?.data || error.message);
  }
}

/**
 * مثال 3: تتبع شحنة
 */
async function trackShipment() {
  try {
    const response = await axios.post(`${API_BASE_URL}/ai/chat`, {
      message: "تتبع الشحنة رقم MRSL123456",
      user_id: USER_ID,
      session_id: "example_session_3"
    }, { headers });

    console.log('✅ رد تتبع الشحنة:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ خطأ في تتبع الشحنة:', error.response?.data || error.message);
  }
}

/**
 * مثال 4: عرض قائمة الشحنات
 */
async function listShipments() {
  try {
    const response = await axios.post(`${API_BASE_URL}/ai/chat`, {
      message: "عرض شحناتي",
      user_id: USER_ID,
      session_id: "example_session_4"
    }, { headers });

    console.log('✅ رد قائمة الشحنات:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ خطأ في قائمة الشحنات:', error.response?.data || error.message);
  }
}

/**
 * مثال 5: إلغاء شحنة
 */
async function cancelShipment() {
  try {
    const response = await axios.post(`${API_BASE_URL}/ai/chat`, {
      message: "ألغِ الشحنة رقم 60d5ecb74bb2c72b8c8b4567",
      user_id: USER_ID,
      session_id: "example_session_5"
    }, { headers });

    console.log('✅ رد إلغاء الشحنة:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ خطأ في إلغاء الشحنة:', error.response?.data || error.message);
  }
}

/**
 * مثال 6: الحصول على تاريخ المحادثة
 */
async function getConversationHistory() {
  try {
    const response = await axios.get(`${API_BASE_URL}/ai/conversation/${USER_ID}?limit=10`, {
      headers
    });

    console.log('✅ تاريخ المحادثة:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ خطأ في تاريخ المحادثة:', error.response?.data || error.message);
  }
}

/**
 * مثال 7: الحصول على إحصائيات المحادثات
 */
async function getConversationStats() {
  try {
    const response = await axios.get(`${API_BASE_URL}/ai/stats/${USER_ID}`, {
      headers
    });

    console.log('✅ إحصائيات المحادثات:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ خطأ في إحصائيات المحادثات:', error.response?.data || error.message);
  }
}

/**
 * مثال 8: ردود مختلفة من Gemini
 */
async function testDifferentResponses() {
  const testMessages = [
    "مرحبا",
    "كيف حالك",
    "ما هي الخدمات المتاحة",
    "أريد مساعدة",
    "شكراً لك",
    "مع السلامة"
  ];

  for (const message of testMessages) {
    try {
      console.log(`\n🧪 اختبار الرسالة: "${message}"`);
      const response = await axios.post(`${API_BASE_URL}/ai/chat`, {
        message: message,
        user_id: USER_ID,
        session_id: "test_responses"
      }, { headers });

      console.log(`✅ الرد: ${response.data.message}`);
      console.log(`📊 العملية: ${response.data.action}`);

      // انتظار قليل بين الطلبات
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ خطأ في الرسالة "${message}":`, error.response?.data?.message || error.message);
    }
  }
}

// تشغيل الأمثلة
async function runExamples() {
  console.log('🚀 بدء اختبار AI Assistant API...\n');

  try {
    // اختبارات أساسية
    console.log('💰 اختبار رصيد المحفظة:');
    await checkWalletBalance();

    console.log('\n📦 اختبار إنشاء شحنة:');
    await createNewShipment();

    console.log('\n🔍 اختبار تتبع شحنة:');
    await trackShipment();

    console.log('\n📋 اختبار قائمة الشحنات:');
    await listShipments();

    console.log('\n🚫 اختبار إلغاء شحنة:');
    await cancelShipment();

    console.log('\n📖 اختبار تاريخ المحادثة:');
    await getConversationHistory();

    console.log('\n📊 اختبار إحصائيات المحادثات:');
    await getConversationStats();

    console.log('\n🧪 اختبار ردود مختلفة:');
    await testDifferentResponses();

  } catch (error) {
    console.error('❌ خطأ عام في الاختبارات:', error.message);
  }

  console.log('\n✅ انتهى الاختبار!');
}

// تشغيل الأمثلة إذا تم استدعاء الملف مباشرة
if (require.main === module) {
  runExamples();
}

module.exports = {
  checkWalletBalance,
  createNewShipment,
  trackShipment,
  listShipments,
  cancelShipment,
  getConversationHistory,
  getConversationStats,
  testDifferentResponses,
  runExamples
};
