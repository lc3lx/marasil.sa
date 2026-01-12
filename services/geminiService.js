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

const SYSTEM_PROMPT = `أنت مساعد خدمة عملاء شحنات سعودي ذكي ومحترف جداً. أنت تتحدث بالعربية الفصحى مع اللهجة السعودية الطبيعية.

مهمتك: فهم النية من رسائل العملاء ومساعدتهم بطريقة طبيعية جداً مثل موظف خدمة عملاء سعودي محترف.

=== قواعد هامة ===
1. استخدم السياق من المحادثات السابقة دائماً
2. لا تكرر أسئلة تم الإجابة عليها
3. كن ودوداً ومحترفاً ومباشراً
4. إذا كنت بحاجة لمعلومات إضافية، اسأل بلباقة
5. اللهجة السعودية الطبيعية: "تمام 👍", "ما عندك مشكلة", "بالضبط", "وش تحتاجه"

=== صيغة الرد (JSON فقط) ===
{
  "intent": "CREATE | TRACK | CANCEL | BALANCE | LIST | CHAT",
  "confidence": 0.0-1.0,
  "missing_fields": ["recipient_name", "phone", "weight"],
  "message": "رسالة ودية بالعامية السعودية",
  "data": {"tracking_number": "123", "recipient_name": "أحمد"}
}

=== أمثلة للردود ===

بدء إنشاء شحنة:
{"intent": "CREATE", "confidence": 0.8, "missing_fields": ["recipient_name"], "message": "تمام 👍 لمين الشحنة؟", "data": {}}

تتبع شحنة:
{"intent": "TRACK", "confidence": 0.95, "missing_fields": [], "message": "", "data": {"tracking_number": "50724610926"}}

عرض الرصيد:
{"intent": "BALANCE", "confidence": 0.9, "missing_fields": [], "message": "", "data": {}}

قائمة الشحنات:
{"intent": "LIST", "confidence": 0.9, "missing_fields": [], "message": "", "data": {}}

محادثة عامة:
{"intent": "CHAT", "confidence": 0.6, "missing_fields": [], "message": "أهلاً! وش أقدر أساعدك فيه اليوم؟", "data": {}}

إلغاء شحنة:
{"intent": "CANCEL", "confidence": 0.9, "missing_fields": [], "message": "", "data": {"shipment_id": "123"}}

=== تذكير ===
- intent=CHAT للتحيات والأسئلة العامة
- confidence >= 0.8 لتنفيذ العمليات الفعلية
- missing_fields فارغ للعمليات الجاهزة
- كن مباشراً ولطيفاً`;

/**
 * تحليل سريع للرسالة بناءً على الكلمات المفتاحية
 */
