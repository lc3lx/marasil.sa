const { GoogleGenerativeAI } = require("@google/generative-ai");
let AiKnowledge;
try {
  AiKnowledge = require("../models/aiKnowledgeModel");
} catch (e) {
  AiKnowledge = null;
}

// تهيئة Gemini API مع دعم لـ function calling
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const ENABLE_DEEP_THINKING =
  process.env.GEMINI_ALLOW_EXPANSIVE_RESPONSES !== "false";

const GENERATION_CONFIG = {
  temperature: 0.5,
  topK: 40,
  topP: 0.9,
  maxOutputTokens: 2048,
};

const ARABIC_INDIC_DIGITS_MAP = Object.freeze({
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
});

function normalizeArabicText(text = "") {
  if (!text) return "";

  return text
    .toLowerCase()
    .replace(/[\u0622\u0623\u0625\u0627]/g, "ا")
    .replace(/[\u0649\u0625\u0670\u0640]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/؟/g, "?")
    .replace(/[٠-٩]/g, (digit) => ARABIC_INDIC_DIGITS_MAP[digit] || digit)
    .replace(/\s+/g, " ")
    .trim();
}

function includesNormalized(
  haystack = "",
  pattern = "",
  haystackNormalized = false,
) {
  if (!haystack || !pattern) return false;
  const normalizedHaystack = haystackNormalized
    ? haystack
    : normalizeArabicText(haystack);
  const normalizedPattern = normalizeArabicText(pattern);
  return normalizedHaystack.includes(normalizedPattern);
}

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

=== تدقيق الإملاء والجودة (إلزامي) ===
قبل إخراج message:
- راجع الإملاء والصياغة مرة أخيرة
- استخدم الصيغ المعتمدة دائماً: "زد" وليس "زيد"، "شوبيفاي"، "اللي يحبها قلبك"، "يناسبك"، "طباعة البوالص"
- اجعل الرد واضحًا، مختصرًا، وخاليًا من الأخطاء اللغوية
- لا تضف وجوهًا تعبيرية في نهاية الرد إلا إذا طلب المستخدم ذلك

=== تفكير خطوة بخطوة (إلزامي) ===
قبل أي رد، نفّذ بالترتيب:
1. **التحليل:** ما نية المستخدم الحقيقية؟ (تتبع، إنشاء، رصيد، قائمة، إلغاء، معلومات، أسعار، إلخ)
2. **السياق:** ماذا سبق في المحادثة؟ لا تُعيد من الصفر عند تغيير صياغة المستخدم
3. **القرار:** أي API يناسب النية؟ هل البيانات كافية؟
4. **المخرجات:** صغ جملة JSON واحدة فقط كما في الصيغة أدناه

=== اللهجة والنية (مهم جداً) ===
- تغيير اللهجة أو الأسلوب (سعودي، مصري، شامي، فصحى، عامية) **لا يغيّر النية**
- إذا قال المستخدم نفس الطلب بصيغة أخرى أو لهجة أخرى → نفس الـ intent ونفس القرار
- لا "تفرش" ولا تعيد السياق من الصفر: استمر من حيث انتهت المحادثة
- ركّز على **ماذا يريد** (النية) وليس **كيف قاله** (الصياغة/اللهجة)
- أمثلة لنفس النية بصيغ مختلفة:
  • تتبع: "وين شحنتي" = "فين الشحنة دي" = "أين طلبي" = "track 123" → intent: TRACK
  • رصيد: "كم رصيدي" = "فلوسي كم" = "ما هو رصيد المحفظة" → intent: BALANCE
  • قائمة: "شحناتي" = "وريني الطلبات" = "قائمة الشحنات" → intent: LIST

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

=== عند السؤال عن خدماتنا (خدمات مراسيل) ===
عندما يسأل التاجر عن الخدمات أو "شو تقدمون" أو "خدماتكم" أو "ما خدمات مراسيل":
استخدم الصياغة التالية بالنص تقريباً (بدون إيموجي):
إدارة الشحنات والطلبات بأسهل طريقة يحبها قلبك تنشئ تتابع وتتحكم بكل شحنة من مكان واحد
تكامل مع متجرك ربط مباشر مع (سلة) و (زد) و (شوبيفاي) والطلبات تنزل عندنا والشحن يناسبك
طباعة البوالص من كل شركات الشحن في منصتنا بأقل الأسعار ما تحتاج تتنقل من شركة لشركة
ثم اختم بـ:
تبغى نبدأ من وين ؟
شحناتك
الرصيد
شركة معينة

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

=== صيغة الرد (جملة JSON واحدة فقط) ===
يجب أن يكون ردك جملة JSON صالحة واحدة فقط. بدون نص قبلها أو بعدها (أو سيتم استخراج الـ JSON فقط).
الحقول الاختيارية للتحليل الداخلي (لا تظهر للمستخدم): reasoning.
الحقول المطلوبة للباكند: intent, confidence, message, data, واختياري api_call و missing_fields.

