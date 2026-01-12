// اختبار الاستجابات الذكية الجديدة
const { quickKeywordParse } = require('./services/geminiService');

console.log('🧠 اختبار الاستجابات الذكية الجديدة...\n');

const testCases = [
  // ترحيب
  { input: "مرحبا", expectContains: "🌟 مرحباً بك في منصة مراسيل" },

  // معلومات الشركة
  { input: "ما هي مراسيل", expectContains: "🏢 **مراسيل** هي منصة الشحن الذكية" },
  { input: "عن الشركة", expectContains: "⭐ **رؤيتنا**" },

  // شركات الشحن
  { input: "ما هي شركات الشحن", expectContains: "🚛 **شركاء الشحن في منصة مراسيل**" },
  { input: "shipping companies", expectContains: "🏆 **ARAMEX**" },

  // الخدمات
  { input: "ما هي خدماتكم", expectContains: "🎯 **خدمات مراسيل المتميزة**" },
  { input: "features", expectContains: "📦 **إنشاء الشحنات**" },

  // الأسعار
  { input: "كم التكلفة", expectContains: "💰 **أسعار شحن مراسيل**" },
  { input: "what is the price", expectContains: "📏 **حساب التكلفة التلقائي**" },

  // التتبع
  { input: "كيف أتتبع", expectContains: "🔍 **كيف تتبع شحناتك في مراسيل**" },
  { input: "how to track", expectContains: "📱 **طرق التتبع**" },

  // الدعم
  { input: "أحتاج مساعدة", expectContains: "🛠️ **دعم مراسيل - نحن هنا لمساعدتك!**" },
  { input: "I have a problem", expectContains: "📞 **طرق التواصل**" },

  // التسجيل
  { input: "كيف أسجل", expectContains: "📝 **إنشاء حساب في مراسيل - سهل وبسيط!**" },
  { input: "how to register", expectContains: "🎁 **مزايا العضوية**" },

  // المناطق
  { input: "أين تشحنون", expectContains: "🗺️ **تغطية مراسيل الشاملة في السعودية**" },
  { input: "what areas", expectContains: "🏙️ **المدن الرئيسية**" },

  // الأمان
  { input: "هل آمن", expectContains: "🔒 **الأمان والضمان في مراسيل**" },
  { input: "is it safe", expectContains: "🛡️ **أمان البيانات**" },

  // العروض
  { input: "ما هي العروض", expectContains: "🎉 **عروض وخصومات مراسيل**" },
  { input: "current offers", expectContains: "🔥 **عروض شهر نوفمبر**" },

  // التطبيق
  { input: "هل لديكم تطبيق", expectContains: "📱 **تطبيق وموقع مراسيل**" },
  { input: "app download", expectContains: "🌐 **الموقع الإلكتروني**" },

  // أوقات التوصيل
  { input: "كم يستغرق التوصيل", expectContains: "⚡ **أوقات التوصيل في مراسيل**" },
  { input: "delivery time", expectContains: "🚀 **خدمة التوصيل السريع**" },

  // الإلغاء
  { input: "كيف ألغي", expectContains: "❌ **سياسة إلغاء الشحنات**" },
  { input: "how to cancel", expectContains: "⏰ **فترة الإلغاء المسموحة**" },

  // الشكر
  { input: "شكراً لك", expectContains: "🙏 **العفو! يسعدني مساعدتك**" },
  { input: "thanks", expectContains: "⭐ إذا كان لديك أي استفسار آخر" },
];

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const result = quickKeywordParse(test.input);
  const response = result && result.message ? result.message : '';

  if (response.includes(test.expectContains)) {
    console.log(`✅ Test ${index + 1}: "${test.input}"`);
    passed++;
  } else {
    console.log(`❌ Test ${index + 1}: "${test.input}"`);
    console.log(`   Expected to contain: "${test.expectContains}"`);
    console.log(`   Actual response length: ${response.length}`);
    failed++;
  }
});

console.log(`\n📊 Smart Responses Test Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All smart responses working perfectly!');
  console.log('🤖 AI Assistant is now fully intelligent and comprehensive!');
} else {
  console.log('⚠️  Some tests failed. Check the response logic.');
}