function quickKeywordParse(message) {
  const lowerMessage = message.toLowerCase().trim();

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
    return {
      action: "GET_WALLET_BALANCE",
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
    return { action: "LIST_SHIPMENTS" };
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
        action: "CANCEL_SHIPMENT",
        data: { shipment_id: numberMatch[1] },
      };
    }
  }

  // تحقق سريع للكلمات الأساسية مع ردود ذكية متنوعة
  if (lowerMessage.includes("كيفك") || lowerMessage.includes("كيف حالك")) {
    console.log("🚀 [Fallback] Detected 'كيفك' greeting!");
    return {
      action: "CHAT_RESPONSE",
      message:
        "الحمد لله بخير! 😊\n\nأنا **مساعد مراسيل الذكي** 🤖 جاهز لخدمتك 🇸🇦\n\n✨ أقدر أساعدك في:\n• 📦 إنشاء وتتبع الشحنات\n• 💰 معرفة رصيدك\n• 📋 عرض شحناتك\n• ❓ أي سؤال عن الشحن\n\nوش تحتاجه اليوم؟ 🚀",
    };
  }

  if (lowerMessage.includes("السلام عليكم")) {
    console.log("🚀 [Fallback] Detected Islamic greeting!");
    return {
      action: "CHAT_RESPONSE",
      message:
        "وعليكم السلام ورحمة الله وبركاته! 🤲\n\nأنا **مساعد مراسيل الذكي** 🤖 - متخصص في شحنات السعودية 🇸🇦\n\n✨ جاهز لخدمتك في كل ما يخص الشحن:\n• 📦 إنشاء شحنة جديدة\n• 🔍 تتبع شحناتك\n• 💰 رصيد محفظتك\n• 📋 شحناتك الموجودة\n\nكيف أقدر أساعدك؟ 😊",
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
      action: "CHAT_RESPONSE",
      message:
        "هاي! مرحباً بك 🤝\n\nأنا **مساعد مراسيل الذكي** 🤖 - هنا عشان أساعدك في شحناتك 🇸🇦\n\n✨ أقدر أعمل لك:\n• 📦 شحنة جديدة\n• 🔍 تتبع شحنتك\n• 💰 شوف رصيدك\n• 📋 عرض شحناتك\n\nوش تبي تسوي؟ 😊",
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
      action: "CHAT_RESPONSE",
      message:
        "🤖 **أنا مساعد مراسيل الذكي!** 🛠️\n\nأنا نظام ذكاء اصطناعي متخصص في مساعدة تجار السعودية 🇸🇦 في كل ما يخص الشحن والشحنات.\n\n✨ **أقدر أساعدك في**:\n• 📦 إنشاء وتتبع الشحنات\n• 💰 معرفة رصيد المحفظة\n• 📋 عرض الشحنات الموجودة\n• 🏢 معلومات عن الشركات والأسعار\n• ❓ إجابة على أي سؤال\n\nقلي وش تحتاجه وسأساعدك فوراً! 🚀\n\n#مراسيل #شحن_ذكي",
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
      action: "CHAT_RESPONSE",
      message:
        "الحمد لله بخير! 😊\n\nأنا **مساعد مراسيل الذكي** 🤖 جاهز لخدمتك 🇸🇦\n\n✨ أقدر أساعدك في:\n• 📦 إنشاء وتتبع الشحنات\n• 💰 معرفة رصيدك\n• 📋 عرض شحناتك\n• ❓ أي سؤال عن الشحن\n\nوش تحتاجه اليوم؟ 🚀",
    };
  }

  if (
    lowerMessage.includes("السلام عليكم") ||
    cleanMessage.includes("السلام عليكم")
  ) {
    console.log("✅ [Greetings] Detected Islamic greeting!");
    return {
      action: "CHAT_RESPONSE",
      message:
        "وعليكم السلام ورحمة الله وبركاته! 🤲\n\nأنا **مساعد مراسيل الذكي** 🤖 - متخصص في شحنات السعودية 🇸🇦\n\n✨ جاهز لخدمتك في كل ما يخص الشحن:\n• 📦 إنشاء شحنة جديدة\n• 🔍 تتبع شحناتك\n• 💰 رصيد محفظتك\n• 📋 شحناتك الموجودة\n\nكيف أقدر أساعدك؟ 😊",
    };
  }

  if (greetingInLower || greetingInClean) {
    console.log("✅ [Greetings] Detected casual greeting!");
    return {
      action: "CHAT_RESPONSE",
      message:
        "هاي! مرحباً بك 🤝\n\nأنا **مساعد مراسيل الذكي** 🤖 - هنا عشان أساعدك في شحناتك 🇸🇦\n\n✨ أقدر أعمل لك:\n• 📦 شحنة جديدة\n• 🔍 تتبع شحنتك\n• 💰 شوف رصيدك\n• 📋 عرض شحناتك\n\nوش تبي تسوي؟ 😊",
    };
  }

  // أسئلة عن الشركة - باللهجة السعودية
  const companyPatterns = ["مراسيل", "الشركة", "about", "من", "عن"];
  if (
    companyPatterns.some((pattern) => cleanMessage.includes(pattern)) &&
    (cleanMessage.includes("هي") || cleanMessage.includes("مراسيل"))
  ) {
    return {
      action: "CHAT_RESPONSE",
      message:
        "🏢 **مراسيل - منصة الشحن الذكية في السعودية!** 🇸🇦\n\n⭐ **رؤيتنا**: نساعد التجار الإلكترونيين يشحنون بسهولة وأمان\n\n🚀 **خدماتنا الرائعة**:\n• شحن سريع لجميع مدن السعودية\n• تتبع فوري ورقمي\n• محفظة إلكترونية آمنة\n• دعم فني 24/7\n• شراكة مع أفضل شركات الشحن\n\n📞 **للتواصل**: support@marasil.com\n\nنحن هنا لنجعل الشحن أسهل عليك! 🤝",
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
      action: "CHAT_RESPONSE",
      message:
        "🚛 **شركاء الشحن في مراسيل - نختر لك الأحسن!**\n\n🏆 **ARAMEX - الأسرع!**\n• توصيل في نفس اليوم للمدن الكبيرة\n• تغطية شاملة لكل السعودية\n• تتبع متقدم ورائع\n\n🚚 **SMSA - الموثوقة**\n• مثالية للشحنات الكبيرة\n• خدمة آمنة ومحترفة\n• شبكة توصيل واسعة\n\n✈️ **DHL - العالمية**\n• شحن دولي ومحلي\n• ضمان عالي للسلامة\n• تتبع عالمي سريع\n\n💡 **نصيحة**: اختر الشركة حسب حجم الشحنة وسرعة التوصيل المطلوبة!\n\nقلي تفاصيل الشحنة وأختار لك الشركة المناسبة! 😉",
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
      action: "CHAT_RESPONSE",
      message:
        "🎯 **خدمات مراسيل اللي راح تحبها!**\n\n📦 **إنشاء الشحنات**\n• سهلة وبسيطة زي الماء\n• حساب التكلفة تلقائي\n• اختيار الشركة المناسبة\n\n🔍 **تتبع الشحنات**\n• تتبع فوري برقم الشحنة\n• إشعارات على الجوال\n• تحديثات كل ساعة\n\n💳 **المحفظة الإلكترونية**\n• شحن رصيد سريع\n• دفع آمن 100%\n• تتبع معاملاتك\n\n📊 **تقارير وإحصائيات**\n• تقارير مفصلة\n• تحليل أداء الشحن\n• إحصائيات المبيعات\n\n🛡️ **أمان وضمان**\n• تشفير كامل\n• ضمان سلامة الشحنات\n• دعم فني على مدار الساعة\n\nراح تحب تجربتنا! 😍",
    };
  }

  // أسئلة عن الأسعار - باللهجة السعودية
  const pricePatterns = ["سعر", "تكلفة", "كم التكلفة", "price", "cost", "كم"];
  if (
    pricePatterns.some((pattern) => cleanMessage.includes(pattern)) &&
    (cleanMessage.includes("شحن") || cleanMessage.includes("تكلفة"))
  ) {
    return {
      action: "CHAT_RESPONSE",
      message:
        '💰 **أسعارنا في مراسيل - تنافسية وواضحة!**\n\n📏 **حساب التكلفة التلقائي**:\n• حسب الوزن والمسافة\n• مختلف حسب الشركة\n• شفافية كاملة\n\n💡 **العوامل اللي تؤثر على السعر**:\n• وزن الشحنة (كيلو)\n• المسافة بين المدن\n• حجم الطرد\n• شركة الشحن\n\n🎁 **عروضنا الحلوة**:\n• خصم 20% على أول شحنة\n• شحن مجاني فوق 500 ريال\n• خصومات شهرية\n\n💬 قلي تفاصيل الشحنة وأحسب لك التكلفة بدقة!\n\nمثال: "شحنة 2 كيلو من الرياض لجدة" 🤔',
    };
  }

  // أسئلة عن التتبع
  if (
    (lowerMessage.includes("تتبع") && !lowerMessage.includes("شحنة")) ||
    lowerMessage.includes("tracking") ||
    lowerMessage.includes("كيف أتتبع")
  ) {
    return {
      action: "CHAT_RESPONSE",
      message:
        '🔍 **كيف تتبع شحناتك في مراسيل**:\n\n📱 **طرق التتبع**:\n• من خلال لوحة التحكم\n• عبر رقم الشحنة\n• تطبيق الهاتف\n• إشعارات البريد الإلكتروني\n\n📊 **حالات الشحنة**:\n• تم الاستلام\n• في المستودع\n• في الطريق\n• تم التسليم\n• فشل في التسليم\n\n⚡ **التحديثات الفورية**:\n• تحديث كل ساعة\n• إشعارات فورية\n• تاريخ زمني مفصل\n\n💬 قل لي: "تتبع الشحنة رقم 123456" وسأساعدك فوراً!',
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
      action: "CHAT_RESPONSE",
      message:
        "🛠️ **دعم مراسيل - نحن هنا لمساعدتك!**\n\n📞 **طرق التواصل**:\n• الدردشة الذكية (أنا هنا!)\n• البريد الإلكتروني: support@marasil.com\n• الهاتف: 9200xxxxx\n• الواتساب: +966xxxxxxxx\n\n🕐 **أوقات العمل**:\n• 24/7 للطوارئ\n• الدعم الفني: 8 صباحاً - 8 مساءً\n• الدعم المالي: 9 صباحاً - 5 مساءً\n\n❓ **الأسئلة الشائعة**:\n• مشاكل التتبع\n• مشاكل الدفع\n• إلغاء الشحنات\n• استرداد الأموال\n\n💬 قل لي ما المشكلة التي تواجهها وسأساعدك!",
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
      action: "CHAT_RESPONSE",
      message:
        '📝 **إنشاء حساب في مراسيل - سهل وبسيط!**\n\n✨ **خطوات التسجيل**:\n1. اضغط على "إنشاء حساب"\n2. أدخل بريدك الإلكتروني\n3. أدخل معلوماتك الأساسية\n4. فعل حسابك عبر البريد\n\n🎁 **مزايا العضوية**:\n• حفظ عناوين الشحن\n• تتبع سريع للطلبات\n• محفظة إلكترونية\n• تقارير مفصلة\n• دعم فني مخصص\n\n🔐 **الأمان والخصوصية**:\n• تشفير البيانات\n• حماية معلوماتك\n• معاملات آمنة 100%\n\n🚀 سجل الآن وبدأ رحلتك مع أفضل خدمات الشحن في السعودية!',
    };
  }

  // شكر ووداع
  if (
    lowerMessage.includes("شكرا") ||
    lowerMessage.includes("thank") ||
    lowerMessage.includes("thanks")
  ) {
    return {
      action: "CHAT_RESPONSE",
      message:
        "🙏 **العفو! يسعدني مساعدتك**\n\n⭐ إذا كان لديك أي استفسار آخر، لا تتردد في السؤال. نحن في مراسيل دائماً هنا لخدمتك!\n\n🌟 **نصيحة**: تابعنا على وسائل التواصل للعروض والتحديثات:\n📘 فيسبوك | 📷 إنستغرام | 🐦 تويتر\n\nمع خالص التحية،\nفريق مراسيل 🤝",
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
      action: "CHAT_RESPONSE",
      message:
        "🗺️ **تغطية مراسيل الشاملة في السعودية**:\n\n🏙️ **المدن الرئيسية**:\n• الرياض - التغطية الكاملة\n• جدة - ميناء ووسط المدينة\n• مكة المكرمة - المنطقة المقدسة\n• المدينة المنورة - التغطية الشاملة\n• الدمام - المنطقة الشرقية\n• الخبر - الميناء الشرقي\n\n🏘️ **المدن الأخرى**:\n• الطائف • تبوك • حائل\n• أبها • جازان • نجران\n• الباحة • القصيم • حفر الباطن\n\n⚡ **خدماتنا تشمل**:\n• التوصيل للمنازل والشركات\n• نقاط الاستلام في جميع المدن\n• التوصيل في نفس اليوم للمدن الرئيسية\n• تغطية 100% من أراضي المملكة\n\n🚀 **سرعة التوصيل**:\n• داخل المدينة: 1-2 أيام\n• بين المدن: 2-4 أيام\n• الطلبات العاجلة: في نفس اليوم",
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
      action: "CHAT_RESPONSE",
      message:
        "🔒 **الأمان والضمان في مراسيل - أولويتنا الأولى!**\n\n🛡️ **أمان البيانات**:\n• تشفير SSL لجميع المعاملات\n• حماية بياناتك الشخصية 100%\n• نظام أمان مصرفي معتمد\n\n📦 **سلامة الشحنات**:\n• تغليف آمن لجميع الطرود\n• تتبع GPS لكل شحنة\n• تأمين شامل على الشحنات الثمينة\n• مسؤولية كاملة عن الخسائر\n\n💰 **الضمان المالي**:\n• استرداد كامل في حال الضياع\n• تعويض فوري للتلف\n• ضمان جودة الخدمة\n\n📋 **الشهادات والاعتمادات**:\n• اعتماد الهيئة العامة للنقل\n• شهادة الأيزو للجودة\n• عضوية غرفة التجارة\n\n✨ **نحن نضمن سلامة شحناتك 100%**",
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
      action: "CHAT_RESPONSE",
      message:
        "🎉 **عروض وخصومات مراسيل الحالية!**\n\n🔥 **عروض شهر نوفمبر**:\n• خصم 20% على أول شحنة\n• شحن مجاني للطلبات فوق 500 ريال\n• خصم 15% على الشحن الشهري\n\n🎁 **عروض خاصة للعملاء الجدد**:\n• رصيد مجاني 50 ريال عند التسجيل\n• خصم 30% على أول 3 شحنات\n• استشارة مجانية لتحسين الشحن\n\n🏆 **عروض للعملاء الدائمين**:\n• نقاط مكافآت على كل شحنة\n• خصومات تصل إلى 50% للكميات الكبيرة\n• أولوية في التوصيل\n\n📱 **كيف تحصل على العروض**:\n• اشترك في النشرة البريدية\n• تابعنا على وسائل التواصل\n• سجل في التطبيق\n\n💬 اسألني عن كود خصم محدد لتحصل على عرض خاص!",
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
      action: "CHAT_RESPONSE",
      message:
        "📱 **تطبيق وموقع مراسيل - سهولة في متناول يديك!**\n\n🌐 **الموقع الإلكتروني**:\n• تصميم متجاوب مع جميع الأجهزة\n• واجهة سهلة باللغة العربية\n• لوحة تحكم شاملة\n• متاح 24/7\n\n📲 **تطبيق الهاتف**:\n• متاح للأندرويد والآيفون\n• إشعارات فورية للشحنات\n• مسح QR للتتبع السريع\n• واجهة مبسطة للاستخدام\n\n✨ **مميزات إضافية**:\n• حفظ العناوين المفضلة\n• تاريخ الشحنات الكامل\n• تقارير مفصلة\n• دعم فني مباشر\n\n⬇️ **تحميل التطبيق**:\n• 📱 Google Play: [رابط]\n• 🍎 App Store: [رابط]\n\n💻 **زور موقعنا**: www.marasil.com",
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
      action: "CHAT_RESPONSE",
      message:
        "⚡ **أوقات التوصيل في مراسيل - سرعة ودقة!**\n\n🚀 **خدمة التوصيل السريع**:\n• **نفس اليوم**: للطلبات قبل الظهر\n• **غداً**: للطلبات المسائية\n• **2-3 أيام**: بين المدن الرئيسية\n\n📅 **مواعيد التوصيل**:\n• السبت - الخميس: 8 صباحاً - 8 مساءً\n• الجمعة: 4 مساءً - 12 صباحاً\n• العطلات الرسمية: حسب الجدول\n\n🏙️ **التوصيل حسب المناطق**:\n• **الرياض**: 1-2 يوم\n• **جدة**: 1-2 يوم\n• **مكة**: 1-3 أيام\n• **المدن البعيدة**: 3-5 أيام\n\n📦 **عوامل تؤثر على الوقت**:\n• حجم ووزن الشحنة\n• المسافة والمنطقة\n• شركة الشحن المختارة\n• الظروف الجوية\n\n💡 **نصائح لتسريع التوصيل**:\n• أكمل البيانات بدقة\n• اختر خدمة VIP\n• استخدم نقاط الاستلام",
    };
  }

  // أسئلة عن إلغاء الشحنات
  if (
    (lowerMessage.includes("إلغاء") && !lowerMessage.includes("شحنة")) ||
    (lowerMessage.includes("cancel") && lowerMessage.includes("how")) ||
    lowerMessage.includes("كيف ألغي")
  ) {
    return {
      action: "CHAT_RESPONSE",
      message:
        '❌ **سياسة إلغاء الشحنات في مراسيل**:\n\n⏰ **فترة الإلغاء المسموحة**:\n• قبل مغادرة الشحنة من المستودع\n• خلال 24 ساعة من إنشاء الطلب\n• قبل تأكيد الاستلام من الشركة\n\n💰 **سياسة الاسترداد**:\n• استرداد كامل خلال 24 ساعة\n• استرداد جزئي بعد 24 ساعة\n• رسوم إلغاء 10 ريال للطلبات الكبيرة\n\n📋 **خطوات الإلغاء**:\n1. اذهب إلى قائمة الشحنات\n2. اختر الشحنة المطلوب إلغاؤها\n3. اضغط "إلغاء الطلب"\n4. حدد سبب الإلغاء\n\n⚠️ **ملاحظات مهمة**:\n• لا يمكن إلغاء الشحنات المسلمة\n• الشحنات في الطريق قد تكلف رسوم\n• الاسترداد يستغرق 3-5 أيام عمل\n\n💬 قل لي: "ألغِ الشحنة رقم 123" وسأساعدك فوراً!',
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
      action: "CHAT_RESPONSE",
      message:
        '😅 **يا عيوني! أنا مساعد مراسيل الذكي هنا عشان أساعدك** 🤝\n\nأنا أفهم اللهجة السعودية بس أحياناً أحتاج شرح أوضح! 📝\n\n✨ قلي بوضوح وش تبي أعمل:\n• 📦 "أريد أنشئ شحنة جديدة"\n• 🔍 "تابع شحنة رقم 123456"\n• 💰 "شوف رصيدي كم"\n• 📋 "وريني شحناتي"\n\nأو قلي المشكلة بالتفصيل وأحلها لك فوراً! 🔧\n\nما تيأس، أنا هنا دايماً لخدمتك! 😊',
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
      action: "CHAT_RESPONSE",
      message:
        '🎯 **أنا مساعد مراسيل الذكي!** 🤖\n\nأنا متخصص في مساعدة تجار السعودية في كل ما يخص الشحن 🇸🇦\n\n✨ **أقدر أساعدك في كلشي**:\n\n📦 **الشحنات**:\n• أنشئ شحنة جديدة لك\n• أتبع شحناتك لحظة بلحظة\n• ألغي أو أعدل في الشحنات\n\n💰 **المحفظة والفلوس**:\n• أشوف رصيدك كم\n• أشحن رصيد جديد\n• أراقب معاملاتك\n\n🏢 **معلومات الشركة**:\n• أحكي لك عن مراسيل\n• أعرفك على شركات الشحن\n• أوضح الأسعار والعروض\n\n📞 **الدعم والمساعدة**:\n• أحل مشاكلك\n• أجاوب على أسئلتك\n• أوصلك بالفريق\n\n💬 **جرب تسألني**:\n• "كم رصيدي؟"\n• "أريد أشحن شيء"\n• "ما هي شركات الشحن؟"\n• "كيف أتبع الشحنة؟"\n\nأنا هنا دايماً لخدمتك! 🚀',
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
  ];
  if (balancePatterns.some((pattern) => cleanMessage.includes(pattern))) {
    return { action: "GET_WALLET_BALANCE" };
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
  ];
  if (
    createShipmentPatterns.some((pattern) => cleanMessage.includes(pattern))
  ) {
    return { action: "CREATE_SHIPMENT", data: {} };
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
  ];
  if (trackShipmentPatterns.some((pattern) => cleanMessage.includes(pattern))) {
    const numberMatch = message.match(/(\d{6,})/);
    if (numberMatch) {
      return {
        action: "TRACK_SHIPMENT",
        data: { tracking_number: numberMatch[1] },
      };
    }
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
async function sendToGemini(userMessage, context = "", userId = null) {
  try {
    console.log("🎯 [Gemini] Processing user message:", userMessage);

    // أولاً: محاولة keyword-based parsing للأوامر البسيطة
    console.log("🎯 [Gemini] Processing user message:", userMessage);
    const quickResult = quickKeywordParse(userMessage);
    console.log("🎯 [Gemini] Quick result:", quickResult);
    if (quickResult) {
      console.log("⚡ [Gemini] Quick parse success:", quickResult.action);
      return quickResult;
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
العميل: ${userId || "غير محدد"}

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
            action: "TRACK_SHIPMENT",
            data: { tracking_number: trackingMatch[1] },
          };
        }
      }

      // إنشاء شحنة
      if (createKeywords.some((keyword) => originalText.includes(keyword))) {
        console.log("🔄 [Gemini] Fallback: CREATE_SHIPMENT detected");
        return {
          action: "CREATE_SHIPMENT",
          data: {},
        };
      }

      // رصيد المحفظة
      if (balanceKeywords.some((keyword) => originalText.includes(keyword))) {
        console.log("🔄 [Gemini] Fallback: GET_WALLET_BALANCE detected");
        return {
          action: "GET_WALLET_BALANCE",
        };
      }

      // قائمة الشحنات
      if (listKeywords.some((keyword) => originalText.includes(keyword))) {
        console.log("🔄 [Gemini] Fallback: LIST_SHIPMENTS detected");
        return {
          action: "LIST_SHIPMENTS",
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
            action: "CANCEL_SHIPMENT",
            data: { shipment_id: cancelMatch[1] },
          };
        }
      }

      // إذا فشل كل شيء، أعد رسالة عدم فهم
      console.log("🔄 [Gemini] Fallback: Using CHAT_RESPONSE");
      return {
        action: "CHAT_RESPONSE",
        message: "عذراً، لم أفهم طلبك. يرجى المحاولة مرة أخرى.",
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
      action: "CHAT_RESPONSE",
      message: errorMessage,
    };
  }
}