{
  "reasoning": "تحليل قصير: النية من الرسالة، السياق، ولماذا اخترت هذا الـ intent (داخلي فقط)",
  "intent": "CREATE | TRACK | CANCEL | BALANCE | LIST | CHAT | COMPANY_INFO | SHIPPING_COMPANIES | PRICING",
  "confidence": 0.0-1.0,
  "missing_fields": ["recipient_name", "phone", "weight"],
  "message": "رسالة ودية بالعامية السعودية تلائم المستخدم",
  "data": {"tracking_number": "123", "recipient_name": "أحمد"},
  "api_call": {"name": "trackShipment", "params": {"tracking_number": "123"}}
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

**أمثلة نفس النية بلهجات مختلفة (نفس الـ intent والقرار):**
- "فين الشحنة دي رقم 123" (مصري) → مثل "وين شحنتي 123" → intent: TRACK, data.tracking_number: "123"
- "شو رصيدي" (شامي) أو "كم فلوسي" → مثل "كم رصيدي" → intent: BALANCE
- "وريني الطلبات" أو "اعرض الشحنات" → مثل "شحناتي" → intent: LIST

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

const NO_CONTEXT_PLACEHOLDER = "لا يوجد سياق سابق.";

// State Manager للمحادثات (مبسّط لتتبّع تدفق إنشاء الشحنات)
class ConversationStateManager {
  constructor() {
    this.states = new Map();
  }

  getState(userId) {
    if (!userId) return null;
    return this.states.get(String(userId)) || null;
  }

  setState(userId, state) {
    if (!userId) return null;
    this.states.set(String(userId), state);
    return state;
  }

  updateState(userId, patch) {
    if (!userId) return null;
    const current = this.getState(userId) || {};
    const next = { ...current, ...patch };
    this.states.set(String(userId), next);
    return next;
  }

  clearState(userId) {
    if (!userId) return;
    this.states.delete(String(userId));
  }

  hasActiveFlow(userId, flowName) {
    const state = this.getState(userId);
    return !!state && state.flow === flowName;
  }
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

  // فحص أكثر دقة للسياق - النظر في الرسائل الأخيرة
  const lastMessage = recentLines[recentLines.length - 1] || "";
  const secondLastMessage = recentLines[recentLines.length - 2] || "";

  // إذا كان آخر رد من الـ AI يتحدث عن تتبع شحنة
  if (
    lastMessage.includes("شحنة الحين") ||
    lastMessage.includes("بيانات الشحنة") ||
    secondLastMessage.includes("شحنة الحين") ||
    secondLastMessage.includes("بيانات الشحنة")
  ) {
    contextHint =
      "الحالة الحالية: المستخدم طلب تتبع شحنة وينتظر النتيجة - عندما يقول 'جبتها' أو 'وريني' يقصد عرض بيانات الشحنة";
  }
  // إذا كان آخر رد من الـ AI يتحدث عن قائمة شحنات
  else if (
    lastMessage.includes("قائمة شحنات") ||
    lastMessage.includes("شحناتك") ||
    secondLastMessage.includes("قائمة شحنات") ||
    secondLastMessage.includes("شحناتك")
  ) {
    contextHint = "الحالة الحالية: المستخدم طلب قائمة الشحنات وينتظر النتيجة";
  }
  // إذا كان آخر رد من الـ AI يتحدث عن الرصيد
  else if (
    lastMessage.includes("رصيدك") ||
    lastMessage.includes("فلوس") ||
    secondLastMessage.includes("رصيدك") ||
    secondLastMessage.includes("فلوس")
  ) {
    contextHint = "الحالة الحالية: المستخدم طلب الرصيد وينتظر النتيجة";
  }
  // إذا كان آخر رد من الـ AI يطلب رقم الشحنة للإلغاء
  else if (
    lastMessage.includes("لإلغاء الشحنة أحتاج") ||
    lastMessage.includes("رقم الشحنة أو معرفها") ||
    secondLastMessage.includes("لإلغاء الشحنة أحتاج") ||
    secondLastMessage.includes("رقم الشحنة أو معرفها") ||
    recentContext.includes("لإلغاء الشحنة")
  ) {
    contextHint =
      "الحالة الحالية: المستخدم طلب إلغاء شحنة وينتظر إدخال رقم الشحنة أو المعرف - إذا أرسل رقماً فقط فالمقصود إلغاء تلك الشحنة";
  }
  // فحوصات عامة
  else if (
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
  } else if (
    recentContext.includes("إلغاء") ||
    recentContext.includes("الغاء") ||
    recentContext.includes("الغي") ||
    recentContext.includes("cancel")
  ) {
    contextHint =
      "الموضوع الحالي: إلغاء شحنة - إذا المستخدم يرسل رقماً فقط فهو رقم الشحنة المراد إلغاؤها";
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
  const normalizedMessage = normalizeArabicText(message || "");
  const lowerMessage = (message || "").toLowerCase();

  // تتبع شحنة
  if (
    includesNormalized(normalizedMessage, "تتبع", true) ||
    lowerMessage.includes("track") ||
    includesNormalized(normalizedMessage, "وين طلبي", true) ||
    includesNormalized(normalizedMessage, "وين الطلب", true) ||
    includesNormalized(normalizedMessage, "وصلت الشحنه", true)
  ) {
    return "TRACK";
  }

  // إنشاء شحنة
  if (
    includesNormalized(normalizedMessage, "انشاء", true) ||
    lowerMessage.includes("create") ||
    includesNormalized(normalizedMessage, "شحنه جديده", true) ||
    includesNormalized(normalizedMessage, "ابغى اشحن", true)
  ) {
    return "CREATE";
  }

  // رصيد المحفظة
  if (
    includesNormalized(normalizedMessage, "رصيد", true) ||
    lowerMessage.includes("balance") ||
    includesNormalized(normalizedMessage, "محفظه", true)
  ) {
    return "BALANCE";
  }

  // قائمة الشحنات
  if (
    includesNormalized(normalizedMessage, "شحنات", true) ||
    lowerMessage.includes("shipments")
  ) {
    return "LIST";
  }

  // إلغاء شحنة
  if (
    includesNormalized(normalizedMessage, "الغاء", true) ||
    lowerMessage.includes("cancel") ||
    includesNormalized(normalizedMessage, "الغي", true)
  ) {
    return "CANCEL";
  }

  return null; // لا يوجد intent محدد
}

/**
 * تحليل سريع للرسالة بناءً على الكلمات المفتاحية - محسن لم من الحالات
 */
function quickKeywordParse(
  message,
  userInfo = null,
  context = "",
  userId = null,
) {
  const userName = userInfo?.firstName || "عميلنا الكريم";
  const normalizedMessage = normalizeArabicText(message || "");
  const lowerMessage = (message || "").toLowerCase();
  const cleanMessage = (message || "").trim();

  // إذا كان المستخدم داخل تدفق إنشاء شحنة، نُمرّر الرسالة للمعالجة المتخصّصة
  if (userId && stateManager.hasActiveFlow(userId, "CREATE_SHIPMENT")) {
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: "",
      data: {
        action: "CREATE_SHIPMENT_FLOW",
        rawMessage: message,
      },
    };
  }

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
    "ايش الاخبار",
    "شلونك",
    "عامل ايه",
    "كيف امورك",
  ];

  // أنماط الترحيب - أولوية عالية (لكن ليس إذا كانت جزء من جملة أخرى)
  const isGreeting = greetingPatterns.some((pattern) => {
    // تجنب التحيات التي تكون جزء من جملة مثل "هاي الرقم"
    if (
      normalizeArabicText(pattern) === "هاي" &&
      (includesNormalized(normalizedMessage, "هاي الرقم", true) ||
        includesNormalized(normalizedMessage, "هاي رقم", true))
    ) {
      return false;
    }
    return includesNormalized(normalizedMessage, pattern, true);
  });

  if (isGreeting) {
    console.log("✅ [Quick Parse] Matched GREETING");
    return {
      intent: "CHAT",
      confidence: 0.95,
      missing_fields: [],
      message: `أهلاً ${userName} 👋 كيف أقدر أساعدك في شحناتك اليوم؟`,
      data: {},
    };
  }

  // إلغاء شحنة + رقم في نفس الرسالة (قبل فحص "رقم فقط" حتى لا يُفسَّر كتتبع)
  const cancelPatternsWithNumber = [
    "الغاء شحنة",
    "الغي شحنة",
    "الغاء الشحنة",
    "الغي الشحنة",
    "قوم بالغاء",
    "قوم بي الغاء",
    "الغيها",
    "الغها",
    "رقم الشحنة",
    "هاي رقم الشحنة",
    "هذا رقم الشحنة",
    "cancel shipment",
    "الغاء",
    "الغي",
  ];
  const hasCancelIntent = cancelPatternsWithNumber.some((p) =>
    includesNormalized(normalizedMessage, p, true),
  );
  const cancelNumberMatch = normalizedMessage.match(/(\d{6,})/);
  if (hasCancelIntent && cancelNumberMatch) {
    console.log(
      "✅ [Quick Parse] Matched CANCEL with number in same message:",
      cancelNumberMatch[1],
    );
    return {
      intent: "CANCEL",
      confidence: 0.95,
      missing_fields: [],
      message: `تمام ${userName}، جاري إلغاء الشحنة رقم ${cancelNumberMatch[1]}...`,
      data: {
        shipment_id: cancelNumberMatch[1],
        tracking_number: cancelNumberMatch[1],
      },
    };
  }

  // رقم فقط: تحقق من السياق أولاً (طلب إلغاء سابق → الرقم للإلغاء وليس للتتبع)
  const numberOnlyMatch = normalizedMessage.match(/^(\d{6,})$/);
  if (
    numberOnlyMatch &&
    !includesNormalized(normalizedMessage, "كم", true) &&
    !lowerMessage.includes("balance") &&
    !includesNormalized(normalizedMessage, "بكم", true)
  ) {
    if (
      context &&
      (context.includes("إلغاء") ||
        context.includes("لإلغاء الشحنة أحتاج") ||
        context.includes("الغاء") ||
        context.includes("رقم الشحنة المراد إلغاؤها"))
    ) {
      console.log(
        "✅ [Quick Parse] Number only in CANCEL context → CANCEL:",
        numberOnlyMatch[1],
      );
      return {
        intent: "CANCEL",
        confidence: 0.95,
        missing_fields: [],
        message: `تمام ${userName}، جاري إلغاء الشحنة رقم ${numberOnlyMatch[1]}...`,
        data: {
          shipment_id: numberOnlyMatch[1],
          tracking_number: numberOnlyMatch[1],
        },
      };
    }
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
  const numberWithWordsMatch = normalizedMessage.match(
    /(?:رقم|هاي|هذا|التتبع|الشحنه|الطلب|الطلبيه|الكود|المرسل|هاي الرقم)\s*:?\s*(\d{6,})/i,
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
    "اريد اتبع",
    "اتبع",
    "تبع",
    "زبط الوضع",
    "هاي رقم التتبع",
    "رقم التتبع",
    "رقم الشحنة",
    "وينها",
    "وين الشحنة",
    "فين الشحنة",
    "وين الطلب",
    "وين طلبي",
    "طلبي وين",
    "وين صار الطلب",
    "وين صار الطرد",
    "وين صارت",
    "وين وصل",
    "فين وصلت",
    "وصلت الشحنه",
    "وصل طلبي",
    "حالة الشحنه",
    "متا توصل",
    "امتى توصل",
    "متى توصل",
    "وين الطرد",
    "فين الطرد",
    "اطلع الشحنة",
    "بعتلك ايه",
    "شو بعتلك",
    "وش بعتلك",
    "اخبار الشحنه",
    "كيف صار الطلب",
    "شلون صار الطلب",
    "على وين الشحنه",
  ];

  const hasTrackKeyword = trackPatterns.some((pattern) =>
    includesNormalized(normalizedMessage, pattern, true),
  );
  if (hasTrackKeyword) {
    const numberMatch = normalizedMessage.match(/(\d{6,})/);
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

  // إنشاء شحنة مع تفاصيل كاملة (شركة + وزن [+ دفع]) → نسأل مرسل/مستلم جديد أو موجود
  const createWithDetailsPatterns = [
    "اعمل شحنة",
    "اعمل شحن",
    "ابدى اعمل شحنة",
    "بدي اعمل شحنة",
    "ابي اعمل شحنة",
    "اشحن",
    "اشحن بشركة",
    "شحنة بشركة",
    "انشاء شحنة",
    "شحنة جديد",
  ];
  const hasCreateWithDetails = createWithDetailsPatterns.some((p) =>
    includesNormalized(normalizedMessage, p, true),
  );
  if (hasCreateWithDetails) {
    const details = extractShipmentDetails(message);
    if (details.weight && details.company) {
      console.log(
        "✅ [Quick Parse] Create shipment with full details → ask sender/recipient choice",
      );
      return {
        intent: "CHAT",
        confidence: 0.9,
        missing_fields: [],
        message: "",
        data: {
          action: "CREATE_SHIPMENT_FLOW",
          rawMessage: message,
          startWithDetails: true,
          shipmentDetails: {
            company: details.company,
            weight: details.weight,
            paymentMethod: details.paymentMethod || "COD",
            shipmentType: details.shipmentType || null,
            dimensions: details.dimensions || null,
          },
        },
      };
    }
  }

  // إنشاء شحنة (بدون تفاصيل كاملة)
  if (
    includesNormalized(normalizedMessage, "انشاء", true) ||
    includesNormalized(normalizedMessage, "جديد", true) ||
    includesNormalized(normalizedMessage, "ابغى اشحن", true) ||
    includesNormalized(normalizedMessage, "ابغا اشحن", true) ||
    includesNormalized(normalizedMessage, "ودي اشحن", true) ||
    includesNormalized(normalizedMessage, "ارسل طرد", true) ||
    lowerMessage.includes("create")
  ) {
    console.log("✅ [Quick Parse] Matched old CREATE pattern");
    return {
      intent: "CHAT",
      confidence: 0.85,
      missing_fields: [],
      message: "",
      data: {
        action: "CREATE_SHIPMENT_FLOW",
        rawMessage: message,
        start: true,
      },
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
    "كم المبلغ",
    "قد ايش رصيدي",
    "حسابي",
    "كم في الحساب",
    "الباقي في المحفظه",
  ];
  if (
    balancePatterns.some((pattern) =>
      includesNormalized(normalizedMessage, pattern, true),
    )
  ) {
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
    "كل الشحنات",
    "شوف الطلبات",
    "عرض الطلبيات",
    "اظهر الشحنات",
  ];
  if (
    listPatterns.some((pattern) =>
      includesNormalized(normalizedMessage, pattern, true),
    )
  ) {
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
    includesNormalized(normalizedMessage, "الغاء", true) ||
    includesNormalized(normalizedMessage, "الغ الشحنه", true) ||
    includesNormalized(normalizedMessage, "وقف الشحنه", true) ||
    includesNormalized(normalizedMessage, "ما عاد ابي الشحنه", true) ||
    lowerMessage.includes("cancel") ||
    includesNormalized(normalizedMessage, "الغي", true)
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

  // الخدمات (خدماتنا / خدمات مراسيل) → رد تسويقي إبداعي
  const servicesPatterns = [
    "خدماتكم",
    "خدماتنا",
    "خدمات مراسيل",
    "شو خدماتكم",
    "وش خدماتكم",
    "ما خدماتكم",
    "ما هي خدماتكم",
    "شو تقدمون",
    "وش تقدمون",
    "انواع الخدمات",
    "شو عندكم خدمات",
    "قلي عن الخدمات",
    "وريني الخدمات",
    "اعرض الخدمات",
    "ما الخدمات",
    "ايش خدماتكم",
    "ايش تقدمون",
  ];
  if (
    servicesPatterns.some((pattern) =>
      includesNormalized(normalizedMessage, pattern, true),
    )
  ) {
    console.log(
      "✅ [Quick Parse] Matched SERVICES question → GET_SERVICES_INFO",
    );
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: "",
      data: { action: "GET_SERVICES_INFO" },
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
    "زبط هدول كمان",
    "زبط هذول كمان",
    "زبط هاللي قبل كمان",
    "زبط اللي قبل كمان",
    "زبط الوضع",
    "زبط الشغل",
    "زبط الكلام",
    "عطيني معلومات زيادة",
    "عطيني تفاصيل أكثر",
    "أكثر",
    "زيادة",
    "وإيه أكثر",
    "وش أكثر",
    "وش غير كذا",
    "عرفني على مراسيل",
    "احكي عن مراسيل",
    "من انتم",
  ];
  if (
    companyPatterns.some((pattern) =>
      includesNormalized(normalizedMessage, pattern, true),
    )
  ) {
    console.log("✅ [Quick Parse] Matched COMPANY_INFO pattern");
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: `مراسيل هي منصة شحن إلكترونية متخصصة في خدمة التجار والشركات في السعودية. نقدم خدمات إنشاء وتتبع الشحنات، ربط المتاجر، إدارة المحفظة، والم. كيف أقدر أساعدك؟`,
      data: {},
    };
  }

  // شركات الشحن / أنواع الشحن → جلب القائمة من قاعدة البيانات
  const shippingCompaniesPatterns = [
    "شركات الشحن",
    "shipping companies",
    "ما الشركات",
    "شركات متوفرة",
    "أي شركات",
    "شركات التوصيل",
    "شركات الشحن المتاحة",
    "الشركات المتاحه",
    "عطيني الشركات",
    "شو عنا شركات",
    "شو في شركات",
    "شو الشركات",
    "وش الشركات",
    "عندكم شركات",
    "عندكم شركات شحن",
    "انواع الشحن",
    "أنواع الشحن",
    "انواع الشحنات",
    "شو انواع الشحن",
    "وش انواع الشحن",
    "ما هي الشركات",
    "قلي الشركات",
    "وريني الشركات",
  ];
  if (
    shippingCompaniesPatterns.some((pattern) =>
      includesNormalized(normalizedMessage, pattern, true),
    )
  ) {
    console.log("✅ [Quick Parse] Matched SHIPPING_COMPANIES → fetch from DB");
    return {
      intent: "CHAT",
      confidence: 0.9,
      missing_fields: [],
      message: "",
      data: { action: "GET_SHIPPING_COMPANIES" },
    };
  }

  // متابعة حساب السعر: السياق يذكر أننا ننتظر وزن/دفع والرسالة تحتوي وزناً (واختيارياً طريقة دفع)
  if (
    context &&
    (context.includes("لحساب سعر") ||
      context.includes("أحتاج أعرف وزن") ||
      context.includes("وزن الشحنة بالكيلو") ||
      context.includes("طريقة الدفع"))
  ) {
    const hasWeight =
      /\d+(?:\.\d+)?\s*(?:ك(?:يلو|ليو|جم|غ|يلو|ليوغرام|ليو)|كيلوغرام|kg)/i.test(
        normalizedMessage,
      ) || /(?:وزنها|وزن)\s*(\d+)/i.test(normalizedMessage);
    if (hasWeight) {
      console.log(
        "✅ [Quick Parse] Pricing continuation (weight in message) → CALCULATE_PRICING",
      );
      return {
        intent: "CHAT",
        confidence: 0.9,
        missing_fields: [],
        message: "",
        data: { action: "CALCULATE_PRICING", shipmentDetails: message },
      };
    }
  }

  // الأسعار والتكلفة - أنماط شاملة
  const pricingPatterns = [
    "كم التكلفة",
    "كم السعر",
    "كم الثمن",
    "التكلفة",
    "السعر",
    "الاسعار",
    "price",
    "cost",
    "كم يكلف",
    "كم تكلفة",
    "احسب سعر",
    "بدي احسب",
    "حساب سعر",
    "سعر شحنة",
    "اعمل شحنة",
    "بدي اعمل شحنة",
    "كم سعر الشحن",
    "شو اسعار",
    "وش اسعار",
    "شو الاسعار",
    "كم تكلفة الشحن",
    "كم سعر الشحنات",
    "اسعار الشركات",
    "تكلفة الشحن",
    "سعر الشحن",
    "شو اسعار الشركات",
    "كم اسعار الشركات",
    "شو اسعار شركات الشحن",
    "كم تكلفة شركات الشحن",
    "بدي اعرف كم",
    "ابي اعرف كم",
    "اريد اعرف كم",
    "دي اعرف كم",
    "كم تكلفني",
    "كم سعر",
    "شو سعر",
    "وش سعر",
    "كم يكلفني",
    "كم السعر ل",
    "كم سعر الشحنة",
    "كم سعر الشحنة في",
    "سعر الشحنة",
    "بكم",
    "قديش",
    "قد ايش",
    "قد ايه",
    "كم تطلع",
    "كم محسوبه",
  ];
  const hasPricingIntent = pricingPatterns.some((pattern) =>
    includesNormalized(normalizedMessage, pattern, true),
  );
  if (hasPricingIntent) {
    // إذا كانت الرسالة تحتوي وزن و/أو شركة (ارمكس، سمسا، إلخ) → حساب فوري عبر shipmentAccount
    const hasWeightInMessage =
      /\d+(?:\.\d+)?\s*(?:ك(?:يلو|ليو|جم|غ|يلو|ليوغرام|ليو)|كيلوغرام|kg)/i.test(
        normalizedMessage,
      ) ||
      /(?:وزنها|وزن الشحنة|وزن)\s*(\d+(?:\.\d+)?)/i.test(normalizedMessage) ||
      /شحنة\s+عادي[^\d]*(\d+)/i.test(normalizedMessage) ||
      /\d+(?:\.\d+)?\s*كيلوغرام/i.test(normalizedMessage);
    const hasCompanyInMessage =
      /ارمكس|ارامكس|أرامكس|سمسا|ريد بوكس|لاما|ومني|omni/i.test(
        normalizedMessage,
      );
    if (hasWeightInMessage || hasCompanyInMessage) {
      console.log(
        "✅ [Quick Parse] PRICING with details in message → CALCULATE_PRICING via shipmentAccount",
      );
      return {
        intent: "CHAT",
        confidence: 0.9,
        missing_fields: [],
        message: "",
        data: {
          action: "CALCULATE_PRICING",
          shipmentDetails: message,
        },
      };
    }
    console.log("✅ [Quick Parse] Matched PRICING pattern (no details)");
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
    "جبتها",
    "حصلت عليها",
    "وريني",
    "شوفها",
    "اطلعها",
    "عرضها",
    "ما شافها",
    "ما شفتها",
    "ما شوفتها",
    "أرني",
    "أظهر",
    "show me",
    "show",
    "display",
    "عرضلي",
    "وريني إياها",
  ];

  if (
    continuationPatterns.some((pattern) =>
      includesNormalized(normalizedMessage, pattern, true),
    )
  ) {
    console.log("✅ [Quick Parse] Matched CONTINUATION pattern");

    // تحقق من السياق بطريقة أكثر دقة
    if (context) {
      // إذا كان السياق يتعلق بتتبع شحنة محددة
      if (
        context.includes("تتبع شحنة محددة") ||
        context.includes("tracking_number") ||
        context.includes("رقم التتبع") ||
        context.includes("شحنة الحين") ||
        context.includes("بيانات الشحنة")
      ) {
        // ابحث عن رقم التتبع في السياق
        const contextTrackingMatch = context.match(/(\d{6,})/);
        if (contextTrackingMatch) {
          console.log(
            "✅ [Quick Parse] Found tracking number in context for continuation:",
            contextTrackingMatch[1],
          );
          return {
            intent: "TRACK",
            confidence: 0.95,
            missing_fields: [],
            message: `تمام ${userName}، هذي بيانات الشحنة المطلوبة...`,
            data: { tracking_number: contextTrackingMatch[1] },
          };
        } else {
          // إذا كان هناك سياق تتبع لكن لا رقم محدد
          console.log(
            "✅ [Quick Parse] Continuation in tracking context without number",
          );
          return {
            intent: "CHAT",
            confidence: 0.7,
            missing_fields: [],
            message: `${userName}، أنت تتبع شحنة، بس ما لقيت رقم التتبع في المحادثة. قلي الرقم تاني عشان أجيب لك البيانات.`,
            data: {},
          };
        }
      }

      // إذا كان السياق يتعلق بقائمة الشحنات
      if (
        context.includes("قائمة الشحنات") ||
        context.includes("shipments") ||
        context.includes("شحناتك")
      ) {
        return {
          intent: "LIST",
          confidence: 0.8,
          missing_fields: [],
          message: `تمام ${userName}، خلني أجيبلك قائمة شحناتك مع حالة كل شحنة...`,
          data: {},
        };
      }

      // إذا كان السياق يتعلق بالرصيد
      if (
        context.includes("الرصيد المالي") ||
        context.includes("رصيدك") ||
        context.includes("فلوس")
      ) {
        return {
          intent: "BALANCE",
          confidence: 0.8,
          missing_fields: [],
          message: `تمام ${userName}، خلني أجيبلك بيانات رصيدك من النظام...`,
          data: {},
        };
      }

      // إذا كان السياق يتعلق بإلغاء شحنة والمستخدم أرسل رقماً أو جملة فيها رقم
      if (
        context.includes("إلغاء") ||
        context.includes("لإلغاء الشحنة أحتاج") ||
        context.includes("رقم الشحنة المراد إلغاؤها")
      ) {
        const cancelNumInMessage = normalizedMessage.match(/(\d{6,})/);
        if (cancelNumInMessage) {
          console.log(
            "✅ [Quick Parse] Continuation in CANCEL context with number:",
            cancelNumInMessage[1],
          );
          return {
            intent: "CANCEL",
            confidence: 0.9,
            missing_fields: [],
            message: `تمام ${userName}، جاري إلغاء الشحنة رقم ${cancelNumInMessage[1]}...`,
            data: {
              shipment_id: cancelNumInMessage[1],
              tracking_number: cancelNumInMessage[1],
            },
          };
        }
      }

      // إذا كان السياق يتعلق بالأسعار أو الشركات
      if (
        context.includes("الأسعار") ||
        context.includes("اسعار") ||
        context.includes("شركات الشحن") ||
        context.includes("أي نوع شحنة") ||
        context.includes("نوع الشحنة") ||
        context.includes("كل شركة") ||
        context.includes("مميزاتها")
      ) {
        return {
          intent: "CHAT",
          confidence: 0.7,
          missing_fields: [],
          message: `تمام ${userName}، لحساب أسعار الشحن ${cleanMessage} أحتاج أعرف الوزن والمسافة. قلي تفاصيل شحنتك وسأعطيك أسعار دقيقة لجميع الشركات! 💰`,
          data: {},
        };
      }
    }

    // إذا لم يكن هناك سياق واضح، اسأل للتوضيح لكن بشكل أذكى
    return {
      intent: "CHAT",
      confidence: 0.6,
      missing_fields: [],
      message: `${userName}، تقصد تشوف إيه بالضبط؟ معلومات شحنة معينة ولا قائمة الشحنات ولا الرصيد أو الأسعار؟`,
      data: {},
    };
  }

  // أنواع الشحنات - استمرارية للأسعار
  const shipmentTypePatterns = [
    "شحن عادي",
    "شحن سريع",
    "شحن اقتصادي",
    "شحن برو",
    "شحن تدريجي",
    "شحن فوري",
    "شحن مستعجل",
    "شحن عاجل",
    "عادي",
    "سريع",
    "اقتصادي",
    "برو",
    "تدريجي",
    "فوري",
  ];

  if (
    shipmentTypePatterns.some((pattern) =>
      includesNormalized(normalizedMessage, pattern, true),
    )
  ) {
    console.log("✅ [Quick Parse] Matched SHIPMENT_TYPE pattern");

    // إذا كان السياق يتعلق بالأسعار أو الشركات
    if (
      context &&
      (context.includes("الأسعار") ||
        context.includes("اسعار") ||
        context.includes("شركات الشحن") ||
        context.includes("أي نوع شحنة"))
    ) {
      // استخراج نوع الشحن من الرسالة
      const shipmentType =
        cleanMessage.includes("عادي") || cleanMessage.includes("اقتصادي")
          ? "اقتصادي"
          : cleanMessage.includes("برو")
            ? "برو"
            : cleanMessage.includes("سريع")
              ? "برو"
              : "اقتصادي";

      return {
        intent: "CHAT",
        confidence: 0.8,
        missing_fields: ["weight", "paymentMethod"],
        message: `تمام ${userName}، لحساب سعر الشحن ${cleanMessage} بدقة أحتاج أعرف:\n\n⚖️ وزن الشحنة بالكيلوغرام؟\n💰 طريقة الدفع (كاش أو دفع عند الاستلام)؟\n📏 الأبعاد اختياري (الطول × العرض × الارتفاع بالسنتيمتر)\n\nقلي هذي التفاصيل وسأحسب لك الأسعار لكل شركة! 🧮`,
        data: {
          shipmentType: shipmentType,
          context: "pricing_calculation",
        },
      };
    }

    // إذا لم يكن هناك سياق محدد، اسأل عن التفاصيل
    return {
      intent: "CHAT",
      confidence: 0.7,
      missing_fields: [],
      message: `${userName}، تقصد تشحن ${cleanMessage}؟ قلي تفاصيل الشحنة (الوزن، العنوان) وسأساعدك في إنشاء الشحنة فوراً! 📦`,
      data: {},
    };
  }

  // تفاصيل الشحنة للحساب (وزن، دفع، أبعاد)
  const shipmentDetailsPatterns = [
    /\d+(?:\.\d+)?\s*ك(?:يلو|جم|غ|ليو|يلو)/i,
    /\d+(?:\.\d+)?\s*kg/i,
    /كاش|نقد/i,
    /دفع عند الاستلام|cod/i,
    /\d+\s*x\s*\d+\s*x\s*\d+/i,
    /\d+\s*×\s*\d+\s*×\s*\d+/i,
    /شحنه\s+\d+/i,
    /وزن الشحنه\s+\d+/i,
    /نوعها\s+شحن/i,
    /سمسا\s+الاقتصاديه/i,
    /سمسا\s+البرو/i,
    /ارامكس\s+البرو/i,
  ];

  if (
    shipmentDetailsPatterns.some(
      (pattern) =>
        pattern.test(normalizedMessage) || pattern.test(lowerMessage),
    )
  ) {
    console.log("✅ [Quick Parse] Matched SHIPMENT_DETAILS pattern");

    // إذا كان السياق يتعلق بحساب الأسعار
    if (context && context.includes("pricing_calculation")) {
      return {
        intent: "CHAT",
        confidence: 0.9,
        missing_fields: [],
        message: `تمام ${userName}، خلني أحسب لك الأسعار فوراً...`,
        data: {
          action: "CALCULATE_PRICING",
          shipmentDetails: cleanMessage,
          context: "pricing_calculation",
        },
      };
    }
  }

  // إذا لم يتطابق مع أي نمط - رد دردشة عام
  console.log("⚡ [Quick Parse] No match, returning null for Gemini");
  return null;
}

/**
 * توليد رد قصير مرتبط بمنصة مراسيل عند عدم معرفة الإجابة (بديل عن "لا أعرف")
 */
async function generateMarasilFallbackReply(userMessage) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig: { temperature: 0.6, maxOutputTokens: 150 },
    });
    const prompt = `المستخدم سأل: "${userMessage}"
اكتب رداً قصيراً (جملة أو جملتين) بالعربية، مرتبطاً بمنصة مراسيل marasil.sa (شحن، لوجستيات، تجار). لا تذكر أنك لا تعرف؛ قدّم معلومة مفيدة عن المنصة أو الشحن.`;
    const result = await model.generateContent(prompt);
    const text = result.response?.text?.()?.trim();
    return text || "مراسيل منصة شحن إلكترونية للتجار. كيف أقدر أساعدك؟";
  } catch (e) {
    console.warn("⚠️ [Gemini] Marasil fallback reply failed:", e?.message);
    return "مراسيل منصة شحن إلكترونية للتجار. كيف أقدر أساعدك؟";
  }
}

