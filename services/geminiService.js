const { GoogleGenerativeAI } = require("@google/generative-ai");

// تهيئة Gemini API مع دعم لـ function calling
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * System Prompt الصارم للمساعد الذكي - محسن ليشمل وصف APIs وتفكير خطوة بخطوة
 */
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

=== تفكير خطوة بخطوة ===
قبل الرد، فكر خطوة بخطوة:
1. فهم السؤال: ما هي نية الزبون؟ (مثل تتبع، إنشاء، رصيد، إلخ)
2. تحديد الـ API المطلوب: بناءً على النية، اختر الـ API المناسب (مثل trackShipment للتتبع)
3. الوصول إلى البيانات: إذا لزم، استدعي الـ API للوصول إلى قاعدة البيانات
4. بناء الرد: اجعل الرد ودي، مفيد، ومطمئن

=== شرح مفصل للـ APIs المتاحة ===

استخدم هذه الـ APIs بناءً على فهم نية السؤال. لكل API شرح مفصل عن متى وكيف تستخدمه:

1. **shipmentService.trackShipment(tracking_number)**
   - **متى تستخدمه:** عندما يسأل التاجر عن حالة شحنة معينة أو يريد تتبع شحنة
   - **المعطيات:** tracking_number (رقم التتبع)
   - **ما يرد به:** حالة الشحنة، تاريخ الإنشاء، بيانات المستلم، التفاصيل
   - **أمثلة أسئلة:** "وين شحنتي رقم 123456"، "كيف حالة الشحنة"، "تابع الشحنة"
   - **عدم استخدامه:** إذا لم يحدد رقم التتبع

2. **shipmentService.createShipmentFromAI(data)**
   - **متى تستخدمه:** عندما يريد التاجر إنشاء شحنة جديدة ولديه جميع البيانات المطلوبة
   - **المعطيات المطلوبة:** recipient_name, phone, weight, address, city
   - **ما يرد به:** رقم التتبع الجديد، تأكيد الإنشاء
   - **أمثلة أسئلة:** "أريد أشحن شيء لأحمد"، "أضف شحنة جديدة"
   - **ملاحظة:** لا تستخدم إلا إذا كانت جميع البيانات متوفرة

3. **shipmentService.cancelShipment(shipment_id)**
   - **متى تستخدمه:** عندما يريد التاجر إلغاء شحنة محددة
   - **المعطيات:** shipment_id (معرف الشحنة)
   - **ما يرد به:** تأكيد الإلغاء أو رسالة خطأ إذا تعذر الإلغاء
   - **أمثلة أسئلة:** "ألغِ الشحنة رقم 123"، "أريد ألغي شحنتي"
   - **قيود:** لا يمكن إلغاء الشحنات التي تم تسليمها أو التي في الطريق

4. **shipmentService.getUserShipments()**
   - **متى تستخدمه:** عندما يسأل التاجر عن شحناته أو يريد رؤية قائمة الشحنات
   - **المعطيات:** لا يحتاج معطيات (يستخدم userId من الجلسة)
   - **ما يرد به:** قائمة الشحنات الأخيرة مع الحالات والتفاصيل
   - **أمثلة أسئلة:** "شحناتي"، "وريني شحناتي"، "كم شحنة عندي"

5. **walletService.getBalance()**
   - **متى تستخدمه:** عندما يسأل التاجر عن رصيده أو أمواله في المحفظة
   - **المعطيات:** لا يحتاج معطيات
   - **ما يرد به:** الرصيد الحالي بالريال السعودي
   - **أمثلة أسئلة:** "كم رصيدي"، "فلوسي كم"، "رصيد محفظتي"

6. **generalService.getCompanyInfo()**
   - **متى تستخدمه:** عندما يسأل التاجر عن مراسيل كشركة أو معلومات عامة
   - **المعطيات:** لا يحتاج معطيات
   - **ما يرد به:** معلومات عن الرؤية والخدمات والتواصل
   - **أمثلة أسئلة:** "ما هي مراسيل"، "معلومات عن الشركة"، "عن مراسيل"

7. **generalService.getShippingCompanies()**
   - **متى تستخدمه:** عندما يسأل التاجر عن شركات الشحن المتاحة أو يريد مقارنة
   - **المعطيات:** لا يحتاج معطيات
   - **ما يرد به:** قائمة شركات الشحن مع أسعارها ومدد التوصيل
   - **أمثلة أسئلة:** "ما هي شركات الشحن"، "أي شركة أختار"، "شركات التوصيل"