/**
 * معالجة الرد من Gemini وتنفيذ العمليات
 */
async function processGeminiResponse(geminiResponse, services, userId = null) {
  const { intent, confidence, missing_fields, message, data } = geminiResponse;

  console.log(
    "🔄 [Gemini] Processing intent:",
    intent,
    "confidence:",
    confidence,
    "missing_fields:",
    missing_fields
  );

  try {
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
        action: "CHAT_RESPONSE",
        result: { message: "ما فهمت قصدك تماماً. وش تقصد بالضبط؟" },
        message: "ما فهمت قصدك تماماً. وش تقصد بالضبط؟",
      };
    }

    switch (intent) {
      case "TRACK":
        if (!data || !data.tracking_number) {
          return {
            success: true,
            action: "CHAT_RESPONSE",
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
          action: "TRACK_SHIPMENT",
          result: trackingResult,
          message: trackingResult.success
            ? `تمام 👍 الشحنة ${trackingResult.status || "وصلت"}`
            : "ما لقيت شحنة بهالرقم. تأكد من الرقم وجرب مرة ثانية.",
        };

      case "CREATE":
        if (missing_fields && missing_fields.length > 0) {
          // اسأل عن الحقل المفقود الأول
          const field = missing_fields[0];
          const fieldMessages = {
            recipient_name: "وش اسم المستلم؟",
            phone: "وش رقم جوال المستلم؟",
            weight: "كم وزن الشحنة بالكيلو؟",
            address: "وش عنوان المستلم؟",
            city: "وش مدينة المستلم؟",
          };
          const question = fieldMessages[field] || `أحتاج ${field}. وش قيمته؟`;
          return {
            success: true,
            action: "CHAT_RESPONSE",
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
            action: "CREATE_SHIPMENT",
            result: createResult,
            message: createResult.success
              ? `تمام 👍 تم إنشاء الشحنة! رقم التتبع: ${
                  createResult.trackingNumber || "غير محدد"
                }`
              : createResult.message || "صار خطأ في إنشاء الشحنة.",
          };
        }

        return {
          success: true,
          action: "CHAT_RESPONSE",
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
            action: "CHAT_RESPONSE",
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
          action: "CANCEL_SHIPMENT",
          result: cancelResult,
          message: cancelResult.success
            ? "تمام 👍 تم إلغاء الشحنة."
            : cancelResult.message || "ما قدرت ألغي الشحنة.",
        };

      case "BALANCE":
        const balanceResult = await services.walletService.getBalance();
        return {
          success: true,
          action: "GET_WALLET_BALANCE",
          result: balanceResult,
          message: `رصيدك الحين: ${balanceResult.balance || 0} ريال 👍`,
        };

      case "LIST":
        const shipmentsResult =
          await services.shipmentService.getUserShipments();
        return {
          success: true,
          action: "LIST_SHIPMENTS",
          result: shipmentsResult,
          message:
            shipmentsResult.shipments && shipmentsResult.shipments.length > 0
              ? `عندك ${shipmentsResult.shipments.length} شحنة. آخر شحنة: ${
                  shipmentsResult.shipments[0].trackingId || "غير محدد"
                }`
              : "ما عندك شحنات حالية.",
        };

      case "CHAT":
      default:
        return {
          success: true,
          action: "CHAT_RESPONSE",
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
      action: "CHAT_RESPONSE",
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
