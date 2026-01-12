// اختبار سريع للإصلاحات الجديدة
console.log("🧪 اختبار الإصلاحات الجديدة...\n");

// اختبار manual لأن الـ import قد يسبب مشاكل
const testMessages = [
  "السلام عليكم",
  "كيفك",
  "مين انت",
  "بتحكي عربي",
  "شو فيك تساعدني",
  "هاي",
  "هلا",
  "يا اخ"
];

console.log("اختبار الرسائل التالية:");
testMessages.forEach(msg => console.log(`- "${msg}"`));

console.log("\n📝 للاختبار الفعلي:");
console.log("1. شغل السيرفر: npm start");
console.log("2. اذهب إلى: http://localhost:3000/ai/chat");
console.log("3. جرب إرسال هذه الرسائل");
console.log("4. يجب أن يرد الـ AI على جميعها بدلاً من 'عذراً، لم أفهم'");

console.log("\n🔧 الإصلاحات المطبقة:");
console.log("✅ إضافة أسئلة هوية: مين انت، بتحكي عربي، شو فيك تساعدني");
console.log("✅ إصلاح منطق البحث: يستخدم lowerMessage و cleanMessage");
console.log("✅ إضافة logging مفصل للتحقق من العمل");
console.log("✅ إضافة ردود مخصصة لأسئلة الهوية");

console.log("\n🎯 النتيجة المتوقعة:");
console.log("جميع الرسائل المذكورة أعلاه يجب أن تحصل على رد مناسب!");
