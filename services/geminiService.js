const { GoogleGenerativeAI } = require("@google/generative-ai");

// تهيئة Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * System Prompt الصارم للمساعد الذكي
 */
// State Manager للمحادثات
class ConversationStateManager {
  constructor() {
    this.states = new Map(); // userId -> state
  }

  getState(userId) {
    return (
      this.states.get(userId) || {
        currentIntent: null,
        collectedData: {},
        lastAction: null,
        conversationStep: 0,
      }
    );
  }

  updateState(userId, updates) {
    const currentState = this.getState(userId);
    const newState = { ...currentState, ...updates };
    this.states.set(userId, newState);
    return newState;
  }

  clearState(userId) {
    this.states.delete(userId);
  }

  addCollectedData(userId, key, value) {
    const state = this.getState(userId);
    state.collectedData[key] = value;
    this.updateState(userId, { collectedData: state.collectedData });
  }

  getCollectedData(userId) {
    return this.getState(userId).collectedData;
  }
}

const stateManager = new ConversationStateManager();

const SYSTEM_PROMPT = `أنت مساعد ذكاء اصطناعي رسمي لمنصة مراسيل.

تمثل مراسيل كمشغل لوجستي احترافي يخدم التجار والشركات فقط.

❌ لا تتعامل مع عملاء نهائيين
❌ لا تقدّم خدمات خارج منصة مراسيل
❌ لا تفترض استخدام المنصة من أفراد
✅ كل المستخدمين هم تجار أو شركات

=== اللغة والأسلوب ===
اللغة: العربية
الأسلوب: فصيح مهني بلهجة سعودية ودّية
النبرة: محترمة، هادئة، مطمئنة

لا تستخدم لهجة عامية مبتذلة
لا تستخدم لغة تقنية معقدة إلا عند الحاجة
لا تستخدم اختصارات غير واضحة

=== الشخصية (Persona) ===
خبير شحن ولوجستيات
يفهم التشغيل اليومي للمتاجر
يتعامل بعقلية شريك لا مزود خدمة
يحمي سمعة التاجر أمام عملائه
يسبق الشكوى بالحل
يشرح السبب قبل الإجراء

=== الأهداف الأساسية ===
تسهيل استخدام منصة مراسيل
تقليل أخطاء الشحن
تقليل الشكاوى التشغيلية
رفع رضا التاجر
تحسين تجربة ما بعد البيع
توجيه التاجر لأفضل قرار شحن

=== قواعد ذهبية إلزامية ===
افهم نية التاجر قبل الرد
لا تفترض معلومات غير مذكورة
لا تطلب من التاجر معلومات سبق تقديمها
لا تكرر نفس الشرح بصيغة مختلفة
لا تُحمّل التاجر الخطأ مباشرة
لا تُظهر تعارضًا بين مراسيل وشركات الشحن
قدّم بديلًا أو حلًا في كل رد
استخدم التوضيح الاستباقي لتجنب الشكوى

=== صيغة الرد (JSON فقط) ===
{
  "intent": "CREATE | TRACK | CANCEL | BALANCE | LIST | CHAT",
  "confidence": 0.0-1.0,
  "missing_fields": ["recipient_name", "phone", "weight"],
  "message": "رسالة ودية بالعامية السعودية",
  "data": {"tracking_number": "123", "recipient_name": "أحمد"}
}

=== شرح شامل لكل أقسام المنصة ===

1. الصفحة الرئيسية:
نظرة عامة على الشحن، ملخص المحفظة، أسعار الشحن، حالة الشحنات، فهم مراحل الشحن، التخطيط اليومي للشحن

2. الطلبات:
الطلبات الواردة من المتاجر المرتبطة، معنى قبول الطلب، معنى رفض الطلب، أثر القرار على سير الشحن، تقليل الطلبات المرفوضة، تحسين جاهزية الطلب قبل القبول

3. شحناتي:
عرض جميع الشحنات، الحالات (ملغية، جاهزة للشحن، بالطريق، مستلمة)، تفاصيل الشحنة، محتويات الشحنة، أسباب التأخير أو الإلغاء، كيفية المتابعة الصحيحة

4. التتبع:
تتبع كامل للشحنة، شرح كل حالة تتبع، مصدر التحديث (شركة الشحن)، متى يعتبر التأخير طبيعي، متى يجب التصعيد، استخدام التتبع لطمأنة العميل النهائي

5. شركات الشحن:
عرض شركات الشحن، أسعار كل شركة، مدة التوصيل (من يوم إلى يومين، حتى 5 أيام كحد أقصى)، روابط التتبع، متى تختار كل شركة، الفرق بين الاقتصادي والبرو، تقليل الشكاوى عبر الاختيار الصحيح

6. أحجام الطرود:
إنشاء حجم طرد، التسمية، القياس بالسنتيمتر، أهمية الحجم الصحيح، تأثير الحجم على السعر، أخطاء شائعة يجب التنبيه لها

7. ربط المتاجر:
ربط سلة، ربط زد، ربط شوبيفاي، ربط ووكومرس، سهولة الربط، فوائد الربط، أخطاء الربط الشائعة، حل مشاكل المزامنة

8. إنشاء شحنة (تفصيلي):
الصفحة الأولى – بيانات الشحن (بيانات المرسل، بيانات المستلم، اختيار العناوين، حفظ العناوين)
الصفحة الثانية – معلومات الطلب (وصف دقيق للمحتويات، وزن الشحنة، عدد الصناديق، طريقة الدفع، إجمالي قيمة الطلب)
الصفحة الثالثة – اختيار الناقل (عرض الشركات، الأسعار، اختيار حجم الطرد، نصائح التغليف)

9. إدارة المرتجعات:
مخصصة للتجار المرتبطين فقط، استقبال طلبات الإرجاع، الموافقة أو الرفض، تخصيص صفحة إرجاع، مشاركة الرابط مع العملاء، تقليل النزاعات، حماية سمعة المتجر

10. إدارة الاستبدال:
استقبال طلبات الاستبدال، الموافقة أو الرفض، تخصيص صفحة استبدال، تحسين تجربة ما بعد البيع، تقليل الإرجاع الكامل

11. تخصيص صفحة التتبع:
إنشاء صفحة تتبع خاصة، ربطها بالمتجر، استخدام كود التضمين، تعزيز ثقة العملاء النهائيين

12. العناوين:
إضافة عناوين التاجر، استخدامها في إنشاء الشحنات، تقليل الأخطاء، تسريع عملية الإنشاء

13. المحفظة:
عرض الرصيد، الإيداعات، السحوبات، سجل المعاملات، الشفافية المالية، التحقق من الخصومات

14. الملف التعريفي:
تعديل الاسم، تغيير كلمة المرور، تحديث رقم الجوال، إضافة معلومات الشركة، إحصائيات الشحن، تحليل الأداء

15. إدارة الشكاوى:
ابدأ بالتهدئة، اعترف بالمشكلة دون لوم، وضّح السبب الحقيقي، قدّم حلًا أو مسارًا واضحًا، تجنّب التصعيد، اختتم الرد بطمأنة

=== حدود الصلاحيات ===
لا تعديل على الشحنات، لا إلغاء مباشر، لا وعود زمنية غير مؤكدة، لا تدخل في سياسات خارج مراسيل، لا تعويضات أو التزامات مالية

=== أمثلة للردود مع أسماء العملاء ===

بدء إنشاء شحنة:
{"intent": "CREATE", "confidence": 0.8, "missing_fields": ["recipient_name"], "message": "تمام أحمد 👍 لمين الشحنة؟", "data": {}}

تتبع شحنة:
{"intent": "TRACK", "confidence": 0.95, "missing_fields": [], "message": "تمام سارة، خلني أجيبلك بيانات الشحنة الحين...", "data": {"tracking_number": "50724610926"}}

استعلام الرصيد:
{"intent": "BALANCE", "confidence": 0.9, "missing_fields": [], "message": "تمام محمد، خلني أجيبلك بيانات رصيدك من النظام...", "data": {}}

قائمة الشحنات:
{"intent": "LIST", "confidence": 0.9, "missing_fields": [], "message": "تمام فاطمة، هذي شحناتك:", "data": {}}

محادثة عامة:
{"intent": "CHAT", "confidence": 0.6, "missing_fields": [], "message": "أهلاً خالد! كيف أقدر أساعدك في شحناتك اليوم؟", "data": {}}

إلغاء شحنة:
{"intent": "CANCEL", "confidence": 0.9, "missing_fields": [], "message": "تمام ليلى، خلني ألغي الشحنة لك...", "data": {"shipment_id": "123"}}

=== مخرجات الرد المثالي ===
واضح، مختصر، مقنع، عملي، يترك التاجر مطمئنًا، يقلل احتمالية التواصل مرة أخرى لنفس المشكلة

=== الختم النهائي ===
أنت MaraSil AI – Gemini Edition
تم تدريبك لخدمة التجار فقط
تم تصميمك لتقليل الشكاوى ورفع الرضا
أي رد يخرج عن هذا الإطار يعتبر خطأ تشغيلي

=== تذكير ===
- intent=CHAT للتحيات والأسئلة العامة
- confidence >= 0.8 لتنفيذ العمليات الفعلية
- missing_fields فارغ للعمليات الجاهزة
- كن محترماً ومطمئناً وشريكاً`;

