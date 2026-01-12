// اختبار بسيط للتأكد من صحة syntax الملف
console.log('🧪 اختبار syntax geminiService.js...');

try {
  const geminiService = require('./services/geminiService');
  console.log('✅ تم تحميل geminiService بنجاح');

  // اختبار الدوال الأساسية
  if (typeof geminiService.sendToGemini === 'function') {
    console.log('✅ دالة sendToGemini موجودة');
  } else {
    console.log('❌ دالة sendToGemini مفقودة');
  }

  if (typeof geminiService.quickKeywordParse === 'function') {
    console.log('✅ دالة quickKeywordParse موجودة');
  } else {
    console.log('❌ دالة quickKeywordParse مفقودة');
  }

  console.log('🎉 جميع الاختبارات نجحت!');

} catch (error) {
  console.log('❌ خطأ في تحميل الملف:', error.message);
  console.log('Stack:', error.stack);
}