/**
 * عند رد CHAT بثقة منخفضة أو "لم أفهم": جرّب المعرفة المتعلمة ثم رد مراسيل الاحتياطي
 */
async function tryEnrichFromKnowledge(userMessage, result) {
  if (!result || result.intent !== "CHAT") return result;
  const lowConfidence = (result.confidence ?? 0.5) < 0.5;
  const genericMessage = /عذراً،?\s*(لم أفهم|لا أعرف|حدث خطأ|لم أستطع)/i.test(
    result.message || "",
  );
  if (!lowConfidence && !genericMessage) return result;

  if (!AiKnowledge) return result;

  const matches = await AiKnowledge.findBestMatch(userMessage, 1);
  if (matches.length && matches[0].score >= 2) {
    await AiKnowledge.findByIdAndUpdate(matches[0]._id, {
      $inc: { useCount: 1 },
    }).catch(() => {});
    console.log("📚 [Gemini] Using learned knowledge for reply");
    return {
      ...result,
      confidence: 0.85,
      message: matches[0].answer,
    };
  }

  const fallback = await generateMarasilFallbackReply(userMessage);
  return {
    ...result,
    confidence: 0.6,
    message: fallback,
  };
}

/**
 * إرسال رسالة لـ Gemini والحصول على رد - محسن بدعم function calling
 */
