const { GoogleGenerativeAI } = require("@google/generative-ai");

// تهيئة Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * System Prompt الصارم للمساعد الذكي
 */
const SYSTEM_PROMPT = `Respond ONLY with JSON. No other text.

Actions:
{"action": "TRACK_SHIPMENT", "data": {"tracking_number": "NUMBER"}}
{"action": "CREATE_SHIPMENT", "data": {}}
{"action": "CANCEL_SHIPMENT", "data": {"shipment_id": "ID"}}
{"action": "GET_WALLET_BALANCE"}
{"action": "LIST_SHIPMENTS"}
{"action": "CHAT_RESPONSE", "message": "Arabic text"}

For unclear requests: {"action": "CHAT_RESPONSE", "message": "Helpful response in Arabic"}`;

/**
 * تحليل سريع للرسالة بناءً على الكلمات المفتاحية
 */
function quickKeywordParse(message) {
  const lowerMessage = message.toLowerCase().trim();

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

  // قائمة الشحنات
  if (
    lowerMessage.includes("شحناتي") ||
    lowerMessage.includes("قائمة") ||
    lowerMessage.includes("عرض") ||
    lowerMessage.includes("list")
  ) {
    return {
      action: "LIST_SHIPMENTS",
    };
  }

  // إلغاء شحنة
  if (lowerMessage.includes("إلغاء") || lowerMessage.includes("cancel")) {
    const numberMatch = message.match(/(\d{3,})/);
    if (numberMatch) {
      return {
        action: "CANCEL_SHIPMENT",
        data: { shipment_id: numberMatch[1] },
      };
    }
  }

  // تحيات وأسئلة عامة
  if (
    lowerMessage.includes("مرحبا") ||
    lowerMessage.includes("hello") ||
    lowerMessage.includes("hi") ||
    lowerMessage.includes("كيف") ||
    lowerMessage.includes("help") ||
    lowerMessage.includes("مساعدة")
  ) {
    return {
      action: "CHAT_RESPONSE",
      message:
        "مرحباً! أنا مساعدك في منصة مراسيل. يمكنني مساعدتك في:\n\n✅ تتبع الشحنات\n✅ إنشاء شحنات جديدة\n✅ عرض رصيد محفظتك\n✅ إدارة شحناتك\n\nكيف يمكنني مساعدتك اليوم؟",
    };
  }

  // شكر
  if (
    lowerMessage.includes("شكرا") ||
    lowerMessage.includes("thank") ||
    lowerMessage.includes("thanks")
  ) {
    return {
      action: "CHAT_RESPONSE",
      message:
        "العفو! يسعدني مساعدتك. إذا كان لديك أي استفسار آخر، لا تتردد في السؤال.",
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
async function sendToGemini(userMessage, context = "") {
  try {
    console.log("🎯 [Gemini] Processing user message:", userMessage);

    // أولاً: محاولة keyword-based parsing للأوامر البسيطة
    const quickResult = quickKeywordParse(userMessage);
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

    // بناء الـ prompt الكامل
    const fullPrompt = `${SYSTEM_PROMPT}

سياق المحادثة السابق:
${context}

رسالة العميل الحالية: "${userMessage}"

أجب بالصيغة المطلوبة فقط:`;

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

      // فحص أقوى للكلمات المفتاحية
      const trackKeywords = [
        "track",
        "تتبع",
        "شحنة",
        "رقم",
        "tracking",
        "shipment",
      ];
      const createKeywords = [
        "create",
        "إنشاء",
        "جديدة",
        "شحنة جديدة",
        "إضافة",
      ];
      const balanceKeywords = ["balance", "رصيد", "محفظة", "كم رصيد"];
      const listKeywords = ["list", "عرض", "شحناتي", "قائمة", "shipments"];
      const cancelKeywords = ["cancel", "إلغاء", "ألغ"];

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
        const message =
          data && data.message
            ? data.message
            : "عذراً، لم أفهم طلبك. يرجى المحاولة مرة أخرى.";
        return {
          success: true,
          action: "CHAT_RESPONSE",
          result: { message: message },
          message: message,
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
  quickKeywordParse,
};