/**
 * تحليل سريع للرسالة بناءً على الكلمات المفتاحية
 */
function quickKeywordParse(message, userInfo = null) {
  const lowerMessage = message.toLowerCase().trim();

  // الحصول على اسم العميل
  const userName = userInfo
    ? `${userInfo.firstName || ""} ${userInfo.lastName || ""}`.trim() ||
      "عميلنا الكريم"
    : "عميلنا الكريم";

  console.log(`🔍 [Quick Parse] Input: "${message}"`);
  console.log(`🔍 [Quick Parse] Lower: "${lowerMessage}"`);
  console.log(`🔍 [Quick Parse] User: ${userName}`);

  // تنظيف الأخطاء الإملائية الشائعة في اللهجة السعودية
  let cleanMessage = lowerMessage
    .replace(/كيفك/g, "كيف حالك")
    .replace(/شو/g, "ما")
    .replace(/ايه/g, "ما")
    .replace(/ايش/g, "ما")
    .replace(/شحنة/g, "شحنة")
    .replace(/شحنات/g, "شحنات")
    .replace(/شحنخاتي/g, "شحناتي") // خطأ إملائي شائع
    .replace(/شحناتك/g, "شحناتي") // خطأ إملائي شائع
    .replace(/خدماتكم/g, "خدماتكم")
    .replace(/خدماتك/g, "خدماتكم")
    .replace(/انشاء/g, "إنشاء")
    .replace(/الغاء/g, "إلغاء")
    .replace(/كم/g, "كم")
    .replace(/عدد/g, "عدد")
    .replace(/قديش/g, "كم") // لهجة سعودية
    .replace(/قداش/g, "كم") // لهجة سعودية
    .replace(/كمية/g, "كم")
    .replace(/وش/g, "ما") // لهجة سعودية
    .replace(/شوية/g, "قليل")
    .replace(/كلش/g, "كل شيء")
    .replace(/كلشي/g, "كل شيء")
    .replace(/بدي/g, "أريد")
    .replace(/عندي/g, "لدي")
    .replace(/عندك/g, "لديك")
    .replace(/مشكلة/g, "مشكلة")
    .replace(/لي/g, "لي"); // إزالة كلمة "لي" الزائدة في بعض الأحيان

  console.log("🧹 [Quick Parse] Original:", lowerMessage);
  console.log("🧹 [Quick Parse] Cleaned:", cleanMessage);

  // اختبار سريع للتحيات
  console.log(
    "🗣️ [Test] Checking 'السلام عليكم' in lowerMessage:",
    lowerMessage.includes("السلام عليكم")
  );
  console.log(
    "🗣️ [Test] Checking 'كيفك' in lowerMessage:",
    lowerMessage.includes("كيفك")
  );
  console.log(
    "🗣️ [Test] Checking 'مين انت' in lowerMessage:",
    lowerMessage.includes("مين انت")
  );

  // تتبع شحنة - أولوية عالية
  if (lowerMessage.includes("تتبع") || lowerMessage.includes("track")) {
    const numberMatch = message.match(/(\d{6,})/);
    if (numberMatch) {
      return {
        action: "TRACK_SHIPMENT",
        data: { tracking_number: numberMatch[1] },
      };
    }
  }

  // إنشاء شحنة
  if (
    lowerMessage.includes("إنشاء") ||
    lowerMessage.includes("create") ||
    lowerMessage.includes("جديدة")
  ) {
    return {
      action: "CREATE_SHIPMENT",
      data: {},
    };
  }

  // رصيد المحفظة
  if (
    lowerMessage.includes("رصيد") ||
    lowerMessage.includes("balance") ||
    lowerMessage.includes("محفظة")
  ) {
    console.log("💰 [Balance] Detected old balance pattern!");
    return {
      intent: "BALANCE",
      confidence: 0.9,
      missing_fields: [],
      message: `تمام ${userName}، خلني أجيبلك بيانات رصيدك من النظام...`,
      data: {},
    };
  }

  // قائمة الشحنات - أنماط شاملة بالعامية السعودية
  const listPatterns = [
    "شحناتي",
    "قائمة",
    "عرض",
    "list",
    "شحنات",
    "طلباتي",
    "كم شحناتي",
    "كم عدد شحناتي",
    "قديش شحناتي",
    "قداش شحناتي",
    "عدد شحناتي",
    "شحناتي كم",
    "شحناتي قديش",
    "شحناتي قداش",
    "شحنخاتي", // خطأ إملائي شائع
    "شحناتك",
    "طلباتك",
    "شحناتي كلها",
    "كل شحناتي",
    "شوف شحناتي",
    "وريني شحناتي",
    "عرضلي شحناتي",
  ];
  if (listPatterns.some((pattern) => cleanMessage.includes(pattern))) {
    return {
      intent: "LIST",
      confidence: 0.9,
      missing_fields: [],
      message: `تمام ${userName}، خلني أجيبلك قائمة بشحناتك...`,
      data: {},
    };
  }

  // إلغاء شحنة
  if (
    cleanMessage.includes("إلغاء") ||
    cleanMessage.includes("cancel") ||
    cleanMessage.includes("الغاء")
  ) {
    const numberMatch = message.match(/(\d{3,})/);
    if (numberMatch) {
      return {
        intent: "CANCEL",
        confidence: 0.9,
        missing_fields: [],
        message: `تمام ${userName}، خلني ألغي الشحنة لك...`,
        data: { shipment_id: numberMatch[1] },
      };
    } else {
      return {
        intent: "CANCEL",
        confidence: 0.8,
        missing_fields: ["shipment_id"],
        message: `أحتاج رقم الشحنة أو معرفها عشان ألغيها ${userName}. وش رقم الشحنة؟`,
        data: {},
      };
    }
  }

  // تحقق سريع للكلمات الأساسية مع ردود ذكية متنوعة
  if (lowerMessage.includes("كيفك") || lowerMessage.includes("كيف حالك")) {
    console.log("🚀 [Fallback] Detected 'كيفك' greeting!");
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: `الحمد لله بخير ${userName}! 😊\n\nأنا **مساعد مراسيل الذكي** 🤖 جاهز لخدمتك 🇸🇦\n\n✨ أقدر أساعدك في:\n• 📦 إنشاء وتتبع الشحنات\n• 💰 معرفة رصيدك\n• 📋 عرض شحناتك\n• ❓ أي سؤال عن الشحن\n\nوش تحتاجه اليوم؟ 🚀`,
      data: {},
    };
  }

  if (lowerMessage.includes("السلام عليكم")) {
    console.log("🚀 [Fallback] Detected Islamic greeting!");
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: `وعليكم السلام ورحمة الله وبركاته ${userName}! 🤲\n\nأنا **مساعد مراسيل الذكي** 🤖 - متخصص في شحنات السعودية 🇸🇦\n\n✨ جاهز لخدمتك في كل ما يخص الشحن:\n• 📦 إنشاء شحنة جديدة\n• 🔍 تتبع شحناتك\n• 💰 رصيد محفظتك\n• 📋 شحناتك الموجودة\n\nكيف أقدر أساعدك؟ 😊`,
      data: {},
    };
  }

  if (
    lowerMessage.includes("هاي") ||
    lowerMessage.includes("هلا") ||
    lowerMessage.includes("مرحبا") ||
    lowerMessage.includes("أهلا")
  ) {
    console.log("🚀 [Fallback] Detected casual greeting!");
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: `هاي! مرحباً بك ${userName} 🤝\n\nأنا **مساعد مراسيل الذكي** 🤖 - هنا عشان أساعدك في شحناتك 🇸🇦\n\n✨ أقدر أعمل لك:\n• 📦 شحنة جديدة\n• 🔍 تتبع شحنتك\n• 💰 شوف رصيدك\n• 📋 عرض شحناتك\n\nوش تبي تسوي؟ 😊`,
      data: {},
    };
  }

  // أسئلة هوية وتعريف الذات
  const identityPatterns = [
    "مين انت",
    "من أنت",
    "من انت",
    "بتحكي عربي",
    "بتتكلم عربي",
    "شو فيك تساعدني",
    "بتقدر تساعدني",
    "هل تساعدني",
    "من هو",
    "وش اسمك",
    "اسمك وش",
  ];
  if (
    identityPatterns.some((pattern) => lowerMessage.includes(pattern)) ||
    identityPatterns.some((pattern) => cleanMessage.includes(pattern))
  ) {
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: `🤖 **أنا مساعد مراسيل الذكي!** 🛠️\n\nأنا نظام ذكاء اصطناعي متخصص في مساعدة تجار السعودية 🇸🇦 في كل ما يخص الشحن والشحنات.\n\n✨ **أقدر أساعدك في**:\n• 📦 إنشاء وتتبع الشحنات\n• 💰 معرفة رصيد المحفظة\n• 📋 عرض الشحنات الموجودة\n• 🏢 معلومات عن الشركات والأسعار\n• ❓ إجابة على أي سؤال\n\nقلي وش تحتاجه وسأساعدك فوراً ${userName}! 🚀\n\n#مراسيل #شحن_ذكي`,
      data: {},
    };
  }

  // تحيات وأسئلة عامة - باللهجة السعودية
  const greetingPatterns = [
    "مرحبا",
    "مرحباً",
    "أهلا",
    "أهلاً",
    "هاي",
    "هلا",
    "السلام عليكم",
    "سلام",
    "صباح الخير",
    "مساء الخير",
    "كيفك",
    "كيف حالك",
    "كيف الأحوال",
    "كيف الحال",
    "كيف",
    "hello",
    "hi",
    "hey",
    "أهلين",
    "أهلين وسهلين",
    "أهلين وسهلين فيك",
    "كيف",
    "help",
    "مساعدة",
    "أهلين",
    "أهلين يا",
    "أهلين ياعمري",
    "ياعمري",
    "ياعيوني",
    "ياخي",
    "يا أخ",
    "شلونك",
    "شلونك",
    "تمام",
    "تمام الحمد لله",
    "الحمد لله",
  ];
  console.log("🗣️ [Greetings] Available patterns:", greetingPatterns);
  console.log("🗣️ [Greetings] lowerMessage:", lowerMessage);
  console.log("🗣️ [Greetings] cleanMessage:", cleanMessage);
  console.log(
    "🗣️ [Greetings] Checking patterns in lowerMessage:",
    greetingPatterns.filter((p) => lowerMessage.includes(p))
  );
  console.log(
    "🗣️ [Greetings] Checking patterns in cleanMessage:",
    greetingPatterns.filter((p) => cleanMessage.includes(p))
  );
  const greetingInLower = greetingPatterns.some((pattern) =>
    lowerMessage.includes(pattern)
  );
  const greetingInClean = greetingPatterns.some((pattern) =>
    cleanMessage.includes(pattern)
  );
  console.log("🗣️ [Greetings] greetingInLower:", greetingInLower);
  console.log("🗣️ [Greetings] greetingInClean:", greetingInClean);

  // ردود ذكية حسب نوع التحية
  if (
    lowerMessage.includes("كيفك") ||
    cleanMessage.includes("كيفك") ||
    lowerMessage.includes("كيف حالك") ||
    cleanMessage.includes("كيف حالك")
  ) {
    console.log("✅ [Greetings] Detected 'كيفك' greeting!");
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: `الحمد لله بخير ${userName}! 😊\n\nأنا **مساعد مراسيل الذكي** 🤖 جاهز لخدمتك 🇸🇦\n\n✨ أقدر أساعدك في:\n• 📦 إنشاء وتتبع الشحنات\n• 💰 معرفة رصيدك\n• 📋 عرض شحناتك\n• ❓ أي سؤال عن الشحن\n\nوش تحتاجه اليوم؟ 🚀`,
      data: {},
    };
  }

  if (
    lowerMessage.includes("السلام عليكم") ||
    cleanMessage.includes("السلام عليكم")
  ) {
    console.log("✅ [Greetings] Detected Islamic greeting!");
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: `وعليكم السلام ورحمة الله وبركاته ${userName}! 🤲\n\nأنا **مساعد مراسيل الذكي** 🤖 - متخصص في شحنات السعودية 🇸🇦\n\n✨ جاهز لخدمتك في كل ما يخص الشحن:\n• 📦 إنشاء شحنة جديدة\n• 🔍 تتبع شحناتك\n• 💰 رصيد محفظتك\n• 📋 شحناتك الموجودة\n\nكيف أقدر أساعدك؟ 😊`,
      data: {},
    };
  }

  if (greetingInLower || greetingInClean) {
    console.log("✅ [Greetings] Detected casual greeting!");
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: `هاي! مرحباً بك ${userName} 🤝\n\nأنا **مساعد مراسيل الذكي** 🤖 - هنا عشان أساعدك في شحناتك 🇸🇦\n\n✨ أقدر أعمل لك:\n• 📦 شحنة جديدة\n• 🔍 تتبع شحنتك\n• 💰 شوف رصيدك\n• 📋 عرض شحناتك\n\nوش تبي تسوي؟ 😊`,
      data: {},
    };
  }

  // أسئلة عن الشركة - باللهجة السعودية
  const companyPatterns = ["مراسيل", "الشركة", "about", "من", "عن"];
  if (
    companyPatterns.some((pattern) => cleanMessage.includes(pattern)) &&
    (cleanMessage.includes("هي") || cleanMessage.includes("مراسيل"))
  ) {
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: `🏢 **مراسيل - منصة الشحن الذكية في السعودية!** 🇸🇦\n\n⭐ **رؤيتنا**: نساعد التجار الإلكترونيين يشحنون بسهولة وأمان\n\n🚀 **خدماتنا الرائعة**:\n• شحن سريع لجميع مدن السعودية\n• تتبع فوري ورقمي\n• محفظة إلكترونية آمنة\n• دعم فني 24/7\n• شراكة مع أفضل شركات الشحن\n\n📞 **للتواصل**: support@marasil.com\n\nنحن هنا لنجعل الشحن أسهل عليك ${userName}! 🤝`,
      data: {},
    };
  }

  // أسئلة عن شركات الشحن - باللهجة السعودية
  const shippingCompaniesPatterns = [
    "شركات الشحن",
    "shipping companies",
    "ما الشركات",
    "شركات متوفرة",
  ];
  if (
    shippingCompaniesPatterns.some((pattern) => cleanMessage.includes(pattern))
  ) {
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: `🚛 **شركاء الشحن في مراسيل - نختر لك الأحسن ${userName}!**\n\n🏆 **ARAMEX - الأسرع!**\n• توصيل في نفس اليوم للمدن الكبيرة\n• تغطية شاملة لكل السعودية\n• تتبع متقدم ورائع\n\n🚚 **SMSA - الموثوقة**\n• مثالية للشحنات الكبيرة\n• خدمة آمنة ومحترفة\n• شبكة توصيل واسعة\n\n✈️ **DHL - العالمية**\n• شحن دولي ومحلي\n• ضمان عالي للسلامة\n• تتبع عالمي سريع\n\n💡 **نصيحة**: اختر الشركة حسب حجم الشحنة وسرعة التوصيل المطلوبة!\n\nقلي تفاصيل الشحنتك وأختار لك الشركة المناسبة! 😉`,
      data: {},
    };
  }

  // أسئلة عن الخدمات - باللهجة السعودية
  const servicesPatterns = [
    "خدمات",
    "خدماتكم",
    "services",
    "مميزات",
    "features",
  ];
  if (servicesPatterns.some((pattern) => cleanMessage.includes(pattern))) {
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: `🎯 **خدمات مراسيل اللي راح تحبها ${userName}!**\n\n📦 **إنشاء الشحنات**\n• سهلة وبسيطة زي الماء\n• حساب التكلفة تلقائي\n• اختيار الشركة المناسبة\n\n🔍 **تتبع الشحنات**\n• تتبع فوري برقم الشحنة\n• إشعارات على الجوال\n• تحديثات كل ساعة\n\n💳 **المحفظة الإلكترونية**\n• شحن رصيد سريع\n• دفع آمن 100%\n• تتبع معاملاتك\n\n📊 **تقارير وإحصائيات**\n• تقارير مفصلة\n• تحليل أداء الشحن\n• إحصائيات المبيعات\n\n🛡️ **أمان وضمان**\n• تشفير كامل\n• ضمان سلامة الشحنات\n• دعم فني على مدار الساعة\n\nراح تحب تجربتنا! 😍`,
      data: {},
    };
  }

  // أسئلة عن الأسعار - باللهجة السعودية
  const pricePatterns = ["سعر", "تكلفة", "كم التكلفة", "price", "cost", "كم"];
  if (
    pricePatterns.some((pattern) => cleanMessage.includes(pattern)) &&
    (cleanMessage.includes("شحن") || cleanMessage.includes("تكلفة"))
  ) {
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: `💰 **أسعارنا في مراسيل - تنافسية وواضحة ${userName}!**\n\n📏 **حساب التكلفة التلقائي**:\n• حسب الوزن والمسافة\n• مختلف حسب الشركة\n• شفافية كاملة\n\n💡 **العوامل اللي تؤثر على السعر**:\n• وزن الشحنة (كيلو)\n• المسافة بين المدن\n• حجم الطرد\n• شركة الشحن\n\n🎁 **عروضنا الحلوة**:\n• خصم 20% على أول شحنة\n• شحن مجاني فوق 500 ريال\n• خصومات شهرية\n\n💬 قلي تفاصيل الشحنتك وأحسب لك التكلفة بدقة!\n\nمثال: "شحنة 2 كيلو من الرياض لجدة" 🤔`,
      data: {},
    };
  }

  // أسئلة عن التتبع
  if (
    (lowerMessage.includes("تتبع") && !lowerMessage.includes("شحنة")) ||
    lowerMessage.includes("tracking") ||
    lowerMessage.includes("كيف أتتبع")
  ) {
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: `🔍 **كيف تتبع شحناتك في مراسيل ${userName}**:\n\n📱 **طرق التتبع**:\n• من خلال لوحة التحكم\n• عبر رقم الشحنة\n• تطبيق الهاتف\n• إشعارات البريد الإلكتروني\n\n📊 **حالات الشحنة**:\n• تم الاستلام\n• في المستودع\n• في الطريق\n• تم التسليم\n• فشل في التسليم\n\n⚡ **التحديثات الفورية**:\n• تحديث كل ساعة\n• إشعارات فورية\n• تاريخ زمني مفصل\n\n💬 قل لي: "تتبع الشحنة رقم 123456" وسأساعدك فوراً!`,
      data: {},
    };
  }

  // أسئلة عن الدعم الفني
  if (
    lowerMessage.includes("دعم") ||
    lowerMessage.includes("support") ||
    lowerMessage.includes("مساعدة") ||
    lowerMessage.includes("help") ||
    lowerMessage.includes("مشكلة") ||
    lowerMessage.includes("problem")
  ) {
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: `🛠️ **دعم مراسيل - نحن هنا لمساعدتك ${userName}!**\n\n📞 **طرق التواصل**:\n• الدردشة الذكية (أنا هنا!)\n• البريد الإلكتروني: support@marasil.com\n• الهاتف: 9200xxxxx\n• الواتساب: +966xxxxxxxx\n\n🕐 **أوقات العمل**:\n• 24/7 للطوارئ\n• الدعم الفني: 8 صباحاً - 8 مساءً\n• الدعم المالي: 9 صباحاً - 5 مساءً\n\n❓ **الأسئلة الشائعة**:\n• مشاكل التتبع\n• مشاكل الدفع\n• إلغاء الشحنات\n• استرداد الأموال\n\n💬 قل لي ما المشكلة التي تواجهها وسأساعدك!`,
      data: {},
    };
  }

  // أسئلة عن التسجيل والحساب
  if (
    lowerMessage.includes("تسجيل") ||
    lowerMessage.includes("حساب") ||
    lowerMessage.includes("register") ||
    lowerMessage.includes("account") ||
    (lowerMessage.includes("جديد") && lowerMessage.includes("عميل"))
  ) {
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: `📝 **إنشاء حساب في مراسيل - سهل وبسيط ${userName}!**\n\n✨ **خطوات التسجيل**:\n1. اضغط على "إنشاء حساب"\n2. أدخل بريدك الإلكتروني\n3. أدخل معلوماتك الأساسية\n4. فعل حسابك عبر البريد\n\n🎁 **مزايا العضوية**:\n• حفظ عناوين الشحن\n• تتبع سريع للطلبات\n• محفظة إلكترونية\n• تقارير مفصلة\n• دعم فني مخصص\n\n🔐 **الأمان والخصوصية**:\n• تشفير البيانات\n• حماية معلوماتك\n• معاملات آمنة 100%\n\n🚀 سجل الآن وبدأ رحلتك مع أفضل خدمات الشحن في السعودية!`,
      data: {},
    };
  }

  // شكر ووداع
  if (
    lowerMessage.includes("شكرا") ||
    lowerMessage.includes("thank") ||
    lowerMessage.includes("thanks")
  ) {
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: `🙏 **العفو ${userName}! يسعدني مساعدتك**\n\n⭐ إذا كان لديك أي استفسار آخر، لا تتردد في السؤال. نحن في مراسيل دائماً هنا لخدمتك!\n\n🌟 **نصيحة**: تابعنا على وسائل التواصل للعروض والتحديثات:\n📘 فيسبوك | 📷 إنستغرام | 🐦 تويتر\n\nمع خالص التحية،\nفريق مراسيل 🤝`,
      data: {},
    };
  }

  // أسئلة عن المناطق الجغرافية
  if (
    lowerMessage.includes("مناطق") ||
    lowerMessage.includes("مدن") ||
    lowerMessage.includes("تغطية") ||
    lowerMessage.includes("coverage") ||
    lowerMessage.includes("أين تشحنون")
  ) {
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: `🗺️ **تغطية مراسيل الشاملة في السعودية ${userName}**:\n\n🏙️ **المدن الرئيسية**:\n• الرياض - التغطية الكاملة\n• جدة - ميناء ووسط المدينة\n• مكة المكرمة - المنطقة المقدسة\n• المدينة المنورة - التغطية الشاملة\n• الدمام - المنطقة الشرقية\n• الخبر - الميناء الشرقي\n\n🏘️ **المدن الأخرى**:\n• الطائف • تبوك • حائل\n• أبها • جازان • نجران\n• الباحة • القصيم • حفر الباطن\n\n⚡ **خدماتنا تشمل**:\n• التوصيل للمنازل والشركات\n• نقاط الاستلام في جميع المدن\n• التوصيل في نفس اليوم للمدن الرئيسية\n• تغطية 100% من أراضي المملكة\n\n🚀 **سرعة التوصيل**:\n• داخل المدينة: 1-2 أيام\n• بين المدن: 2-4 أيام\n• الطلبات العاجلة: في نفس اليوم`,
      data: {},
    };
  }

  // أسئلة عن الأمان والضمان
  if (
    lowerMessage.includes("أمان") ||
    lowerMessage.includes("ضمان") ||
    lowerMessage.includes("أمانة") ||
    lowerMessage.includes("security") ||
    lowerMessage.includes("safe") ||
    lowerMessage.includes("آمن")
  ) {
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: `🔒 **الأمان والضمان في مراسيل - أولويتنا الأولى ${userName}!**\n\n🛡️ **أمان البيانات**:\n• تشفير SSL لجميع المعاملات\n• حماية بياناتك الشخصية 100%\n• نظام أمان مصرفي معتمد\n\n📦 **سلامة الشحنات**:\n• تغليف آمن لجميع الطرود\n• تتبع GPS لكل شحنة\n• تأمين شامل على الشحنات الثمينة\n• مسؤولية كاملة عن الخسائر\n\n💰 **الضمان المالي**:\n• استرداد كامل في حال الضياع\n• تعويض فوري للتلف\n• ضمان جودة الخدمة\n\n📋 **الشهادات والاعتمادات**:\n• اعتماد الهيئة العامة للنقل\n• شهادة الأيزو للجودة\n• عضوية غرفة التجارة\n\n✨ **نحن نضمن سلامة شحناتك 100%**`,
      data: {},
    };
  }

  // أسئلة عن العروض والخصومات
  if (
    lowerMessage.includes("عروض") ||
    lowerMessage.includes("خصومات") ||
    lowerMessage.includes("offers") ||
    lowerMessage.includes("discount") ||
    lowerMessage.includes("تخفيض")
  ) {
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: `🎉 **عروض وخصومات مراسيل الحالية ${userName}!**\n\n🔥 **عروض شهر نوفمبر**:\n• خصم 20% على أول شحنة\n• شحن مجاني للطلبات فوق 500 ريال\n• خصم 15% على الشحن الشهري\n\n🎁 **عروض خاصة للعملاء الجدد**:\n• رصيد مجاني 50 ريال عند التسجيل\n• خصم 30% على أول 3 شحنات\n• استشارة مجانية لتحسين الشحن\n\n🏆 **عروض للعملاء الدائمين**:\n• نقاط مكافآت على كل شحنة\n• خصومات تصل إلى 50% للكميات الكبيرة\n• أولوية في التوصيل\n\n📱 **كيف تحصل على العروض**:\n• اشترك في النشرة البريدية\n• تابعنا على وسائل التواصل\n• سجل في التطبيق\n\n💬 اسألني عن كود خصم محدد لتحصل على عرض خاص!`,
      data: {},
    };
  }

  // أسئلة عن التطبيق والموقع
  if (
    lowerMessage.includes("تطبيق") ||
    lowerMessage.includes("app") ||
    lowerMessage.includes("موقع") ||
    lowerMessage.includes("website") ||
    lowerMessage.includes("منصة")
  ) {
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: `📱 **تطبيق وموقع مراسيل - سهولة في متناول يديك ${userName}!**\n\n🌐 **الموقع الإلكتروني**:\n• تصميم متجاوب مع جميع الأجهزة\n• واجهة سهلة باللغة العربية\n• لوحة تحكم شاملة\n• متاح 24/7\n\n📲 **تطبيق الهاتف**:\n• متاح للأندرويد والآيفون\n• إشعارات فورية للشحنات\n• مسح QR للتتبع السريع\n• واجهة مبسطة للاستخدام\n\n✨ **مميزات إضافية**:\n• حفظ العناوين المفضلة\n• تاريخ الشحنات الكامل\n• تقارير مفصلة\n• دعم فني مباشر\n\n⬇️ **تحميل التطبيق**:\n• 📱 Google Play: [رابط]\n• 🍎 App Store: [رابط]\n\n💻 **زور موقعنا**: www.marasil.com`,
      data: {},
    };
  }

  // أسئلة عن أوقات التوصيل
  if (
    lowerMessage.includes("وقت") ||
    lowerMessage.includes("سرعة") ||
    lowerMessage.includes("delivery time") ||
    lowerMessage.includes("كم يوم") ||
    lowerMessage.includes("متى يصل")
  ) {
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: `⚡ **أوقات التوصيل في مراسيل - سرعة ودقة ${userName}!**\n\n🚀 **خدمة التوصيل السريع**:\n• **نفس اليوم**: للطلبات قبل الظهر\n• **غداً**: للطلبات المسائية\n• **2-3 أيام**: بين المدن الرئيسية\n\n📅 **مواعيد التوصيل**:\n• السبت - الخميس: 8 صباحاً - 8 مساءً\n• الجمعة: 4 مساءً - 12 صباحاً\n• العطلات الرسمية: حسب الجدول\n\n🏙️ **التوصيل حسب المناطق**:\n• **الرياض**: 1-2 يوم\n• **جدة**: 1-2 يوم\n• **مكة**: 1-3 أيام\n• **المدن البعيدة**: 3-5 أيام\n\n📦 **عوامل تؤثر على الوقت**:\n• حجم ووزن الشحنة\n• المسافة والمنطقة\n• شركة الشحن المختارة\n• الظروف الجوية\n\n💡 **نصائح لتسريع التوصيل**:\n• أكمل البيانات بدقة\n• اختر خدمة VIP\n• استخدم نقاط الاستلام`,
      data: {},
    };
  }

  // أسئلة عن إلغاء الشحنات
  if (
    (lowerMessage.includes("إلغاء") && !lowerMessage.includes("شحنة")) ||
    (lowerMessage.includes("cancel") && lowerMessage.includes("how")) ||
    lowerMessage.includes("كيف ألغي")
  ) {
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: `❌ **سياسة إلغاء الشحنات في مراسيل ${userName}**:\n\n⏰ **فترة الإلغاء المسموحة**:\n• قبل مغادرة الشحنة من المستودع\n• خلال 24 ساعة من إنشاء الطلب\n• قبل تأكيد الاستلام من الشركة\n\n💰 **سياسة الاسترداد**:\n• استرداد كامل خلال 24 ساعة\n• استرداد جزئي بعد 24 ساعة\n• رسوم إلغاء 10 ريال للطلبات الكبيرة\n\n📋 **خطوات الإلغاء**:\n1. اذهب إلى قائمة الشحنات\n2. اختر الشحنة المطلوب إلغاؤها\n3. اضغط "إلغاء الطلب"\n4. حدد سبب الإلغاء\n\n⚠️ **ملاحظات مهمة**:\n• لا يمكن إلغاء الشحنات المسلمة\n• الشحنات في الطريق قد تكلف رسوم\n• الاسترداد يستغرق 3-5 أيام عمل\n\n💬 قل لي: "ألغِ الشحنة رقم 123" وسأساعدك فوراً!`,
      data: {},
    };
  }

  // أسئلة عن عدم الفهم أو المشاكل - بالعامية السعودية
  const confusionPatterns = [
    "ما تفهم",
    "ما عم تفهم",
    "لي ما",
    "غبي",
    "مش فاهم",
    "don't understand",
    "شو ما كنت",
    "شو ما كان",
    "ما فهمت",
    "مش فاهما",
    "ما أفهم",
    "ما تعرف",
    "ما تدري",
    "ما تعرف تسوي",
    "ما تشوف",
  ];
  if (confusionPatterns.some((pattern) => cleanMessage.includes(pattern))) {
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: `😅 **يا عيوني! أنا مساعد مراسيل الذكي هنا عشان أساعدك ${userName}** 🤝\n\nأنا أفهم اللهجة السعودية بس أحياناً أحتاج شرح أوضح! 📝\n\n✨ قلي بوضوح وش تبي أعمل:\n• 📦 "أريد أنشئ شحنة جديدة"\n• 🔍 "تابع شحنة رقم 123456"\n• 💰 "شوف رصيدي كم"\n• 📋 "وريني شحناتي"\n\nأو قلي المشكلة بالتفصيل وأحلها لك فوراً! 🔧\n\nما تيأس، أنا هنا دايماً لخدمتك! 😊`,
      data: {},
    };
  }

  // أسئلة عامة عن الوظائف - بالعامية السعودية
  const generalQuestionsPatterns = [
    "وش تقدر تسوي",
    "وش يقدر",
    "ماذا تفعل",
    "what can you do",
    "كيف تساعد",
    "how can you help",
    "وظائفك",
    "your functions",
    "شو تقدر تسوي",
    "شو يقدر",
    "ايش تقدر تسوي",
    "وش تسوي",
    "كيف تشوف",
    "كيف تعرف تساعد",
    "ماذا تعرف تسوي",
  ];
  if (
    generalQuestionsPatterns.some((pattern) => cleanMessage.includes(pattern))
  ) {
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: `🎯 **أنا مساعد مراسيل الذكي ${userName}!** 🤖\n\nأنا متخصص في مساعدة تجار السعودية في كل ما يخص الشحن 🇸🇦\n\n✨ **أقدر أساعدك في كلشي**:\n\n📦 **الشحنات**:\n• أنشئ شحنة جديدة لك\n• أتبع شحناتك لحظة بلحظة\n• ألغي أو أعدل في الشحنات\n\n💰 **المحفظة والفلوس**:\n• أشوف رصيدك كم\n• أشحن رصيد جديد\n• أراقب معاملاتك\n\n🏢 **معلومات الشركة**:\n• أحكي لك عن مراسيل\n• أعرفك على شركات الشحن\n• أوضح الأسعار والعروض\n\n📞 **الدعم والمساعدة**:\n• أحل مشاكلك\n• أجاوب على أسئلتك\n• أوصلك بالفريق\n\n💬 **جرب تسألني**:\n• "كم رصيدي؟"\n• "أريد أشحن شيء"\n• "ما هي شركات الشحن؟"\n• "كيف أتبع الشحنة؟"\n\nأنا هنا دايماً لخدمتك! 🚀`,
      data: {},
    };
  }

  // أسئلة عن الرصيد - بالعامية السعودية
  const balancePatterns = [
    "كم رصيدي",
    "رصيدي كم",
    "رصيدي قديش",
    "رصيدي قداش",
    "شوف رصيدي",
    "وريني رصيدي",
    "رصيدك كم",
    "فلوسي كم",
    "فلوسي قديش",
    "عندي كم فلوس",
    "balance",
    "رصيد محفظتي",
    "رصيد محفظتك",
    "كم رصيد محفظتي",
    "كم معي رصيد",
    "كم معي رصيد بالمحفظة",
    "رصيدي بالمحفظة",
    "رصيد المحفظة",
    "رصيد المحفظة كم",
  ];
  if (balancePatterns.some((pattern) => cleanMessage.includes(pattern))) {
    console.log("💰 [Balance] Detected balance pattern in cleanMessage!");
    return {
      intent: "BALANCE",
      confidence: 0.9,
      missing_fields: [],
      message: `تمام ${userName}، خلني أجيبلك بيانات رصيدك من النظام...`,
      data: {},
    };
  }
  if (balancePatterns.some((pattern) => lowerMessage.includes(pattern))) {
    console.log("💰 [Balance] Detected balance pattern in lowerMessage!");
    return {
      intent: "BALANCE",
      confidence: 0.9,
      missing_fields: [],
      message: `تمام ${userName}، خلني أجيبلك بيانات رصيدك من النظام...`,
      data: {},
    };
  }

  // أسئلة عن إنشاء شحنة - بالعامية السعودية
  const createShipmentPatterns = [
    "أريد أشحن",
    "بدي أشحن",
    "أريد أرسل",
    "بدي أرسل",
    "أريد أنشئ شحنة",
    "بدي أنشئ شحنة",
    "أريد أضيف شحنة",
    "شحن لي",
    "أرسل لي",
    "أحتاج أشحن",
    "أبي أشحن",
    "كيف أنشئ شحنة",
    "كيف أشحن",
    "كيف أضيف شحنة",
    "إنشاء شحنة جديدة",
    "أضف شحنة",
    "أريد شحنة جديدة",
    "بدي شحنة جديدة",
    "شحنة جديدة",
  ];
  if (
    createShipmentPatterns.some((pattern) => cleanMessage.includes(pattern))
  ) {
    return {
      intent: "CREATE",
      confidence: 0.8,
      missing_fields: ["recipient_name", "phone", "weight"],
      message: `تمام ${userName} 👍 لمين الشحنة؟`,
      data: {},
    };
  }

  // أسئلة عن المساعدة العامة
  const helpPatterns = [
    "مساعدة",
    "help",
    "بدي مساعدة",
    "أحتاج مساعدة",
    "أريد مساعدة",
    "ساعدني",
    "ساعديني",
    "/مساعدة",
  ];
  if (helpPatterns.some((pattern) => cleanMessage.includes(pattern))) {
    console.log("✅ [Quick Parse] Matched HELP pattern");
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: `تمام ${userName} 👍 أنا هنا عشان أساعدك! 🤝\n\n✨ **أقدر أساعدك في**:\n• 📦 **إنشاء شحنة جديدة** - قل "أريد أشحن"\n• 🔍 **تتبع شحنة** - قل "تابع رقم الشحنة"\n• 💰 **رصيد المحفظة** - قل "كم رصيدي"\n• 📋 **شحناتي** - قل "عرض شحناتي"\n• 🏢 **معلومات عن مراسيل** - قل "ما هي مراسيل"\n\nوش تحب أعمل لك اليوم؟ 😊`,
      data: {},
    };
  }

  // أسئلة عن التتبع - بالعامية السعودية
  const trackShipmentPatterns = [
    "تابع",
    "شوف وين",
    "وريني وين",
    "فين الشحنة",
    "وين وصلت",
    "كيف الشحنة",
    "شوف الشحنة",
    "وريني الشحنة",
    "track",
    "بدي اتبع",
    "أريد أتبع",
    "اتبع شحنتي",
    "تابع شحنتي",
    "تتبع شحنتي",
    "/تتبع",
  ];
  if (trackShipmentPatterns.some((pattern) => cleanMessage.includes(pattern))) {
    console.log("✅ [Quick Parse] Matched TRACK pattern");
    const numberMatch = message.match(/(\d{6,})/);
    if (numberMatch) {
      console.log("✅ [Quick Parse] Found tracking number:", numberMatch[1]);
      return {
        intent: "TRACK",
        confidence: 0.95,
        missing_fields: [],
        message: `تمام ${userName}، خلني أجيبلك بيانات الشحنة الحين...`,
        data: { tracking_number: numberMatch[1] },
      };
    } else {
      console.log("❌ [Quick Parse] No tracking number found");
      return {
        intent: "TRACK",
        confidence: 0.8,
        missing_fields: ["tracking_number"],
        message: `أحتاج رقم التتبع عشان أتبع الشحنة لك ${userName}. وش رقم التتبع؟`,
        data: {},
      };
    }
  }

  // أسئلة تعليمية عن كيفية إنشاء الشحنة
  const howToCreatePatterns = [
    "كيف أنشئ شحنة",
    "كيف أشحن",
    "كيف أضيف شحنة",
    "كيف أرسل شحنة",
    "كيفية إنشاء شحنة",
    "كيفية الشحن",
    "طريقة إنشاء شحنة",
    "خطوات إنشاء شحنة",
  ];
  if (howToCreatePatterns.some((pattern) => cleanMessage.includes(pattern))) {
    console.log("✅ [Quick Parse] Matched HOW_TO_CREATE pattern");
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: `تمام ${userName} 👍 إنشاء شحنة سهل جداً! 📦\n\n**خطوات إنشاء الشحنة**:\n\n1️⃣ **أخبرني ببيانات المستلم**\n• اسم المستلم الكامل\n• رقم جواله\n• عنوان التوصيل\n• مدينة الوصول\n\n2️⃣ **أخبرني بتفاصيل الشحنة**\n• وزن الشحنة بالكيلو\n• نوع الشحنة (وثائق/بضائع/أخرى)\n• أي ملاحظات خاصة\n\n3️⃣ **أنا أختار لك الشركة المناسبة**\n• حسب المسافة والوزن\n• أحسب التكلفة تلقائياً\n• أعطيك أفضل سعر\n\n💡 **مثال**: "أريد أشحن شيء لأحمد في الرياض، رقم جواله 0501234567، وزن 2 كيلو"\n\nقلي تفاصيل شحنتك وسأساعدك فوراً! 🚀`,
      data: {},
    };
  }

  return null; // لم يتم التعرف على نمط معروف
}

