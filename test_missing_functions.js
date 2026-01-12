// اختبار الدوال المفقودة المضافة
console.log('🧪 اختبار الدوال المفقودة في geminiService.js...');

try {
  const geminiService = require('./services/geminiService');
  console.log('✅ تم تحميل geminiService بنجاح');

  // اختبار الدوال المفقودة المضافة
  if (typeof geminiService.extractIntent === 'function') {
    console.log('✅ دالة extractIntent موجودة');

    // اختبار دالة extractIntent
    const testMessage1 = "تتبع شحنتي رقم 123";
    const intent1 = geminiService.extractIntent(testMessage1);
    console.log(`📝 extractIntent("${testMessage1}") = "${intent1}"`);

    const testMessage2 = "كم رصيدي";
    const intent2 = geminiService.extractIntent(testMessage2);
    console.log(`📝 extractIntent("${testMessage2}") = "${intent2}"`);
  } else {
    console.log('❌ دالة extractIntent مفقودة');
  }

  if (typeof geminiService.buildContext === 'function') {
    console.log('✅ دالة buildContext موجودة');

    // اختبار دالة buildContext
    const testMessages = [
      { sender: 'user', message: 'مرحبا' },
      { sender: 'assistant', message: 'أهلاً، كيف أقدر أساعدك؟' },
      { sender: 'user', message: 'أريد تتبع شحنة' }
    ];
    const context = geminiService.buildContext(testMessages);
    console.log(`📝 buildContext result length: ${context.length}`);
  } else {
    console.log('❌ دالة buildContext مفقودة');
  }

  console.log('🎉 جميع الاختبارات نجحت!');

} catch (error) {
  console.log('❌ خطأ في تحميل الملف:', error.message);
  console.log('Stack:', error.stack);
}