8. **generalService.getPricingInfo(data)**
   - **متى تستخدمه:** عندما يسأل التاجر عن الأسعار أو يريد حساب تكلفة شحنة
   - **المعطيات:** weight (الوزن)، distance (المسافة - اختياري)
   - **ما يرد به:** حساب التكلفة بناءً على الوزن والمسافة
   - **أمثلة أسئلة:** "كم تكلفة شحنة 2 كيلو"، "كم السعر للشحن"

=== كيفية اختيار الـ API المناسب ===

1. **فهم النية:** اقرأ السؤال بعناية وحدد ما يريده التاجر بالضبط
2. **التحقق من البيانات:** تأكد من توفر البيانات المطلوبة للـ API
3. **اختيار الـ API:** اختر الـ API الأنسب للنية
4. **استدعاء الـ API:** استخدم function calling لاستدعاء الـ API

إذا كان السؤال يتطلب API، حدد الـ intent واستدعيها عبر function calling.

=== صيغة الرد (JSON فقط) ===
{
  "intent": "CREATE | TRACK | CANCEL | BALANCE | LIST | CHAT | COMPANY_INFO | SHIPPING_COMPANIES | PRICING",
  "confidence": 0.0-1.0,
  "missing_fields": ["recipient_name", "phone", "weight"],
  "message": "رسالة ودية بالعامية السعودية",
  "data": {"tracking_number": "123", "recipient_name": "أحمد"},
  "api_call": {"name": "trackShipment", "params": {"tracking_number": "123"}}  // إضافة لـ function calling
}

=== شرح شامل لكل أقسام المنصة ===
// (ابقِ كما هو في الكود الأصلي)

=== حدود الصلاحيات ===
// (ابقِ كما هو)

=== أمثلة للردود مع أسماء العملاء ===

**مثال 1: تتبع شحنة**
السؤال: "وين شحنتي رقم 123456"
الرد: {"intent": "TRACK", "confidence": 0.95, "missing_fields": [], "message": "تمام أحمد، خلني أجيبلك بيانات الشحنة الحين...", "data": {"tracking_number": "123456"}, "api_call": {"name": "trackShipment", "params": {"tracking_number": "123456"}}}

**مثال 2: رصيد المحفظة**
السؤال: "كم رصيدي"
الرد: {"intent": "BALANCE", "confidence": 0.9, "missing_fields": [], "message": "تمام سعد، خلني أجيبلك بيانات رصيدك من النظام...", "data": {}, "api_call": {"name": "getBalance", "params": {}}}

**مثال 3: إنشاء شحنة (بيانات ناقصة)**
السؤال: "أريد أشحن شيء"
الرد: {"intent": "CREATE", "confidence": 0.8, "missing_fields": ["recipient_name", "phone", "weight"], "message": "تمام، لإنشاء الشحنة أحتاج أعرف: اسم المستلم، رقم جواله، وزن الشحنة", "data": {}}

**مثال 4: معلومات الشركة**
السؤال: "ما هي مراسيل"
الرد: {"intent": "COMPANY_INFO", "confidence": 0.9, "missing_fields": [], "message": "مراسيل هي منصة شحن إلكترونية متخصصة في خدمة التجار...", "data": {}, "api_call": {"name": "getCompanyInfo", "params": {}}}

**مثال 5: شركات الشحن**
السؤال: "أي شركة شحن أختار"
الرد: {"intent": "SHIPPING_COMPANIES", "confidence": 0.85, "missing_fields": [], "message": "تمام، خلني أوضحلك شركات الشحن المتاحة عندنا...", "data": {}, "api_call": {"name": "getShippingCompanies", "params": {}}}

**مثال 6: حساب الأسعار**
السؤال: "كم تكلفة شحنة 2 كيلو"
الرد: {"intent": "PRICING", "confidence": 0.9, "missing_fields": [], "message": "تمام، لحساب تكلفة شحنة 2 كيلو...", "data": {"weight": 2}, "api_call": {"name": "getPricingInfo", "params": {"weight": 2}}}

=== مخرجات الرد المثالي ===
// (ابقِ كما هو)

