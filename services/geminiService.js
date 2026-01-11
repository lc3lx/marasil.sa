const { GoogleGenerativeAI } = require("@google/generative-ai");

// تهيئة Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * System Prompt الصارم للمساعد الذكي
 */
const SYSTEM_PROMPT = `أنت مساعد ذكي لمنصة شحن مراسيل. مهمتك الوحيدة هي مساعدة التاجر في إدارة شحناته.

القواعد الصارمة:
1. لا تتحدث خارج المطلوب - فقط JSON
2. إذا كان الطلب يتطلب تنفيذ عملية، أرجع JSON فقط بالصيغة المحددة
3. إذا كان الطلب استفساراً أو شرح، أرجع JSON مع "CHAT_RESPONSE"
4. لا تذكر أي شيء عن Gemini أو الذكاء الاصطناعي

الصيغ المسموحة فقط:

للعمليات:
{
  "action": "TRACK_SHIPMENT",
  "data": { "tracking_number": "رقم التتبع" }
}

{
  "action": "CREATE_SHIPMENT",
  "data": {
    "company": "اسم الشركة",
    "weight": "الوزن بالكيلو",
    "receiver_name": "اسم المستلم",
    "receiver_phone": "رقم هاتف المستلم",
    "receiver_city": "مدينة المستلم",
    "receiver_address": "عنوان المستلم"
  }
}

{
  "action": "CANCEL_SHIPMENT",
  "data": { "shipment_id": "معرف الشحنة" }
}

{
  "action": "GET_WALLET_BALANCE"
}

{
  "action": "LIST_SHIPMENTS"
}

للردود النصية:
{
  "action": "CHAT_RESPONSE",
  "message": "نص عربي واضح للتاجر"
}

الأوامر المدعومة:
- تتبع شحنة: "تتبع الشحنة رقم 123456"
- إنشاء شحنة: "أريد إنشاء شحنة إلى الرياض وزن 2 كيلو"
- إلغاء شحنة: "ألغِ الشحنة رقم 123"
- رصيد المحفظة: "كم رصيدي"
- قائمة الشحنات: "عرض شحناتي"

إذا لم تفهم الطلب، أجب بـ CHAT_RESPONSE مع رسالة توضيحية.`;

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
async function sendToGemini(userMessage, context = "") {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // بناء الـ prompt الكامل
    const fullPrompt = `${SYSTEM_PROMPT}

سياق المحادثة السابق:
${context}

رسالة العميل الحالية: "${userMessage}"

أجب بالصيغة المطلوبة فقط:`;

    console.log("🚀 [Gemini] Sending prompt to Gemini...");
    console.log(
      "📝 [Gemini] Full prompt:",
      fullPrompt.substring(0, 500) + "..."
    );

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    console.log("✅ [Gemini] Raw response from Gemini:", text);

    // تنظيف الرد من أي markdown أو تنسيق إضافي
    let cleanResponse = text.trim();

    // إزالة أي ```json أو ``` في البداية أو النهاية
    cleanResponse = cleanResponse
      .replace(/^```json\s*/, "")
      .replace(/\s*```$/, "");
    cleanResponse = cleanResponse.replace(/^```\s*/, "").replace(/\s*```$/, "");

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

      // إذا فشل التحليل، أعد رسالة خطأ واضحة
      return {
        action: "CHAT_RESPONSE",
        message: "عذراً، حدث خطأ في معالجة طلبك. يرجى المحاولة مرة أخرى.",
      };
    }
  } catch (error) {
    console.error("❌ [Gemini] Error communicating with Gemini API:", error);

    // في حالة خطأ في API، أعد رسالة خطأ بالعربية
    return {
      action: "CHAT_RESPONSE",
      message: "عذراً، حدث خطأ تقني. يرجى المحاولة لاحقاً.",
    };
  }
}

/**
 * معالجة الرد من Gemini وتنفيذ العمليات
 */
async function processGeminiResponse(geminiResponse, services) {
  const { action, data } = geminiResponse;

  console.log("🔄 [Gemini] Processing action:", action, "with data:", data);

  try {
    switch (action) {
      case "TRACK_SHIPMENT":
        if (!data || !data.tracking_number) {
          return {
            success: false,
            message: "يرجى توفير رقم التتبع لتتبع الشحنة.",
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
            ? `تم العثور على الشحنة: ${trackingResult.status || "غير محدد"}`
            : "لم يتم العثور على الشحنة بهذا الرقم.",
        };

      case "CREATE_SHIPMENT":
        if (
          !data ||
          !data.receiver_name ||
          !data.receiver_phone ||
          !data.weight
        ) {
          return {
            success: false,
            message: "يرجى توفير جميع البيانات المطلوبة لإنشاء الشحنة.",
          };
        }
        const createResult =
          await services.shipmentService.createShipmentFromAI(data);
        return {
          success: createResult.success,
          action: "CREATE_SHIPMENT",
          result: createResult,
          message: createResult.success
            ? `تم إنشاء الشحنة بنجاح. رقم التتبع: ${
                createResult.trackingNumber || "غير محدد"
              }`
            : createResult.message || "فشل في إنشاء الشحنة.",
        };

      case "CANCEL_SHIPMENT":
        if (!data || !data.shipment_id) {
          return {
            success: false,
            message: "يرجى توفير معرف الشحنة للإلغاء.",
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
            ? "تم إلغاء الشحنة بنجاح."
            : cancelResult.message || "فشل في إلغاء الشحنة.",
        };

      case "GET_WALLET_BALANCE":
        const balanceResult = await services.walletService.getBalance();
        return {
          success: true,
          action: "GET_WALLET_BALANCE",
          result: balanceResult,
          message: `رصيد محفظتك الحالي: ${balanceResult.balance || 0} ريال.`,
        };

      case "LIST_SHIPMENTS":
        const shipmentsResult =
          await services.shipmentService.getUserShipments();
        return {
          success: true,
          action: "LIST_SHIPMENTS",
          result: shipmentsResult,
          message:
            shipmentsResult.shipments && shipmentsResult.shipments.length > 0
              ? `لديك ${shipmentsResult.shipments.length} شحنة. آخر شحنة: ${
                  shipmentsResult.shipments[0].trackingId || "غير محدد"
                }`
              : "لا توجد شحنات حالية.",
        };

      case "CHAT_RESPONSE":
        return {
          success: true,
          action: "CHAT_RESPONSE",
          result: { message: data.message },
          message: data.message,
        };

      default:
        return {
          success: false,
          message: "عذراً، لم أفهم طلبك. يرجى المحاولة مرة أخرى.",
        };
    }
  } catch (error) {
    console.error("❌ [Gemini] Error executing action:", action, error);
    return {
      success: false,
      message: "حدث خطأ أثناء تنفيذ العملية. يرجى المحاولة لاحقاً.",
    };
  }
}

module.exports = {
  sendToGemini,
  processGeminiResponse,
  extractIntent,
  buildContext,
};