async function sendToGemini(
  userMessage,
  context = "",
  userId = null,
  userInfo = null,
) {
  try {
    // 1. أولاً جرب Quick Parse للأسئلة البسيطة
    console.log("🎯 [Gemini] Processing user message:", userMessage);
    const quickResult = quickKeywordParse(
      userMessage,
      userInfo,
      context,
      userId,
    );

    if (quickResult) {
      console.log("⚡ [Gemini] Quick parse produced hint:", quickResult.intent);
      if (!ENABLE_DEEP_THINKING) {
        console.log(
          "⚡ [Gemini] Deep thinking disabled, returning quick response",
        );
        return quickResult;
      }
    }

    console.log(
      "🚀 [Gemini] Proceeding with Gemini API for deep reasoning",
      ENABLE_DEEP_THINKING ? "(expanded mode)" : "",
    );

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      tools: [{ functionDeclarations: TOOLS }],
      generationConfig: GENERATION_CONFIG,
    });

    // بناء الـ prompt مع إرشادات تحليل وقرار ثم JSON فقط
    const deepThinkingDirectives = ENABLE_DEEP_THINKING
      ? `التحليل ثم القرار ثم المخرجات:
1) حلل: ما نية المستخدم (بدون التأثر باللهجة أو تغيير الصياغة)؟ ما السياق السابق؟
2) قرر: أي intent و أي API يناسبان النية؟ هل البيانات كافية؟
3) حسّن: صِغ message بلغة سليمة وخالية من الأخطاء الإملائية وبأسلوب مهني واضح.
4) أخرج: جملة JSON واحدة فقط (يمكن أن تتضمن حقل reasoning للتحليل الداخلي). لا نص قبل أو بعد الـ JSON.
تذكّر: تغيير اللهجة لا يغيّر النية؛ حافظ على استمرارية السياق.`
      : "حلل النية والسياق ثم قرر الـ intent والـ API. أخرج جملة JSON واحدة فقط.";

    const quickIntentHint = quickResult
      ? {
          intent: quickResult.intent,
          data: quickResult.data || {},
          missing_fields: quickResult.missing_fields || [],
          base_message: quickResult.message || "",
        }
      : null;

    const hintSection = quickIntentHint
      ? `\n\n# تلميح intent (اختياري)
${JSON.stringify(quickIntentHint, null, 2)}`
      : "";

    const normalizedContext = context || NO_CONTEXT_PLACEHOLDER;

    // حقن المعرفة المتعلمة في الـ prompt
    let knowledgeBlock = "";
    if (AiKnowledge) {
      try {
        const learned = await AiKnowledge.findBestMatch(userMessage, 10);
        if (learned.length) {
          knowledgeBlock =
            "\n\n=== معرفة مُتعلمة من المحادثات (استخدمها إن وافقت سؤال المستخدم)\n" +
            learned.map((k) => `س: ${k.question}\nج: ${k.answer}`).join("\n\n");
        }
      } catch (e) {
        console.warn("⚠️ [Gemini] Load learned knowledge failed:", e?.message);
      }
    }

    const outputReminder = `\n\nمطلوب: ردّك يجب أن يكون جملة JSON واحدة صالحة فقط (بدون شرح خارج الـ JSON).`;

    const fullPrompt = `${SYSTEM_PROMPT}\n\n${deepThinkingDirectives}\n\nContext: ${normalizedContext}\nUser: ${userMessage}${hintSection}${knowledgeBlock}${outputReminder}`;

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

        // إزالة حقل التحليل الداخلي قبل إرسال القرار للباكند (الباكند يهتم بالـ intent والـ data فقط)
        if (Object.prototype.hasOwnProperty.call(geminiData, "reasoning")) {
          console.log(
            "🧠 [Gemini] Reasoning (internal):",
            geminiData.reasoning?.substring?.(0, 120) || geminiData.reasoning,
          );
          delete geminiData.reasoning;
        }

        if (quickResult) {
          geminiData.intent = geminiData.intent || quickResult.intent;
          geminiData.data = {
            ...(quickResult.data || {}),
            ...(geminiData.data || {}),
          };
          geminiData.missing_fields =
            geminiData.missing_fields || quickResult.missing_fields || [];
          geminiData.confidence =
            geminiData.confidence || quickResult.confidence || 0.6;
          geminiData.message = geminiData.message || quickResult.message || "";
        }

        // التأكد من وجود الحقول المطلوبة
        if (geminiData.intent && geminiData.message) {
          let out = {
            intent: geminiData.intent,
            confidence: geminiData.confidence || 0.5,
            missing_fields: geminiData.missing_fields || [],
            message: geminiData.message,
            data: geminiData.data || {},
            api_call: geminiData.api_call,
          };
          out = await tryEnrichFromKnowledge(userMessage, out);
          return out;
        }
      }

      // إذا لم نجد JSON صحيح، أعد رد دردشة عام (مع محاولة المعرفة والرد المرتبط بمراسيل)
      console.log("⚠️ [Gemini] No valid JSON found, returning chat response");
      if (quickResult) {
        return quickResult;
      }
      return await tryEnrichFromKnowledge(userMessage, {
        intent: "CHAT",
        confidence: 0.3,
        missing_fields: [],
        message: "عذراً، لم أفهم طلبك. يرجى المحاولة مرة أخرى.",
        data: {},
      });
    } catch (parseError) {
      console.error("❌ [Gemini] JSON parse error:", parseError.message);
      if (quickResult) {
        console.log(
          "🔄 [Gemini] Falling back to quick response after parse error",
        );
        return quickResult;
      }
      return await tryEnrichFromKnowledge(userMessage, {
        intent: "CHAT",
        confidence: 0.2,
        missing_fields: [],
        message: "عذراً، حدث خطأ في معالجة الطلب. يرجى المحاولة مرة أخرى.",
        data: {},
      });
    }
  } catch (error) {
    console.error(
      "❌ [Gemini] Error communicating with Gemini API:",
      error.message,
    );

    // في حالة الخطأ، أعد رد Quick Parse أو رد عام
    const quickFallback = quickKeywordParse(
      userMessage,
      userInfo,
      context,
      userId,
    );
    if (quickFallback) {
      console.log("🔄 [Gemini] Using quick parse fallback");
      return quickFallback;
    }

    return await tryEnrichFromKnowledge(userMessage, {
      intent: "CHAT",
      confidence: 0.1,
      missing_fields: [],
      message: "عذراً، حدث خطأ تقني. يرجى المحاولة لاحقاً.",
      data: {},
    });
  }
}

/**
 * معالجة الرد من Gemini وتنفيذ العمليات - محسن لدعم function calls ووصول DB
 */