=== الختم النهائي ===
// (ابقِ كما هو)
`;

// تعريف الـ tools لـ function calling في Gemini
const TOOLS = [
  {
    name: "trackShipment",
    description:
      "تتبع شحنة باستخدام رقم التتبع. استخدم هذا عندما يسأل التاجر عن حالة شحنة معينة أو يريد معلومات عن شحنة.",
    parameters: {
      type: "object",
      properties: {
        tracking_number: {
          type: "string",
          description: "رقم التتبع للشحنة (مثل: 123456 أو MRSL123456)",
        },
      },
      required: ["tracking_number"],
    },
  },
  {
    name: "createShipment",
    description:
      "إنشاء شحنة جديدة. استخدم هذا فقط إذا كان لديك جميع البيانات المطلوبة: اسم المستلم، رقم الهاتف، الوزن، العنوان، المدينة.",
    parameters: {
      type: "object",
      properties: {
        recipient_name: {
          type: "string",
          description: "اسم المستلم الكامل",
        },
        phone: {
          type: "string",
          description: "رقم هاتف المستلم",
        },
        weight: {
          type: "number",
          description: "وزن الشحنة بالكيلوغرام",
        },
        address: {
          type: "string",
          description: "عنوان المستلم الكامل",
        },
        city: {
          type: "string",
          description: "مدينة المستلم",
        },
      },
      required: ["recipient_name", "phone", "weight"],
    },
  },
  {
    name: "cancelShipment",
    description:
      "إلغاء شحنة موجودة. استخدم هذا عندما يطلب التاجر إلغاء شحنة محددة.",
    parameters: {
      type: "object",
      properties: {
        shipment_id: {
          type: "string",
          description: "معرف الشحنة المراد إلغاؤها",
        },
      },
      required: ["shipment_id"],
    },
  },
  {
    name: "getBalance",
    description:
      "الحصول على رصيد المحفظة الحالي. استخدم هذا عندما يسأل التاجر عن رصيده أو أمواله.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "getUserShipments",
    description:
      "الحصول على قائمة شحنات المستخدم. استخدم هذا عندما يريد التاجر رؤية شحناته.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "getCompanyInfo",
    description:
      "الحصول على معلومات عن شركة مراسيل. استخدم هذا عندما يسأل التاجر عن الشركة.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "getShippingCompanies",
    description:
      "الحصول على قائمة شركات الشحن المتاحة. استخدم هذا عندما يسأل التاجر عن شركات الشحن أو يريد مقارنة.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "getPricingInfo",
    description:
      "حساب أسعار الشحن. استخدم هذا عندما يسأل التاجر عن الأسعار أو يريد حساب تكلفة شحنة.",
    parameters: {
      type: "object",
      properties: {
        weight: {
          type: "number",
          description: "وزن الشحنة بالكيلوغرام",
        },
        distance: {
          type: "string",
          description: "المسافة أو المدينة (اختياري)",
        },
      },
      required: ["weight"],
    },
  },
];

// State Manager للمحادثات (ابقِ كما هو)
class ConversationStateManager {
  // (الكود الأصلي)
}

const stateManager = new ConversationStateManager();

/**
 * بناء سياق المحادثة من الرسائل السابقة
 */
function buildContext(recentMessages) {
  if (!recentMessages || recentMessages.length === 0) {
    return "لا يوجد سياق سابق.";
  }

  const contextLines = recentMessages.map((msg) => {
    const role = msg.sender === "user" ? "User" : "Assistant";
    const content = msg.message || msg.content || "";
    return `${role}: ${content}`;
  });

  const fullContext = contextLines.join("\n");

  // التركيز على آخر 3 رسائل للسياق الحديث
  const recentLines = contextLines.slice(-3);
  const recentContext = recentLines.join("\n");

  // إذا كان السياق الأخير يحتوي على كلمات مفتاحية، أبرزها
  let contextHint = "";
  if (
    recentContext.includes("تتبع") ||
    recentContext.includes("تابع") ||
    recentContext.includes("tracking")
  ) {
    contextHint =
      "الموضوع الحالي: تتبع شحنة محددة - المستخدم ينتظر معلومات عن شحنة مع رقم التتبع";
  } else if (
    recentContext.includes("شحنات") ||
    recentContext.includes("قائمة") ||
    recentContext.includes("shipments")
  ) {
    contextHint = "الموضوع الحالي: قائمة الشحنات - المستخدم يريد رؤية شحناته";
  } else if (recentContext.includes("شحن") || recentContext.includes("طرد")) {
    contextHint = "الموضوع الحالي: شحنات وتتبع عام";
  } else if (
    recentContext.includes("رصيد") ||
    recentContext.includes("فلوس") ||
    recentContext.includes("balance")
  ) {
    contextHint = "الموضوع الحالي: الرصيد المالي";
  } else if (
    recentContext.includes("إنشاء") ||
    recentContext.includes("جديد") ||
    recentContext.includes("create")
  ) {
    contextHint = "الموضوع الحالي: إنشاء شحنة";
  }

  const finalContext = contextHint
    ? `${contextHint}\n\n${recentContext}`
    : recentContext;

  return finalContext.substring(0, 1000); // حد أقصى 1000 حرف
}

/**
 * استخراج intent من الرسالة
 */
function extractIntent(message) {
  const lowerMessage = message.toLowerCase();

  // تتبع شحنة
  if (lowerMessage.includes("تتبع") || lowerMessage.includes("track")) {
    return "TRACK";
  }

  // إنشاء شحنة
  if (
    lowerMessage.includes("إنشاء") ||
    lowerMessage.includes("create") ||
    lowerMessage.includes("جديد")
  ) {
    return "CREATE";
  }

  // رصيد المحفظة
  if (
    lowerMessage.includes("رصيد") ||
    lowerMessage.includes("balance") ||
    lowerMessage.includes("محفظة")
  ) {
    return "BALANCE";
  }

  // قائمة الشحنات
  if (lowerMessage.includes("شحنات") || lowerMessage.includes("shipments")) {
    return "LIST";
  }

  // إلغاء شحنة
  if (lowerMessage.includes("إلغاء") || lowerMessage.includes("cancel")) {
    return "CANCEL";
  }

  return null; // لا يوجد intent محدد
}

/**
 * تحليل سريع للرسالة بناءً على الكلمات المفتاحية - محسن لمزيد من الحالات
 */
function quickKeywordParse(message, userInfo = null) {
  const userName = userInfo?.firstName || "عميلنا الكريم";
  const lowerMessage = message.toLowerCase();
  const cleanMessage = message.trim();

  // تعريف أنماط الترحيب
  const greetingPatterns = [
    "كيفك",
    "هاي",
    "هلا",
    "السلام عليكم",
    "مرحبا",
    "أهلا",
    "أهلاً",
    "صباح الخير",
    "مساء الخير",
    "كيف حالك",
    "كيف الحال",
    "hello",
    "hi",
    "hey",
    "أهلين",
    "أهلين وسهلين",
    "ياخي",
    "يا أخ",
    "شلونك",
    "تمام",
    "الحمد لله",
    "تمام الحمد لله",
  ];

  // أنماط الترحيب - أولوية عالية
  if (greetingPatterns.some((pattern) => lowerMessage.includes(pattern))) {
    console.log("✅ [Quick Parse] Matched GREETING");
    return {
      intent: "CHAT",
      confidence: 0.95,
      missing_fields: [],
      message: `أهلاً ${userName} 👋 كيف أقدر أساعدك في شحناتك اليوم؟`,
      data: {},
    };
  }

  // التحقق من رقم التتبع المستقل (مثل "50724610926")
  const numberOnlyMatch = message.match(/^(\d{6,})$/);
  if (
    numberOnlyMatch &&
    !lowerMessage.includes("كم") &&
    !lowerMessage.includes("balance")
  ) {
    console.log("✅ [Quick Parse] Matched standalone tracking number");
    return {
      intent: "TRACK",
      confidence: 0.95,
      missing_fields: [],
      message: `تمام ${userName}، خلني أجيبلك بيانات الشحنة الحين...`,
      data: { tracking_number: numberOnlyMatch[1] },
    };
  }

  // التحقق من رقم التتبع مع كلمات توضيحية (مثل "هاي رقم التتبع 50724610926")
  const numberWithWordsMatch = message.match(
    /(?:رقم|هاي|هذا|التتبع|الشحنة|هاي الرقم)\s*\:?\s*(\d{6,})/i
  );
  if (numberWithWordsMatch) {
    console.log("✅ [Quick Parse] Matched tracking number with words");
    return {
      intent: "TRACK",
      confidence: 0.95,
      missing_fields: [],
      message: `تمام ${userName}، خلني أجيبلك بيانات الشحنة الحين...`,
      data: { tracking_number: numberWithWordsMatch[1] },
    };
  }

  // تتبع شحنة - أولوية عالية (مع أو بدون رقم)
  const trackPatterns = [
    "تتبع",
    "track",
    "تابع",
    "شو الحل",
    "بدي اتبع",
    "أريد أتبع",
    "اتبع",
    "تبع",
    "زبط الوضع",
    "بدي اتبع",
    "هاي رقم التتبع",
    "رقم التتبع",
    "رقم الشحنة",
    "وينها",
    "وين الشحنة",
    "فين الشحنة",
    "شو الشحنة",
    "وين وصلت",
    "كيف الشحنة",
    "حالة الشحنة",
    "وين الطرد",
    "فين الطرد",
    "اطلع الشحنة",
    "بعتلك ايه",
    "شو بعتلك",
    "وش بعتلك",
  ];

  const hasTrackKeyword = trackPatterns.some((pattern) =>
    cleanMessage.includes(pattern)
  );
  if (hasTrackKeyword) {
    const numberMatch = message.match(/(\d{6,})/);
    if (numberMatch) {
      console.log("✅ [Quick Parse] Matched TRACK with number");
      return {
        intent: "TRACK",
        confidence: 0.95,
        missing_fields: [],
        message: `تمام ${userName}، خلني أجيبلك بيانات الشحنة الحين...`,
        data: { tracking_number: numberMatch[1] },
      };
    } else {
      console.log("✅ [Quick Parse] Matched TRACK without number");
      return {
        intent: "TRACK",
        confidence: 0.8,
        missing_fields: ["tracking_number"],
        message: `${userName}، لتتبع الشحنة أحتاج أعرف رقم التتبع. قلي الرقم وأجيبلك البيانات فوراً! 📦`,
        data: {},
      };
    }
  }

  // إنشاء شحنة
  if (
    lowerMessage.includes("إنشاء") ||
    lowerMessage.includes("create") ||
    lowerMessage.includes("جديدة")
  ) {
    console.log("✅ [Quick Parse] Matched old CREATE pattern");
    return {
      intent: "CREATE",
      confidence: 0.8,
      missing_fields: ["recipient_name", "phone", "weight"],
      message: `تمام ${userName} 👍 لمين الشحنة؟`,
      data: {},
    };
  }

  // رصيد المحفظة - أنماط شاملة
  const balancePatterns = [
    "رصيد",
    "balance",
    "محفظة",
    "wallet",
    "فلوسي",
    "فلوس",
    "كم عندي",
    "كم رصيدي",
    "رصيدي كم",
    "كم معي",
    "معي كم",
    "رصيد محفظتي",
    "كم في محفظتي",
    "كم رصيد بالمحفظة",
    "رصيدي",
    "فلوسي كم",
  ];
  if (balancePatterns.some((pattern) => cleanMessage.includes(pattern))) {
    console.log("✅ [Quick Parse] Matched BALANCE pattern");
    return {
      intent: "BALANCE",
      confidence: 0.9,
      missing_fields: [],
      message: `تمام ${userName}، خلني أجيبلك بيانات رصيدك من النظام...`,
      data: {},
    };
  }

  // قائمة الشحنات - أنماط شاملة
  const listPatterns = [
    "شحناتي",
    "my shipments",
    "قائمة الشحنات",
    "شحنات",
    "شحناتي كم",
    "كم شحنتي",
    "وريني شحناتي",
    "اطلع شحناتي",
    "شوف شحناتي",
    "شحناتي كلها",
    "قائمة شحناتي",
  ];
  if (listPatterns.some((pattern) => cleanMessage.includes(pattern))) {
    console.log("✅ [Quick Parse] Matched LIST_SHIPMENTS pattern");
    return {
      intent: "LIST",
      confidence: 0.85,
      missing_fields: [],
      message: `تمام ${userName}، خلني أجيبلك قائمة شحناتك...`,
      data: {},
    };
  }

  // إلغاء شحنة
  if (
    lowerMessage.includes("إلغاء") ||
    lowerMessage.includes("cancel") ||
    lowerMessage.includes("ألغي")
  ) {
    console.log("✅ [Quick Parse] Matched CANCEL pattern");
    return {
      intent: "CANCEL",
      confidence: 0.8,
      missing_fields: ["shipment_id"],
      message: `${userName}، لإلغاء الشحنة أحتاج أعرف رقم الشحنة أو معرفها`,
      data: {},
    };
  }

  // معلومات الشركة
  const companyPatterns = [
    "معلومات الشركة",
    "about company",
    "ما هي مراسيل",
    "عن مراسيل",
    "من هي مراسيل",
    "مراسيل هي",
    "ما هي خدماتكم",
    "خدماتكم",
  ];
  if (companyPatterns.some((pattern) => cleanMessage.includes(pattern))) {
    console.log("✅ [Quick Parse] Matched COMPANY_INFO pattern");
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: `مراسيل هي منصة شحن إلكترونية متخصصة في خدمة التجار والشركات في السعودية. نقدم خدمات إنشاء وتتبع الشحنات، ربط المتاجر، إدارة المحفظة، والمزيد. كيف أقدر أساعدك؟`,
      data: {},
    };
  }

  // شركات الشحن
  const shippingCompaniesPatterns = [
    "شركات الشحن",
    "shipping companies",
    "ما الشركات",
    "شركات متوفرة",
    "أي شركات",
    "شركات التوصيل",
    "شركات الشحن المتاحة",
  ];
  if (
    shippingCompaniesPatterns.some((pattern) => cleanMessage.includes(pattern))
  ) {
    console.log("✅ [Quick Parse] Matched SHIPPING_COMPANIES pattern");
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: `عندنا عدة شركات شحن موثوقة: سمسا (اقتصادي وبرو)، أرامكس برو، ريد بوكس، ولما بوكس. كل شركة لها مميزاتها حسب نوع الشحنة. أي نوع شحنة عندك؟`,
      data: {},
    };
  }

  // الأسعار والتكلفة
  const pricingPatterns = [
    "كم التكلفة",
    "كم السعر",
    "كم الثمن",
    "التكلفة",
    "السعر",
    "الأسعار",
    "price",
    "cost",
    "كم يكلف",
    "كم تكلفة",
    "كم سعر الشحن",
  ];
  if (pricingPatterns.some((pattern) => cleanMessage.includes(pattern))) {
    console.log("✅ [Quick Parse] Matched PRICING pattern");
    return {
      intent: "CHAT",
      confidence: 0.8,
      missing_fields: ["weight"],
      message: `تمام ${userName}، لحساب التكلفة أحتاج أعرف وزن الشحنة ونوعها. قلي تفاصيل شحنتك وسأحسب لك التكلفة بدقة! 💰`,
      data: {},
    };
  }

  // أسئلة استمرارية أو ضمائر (ها، هم، هن، إلخ)
  const continuationPatterns = [
    "وينها",
    "فينها",
    "وينهم",
    "فينهم",
    "وينهن",
    "فينهن",
    "شوها",
    "وشها",
    "كيفها",
    "كيفها",
    "وين اللي",
    "فين اللي",
    "بعتلك ايه",
    "شو بعتلك",
    "وش بعتلك",
    "وين وصلت",
    "فين وصلت",
    "كيف وصلت",
    "وش صار",
    "شو صار",
  ];

  if (continuationPatterns.some((pattern) => cleanMessage.includes(pattern))) {
    console.log("✅ [Quick Parse] Matched CONTINUATION pattern");

    // تحقق من السياق بطريقة أكثر دقة
    if (context) {
      // إذا كان السياق يتعلق بتتبع شحنة محددة
      if (
        context.includes("تتبع شحنة محددة") ||
        context.includes("tracking_number") ||
        context.includes("رقم التتبع")
      ) {
        // ابحث عن رقم التتبع في السياق
        const contextTrackingMatch = context.match(/(\d{6,})/);
        if (contextTrackingMatch) {
          console.log(
            "✅ [Quick Parse] Found tracking number in context:",
            contextTrackingMatch[1]
          );
          return {
            intent: "TRACK",
            confidence: 0.95,
            missing_fields: [],
            message: `تمام ${userName}، خلني أجيبلك بيانات الشحنة الحين...`,
            data: { tracking_number: contextTrackingMatch[1] },
          };
        }
      }

      // إذا كان السياق يتعلق بقائمة الشحنات
      if (context.includes("قائمة الشحنات") || context.includes("shipments")) {
        return {
          intent: "LIST",
          confidence: 0.8,
          missing_fields: [],
          message: `تمام ${userName}، خلني أجيبلك قائمة شحناتك مع حالة كل شحنة...`,
          data: {},
        };
      }
    }

    // إذا لم يكن هناك سياق واضح، اسأل للتوضيح
    return {
      intent: "CHAT",
      confidence: 0.6,
      missing_fields: [],
      message: `${userName}، تقصد وين إيه بالضبط؟ الشحنات أو الطلبات أو إيه؟`,
      data: {},
    };
  }

  // إذا لم يتطابق مع أي نمط - رد دردشة عام
  console.log("⚡ [Quick Parse] No match, returning null for Gemini");
  return null;
}

/**
 * إرسال رسالة لـ Gemini والحصول على رد - محسن بدعم function calling
 */
async function sendToGemini(
  userMessage,
  context = "",
  userId = null,
  userInfo = null
) {
  try {
    // 1. أولاً جرب Quick Parse للأسئلة البسيطة
    console.log("🎯 [Gemini] Processing user message:", userMessage);
    const quickResult = quickKeywordParse(userMessage, userInfo);

    if (quickResult) {
      console.log("⚡ [Gemini] Quick parse success:", quickResult.intent);
      return quickResult;
    }

    console.log("🚀 [Gemini] Quick parse returned null, going to Gemini API");

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      tools: [{ functionDeclarations: TOOLS }],
    });

    // بناء الـ prompt مع إرشادات تفكير
    const fullPrompt = `${SYSTEM_PROMPT}\n\nفكر خطوة بخطوة ثم حدد الـ intent والـ API إذا لزم.\n\nContext: ${context}\nUser: ${userMessage}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    let text = response.text();

    // التعامل مع function calls إذا وجدت
    const functionCalls = response.functionCalls || [];
    if (functionCalls.length > 0) {
      // Gemini رد بطلب استدعاء function
      const apiCall = functionCalls[0];
      return {
        intent: "API_CALL",
        api_call: { name: apiCall.name, params: apiCall.args },
        message: "جاري معالجة طلبك...",
      };
    }

    // تحليل JSON response من Gemini
    console.log("📄 [Gemini] Raw response text:", text);

    try {
      // محاولة استخراج JSON من النص
      let jsonStart = text.indexOf("{");
      let jsonEnd = text.lastIndexOf("}") + 1;

      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        const jsonText = text.substring(jsonStart, jsonEnd);
        console.log("🔍 [Gemini] Extracted JSON:", jsonText);

        const geminiData = JSON.parse(jsonText);

        // التأكد من وجود الحقول المطلوبة
        if (geminiData.intent && geminiData.message) {
          return {
            intent: geminiData.intent,
            confidence: geminiData.confidence || 0.5,
            missing_fields: geminiData.missing_fields || [],
            message: geminiData.message,
            data: geminiData.data || {},
            api_call: geminiData.api_call,
          };
        }
      }

      // إذا لم نجد JSON صحيح، أعد رد دردشة عام
      console.log("⚠️ [Gemini] No valid JSON found, returning chat response");
      return {
        intent: "CHAT",
        confidence: 0.3,
        missing_fields: [],
        message: "عذراً، لم أفهم طلبك. يرجى المحاولة مرة أخرى.",
        data: {},
      };
    } catch (parseError) {
      console.error("❌ [Gemini] JSON parse error:", parseError.message);
      return {
        intent: "CHAT",
        confidence: 0.2,
        missing_fields: [],
        message: "عذراً، حدث خطأ في معالجة الطلب. يرجى المحاولة مرة أخرى.",
        data: {},
      };
    }
  } catch (error) {
    console.error(
      "❌ [Gemini] Error communicating with Gemini API:",
      error.message
    );

    // في حالة الخطأ، أعد رد Quick Parse أو رد عام
    const quickFallback = quickKeywordParse(userMessage, userInfo);
    if (quickFallback) {
      console.log("🔄 [Gemini] Using quick parse fallback");
      return quickFallback;
    }

    // إذا فشل كل شيء، أعد رد خطأ
    return {
      intent: "CHAT",
      confidence: 0.1,
      missing_fields: [],
      message: "عذراً، حدث خطأ تقني. يرجى المحاولة لاحقاً.",
      data: {},
    };
  }
}