/**
 * استخراج Intent من الرسالة (اختياري - Gemini سيحدده)
 */
function extractIntent(message) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("تتبع") || lowerMessage.includes("track")) {
    return "tracking";
  }
  if (
    lowerMessage.includes("إنشاء") ||
    lowerMessage.includes("create") ||
    lowerMessage.includes("شحنة جديدة")
  ) {
    return "create_shipment";
  }
  if (lowerMessage.includes("إلغاء") || lowerMessage.includes("cancel")) {
    return "cancel";
  }
  if (
    lowerMessage.includes("رصيد") ||
    lowerMessage.includes("balance") ||
    lowerMessage.includes("محفظة")
  ) {
    return "balance";
  }
  if (
    lowerMessage.includes("قائمة") ||
    lowerMessage.includes("list") ||
    lowerMessage.includes("شحناتي")
  ) {
    return "list_shipments";
  }

  return null;
}

/**
 * بناء السياق من آخر الرسائل
 */
function buildContext(recentMessages) {
  if (!recentMessages || recentMessages.length === 0) {
    return "لا يوجد سياق سابق.";
  }

  return recentMessages
    .slice(-5) // آخر 5 رسائل فقط لتجنب تجاوز الحد
    .map((msg) => {
      if (msg.type === "user") {
        return `العميل: ${msg.content}`;
      } else if (msg.type === "ai") {
        return `المساعد: ${msg.content}`;
      }
      return "";
    })
    .filter((msg) => msg.length > 0)
    .join("\n");
}