async function processGeminiResponse(
  geminiResponse,
  services,
  userId = null,
  userInfo = null,
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
        console.log("🔄 [AI] Services available:", !!services);
        console.log(
          "🔄 [AI] Shipment service available:",
          !!services.shipmentService,
        );
        console.log(
          "🔄 [AI] Track method available:",
          typeof services.shipmentService.trackShipment,
        );

        try {
          apiResult = await services.shipmentService.trackShipment(
            data.tracking_number,
          );
          console.log("🔄 [AI] API result:", apiResult);
          shouldCallAPI = true;
        } catch (apiError) {
          console.error("❌ [AI] API call failed:", apiError);
          apiResult = {
            success: false,
            message: "حدث خطأ في استدعاء API التتبع",
          };
          shouldCallAPI = true;
        }
      } else {
        console.log("⚠️ [AI] No tracking number provided for TRACK intent");
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

    case "CHAT":
      // طلب معلومات الخدمات → رد تسويقي إبداعي
      if (data && data.action === "GET_SERVICES_INFO") {
        const userName = userInfo?.firstName || "عميلنا";
        const servicesMessage =
          `أهلاً فيك ${userName}\n\n` +
          `إدارة الشحنات والطلبات بأسهل طريقة يحبها قلبك تنشئ تتابع وتتحكم بكل شحنة من مكان واحد\n\n` +
          `تكامل مع متجرك ربط مباشر مع (سلة) و (زد) و (شوبيفاي) والطلبات تنزل عندنا والشحن يناسبك\n\n` +
          `طباعة البوالص من كل شركات الشحن في منصتنا بأقل الأسعار ما تحتاج تتنقل من شركة لشركة\n\n` +
          `تبغى نبدأ من وين ؟\n` +
          `شحناتك\n` +
          `الرصيد\n` +
          `شركة معينة`;
        return {
          success: true,
          intent: "CHAT",
          result: null,
          message: servicesMessage,
        };
      }

      // طلب قائمة شركات الشحن من قاعدة البيانات
      if (data && data.action === "GET_SHIPPING_COMPANIES") {
        try {
          const companiesResult =
            await services.generalService.getShippingCompanies();
          if (!companiesResult.success || !companiesResult.companies?.length) {
            return {
              success: true,
              intent: "CHAT",
              result: companiesResult,
              message: `عذراً ${userInfo?.firstName || "عميلنا"}، ما فيه شركات شحن متاحة حالياً. جرّب بعد شوي أو تواصل مع الدعم.`,
            };
          }
          const companies = companiesResult.companies;
          const userName = userInfo?.firstName || "عميلنا";
          let companiesMessage = `🚚 **شركات الشحن المتاحة عندنا:**\n\n`;
          companies.forEach((c, i) => {
            const emoji = ["📦", "🚛", "✈️", "🚚"][i] || "•";
            const types =
              Array.isArray(c.shippingTypes) && c.shippingTypes.length > 0
                ? c.shippingTypes.map((t) => t.type || t).join("، ")
                : "—";
            companiesMessage += `${emoji} **${c.name}**\n`;
            companiesMessage += `   📋 أنواع الشحن: ${types}\n`;
            companiesMessage += `   ⏱️ مدة التوصيل: ${c.deliveryTime || "2-3 أيام عمل"}\n`;
            if (c.description) {
              companiesMessage += `   ${c.description}\n`;
            }
            companiesMessage += "\n";
          });
          companiesMessage += `أي شركة تناسبك؟ أو قلي وزن شحنتك وأحسب لك الأسعار. 💰`;
          return {
            success: true,
            intent: "CHAT",
            result: companiesResult,
            message: companiesMessage,
          };
        } catch (err) {
          console.error("❌ [AI] GET_SHIPPING_COMPANIES failed:", err);
          return {
            success: false,
            intent: "CHAT",
            result: null,
            message: "حدث خطأ في جلب شركات الشحن. يرجى المحاولة لاحقاً.",
          };
        }
      }

      // تدفق إنشاء شحنة جديد
      if (data && data.action === "CREATE_SHIPMENT_FLOW") {
        return await handleCreateShipmentFlow(
          data.rawMessage || "",
          userId,
          userInfo,
          services,
          {
            start: data.start === true,
            startWithDetails: data.startWithDetails === true,
            shipmentDetails: data.shipmentDetails || null,
          },
        );
      }

      // التحقق من وجود CALCULATE_PRICING action في البيانات
      if (data && data.action === "CALCULATE_PRICING" && data.shipmentDetails) {
        console.log(
          "🔄 [AI] Executing CALCULATE_PRICING with details:",
          data.shipmentDetails,
        );

        try {
          // استخراج البيانات من الرسالة
          const shipmentDetails = extractShipmentDetails(data.shipmentDetails);
          console.log("📊 [AI] Extracted shipment details:", shipmentDetails);

          // التحقق من اكتمال البيانات المطلوبة - الوزن مطلوب، طريقة الدفع اختيارية (افتراضي COD)
          if (!shipmentDetails.weight) {
            return {
              success: true,
              intent: "CHAT",
              result: geminiResponse,
              message: `عذراً ${
                userInfo?.firstName || "عميلنا"
              }، ما قدرت أستخرج وزن الشحنة. قلي بوضوح:\n\n⚖️ وزن الشحنة (مثال: 2 كيلو)\n💰 طريقة الدفع اختيارية (كاش أو دفع عند الاستلام - افتراضي دفع عند الاستلام)\n\nوسأحسب لك الأسعار! 🧮`,
            };
          }

          // إذا لم يحدد طريقة الدفع، افترض COD
          if (!shipmentDetails.paymentMethod) {
            shipmentDetails.paymentMethod = "COD";
            console.log(
              "💳 [AI] No payment method specified, defaulting to COD",
            );
          }

          // الحصول على شركات الشحن من قاعدة البيانات
          const companiesResult =
            await services.generalService.getShippingCompanies();
          if (!companiesResult.success) {
            return {
              success: false,
              intent: "CHAT",
              result: geminiResponse,
              message: "حدث خطأ في الحصول على بيانات شركات الشحن",
            };
          }

          let pricingComparison;

          // إذا كان هناك شركة محددة، احسب لها فقط (مطابقة مرنة: أرامكس = aramex)
          if (shipmentDetails.company) {
            const requested = (shipmentDetails.company || "").trim();
            let specificCompany = companiesResult.companies.find(
              (c) => (c.name || "").trim() === requested,
            );
            if (!specificCompany && requested) {
              const requestedNorm = normalizeArabicText(requested);
              specificCompany = companiesResult.companies.find((c) => {
                const nameNorm = normalizeArabicText((c.name || "").trim());
                return (
                  nameNorm === requestedNorm ||
                  nameNorm.includes(requestedNorm) ||
                  requestedNorm.includes(nameNorm) ||
                  (requestedNorm.includes("ارمكس") &&
                    nameNorm.includes("aramex"))
                );
              });
            }

            if (specificCompany) {
              console.log(
                `🎯 [AI] Calculating for specific company: ${shipmentDetails.company}`,
              );
              pricingComparison = await calculatePricingForSpecificCompany(
                specificCompany,
                shipmentDetails,
              );
            } else {
              // الشركة غير موجودة، احسب للجميع
              pricingComparison = await calculatePricingForAllCompanies(
                companiesResult.companies,
                shipmentDetails,
              );
            }
          } else {
            // حساب الأسعار لكل شركة
            pricingComparison = await calculatePricingForAllCompanies(
              companiesResult.companies,
              shipmentDetails,
            );
          }

          // بناء رسالة المقارنة
          let pricingMessage = `💰 **حساب الأسعار لشحنتك:**\n\n`;
          pricingMessage += `⚖️ الوزن: ${shipmentDetails.weight} كجم\n`;
          pricingMessage += `💳 طريقة الدفع: ${
            shipmentDetails.paymentMethod === "COD" ? "دفع عند الاستلام" : "كاش"
          }\n\n`;

          // إذا كانت شركة واحدة، غير الرسالة
          const formatPrice = (n) =>
            Number(n) != null && !Number.isNaN(Number(n))
              ? Number(Number(n).toFixed(2))
              : n;
          if (
            Array.isArray(pricingComparison) &&
            pricingComparison.length === 1
          ) {
            const company = pricingComparison[0];
            const emoji = "🚚";
            pricingMessage += `${emoji} **${company.name}** — 💰 ${formatPrice(company.total)} ريال\n\n`;
            pricingMessage += `🛒 موافق على إنشاء الشحنة مع ${company.name}؟`;
          } else {
            pricingComparison.forEach((company, index) => {
              const emoji = ["🚚", "📦", "🚛", "✈️"][index] || "📮";
              pricingMessage += `${emoji} **${company.name}** — 💰 ${formatPrice(company.total)} ريال\n`;
            });
            pricingMessage += `\n🛒 أي شركة تفضلها لإنشاء الشحنة؟`;
          }

          return {
            success: true,
            intent: "CHAT",
            result: geminiResponse,
            message: pricingMessage,
          };
        } catch (error) {
          console.error(
            "❌ [AI] CALCULATE_PRICING failed:",
            error?.message || error,
          );
          const friendlyMessage =
            error?.message && error.message.includes("البيانات")
              ? `عذراً، ${error.message} تأكد من وجود شركات شحن مفعّلة في النظام.`
              : "حدث خطأ في حساب الأسعار. تأكد من وجود شركات شحن مفعّلة في النظام وحاول مرة أخرى.";
          return {
            success: false,
            intent: "CHAT",
            result: geminiResponse,
            message: friendlyMessage,
          };
        }
      }
      break;

    case "CANCEL":
      if (data && data.shipment_id) {
        console.log("🔄 [AI] Executing cancelShipment:", data.shipment_id);
        apiResult = await services.shipmentService.cancelShipment(
          data.shipment_id,
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
                } - ${ship.totalPrice} ريال`,
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
          api_call.params.tracking_number,
        );
        apiResult = await services.shipmentService.trackShipment(
          api_call.params.tracking_number,
        );
        break;
      case "createShipment":
        console.log("🔄 [AI] Executing createShipment:", api_call.params);
        apiResult = await services.shipmentService.createShipmentFromAI(
          api_call.params,
        );
        break;
      case "cancelShipment":
        console.log(
          "🔄 [AI] Executing cancelShipment:",
          api_call.params.shipment_id,
        );
        apiResult = await services.shipmentService.cancelShipment(
          api_call.params.shipment_id,
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
          api_call.params,
        );
        break;
      default:
        console.log("❌ [AI] Unknown API call:", api_call.name);
        apiResult = { success: false, message: "API غير مدعوم" };
    }

    // تنسيق رسالة شركات الشحن من قاعدة البيانات عند استدعاء getShippingCompanies
    let apiMessage = apiResult.success ? "تم التنفيذ بنجاح" : apiResult.message;
    if (
      api_call.name === "getShippingCompanies" &&
      apiResult.success &&
      apiResult.companies?.length
    ) {
      const companies = apiResult.companies;
      apiMessage = `🚚 **شركات الشحن المتاحة عندنا:**\n\n`;
      companies.forEach((c, i) => {
        const emoji = ["📦", "🚛", "✈️", "🚚"][i] || "•";
        const types =
          Array.isArray(c.shippingTypes) && c.shippingTypes.length > 0
            ? c.shippingTypes.map((t) => t.type || t).join("، ")
            : "—";
        apiMessage += `${emoji} **${c.name}**\n`;
        apiMessage += `   📋 أنواع الشحن: ${types}\n`;
        apiMessage += `   ⏱️ مدة التوصيل: ${c.deliveryTime || "2-3 أيام عمل"}\n`;
        if (c.description) apiMessage += `   ${c.description}\n`;
        apiMessage += "\n";
      });
      apiMessage += `أي شركة تناسبك؟ أو قلي وزن شحنتك وأحسب لك الأسعار. 💰`;
    }

    return {
      success: apiResult.success,
      intent,
      result: apiResult,
      message: apiMessage,
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

// استخراج تفاصيل الشحنة من الرسالة
function extractShipmentDetails(message) {
  console.log("🔍 [AI] Extracting shipment details from:", message);
  const normalizedMessage = normalizeArabicText(message || "");

  const details = {
    weight: null,
    paymentMethod: null,
    dimensions: null,
    shipmentType: null,
    company: null,
  };

  // استخراج الوزن - دعم كيلو، كليو، وزنها، وزن الشحنة، إلخ
  const weightMatch = normalizedMessage.match(
    /(\d+(?:\.\d+)?)\s*(?:ك(?:يلو|ليو|جم|غ|يلو|ليوغرام)|كيلوغرام|kg)/i,
  );
  if (weightMatch) {
    details.weight = parseFloat(weightMatch[1]);
    console.log("⚖️ [AI] Extracted weight:", details.weight);
  } else {
    const weightPatterns = [
      /(?:وزنها|وزن الشحنة|وزن)\s*(\d+(?:\.\d+)?)(?:\s*ك(?:يلو|ليو|يلوغرام|جم))?/i,
      /(?:شحنة|شحنه)\s+(?:عادي|برو)?[^\d]*(\d+(?:\.\d+)?)(?:\s*ك(?:يلو|ليو|يلوغرام))?/i,
      /(\d+(?:\.\d+)?)\s*ك(?:يلو|ليو|يلوغرام)/i,
      /(\d+(?:\.\d+)?)\s*كيلوغرام/i,
    ];
    for (const re of weightPatterns) {
      const m = normalizedMessage.match(re);
      if (m && m[1]) {
        details.weight = parseFloat(m[1]);
        console.log("⚖️ [AI] Extracted weight:", details.weight);
        break;
      }
    }
  }

  // استخراج نوع الشحن (عادي / اقتصادي / جاف = نفس الفئة، برو = سريع)
  if (
    includesNormalized(normalizedMessage, "شحن برو", true) ||
    includesNormalized(normalizedMessage, "برو", true) ||
    includesNormalized(normalizedMessage, "سريع", true)
  ) {
    details.shipmentType = "برو";
  } else if (
    includesNormalized(normalizedMessage, "شحن عادي", true) ||
    includesNormalized(normalizedMessage, "عادي", true) ||
    includesNormalized(normalizedMessage, "اقتصادي", true) ||
    includesNormalized(normalizedMessage, "جاف", true)
  ) {
    details.shipmentType = "عادي";
  }

  // استخراج الشركة (ارمكس بدون الألف الثانية شائعة في العامية)
  if (includesNormalized(normalizedMessage, "سمسا", true)) {
    details.company = "سمسا";
  } else if (
    includesNormalized(normalizedMessage, "أرامكس", true) ||
    includesNormalized(normalizedMessage, "ارامكس", true) ||
    includesNormalized(normalizedMessage, "ارمكس", true)
  ) {
    details.company = "أرامكس";
  } else if (includesNormalized(normalizedMessage, "ريد بوكس", true)) {
    details.company = "ريد بوكس";
  } else if (
    includesNormalized(normalizedMessage, "لاما بوكس", true) ||
    includesNormalized(normalizedMessage, "ولما بوكس", true)
  ) {
    details.company = "لاما بوكس";
  }

  // استخراج طريقة الدفع (كاش، مسبق، دفع عند الاستلام)
  const msgLower = (message || "").toLowerCase();
  if (
    message.includes("دفع عند الاستلام") ||
    msgLower.includes("cod") ||
    includesNormalized(normalizedMessage, "عند الاستلام", true)
  ) {
    details.paymentMethod = "COD";
  } else if (
    message.includes("كاش") ||
    message.includes("نقد") ||
    msgLower.includes("cash") ||
    includesNormalized(normalizedMessage, "مسبق", true) ||
    includesNormalized(normalizedMessage, "مدفوع", true) ||
    includesNormalized(normalizedMessage, "prepaid", true) ||
    includesNormalized(normalizedMessage, "الدفع مسبق", true)
  ) {
    details.paymentMethod = "CASH";
  }

  // استخراج الأبعاد (اختياري)
  const dimensionMatch = message.match(/(\d+)\s*[x×]\s*(\d+)\s*[x×]\s*(\d+)/i);
  if (dimensionMatch) {
    details.dimensions = {
      length: parseInt(dimensionMatch[1]),
      width: parseInt(dimensionMatch[2]),
      height: parseInt(dimensionMatch[3]),
    };
    console.log("📏 [AI] Extracted dimensions:", details.dimensions);
  }

  console.log("📋 [AI] Complete extracted details:", details);

  return details;
}

function pickShippingTypeForCompany(company, shipmentDetails) {
  const shippingTypes = Array.isArray(company.shippingTypes)
    ? company.shippingTypes
    : Array.isArray(company.shipmentType)
      ? company.shipmentType
      : [];

  if (!shippingTypes.length) return null;

  const requestedType = shipmentDetails?.shipmentType
    ? normalizeArabicText(shipmentDetails.shipmentType)
    : null;

  if (requestedType) {
    const matched = shippingTypes.find((type) =>
      includesNormalized(type.type || "", requestedType),
    );
    if (matched) return matched;
  }

  return shippingTypes.reduce((cheapest, current) => {
    const cheapestPrice =
      (cheapest?.basePrice || 0) + (cheapest?.profitPrice || 0);
    const currentPrice =
      (current?.basePrice || 0) + (current?.profitPrice || 0);
    return currentPrice < cheapestPrice ? current : cheapest;
  }, shippingTypes[0]);
}

// حساب الأسعار لشركة محددة
async function calculatePricingForSpecificCompany(company, shipmentDetails) {
  console.log(
    `🏢 [AI] Calculating pricing for specific company: ${company.name}`,
  );

  const shipmentAccount = require("./shipmentAccount");
  const pricingResults = [];

  // بيانات الشحنة الموحدة
  const orderData = {
    weight: shipmentDetails.weight,
    paymentMethod: shipmentDetails.paymentMethod,
    dimension: shipmentDetails.dimensions || {
      length: 0,
      width: 0,
      height: 0,
    },
  };

  try {
    console.log(`🏢 [AI] Calculating for ${company.name}`);

    const shippingType = pickShippingTypeForCompany(company, shipmentDetails);

    if (!shippingType) {
      throw new Error("لا توجد أنواع شحن متاحة لهذه الشركة");
    }

    // حساب السعر باستخدام shipmentAccount
    const pricing = shipmentAccount.shipmentnorm(shippingType, orderData);

    // بناء تفاصيل التكلفة
    let breakdown = `الأساسي: ${
      shippingType.basePrice + shippingType.profitPrice
    } ريال`;
    if (pricing.breakdown.additionalWeightCost > 0) {
      breakdown += ` + وزن إضافي: ${pricing.breakdown.additionalWeightCost} ريال`;
    }
    if (pricing.breakdown.codFees > 0) {
      breakdown += ` + دفع عند الاستلام: ${pricing.breakdown.codFees} ريال`;
    }

    pricingResults.push({
      name: company.name,
      total: pricing.total,
      breakdown: breakdown,
      type: shippingType.type || shipmentDetails.shipmentType || "أساسي",
    });
  } catch (error) {
    console.error(`❌ [AI] Error calculating for ${company.name}:`, error);
    pricingResults.push({
      name: company.name,
      total: 0,
      breakdown: "خطأ في الحساب",
      type: shipmentDetails.shipmentType || "اقتصادي",
    });
  }

  return pricingResults;
}

// حساب الأسعار لكل شركة
async function calculatePricingForAllCompanies(companies, shipmentDetails) {
  console.log("🧮 [AI] Calculating pricing for all companies");

  const shipmentAccount = require("./shipmentAccount");
  const pricingResults = [];

  // بيانات الشحنة الموحدة
  const orderData = {
    weight: shipmentDetails.weight,
    paymentMethod: shipmentDetails.paymentMethod,
    dimension: shipmentDetails.dimensions || {
      length: 0,
      width: 0,
      height: 0,
    },
  };

  for (const company of companies) {
    try {
      console.log(`🏢 [AI] Calculating for ${company.name}`);

      const shippingType = pickShippingTypeForCompany(company, shipmentDetails);

      if (!shippingType) {
        console.warn(`⚠️ [AI] No shipping types available for ${company.name}`);
        continue;
      }

      // حساب السعر باستخدام shipmentAccount
      const pricing = shipmentAccount.shipmentnorm(shippingType, orderData);

      // بناء تفاصيل التكلفة
      let breakdown = `الأساسي: ${
        shippingType.basePrice + shippingType.profitPrice
      } ريال`;
      if (pricing.breakdown.additionalWeightCost > 0) {
        breakdown += ` + وزن إضافي: ${pricing.breakdown.additionalWeightCost} ريال`;
      }
      if (pricing.breakdown.codFees > 0) {
        breakdown += ` + دفع عند الاستلام: ${pricing.breakdown.codFees} ريال`;
      }

      pricingResults.push({
        name: company.name,
        total: pricing.total,
        breakdown: breakdown,
        type: shippingType.type || "أساسي",
      });
    } catch (error) {
      console.error(`❌ [AI] Error calculating for ${company.name}:`, error);
      pricingResults.push({
        name: company.name,
        total: 0,
        breakdown: "خطأ في الحساب",
        type: company.types?.[0] || "أساسي",
      });
    }
  }

  // ترتيب النتائج حسب السعر (الأقل سعراً أولاً)
  return pricingResults.sort((a, b) => a.total - b.total);
}

function extractPhoneNumber(message) {
  const normalized = normalizeArabicText(message || "");
  const match = normalized.match(/(\d{8,15})/);
  return match ? match[1] : null;
}

function extractNumber(message) {
  const normalized = normalizeArabicText(message || "");
  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

function extractBoxesCount(message) {
  const normalized = normalizeArabicText(message || "");
  const contextualMatch = normalized.match(
    /(عدد|صندوق|صناديق|كرتون|كراتين)\s*(\d+)/i,
  );
  if (contextualMatch) return parseInt(contextualMatch[2], 10);
  const fallback = normalized.match(/(\d+)/);
  return fallback ? parseInt(fallback[1], 10) : null;
}

function extractPaymentMethod(message) {
  const normalized = normalizeArabicText(message || "");
  if (
    includesNormalized(normalized, "cod", true) ||
    includesNormalized(normalized, "دفع عند الاستلام", true) ||
    includesNormalized(normalized, "عند الاستلام", true)
  ) {
    return "COD";
  }
  if (
    includesNormalized(normalized, "مسبق", true) ||
    includesNormalized(normalized, "مدفوع", true) ||
    includesNormalized(normalized, "prepaid", true)
  ) {
    return "Prepaid";
  }
  return null;
}

function isAffirmativeReply(message) {
  const normalized = normalizeArabicText(message || "");
  const patterns = ["نعم", "اي", "ايه", "تمام", "موافق", "توكل", "اوكي"];
  return patterns.some((pattern) =>
    includesNormalized(normalized, pattern, true),
  );
}

function isNegativeReply(message) {
  const normalized = normalizeArabicText(message || "");
  const patterns = ["لا", "مو", "غير", "الغ", "إلغاء", "وقف"];
  return patterns.some((pattern) =>
    includesNormalized(normalized, pattern, true),
  );
}

function isExistingSenderRecipientChoice(message) {
  const normalized = normalizeArabicText(message || "");
  const patterns = [
    "موجودين",
    "موجود",
    "مسبقا",
    "مسبقاً",
    "اللي عندي",
    "عندي",
    "موجودة",
    "استخدم اللي عندي",
  ];
  return patterns.some((pattern) =>
    includesNormalized(normalized, pattern, true),
  );
}

function isNewSenderRecipientChoice(message) {
  const normalized = normalizeArabicText(message || "");
  const patterns = ["جديد", "جديدين", "انشاء", "اعمل جديد", "مرسل جديد"];
  return patterns.some((pattern) =>
    includesNormalized(normalized, pattern, true),
  );
}

/** يفسر اختيار المستخدم: رقم المرسل ورقم المستلم (مثال: "1 و 2" أو "المرسل 1 المستلم 2") */
function parseSenderRecipientSelection(message) {
  const normalized = (message || "").trim();
  const twoNumbers = normalized.match(/(\d+)\s*(?:و|وال)\s*(\d+)/);
  if (twoNumbers)
    return {
      senderIndex: parseInt(twoNumbers[1], 10),
      recipientIndex: parseInt(twoNumbers[2], 10),
    };
  const anyTwo = normalized.match(/(\d+)\s+(\d+)/);
  if (anyTwo)
    return {
      senderIndex: parseInt(anyTwo[1], 10),
      recipientIndex: parseInt(anyTwo[2], 10),
    };
  const senderMatch = normalized.match(/المرسل\s*(\d+)/i);
  const recipientMatch = normalized.match(/المستلم\s*(\d+)/i);
  if (senderMatch && recipientMatch)
    return {
      senderIndex: parseInt(senderMatch[1], 10),
      recipientIndex: parseInt(recipientMatch[1], 10),
    };
  const singleDigit = normalized.match(/^(\d+)$/);
  if (singleDigit)
    return {
      senderIndex: parseInt(singleDigit[1], 10),
      recipientIndex: parseInt(singleDigit[1], 10),
    };
  return null;
}

function findCompanyInOptions(message, options) {
  const normalized = normalizeArabicText(message || "");
  if (
    includesNormalized(normalized, "ارخص", true) ||
    includesNormalized(normalized, "اقل سعر", true)
  ) {
    return options.reduce((min, current) =>
      current.total < min.total ? current : min,
    );
  }

  return options.find((option) =>
    includesNormalized(normalized, option.name, true),
  );
}

async function handleCreateShipmentFlow(
  message,
  userId,
  userInfo,
  services,
  options = {},
) {
  const startFlow = options.start === true;
  const startWithDetails = options.startWithDetails === true;
  const shipmentDetails = options.shipmentDetails || null;

  const userName = userInfo?.firstName || "عميلنا الكريم";
  const normalizedMessage = normalizeArabicText(message || "");
  let state = stateManager.getState(userId);
  const wasNewFlow = !state;

  if (!state) {
    state = stateManager.setState(userId, {
      flow: "CREATE_SHIPMENT",
      step:
        startWithDetails && shipmentDetails
          ? "AWAIT_SENDER_RECIPIENT_CHOICE"
          : "ASK_SENDER_NAME",
      data: startWithDetails && shipmentDetails ? { ...shipmentDetails } : {},
    });
  }

  if (startFlow && wasNewFlow && !startWithDetails) {
    return {
      success: true,
      intent: "CHAT",
      result: {},
      message: `تمام ${userName}، خلّينا ننشئ الشحنة خطوة خطوة. مين المرسل؟ (اسم المرسل)`,
    };
  }

  if (startWithDetails && wasNewFlow && shipmentDetails) {
    return {
      success: true,
      intent: "CHAT",
      result: {},
      message: `تمام ${userName} 👍 عندك تفاصيل الشحنة (${shipmentDetails.company || "شركة"}، ${shipmentDetails.weight} كجم، ${shipmentDetails.paymentMethod === "CASH" ? "دفع مسبق" : "دفع عند الاستلام"}).\n\nبدك تعمل **مرسل جديد ومستلم جديد** أو **موجودين مسبقاً**؟ (قل "جديد" أو "موجودين")`,
    };
  }

  const skipNegativeCheck =
    state.step === "AWAIT_SENDER_RECIPIENT_CHOICE" ||
    state.step === "AWAIT_SENDER_RECIPIENT_SELECT";
  if (!skipNegativeCheck && isNegativeReply(normalizedMessage)) {
    stateManager.clearState(userId);
    return {
      success: true,
      intent: "CHAT",
      result: {},
      message: `تمام ${userName}، تم إلغاء إنشاء الشحنة. إذا حاب نرجع لها بأي وقت أنا جاهز.`,
    };
  }

  const nextState = (patch) => stateManager.updateState(userId, patch);

  const data = state.data || {};

  switch (state.step) {
    case "AWAIT_SENDER_RECIPIENT_CHOICE": {
      if (isExistingSenderRecipientChoice(normalizedMessage)) {
        const [sendersRes, recipientsRes] = await Promise.all([
          services.shipmentService.getSenderAddresses(),
          services.shipmentService.getClientAddresses(),
        ]);
        const senders = sendersRes.success ? sendersRes.data || [] : [];
        const recipients = recipientsRes.success
          ? recipientsRes.data || []
          : [];
        if (senders.length === 0 && recipients.length === 0) {
          return {
            success: true,
            intent: "CHAT",
            result: {},
            message: `ما في عندك مرسلين ولا مستلمين محفوظين. خلينا ننشئ مرسل ومستلم جديد. مين المرسل؟ (اسم المرسل)`,
          };
        }
        if (senders.length === 0) {
          nextState({ step: "ASK_SENDER_NAME", data: { ...data } });
          return {
            success: true,
            intent: "CHAT",
            result: {},
            message: `ما في مرسلين محفوظين. مين المرسل؟ (اسم المرسل)`,
          };
        }
        if (recipients.length === 0) {
          nextState({ step: "ASK_SENDER_NAME", data: { ...data } });
          return {
            success: true,
            intent: "CHAT",
            result: {},
            message: `ما في مستلمين محفوظين. خلينا ننشئ مرسل أولاً. مين المرسل؟`,
          };
        }
        nextState({
          step: "AWAIT_SENDER_RECIPIENT_SELECT",
          data: {
            ...data,
            sendersList: senders,
            recipientsList: recipients,
          },
        });
        const senderLines = senders
          .map(
            (s, i) =>
              `${i + 1}. ${s.alias || s.location || "عنوان " + (i + 1)} - ${s.city || ""}`,
          )
          .join("\n");
        const recipientLines = recipients
          .map(
            (r, i) => `${i + 1}. ${r.clientName || "مستلم"} - ${r.city || ""}`,
          )
          .join("\n");
        return {
          success: true,
          intent: "CHAT",
          result: {},
          message: `المرسلين:\n${senderLines}\n\nالمستلمين:\n${recipientLines}\n\nاختر رقم المرسل ورقم المستلم (مثال: 1 و 2)`,
        };
      }
      if (isNewSenderRecipientChoice(normalizedMessage)) {
        nextState({ step: "ASK_SENDER_NAME", data: { ...data } });
        return {
          success: true,
          intent: "CHAT",
          result: {},
          message: `تمام ${userName}، خلينا ننشئ مرسل ومستلم جديد. مين المرسل؟ (اسم المرسل)`,
        };
      }
      return {
        success: true,
        intent: "CHAT",
        result: {},
        message: `قل "موجودين" إذا تحب تختار من المرسلين والمستلمين اللي عندك، أو "جديد" لإنشاء مرسل ومستلم جديد.`,
      };
    }

    case "AWAIT_SENDER_RECIPIENT_SELECT": {
      const selection = parseSenderRecipientSelection(message);
      const sendersList = data.sendersList || [];
      const recipientsList = data.recipientsList || [];
      if (
        !selection ||
        selection.senderIndex < 1 ||
        selection.recipientIndex < 1
      ) {
        return {
          success: true,
          intent: "CHAT",
          result: {},
          message: "اختر رقم المرسل ورقم المستلم (مثال: 1 و 2).",
        };
      }
      const senderAddr = sendersList[selection.senderIndex - 1];
      const recipientAddr = recipientsList[selection.recipientIndex - 1];
      if (!senderAddr || !recipientAddr) {
        return {
          success: true,
          intent: "CHAT",
          result: {},
          message: `الرقم غير صحيح. المرسلين من 1 إلى ${sendersList.length} والمستلمين من 1 إلى ${recipientsList.length}. (مثال: 1 و 2)`,
        };
      }
      const senderAddressLine =
        [
          senderAddr.location,
          senderAddr.detalis,
          senderAddr.street,
          senderAddr.district,
          senderAddr.city,
        ]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        senderAddr.city ||
        "العنوان غير محدد";
      const senderPayload = {
        name: senderAddr.alias || senderAddr.location || "المرسل",
        address: senderAddressLine,
        phone: senderAddr.phone || "",
        city: senderAddr.city || "",
        country: senderAddr.country || "sa",
        nationalAddress: senderAddr.nationalAddress || "",
      };
      const receiverPayload = {
        _id: recipientAddr._id,
        name: recipientAddr.clientName,
        address: recipientAddr.clientAddress,
        phone: recipientAddr.clientPhone,
        city: recipientAddr.city,
        country: recipientAddr.country || "sa",
        email: recipientAddr.clientEmail,
        district: recipientAddr.district,
        nationalAddress: recipientAddr.nationalAddress,
      };
      const shipmentPayload = {
        sender: senderPayload,
        receiverId: receiverPayload._id,
        receiver: receiverPayload,
        weight: data.weight,
        boxes: data.boxes || 1,
        description: data.description || "شحنة",
        value: data.value || 0,
        paymentMethod: data.paymentMethod || "COD",
        company: data.company,
        shipmentType: data.shipmentType,
        dimensions: data.dimensions || null,
      };
      const creationResult =
        await services.shipmentService.createShipmentFromAI(shipmentPayload);
      if (!creationResult.success) {
        stateManager.clearState(userId);
        return {
          success: false,
          intent: "CHAT",
          result: creationResult,
          message:
            (creationResult.message ||
              "صار خطأ أثناء إنشاء الشحنة. حاول مرة ثانية.") +
            "\n\nيمكنك البدء من جديد بقول: بدي اعمل شحنة...",
        };
      }
      stateManager.clearState(userId);
      return {
        success: true,
        intent: "CHAT",
        result: creationResult,
        message: `تم إنشاء الشحنة بنجاح ✅ رقم التتبع: ${creationResult.trackingNumber}`,
      };
    }

    case "ASK_SENDER_NAME": {
      const senderName = message.trim();
      if (!senderName) {
        return {
          success: true,
          intent: "CHAT",
          result: {},
          message: "فضلاً اكتب اسم المرسل.",
        };
      }

      nextState({
        step: "ASK_SENDER_PHONE",
        data: {
          ...data,
          sender: { ...(data.sender || {}), name: senderName },
        },
      });
      return {
        success: true,
        intent: "CHAT",
        result: {},
        message: `تمام ${userName}، رقم جوال المرسل؟`,
      };
    }
    case "ASK_SENDER_PHONE": {
      const phone = extractPhoneNumber(message);
      if (!phone) {
        return {
          success: true,
          intent: "CHAT",
          result: {},
          message: "احتاج رقم الجوال للمرسل (مثال: 05XXXXXXXX).",
        };
      }

      nextState({
        step: "ASK_SENDER_CITY",
        data: {
          ...data,
          sender: { ...(data.sender || {}), phone },
        },
      });
      return {
        success: true,
        intent: "CHAT",
        result: {},
        message: "مدينة المرسل؟",
      };
    }
    case "ASK_SENDER_CITY": {
      const city = message.trim();
      if (!city) {
        return {
          success: true,
          intent: "CHAT",
          result: {},
          message: "فضلاً اكتب مدينة المرسل.",
        };
      }

      nextState({
        step: "ASK_SENDER_ADDRESS",
        data: {
          ...data,
          sender: { ...(data.sender || {}), city },
        },
      });
      return {
        success: true,
        intent: "CHAT",
        result: {},
        message: "عنوان المرسل بالتفصيل؟",
      };
    }
    case "ASK_SENDER_ADDRESS": {
      const address = message.trim();
      if (!address) {
        return {
          success: true,
          intent: "CHAT",
          result: {},
          message: "فضلاً اكتب عنوان المرسل بالتفصيل.",
        };
      }

      nextState({
        step: "ASK_RECEIVER_NAME",
        data: {
          ...data,
          sender: { ...(data.sender || {}), address },
        },
      });
      return {
        success: true,
        intent: "CHAT",
        result: {},
        message: "ممتاز. الآن مين المستلم؟ (اسم المستلم)",
      };
    }
    case "ASK_RECEIVER_NAME": {
      const receiverName = message.trim();
      if (!receiverName) {
        return {
          success: true,
          intent: "CHAT",
          result: {},
          message: "فضلاً اكتب اسم المستلم.",
        };
      }

      nextState({
        step: "ASK_RECEIVER_PHONE",
        data: {
          ...data,
          receiver: { ...(data.receiver || {}), name: receiverName },
        },
      });
      return {
        success: true,
        intent: "CHAT",
        result: {},
        message: "رقم جوال المستلم؟",
      };
    }
    case "ASK_RECEIVER_PHONE": {
      const phone = extractPhoneNumber(message);
      if (!phone) {
        return {
          success: true,
          intent: "CHAT",
          result: {},
          message: "احتاج رقم الجوال للمستلم (مثال: 05XXXXXXXX).",
        };
      }

      nextState({
        step: "ASK_RECEIVER_CITY",
        data: {
          ...data,
          receiver: { ...(data.receiver || {}), phone },
        },
      });
      return {
        success: true,
        intent: "CHAT",
        result: {},
        message: "مدينة المستلم؟",
      };
    }
    case "ASK_RECEIVER_CITY": {
      const city = message.trim();
      if (!city) {
        return {
          success: true,
          intent: "CHAT",
          result: {},
          message: "فضلاً اكتب مدينة المستلم.",
        };
      }

      nextState({
        step: "ASK_RECEIVER_ADDRESS",
        data: {
          ...data,
          receiver: { ...(data.receiver || {}), city },
        },
      });
      return {
        success: true,
        intent: "CHAT",
        result: {},
        message: "عنوان المستلم بالتفصيل؟",
      };
    }
    case "ASK_RECEIVER_ADDRESS": {
      const address = message.trim();
      if (!address) {
        return {
          success: true,
          intent: "CHAT",
          result: {},
          message: "فضلاً اكتب عنوان المستلم بالتفصيل.",
        };
      }

      nextState({
        step: "ASK_WEIGHT",
        data: {
          ...data,
          receiver: { ...(data.receiver || {}), address },
        },
      });
      return {
        success: true,
        intent: "CHAT",
        result: {},
        message: "كم وزن الشحنة بالكيلو؟",
      };
    }
    case "ASK_WEIGHT": {
      const weightFromData = data.weight;
      if (weightFromData != null && weightFromData > 0) {
        const boxesFromMsg = extractBoxesCount(message);
        if (boxesFromMsg && boxesFromMsg > 0) {
          nextState({
            step: "ASK_DESCRIPTION",
            data: { ...data, boxes: boxesFromMsg },
          });
          return {
            success: true,
            intent: "CHAT",
            result: {},
            message: "وصف مختصر لمحتوى الشحنة؟",
          };
        }
        nextState({ step: "ASK_BOXES", data: { ...data } });
        return {
          success: true,
          intent: "CHAT",
          result: {},
          message: "كم عدد الصناديق؟",
        };
      }
      const details = extractShipmentDetails(message);
      if (!details.weight) {
        return {
          success: true,
          intent: "CHAT",
          result: {},
          message: "فضلاً اكتب وزن الشحنة بالكيلو (مثال: 5 كيلو).",
        };
      }

      nextState({
        step: "ASK_BOXES",
        data: {
          ...data,
          weight: details.weight,
          shipmentType: details.shipmentType || data.shipmentType,
        },
      });
      return {
        success: true,
        intent: "CHAT",
        result: {},
        message: "كم عدد الصناديق؟",
      };
    }
    case "ASK_BOXES": {
      const boxes = extractBoxesCount(message);
      if (!boxes || boxes <= 0) {
        return {
          success: true,
          intent: "CHAT",
          result: {},
          message: "فضلاً اكتب عدد الصناديق (مثال: 2).",
        };
      }

      nextState({
        step: "ASK_DESCRIPTION",
        data: { ...data, boxes },
      });
      return {
        success: true,
        intent: "CHAT",
        result: {},
        message: "وصف مختصر لمحتوى الشحنة؟",
      };
    }
    case "ASK_DESCRIPTION": {
      const description = message.trim();
      if (!description) {
        return {
          success: true,
          intent: "CHAT",
          result: {},
          message: "فضلاً اكتب وصف الشحنة.",
        };
      }

      nextState({
        step: "ASK_VALUE",
        data: { ...data, description },
      });
      return {
        success: true,
        intent: "CHAT",
        result: {},
        message: "قيمة الشحنة بالريال؟",
      };
    }
    case "ASK_VALUE": {
      const value = extractNumber(message);
      if (!value || value <= 0) {
        return {
          success: true,
          intent: "CHAT",
          result: {},
          message: "فضلاً اكتب قيمة الشحنة بالأرقام (مثال: 150).",
        };
      }

      nextState({
        step: "ASK_PAYMENT_METHOD",
        data: {
          ...data,
          value,
        },
      });

      return {
        success: true,
        intent: "CHAT",
        result: {},
        message: "طريقة الدفع تكون مسبق أو دفع عند الاستلام (COD). وش تختار؟",
      };
    }
    case "ASK_PAYMENT_METHOD": {
      const paymentFromData = data.paymentMethod;
      let paymentMethod = paymentFromData
        ? extractPaymentMethod(paymentFromData) || paymentFromData
        : extractPaymentMethod(message);
      if (!paymentMethod && paymentFromData) paymentMethod = paymentFromData;
      if (!paymentMethod) {
        return {
          success: true,
          intent: "CHAT",
          result: {},
          message: "فضلاً اختر طريقة الدفع: مسبق أو دفع عند الاستلام (COD).",
        };
      }

      const shipmentDetails = {
        weight: data.weight,
        paymentMethod,
        dimensions: data.dimensions || null,
        shipmentType: data.shipmentType || null,
      };

      const companiesResult =
        await services.generalService.getShippingCompanies();
      if (!companiesResult.success) {
        return {
          success: false,
          intent: "CHAT",
          result: {},
          message: "ما قدرت أجيب شركات الشحن حالياً. جرّب بعد شوي.",
        };
      }

      const pricingComparison = await calculatePricingForAllCompanies(
        companiesResult.companies,
        shipmentDetails,
      );

      if (!pricingComparison.length) {
        return {
          success: false,
          intent: "CHAT",
          result: {},
          message:
            "ما حصلت أسعار مناسبة للشحنة. تأكد من البيانات وحاول مرة ثانية.",
        };
      }

      nextState({
        step: "AWAIT_COMPANY",
        data: {
          ...data,
          paymentMethod,
          pricingOptions: pricingComparison,
        },
      });

      const pricingLines = pricingComparison
        .map(
          (option, index) =>
            `${index + 1}. ${option.name} (${option.type}) - ${option.total} ريال`,
        )
        .join("\n");

      return {
        success: true,
        intent: "CHAT",
        result: {},
        message: `تمام ${userName}، هذه أسعار الشركات المتاحة:\n\n${pricingLines}\n\nاختر الشركة اللي تناسبك (أو قل "الأرخص").`,
      };
    }
    case "AWAIT_COMPANY": {
      const options = data.pricingOptions || [];
      const selected = findCompanyInOptions(message, options);
      if (!selected) {
        return {
          success: true,
          intent: "CHAT",
          result: {},
          message: 'ما قدرت أحدد الشركة. قل اسم الشركة بوضوح أو قل "الأرخص".',
        };
      }

      nextState({
        step: "AWAIT_CONFIRMATION",
        data: {
          ...data,
          company: selected.name,
          shipmentType: selected.type,
          selectedPricing: selected,
        },
      });

      return {
        success: true,
        intent: "CHAT",
        result: {},
        message: `تلخيص الشحنة:\n- المرسل: ${data.sender?.name}\n- المستلم: ${data.receiver?.name}\n- الوزن: ${data.weight} كجم\n- الصناديق: ${data.boxes}\n- الوصف: ${data.description}\n- قيمة الشحنة: ${data.value} ريال\n- شركة الشحن: ${selected.name} (${selected.type})\n- السعر التقريبي: ${selected.total} ريال\n\nإذا كل شيء صحيح، تقدر تأكد التنفيذ.`,
      };
    }
    case "AWAIT_CONFIRMATION": {
      if (!isAffirmativeReply(message)) {
        return {
          success: true,
          intent: "CHAT",
          result: {},
          message:
            'تمام، إذا حاب تغير شركة الشحن قل اسم الشركة أو قل "إلغاء" لإنهاء الطلب.',
        };
      }

      const shipmentPayload = {
        sender: data.sender,
        receiver: data.receiver,
        weight: data.weight,
        boxes: data.boxes,
        description: data.description,
        value: data.value,
        paymentMethod: data.paymentMethod || "COD",
        company: data.company,
        shipmentType: data.shipmentType,
        dimensions: data.dimensions || null,
        pricing: data.selectedPricing,
      };

      const creationResult =
        await services.shipmentService.createShipmentFromAI(shipmentPayload);

      if (!creationResult.success) {
        stateManager.clearState(userId);
        return {
          success: false,
          intent: "CHAT",
          result: creationResult,
          message:
            (creationResult.message ||
              "صار خطأ أثناء إنشاء الشحنة. حاول مرة ثانية.") +
            "\n\nيمكنك البدء من جديد بقول: بدي اعمل شحنة...",
        };
      }

      stateManager.clearState(userId);

      return {
        success: true,
        intent: "CHAT",
        result: creationResult,
        message: `تم إنشاء الشحنة بنجاح ✅ رقم التتبع: ${creationResult.trackingNumber}`,
      };
    }
    default:
      stateManager.clearState(userId);
      return {
        success: true,
        intent: "CHAT",
        result: {},
        message: `تمام ${userName}، خلينا نبدأ من جديد. مين المرسل؟`,
      };
  }
}

/**
 * كشف رسالة "تعليم" من المستخدم باستخدام الكلمة السرية تعلم001 فقط
 * الصيغة: تعلم001 السؤال: ... الجواب: ...  أو  تعلم001 س: ... ج: ...
 * بهذا لا يستطيع أي أحد التعلم إلا من يعرف الكلمة.
 * @returns {{ question: string, answer: string } | null}
 */
function parseTeachingMessage(message) {
  if (!message || typeof message !== "string") return null;
  const trimmed = message.trim();
  const secret = "تعلم001";
  if (!trimmed.includes(secret)) return null;

  const afterSecret = trimmed
    .slice(trimmed.indexOf(secret) + secret.length)
    .trim();

  // بعد تعلم001: السؤال: ... الجواب: ... أو الإجابة: ...
  const match1 = afterSecret.match(
    /السؤال\s*[:\-]\s*([\s\S]*?)\s*(?:الجواب|الإجابة)\s*[:\-]\s*([\s\S]*)/i,
  );
  if (match1) {
    const question = match1[1].trim();
    const answer = match1[2].trim();
    if (question.length >= 3 && answer.length >= 2) return { question, answer };
  }

  // بعد تعلم001: س: ... ج: ...
  const match2 = afterSecret.match(
    /س\s*[:\-]\s*([\s\S]*?)\s*ج\s*[:\-]\s*([\s\S]*)/i,
  );
  if (match2) {
    const question = match2[1].trim();
    const answer = match2[2].trim();
    if (question.length >= 3 && answer.length >= 2) return { question, answer };
  }

  return null;
}

module.exports = {
  sendToGemini,
  processGeminiResponse,
  extractIntent,
  buildContext,
  quickKeywordParse,
  stateManager,
  parseTeachingMessage,
};