/**
 * معالجة الرد من Gemini وتنفيذ العمليات - محسن لدعم function calls ووصول DB
 */
async function processGeminiResponse(
  geminiResponse,
  services,
  userId = null,
  userInfo = null
) {
  // (الكود الأصلي)
  const { intent, api_call, data } = geminiResponse;

  // تنفيذ الـ API بناءً على الـ intent
  let apiResult;
  let shouldCallAPI = false;

  // معالجة intents المباشرة من Quick Parse
  switch (intent) {
    case "TRACK":
      if (data && data.tracking_number) {
        console.log("🔄 [AI] Executing trackShipment:", data.tracking_number);
        apiResult = await services.shipmentService.trackShipment(
          data.tracking_number
        );
        shouldCallAPI = true;
      } else {
        // لا يوجد رقم تتبع، أعد الرسالة الأصلية
        return {
          success: true,
          intent,
          result: geminiResponse,
          message: geminiResponse.message || "يرجى تقديم رقم التتبع",
        };
      }
      break;

    case "BALANCE":
      console.log("🔄 [AI] Executing getBalance");
      apiResult = await services.walletService.getBalance();
      shouldCallAPI = true;
      break;

    case "LIST":
      console.log("🔄 [AI] Executing getUserShipments");
      apiResult = await services.shipmentService.getUserShipments();
      shouldCallAPI = true;
      break;

    case "CREATE":
      // لا نستدعي API هنا لأننا نحتاج تفاصيل أكثر
      return {
        success: true,
        intent,
        result: geminiResponse,
        message: geminiResponse.message || "يرجى تقديم تفاصيل الشحنة",
      };

    case "CANCEL":
      if (data && data.shipment_id) {
        console.log("🔄 [AI] Executing cancelShipment:", data.shipment_id);
        apiResult = await services.shipmentService.cancelShipment(
          data.shipment_id
        );
        shouldCallAPI = true;
      } else {
        return {
          success: true,
          intent,
          result: geminiResponse,
          message:
            geminiResponse.message || "يرجى تحديد رقم الشحنة المراد إلغاؤها",
        };
      }
      break;
  }

  // إذا تم استدعاء API، أعد النتيجة
  if (shouldCallAPI && apiResult) {
    // تحسين رسالة الاستجابة بناءً على نوع العملية
    let finalMessage = apiResult.success
      ? "تم التنفيذ بنجاح"
      : apiResult.message;

    if (intent === "TRACK" && apiResult.success) {
      finalMessage =
        `📦 شحنتك رقم ${data.tracking_number}:\n` +
        `📍 الحالة: ${apiResult.status || "غير محدد"}\n` +
        `👤 المستلم: ${apiResult.receiver?.name || "غير محدد"}\n` +
        `📞 رقم الهاتف: ${apiResult.receiver?.phone || "غير محدد"}\n` +
        `📅 تاريخ الإنشاء: ${
          apiResult.createdAt
            ? new Date(apiResult.createdAt).toLocaleDateString("ar-SA")
            : "غير محدد"
        }\n` +
        `💰 التكلفة: ${
          apiResult.details?.totalPrice
            ? apiResult.details.totalPrice + " ريال"
            : "غير محدد"
        }`;
    } else if (intent === "BALANCE" && apiResult.success) {
      finalMessage = `💰 رصيدك الحالي: ${apiResult.balance || 0} ${
        apiResult.currency || "ريال"
      }`;
    } else if (intent === "LIST" && apiResult.success) {
      if (apiResult.shipments && apiResult.shipments.length > 0) {
        finalMessage =
          `📋 شحناتك (${apiResult.shipments.length} شحنة):\n\n` +
          apiResult.shipments
            .slice(0, 3)
            .map(
              (ship, index) =>
                `${index + 1}. رقم ${ship.trackingId} - حالة: ${
                  ship.status
                } - ${ship.totalPrice} ريال`
            )
            .join("\n") +
          (apiResult.shipments.length > 3 ? "\n\n... وغيرها" : "");
      } else {
        finalMessage = "📭 ليس لديك شحنات حالياً";
      }
    }

    return {
      success: apiResult.success,
      intent,
      result: apiResult,
      message: finalMessage,
    };
  }

  // معالجة API calls من Gemini (function calling)
  if (intent === "API_CALL" && api_call) {
    // تنفيذ الـ API بناءً على الاسم
    switch (api_call.name) {
      case "trackShipment":
        console.log(
          "🔄 [AI] Executing trackShipment:",
          api_call.params.tracking_number
        );
        apiResult = await services.shipmentService.trackShipment(
          api_call.params.tracking_number
        );
        break;
      case "createShipment":
        console.log("🔄 [AI] Executing createShipment:", api_call.params);
        apiResult = await services.shipmentService.createShipmentFromAI(
          api_call.params
        );
        break;
      case "cancelShipment":
        console.log(
          "🔄 [AI] Executing cancelShipment:",
          api_call.params.shipment_id
        );
        apiResult = await services.shipmentService.cancelShipment(
          api_call.params.shipment_id
        );
        break;
      case "getBalance":
        console.log("🔄 [AI] Executing getBalance");
        apiResult = await services.walletService.getBalance();
        break;
      case "getUserShipments":
        console.log("🔄 [AI] Executing getUserShipments");
        apiResult = await services.shipmentService.getUserShipments();
        break;
      case "getCompanyInfo":
        console.log("🔄 [AI] Executing getCompanyInfo");
        apiResult = await services.generalService.getCompanyInfo();
        break;
      case "getShippingCompanies":
        console.log("🔄 [AI] Executing getShippingCompanies");
        apiResult = await services.generalService.getShippingCompanies();
        break;
      case "getPricingInfo":
        console.log("🔄 [AI] Executing getPricingInfo:", api_call.params);
        apiResult = await services.generalService.getPricingInfo(
          api_call.params
        );
        break;
      default:
        console.log("❌ [AI] Unknown API call:", api_call.name);
        apiResult = { success: false, message: "API غير مدعوم" };
    }
    return {
      success: apiResult.success,
      intent,
      result: apiResult,
      message: apiResult.success ? "تم التنفيذ بنجاح" : apiResult.message,
    };
  }

  // للـ intents الأخرى (CHAT, إلخ) أعد النتيجة كما هي
  console.log("📝 [AI] Processing non-API intent:", intent);
  return {
    success: true,
    intent,
    result: geminiResponse,
    message: geminiResponse.message || "تم معالجة الطلب",
  };
}

// (الباقي من الوظائف كما هو)

module.exports = {
  sendToGemini,
  processGeminiResponse,
  extractIntent,
  buildContext,
  quickKeywordParse,
  stateManager,
};
