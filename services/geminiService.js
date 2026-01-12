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

=== وصف الـ APIs المتاحة في الباك إند ===
استخدم هذه الـ APIs للرد على الأسئلة:
- shipmentService.trackShipment(tracking_number): يرد بتفاصيل الشحنة (status, location, etc.)
- shipmentService.createShipmentFromAI(data): ينشئ شحنة جديدة (يتطلب recipient_name, phone, weight, address, city)
- shipmentService.cancelShipment(shipment_id): يلغي شحنة
- shipmentService.getUserShipments(): يرد بقائمة الشحنات
- walletService.getBalance(): يرد برصيد المحفظة
- generalService.getCompanyInfo(): يرد بمعلومات عن الشركة
- generalService.getShippingCompanies(): يرد بشركات الشحن المتاحة
- generalService.getPricingInfo(data): يحسب الأسعار بناءً على وزن ومسافة

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
// (ابقِ كما هو، أضف أمثلة جديدة)
{"intent": "COMPANY_INFO", "confidence": 0.9, "missing_fields": [], "message": "تمام محمد، هذي معلومات عن مراسيل...", "data": {}, "api_call": {"name": "getCompanyInfo", "params": {}}}

=== مخرجات الرد المثالي ===
// (ابقِ كما هو)

=== الختم النهائي ===
// (ابقِ كما هو)
`;

// State Manager للمحادثات (ابقِ كما هو)
class ConversationStateManager {
  // (الكود الأصلي)
}

const stateManager = new ConversationStateManager();

// تعريف الـ tools لـ function calling في Gemini
const TOOLS = [
  {
    name: "trackShipment",
    description: "تتبع شحنة باستخدام رقم التتبع",
    parameters: {
      type: "object",
      properties: {
        tracking_number: { type: "string" },
      },
      required: ["tracking_number"],
    },
  },
  {
    name: "createShipment",
    description: "إنشاء شحنة جديدة",
    parameters: {
      type: "object",
      properties: {
        recipient_name: { type: "string" },
        phone: { type: "string" },
        weight: { type: "number" },
        address: { type: "string" },
        city: { type: "string" },
      },
      required: ["recipient_name", "phone", "weight"],
    },
  },
  {
    name: "cancelShipment",
    description: "إلغاء شحنة",
    parameters: {
      type: "object",
      properties: {
        shipment_id: { type: "string" },
      },
      required: ["shipment_id"],
    },
  },
  {
    name: "getBalance",
    description: "الحصول على رصيد المحفظة",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "getUserShipments",
    description: "الحصول على قائمة الشحنات",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "getCompanyInfo",
    description: "الحصول على معلومات الشركة",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "getShippingCompanies",
    description: "الحصول على شركات الشحن",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "getPricingInfo",
    description: "حساب الأسعار",
    parameters: {
      type: "object",
      properties: {
        weight: { type: "number" },
        distance: { type: "string" },
      },
      required: ["weight"],
    },
  },
];

/**
 * تحليل سريع للرسالة بناءً على الكلمات المفتاحية - محسن لمزيد من الحالات
 */
function quickKeywordParse(message, userInfo = null) {
  // (الكود الأصلي مع إضافات لمزيد من الأنماط)
  // أضف أنماط جديدة مثل:
  if (
    lowerMessage.includes("معلومات الشركة") ||
    lowerMessage.includes("about company")
  ) {
    return {
      intent: "COMPANY_INFO",
      confidence: 0.9,
      missing_fields: [],
      message: `تمام ${userName}، خلني أجيبلك معلومات عن مراسيل...`,
      data: {},
    };
  }
  // ... إضافات أخرى لشركات الشحن، الأسعار، إلخ
  // (ابقِ الباقي كما هو)
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
    // (الكود الأصلي للـ quick parse)

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

    // (الباقي كما هو لتحليل JSON)
  } catch (error) {
    // (الكود الأصلي)
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
  const { intent, api_call } = geminiResponse;

  if (intent === "API_CALL" && api_call) {
    // تنفيذ الـ API بناءً على الاسم
    let apiResult;
    switch (api_call.name) {
      case "trackShipment":
        apiResult = await services.shipmentService.trackShipment(
          api_call.params.tracking_number
        );
        break;
      case "createShipment":
        apiResult = await services.shipmentService.createShipmentFromAI(
          api_call.params
        );
        break;
      // ... حالات لكل API
      default:
        apiResult = { success: false, message: "API غير مدعوم" };
    }
    return {
      success: apiResult.success,
      intent,
      result: apiResult,
      message: apiResult.success ? "تم التنفيذ بنجاح" : apiResult.message,
    };
  }

  // (الباقي كما هو للـ intents الأخرى)
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