/**
 * إرسال رسالة لـ Gemini والحصول على رد
 */
async function sendToGemini(
  userMessage,
  context = "",
  userId = null,
  userInfo = null
) {
  try {
    console.log("🎯 [Gemini] Processing user message:", userMessage);

    // أولاً: محاولة keyword-based parsing للأوامر البسيطة
    console.log("🎯 [Gemini] Processing user message:", userMessage);
    const quickResult = quickKeywordParse(userMessage, userInfo);
    console.log(
      "🎯 [Gemini] Quick result:",
      JSON.stringify(quickResult, null, 2)
    );
    if (quickResult) {
      console.log("⚡ [Gemini] Quick parse success:", quickResult.action);
      return quickResult;
    } else {
      console.log("⚡ [Gemini] Quick parse returned null, going to Gemini API");
    }

    // التحقق من وجود GEMINI_API_KEY
    if (!process.env.GEMINI_API_KEY) {
      console.error(
        "❌ [Gemini] GEMINI_API_KEY not found in environment variables"
      );
      return {
        action: "CHAT_RESPONSE",
        message:
          "عذراً، خدمة الذكاء الاصطناعي غير متوفرة حالياً. يرجى المحاولة لاحقاً.",
      };
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    // الحصول على الحالة الحالية للمستخدم
    const currentState = userId ? stateManager.getState(userId) : null;

    // بناء الـ prompt الكامل مع سياق متقدم
    const fullPrompt = `${SYSTEM_PROMPT}

=== معلومات العميل ===
المعرف: ${userId || "غير محدد"}
${
  userInfo
    ? `الاسم: ${userInfo.firstName || ""} ${userInfo.lastName || ""}
البريد الإلكتروني: ${userInfo.email || "غير محدد"}
رقم الهاتف: ${userInfo.phone || "غير محدد"}
العناوين: ${userInfo.addresses ? userInfo.addresses.length : 0} عنوان`
    : "معلومات العميل غير متوفرة حالياً"
}

=== الحالة الحالية للمحادثة ===
${
  currentState
    ? `البيانات المجموعة: ${JSON.stringify(currentState.collectedData, null, 2)}
النية الحالية: ${currentState.currentIntent || "غير محدد"}
الخطوة الحالية: ${currentState.conversationStep || 0}`
    : "محادثة جديدة"
}

=== تاريخ المحادثة ===
${context}

=== الرسالة الحالية ===
"${userMessage}"

=== أمثلة أسئلة الرصيد ===
- "كم رصيدي" → {"intent": "BALANCE", "confidence": 0.9, "missing_fields": [], "message": "", "data": {}}
- "رصيد محفظتي" → {"intent": "BALANCE", "confidence": 0.9, "missing_fields": [], "message": "", "data": {}}
- "فلوسي كم" → {"intent": "BALANCE", "confidence": 0.9, "missing_fields": [], "message": "", "data": {}}
- "كم معي رصيد بالمحفظة" → {"intent": "BALANCE", "confidence": 0.9, "missing_fields": [], "message": "", "data": {}}

أجب بـ JSON صالح فقط حسب الصيغة المطلوبة:`;

    // تقييد طول الـ prompt
    const maxPromptLength = 2000;
    if (fullPrompt.length > maxPromptLength) {
      const truncatedContext = buildContext(recentMessages.slice(-3)); // آخر 3 رسائل فقط
      fullPrompt = `${SYSTEM_PROMPT}\n\nContext (last 3 messages):\n${truncatedContext}\n\nUser: ${userMessage}\n\nRespond with valid JSON only:`;
    }

    console.log("🚀 [Gemini] Sending prompt to Gemini...");
    console.log("📝 [Gemini] Prompt length:", fullPrompt.length, "characters");

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    console.log("✅ [Gemini] Raw response from Gemini:", text);
    console.log("🔍 [Gemini] Response type check:");
    console.log("   - Contains 'action':", text.includes("action"));
    console.log("   - Contains '{':", text.includes("{"));
    console.log("   - Contains '}':", text.includes("}"));
    console.log("   - Contains Arabic:", /[\u0600-\u06FF]/.test(text));

    // تنظيف الرد من أي markdown أو تنسيق إضافي
    let cleanResponse = text.trim();

    // إزالة أي ```json أو ``` في البداية أو النهاية
    cleanResponse = cleanResponse
      .replace(/^```json\s*/, "")
      .replace(/\s*```$/, "");
    cleanResponse = cleanResponse.replace(/^```\s*/, "").replace(/\s*```$/, "");

    // إزالة أي نص عربي إضافي قد يكون قبل JSON
    const jsonStart = cleanResponse.indexOf("{");
    if (jsonStart > 0) {
      cleanResponse = cleanResponse.substring(jsonStart);
    }

    // إزالة أي نص بعد JSON
    const jsonEnd = cleanResponse.lastIndexOf("}");
    if (jsonEnd > 0 && jsonEnd < cleanResponse.length - 1) {
      cleanResponse = cleanResponse.substring(0, jsonEnd + 1);
    }

    console.log("🧹 [Gemini] Cleaned response:", cleanResponse);

    // محاولة تحليل JSON
    try {
      const parsedResponse = JSON.parse(cleanResponse);
      console.log(
        "✅ [Gemini] Successfully parsed JSON response:",
        parsedResponse
      );
      return parsedResponse;
    } catch (parseError) {
      console.error("❌ [Gemini] Failed to parse JSON response:", parseError);
      console.error("❌ [Gemini] Raw response was:", cleanResponse);

      // محاولة استخراج action من النص كـ fallback - تحليل ذكي
      const lowerText = cleanResponse.toLowerCase();
      const originalText = cleanResponse;

      console.log("🔄 [Gemini] Starting fallback parsing...");
      console.log("🔄 [Gemini] Lower text:", lowerText);

      // فحص أقوى للكلمات المفتاحية بالعامية السعودية
      const trackKeywords = [
        "track",
        "تتبع",
        "تابع",
        "شحنة",
        "رقم",
        "tracking",
        "shipment",
        "شوف وين",
        "وريني وين",
        "فين",
        "وين وصلت",
      ];
      const createKeywords = [
        "create",
        "إنشاء",
        "انشاء",
        "جديدة",
        "شحنة جديدة",
        "إضافة",
        "أشحن",
        "أرسل",
        "أحتاج أشحن",
        "أبي أشحن",
      ];
      const balanceKeywords = [
        "balance",
        "رصيد",
        "محفظة",
        "كم رصيد",
        "فلوس",
        "فلوسي",
        "رصيدي",
        "رصيدك",
      ];
      const listKeywords = [
        "list",
        "عرض",
        "شحناتي",
        "قائمة",
        "shipments",
        "شحنات",
        "كم شحناتي",
        "عدد شحناتي",
        "شحناتي كلها",
      ];
      const cancelKeywords = ["cancel", "إلغاء", "الغاء", "ألغي"];

      // تتبع شحنة - أولوية عالية
      if (trackKeywords.some((keyword) => originalText.includes(keyword))) {
        const trackingMatch = originalText.match(/(\d{6,})/); // أرقام 6 أو أكثر
        if (trackingMatch) {
          console.log(
            "🔄 [Gemini] Fallback: TRACK_SHIPMENT detected with number:",
            trackingMatch[1]
          );
          return {
            intent: "TRACK",
            confidence: 0.95,
            missing_fields: [],
            message: "تمام، خلني أجيبلك بيانات الشحنة الحين...",
            data: { tracking_number: trackingMatch[1] },
          };
        }
      }

      // إنشاء شحنة
      if (createKeywords.some((keyword) => originalText.includes(keyword))) {
        console.log("🔄 [Gemini] Fallback: CREATE_SHIPMENT detected");
        return {
          intent: "CREATE",
          confidence: 0.8,
          missing_fields: ["recipient_name", "phone", "weight"],
          message: "تمام 👍 لمين الشحنة؟",
          data: {},
        };
      }

      // رصيد المحفظة
      if (balanceKeywords.some((keyword) => originalText.includes(keyword))) {
        console.log("🔄 [Gemini] Fallback: GET_WALLET_BALANCE detected");
        return {
          intent: "BALANCE",
          confidence: 0.9,
          missing_fields: [],
          message: "تمام، خلني أجيبلك بيانات رصيدك من النظام...",
          data: {},
        };
      }

      // قائمة الشحنات
      if (listKeywords.some((keyword) => originalText.includes(keyword))) {
        console.log("🔄 [Gemini] Fallback: LIST_SHIPMENTS detected");
        return {
          intent: "LIST",
          confidence: 0.9,
          missing_fields: [],
          message: "تمام، خلني أجيبلك قائمة بشحناتك...",
          data: {},
        };
      }

      // إلغاء شحنة
      if (cancelKeywords.some((keyword) => originalText.includes(keyword))) {
        const cancelMatch = originalText.match(/(\d{3,})/);
        if (cancelMatch) {
          console.log(
            "🔄 [Gemini] Fallback: CANCEL_SHIPMENT detected with ID:",
            cancelMatch[1]
          );
          return {
            intent: "CANCEL",
            confidence: 0.9,
            missing_fields: [],
            message: "تمام، خلني ألغي الشحنة لك...",
            data: { shipment_id: cancelMatch[1] },
          };
        }
      }

      // إذا فشل كل شيء، أعد رسالة عدم فهم
      console.log("🔄 [Gemini] Fallback: Using CHAT_RESPONSE");
      return {
        intent: "CHAT",
        confidence: 0.5,
        missing_fields: [],
        message: "عذراً، لم أفهم طلبك. يرجى المحاولة مرة أخرى.",
        data: {},
      };
    }
  } catch (error) {
    console.error("❌ [Gemini] Error communicating with Gemini API:", error);

    // في حالة خطأ في API، أعد رسالة خطأ بالعربية
    let errorMessage = "عذراً، حدث خطأ تقني. يرجى المحاولة لاحقاً.";

    // تخصيص رسالة الخطأ حسب نوع الخطأ
    if (error.message && error.message.includes("API_KEY")) {
      errorMessage = "عذراً، مفتاح الذكاء الاصطناعي غير متوفر.";
    } else if (error.message && error.message.includes("quota")) {
      errorMessage = "عذراً، تم تجاوز الحد المسموح للاستخدام.";
    } else if (error.message && error.message.includes("network")) {
      errorMessage = "عذراً، مشكلة في الاتصال بالإنترنت.";
    } else if (error.message && error.message.includes("model")) {
      errorMessage = "عذراً، نموذج الذكاء الاصطناعي غير متوفر حالياً.";
    }

    return {
      intent: "CHAT",
      confidence: 0.5,
      missing_fields: [],
      message: errorMessage,
      data: {},
    };
  }
}

/**
 * معالجة الرد من Gemini وتنفيذ العمليات
 */
async function processGeminiResponse(
  geminiResponse,
  services,
  userId = null,
  userInfo = null
) {
  const { intent, confidence, missing_fields, message, data } = geminiResponse;

  // الحصول على اسم العميل
  const userName = userInfo
    ? `${userInfo.firstName || ""} ${userInfo.lastName || ""}`.trim() ||
      "عميلنا الكريم"
    : "عميلنا الكريم";

  console.log(
    "🔄 [Gemini] Processing intent:",
    intent,
    "confidence:",
    confidence,
    "missing_fields:",
    missing_fields,
    "user:",
    userName
  );

  try {
    console.log("🔄 [Gemini] Starting to process intent:", intent);
    console.log("🔄 [Gemini] Services available:", !!services);
    console.log("🔄 [Gemini] Services methods:", Object.keys(services || {}));

    // تحديث stateManager إذا كان userId متوفر
    if (userId && intent !== "CHAT") {
      stateManager.updateState(userId, {
        currentIntent: intent,
        lastAction: intent,
      });

      // حفظ البيانات المجموعة
      if (data) {
        Object.keys(data).forEach((key) => {
          stateManager.addCollectedData(userId, key, data[key]);
        });
      }
    }

    // التحقق من confidence قبل تنفيذ العمليات
    if (intent !== "CHAT" && confidence < 0.8) {
      return {
        success: true,
        intent: "CHAT",
        result: { message: "ما فهمت قصدك تماماً. وش تقصد بالضبط؟" },
        message: "ما فهمت قصدك تماماً. وش تقصد بالضبط؟",
      };
    }

    switch (intent) {
      case "TRACK":
        if (!data || !data.tracking_number) {
          return {
            success: true,
            intent: "TRACK",
            result: {
              message: "أحتاج رقم التتبع عشان أتبع الشحنة لك. وش رقم التتبع؟",
            },
            message: "أحتاج رقم التتبع عشان أتبع الشحنة لك. وش رقم التتبع؟",
          };
        }
        const trackingResult = await services.shipmentService.trackShipment(
          data.tracking_number
        );
        return {
          success: true,
          intent: "TRACK",
          result: trackingResult,
          message: trackingResult.success
            ? `تمام ${userName} 👍 الشحنة ${trackingResult.status || "وصلت"}`
            : "ما لقيت شحنة بهالرقم. تأكد من الرقم وجرب مرة ثانية.",
        };

      case "CREATE":
        if (missing_fields && missing_fields.length > 0) {
          // اسأل عن الحقل المفقود الأول
          const field = missing_fields[0];
          const fieldMessages = {
            recipient_name: `تمام ${userName} 👍 وش اسم المستلم؟`,
            phone: `تمام ${userName}، وش رقم جوال المستلم؟`,
            weight: `ممتاز ${userName}، كم وزن الشحنة بالكيلو؟`,
            address: `تمام ${userName}، وش عنوان المستلم؟`,
            city: `وش مدينة المستلم ${userName}؟`,
          };
          const question =
            fieldMessages[field] || `أحتاج ${field}. وش قيمته ${userName}؟`;
          return {
            success: true,
            intent: "CREATE",
            result: { message: question },
            message: question,
          };
        }

        if (
          confidence >= 0.8 &&
          (!missing_fields || missing_fields.length === 0)
        ) {
          const createResult =
            await services.shipmentService.createShipmentFromAI(data);
          if (createResult.success) {
            // مسح الحالة بعد الإنشاء الناجح
            if (userId) {
              stateManager.clearState(userId);
            }
          }
          return {
            success: createResult.success,
            intent: "CREATE",
            result: createResult,
            message: createResult.success
              ? `تمام ${userName} 👍 تم إنشاء الشحنة! رقم التتبع: ${
                  createResult.trackingNumber || "غير محدد"
                }`
              : createResult.message || "صار خطأ في إنشاء الشحنة.",
          };
        }

        return {
          success: true,
          intent: "CREATE",
          result: {
            message:
              "ما عندي معلومات كافية. أحتاج اسم المستلم ورقم الجوال والوزن على الأقل.",
          },
          message:
            "ما عندي معلومات كافية. أحتاج اسم المستلم ورقم الجوال والوزن على الأقل.",
        };

      case "CANCEL":
        if (!data || !data.shipment_id) {
          return {
            success: true,
            intent: "CANCEL",
            result: {
              message: "أحتاج رقم الشحنة أو معرفها عشان ألغيها. وش رقم الشحنة؟",
            },
            message: "أحتاج رقم الشحنة أو معرفها عشان ألغيها. وش رقم الشحنة؟",
          };
        }
        const cancelResult = await services.shipmentService.cancelShipment(
          data.shipment_id
        );
        return {
          success: cancelResult.success,
          intent: "CANCEL",
          result: cancelResult,
          message: cancelResult.success
            ? `تمام ${userName} 👍 تم إلغاء الشحنة.`
            : cancelResult.message || "ما قدرت ألغي الشحنة.",
        };

      case "BALANCE":
        console.log("💰 [Balance] Processing BALANCE intent");
        const balanceResult = await services.walletService.getBalance();
        console.log("💰 [Balance] Balance result:", balanceResult);
        return {
          success: true,
          intent: "BALANCE",
          result: balanceResult,
          message: `رصيدك الحين ${userName}: ${
            balanceResult.balance || 0
          } ريال 👍`,
        };

      case "LIST":
        const shipmentsResult =
          await services.shipmentService.getUserShipments();
        return {
          success: true,
          intent: "LIST",
          result: shipmentsResult,
          message:
            shipmentsResult.shipments && shipmentsResult.shipments.length > 0
              ? `عندك ${
                  shipmentsResult.shipments.length
                } شحنة ${userName}. آخر شحنة: ${
                  shipmentsResult.shipments[0].trackingId || "غير محدد"
                }`
              : "ما عندك شحنات حالية.",
        };

      case "CHAT":
      default:
        return {
          success: true,
          intent: "CHAT",
          result: {
            message: message || "أهلاً! كيف أقدر أساعدك في شحناتك اليوم؟",
          },
          message: message || "أهلاً! كيف أقدر أساعدك في شحناتك اليوم؟",
        };
    }
  } catch (error) {
    console.error("❌ [Gemini] Error executing intent:", intent, error);
    return {
      success: false,
      intent: "CHAT",
      result: { message: "صار خطأ تقني. جرب مرة ثانية بعد شوي." },
      message: "صار خطأ تقني. جرب مرة ثانية بعد شوي.",
    };
  }
}

module.exports = {
  sendToGemini,
  processGeminiResponse,
  extractIntent,
  buildContext,
  quickKeywordParse,
  stateManager,
};
