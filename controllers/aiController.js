const asyncHandler = require("express-async-handler");
const Conversation = require("../models/conversationModel");
const AIServices = require("../services/aiServices");
const geminiService = require("../services/geminiService");

/**
 * معالج الدردشة مع AI Assistant
 * POST /ai/chat
 */
exports.chatWithAI = asyncHandler(async (req, res, next) => {
  try {
    const { message, user_token, user_id, session_id } = req.body;

    console.log("🤖 [AI-Controller] New chat request:", {
      message: message?.substring(0, 100) + "...",
      user_id,
      session_id,
      hasToken: !!user_token,
    });

    // التحقق من البيانات المطلوبة
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "الرسالة مطلوبة",
      });
    }

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "معرف المستخدم مطلوب",
      });
    }

    // التحقق من صحة التوكن (إذا كان متوفراً)
    let customer = null;
    if (user_token) {
      try {
        // يمكن إضافة تحقق التوكن هنا إذا لزم الأمر
        // const decoded = jwt.verify(user_token, process.env.JWT_SECRET);
        // customer = await Customer.findById(decoded.id);
      } catch (tokenError) {
        console.warn("⚠️ [AI-Controller] Invalid token:", tokenError.message);
      }
    }

    // جلب بيانات المستخدم الكاملة من قاعدة البيانات
    if (!customer) {
      try {
        const Customer = require("../models/customerModel");
        customer = await Customer.findById(user_id).select(
          "firstName lastName email phone addresses"
        );
        if (!customer) {
          console.warn("⚠️ [AI-Controller] Customer not found:", user_id);
          customer = { _id: user_id, firstName: "عميل", lastName: "محترم" };
        }
      } catch (dbError) {
        console.warn("⚠️ [AI-Controller] Database error:", dbError.message);
        customer = { _id: user_id, firstName: "عميل", lastName: "محترم" };
      }
    }

    // 1. إيجاد أو إنشاء محادثة
    console.log(
      "🔍 [AI-Controller] Finding/creating conversation for user:",
      user_id
    );
    const conversation = await Conversation.findOrCreateConversation(
      user_id,
      session_id
    );
    console.log(
      "✅ [AI-Controller] Conversation found/created:",
      conversation._id
    );

    // 2. الحصول على آخر 10 رسائل للسياق
    const recentMessages = conversation.getRecentMessages(10);
    console.log(
      "📚 [AI-Controller] Recent messages count:",
      recentMessages.length
    );

    // 3. بناء السياق
    const context = geminiService.buildContext(recentMessages);
    console.log("📝 [AI-Controller] Context built, length:", context.length);

    // 4. إرسال لـ Gemini
    console.log("🚀 [AI-Controller] Sending to Gemini...");
    const geminiResponse = await geminiService.sendToGemini(
      message,
      context,
      user_id,
      customer
    );

    if (!geminiResponse || typeof geminiResponse !== "object") {
      console.error(
        "❌ [AI-Controller] Invalid Gemini response:",
        geminiResponse
      );
      return res.status(500).json({
        success: false,
        message: "حدث خطأ في معالجة الطلب",
      });
    }

    console.log("✅ [AI-Controller] Gemini response received:", geminiResponse);

    // 5. إعداد services لتنفيذ العمليات
    const aiServices = new AIServices(user_id, customer);

    // 6. معالجة رد Gemini وتنفيذ العمليات
    console.log("🔄 [AI-Controller] Processing Gemini response...");
    const executionResult = await geminiService.processGeminiResponse(
      geminiResponse,
      {
        shipmentService: aiServices,
        walletService: aiServices,
      },
      user_id,
      customer
    );

    console.log("✅ [AI-Controller] Execution result:", executionResult);

    // 7. حفظ الرسائل في المحادثة
    console.log("💾 [AI-Controller] Saving conversation...");

    // حفظ رسالة المستخدم
    await conversation.addMessage("user", message, {
      timestamp: new Date(),
    });

    // حفظ رد AI مع النتائج
    await conversation.addMessage("ai", executionResult.message, {
      geminiResponse,
      executionResult,
      action: geminiResponse.action,
      timestamp: new Date(),
    });

    // تحديث آخر intent إذا كان متوفراً
    const intent = geminiService.extractIntent(message);
    if (intent) {
      await conversation.updateLastIntent(intent);
    }

    console.log("✅ [AI-Controller] Conversation saved successfully");

    // 8. إرجاع الرد النهائي
    res.status(200).json({
      success: true,
      intent: geminiResponse.intent || "CHAT",
      confidence: geminiResponse.confidence || 0.5,
      missing_fields: geminiResponse.missing_fields || [],
      message: executionResult.message,
      data: {
        conversation_id: conversation._id,
        session_id: conversation.sessionId,
        execution_result: executionResult.success
          ? executionResult.result
          : null,
        collected_data: geminiResponse.data || {},
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ [AI-Controller] Chat error:", error);

    // في حالة خطأ، نحاول حفظ رسالة خطأ في المحادثة
    try {
      if (req.body.user_id) {
        const conversation = await Conversation.findOrCreateConversation(
          req.body.user_id
        );
        await conversation.addMessage(
          "ai",
          "عذراً، حدث خطأ تقني. يرجى المحاولة لاحقاً.",
          {
            error: error.message,
            timestamp: new Date(),
          }
        );
      }
    } catch (saveError) {
      console.error(
        "❌ [AI-Controller] Error saving error message:",
        saveError
      );
    }

    res.status(500).json({
      success: false,
      message: "حدث خطأ في معالجة الطلب. يرجى المحاولة لاحقاً.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * الحصول على تاريخ المحادثة
 * GET /ai/conversation/:userId
 */
exports.getConversationHistory = asyncHandler(async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { limit = 50, session_id } = req.query;

    console.log(
      "📖 [AI-Controller] Getting conversation history for user:",
      userId
    );

    let query = { userId };
    if (session_id) {
      query.sessionId = session_id;
    }

    const conversation = await Conversation.findOne(query)
      .sort({ lastActivity: -1 })
      .populate("userId", "firstName lastName email");

    if (!conversation) {
      return res.status(200).json({
        success: true,
        data: {
          messages: [],
          totalMessages: 0,
        },
      });
    }

    // الحصول على آخر الرسائل
    const messages = conversation.messages
      .slice(-parseInt(limit))
      .map((msg) => ({
        id: msg._id,
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp,
        action: msg.action,
      }));

    res.status(200).json({
      success: true,
      data: {
        conversation_id: conversation._id,
        session_id: conversation.sessionId,
        messages,
        totalMessages: conversation.messages.length,
        lastActivity: conversation.lastActivity,
      },
    });
  } catch (error) {
    console.error("❌ [AI-Controller] History error:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ في الحصول على تاريخ المحادثة",
    });
  }
});

/**
 * حذف محادثة
 * DELETE /ai/conversation/:conversationId
 */
exports.deleteConversation = asyncHandler(async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    console.log("🗑️ [AI-Controller] Deleting conversation:", conversationId);

    const conversation = await Conversation.findByIdAndDelete(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "المحادثة غير موجودة",
      });
    }

    res.status(200).json({
      success: true,
      message: "تم حذف المحادثة بنجاح",
    });
  } catch (error) {
    console.error("❌ [AI-Controller] Delete conversation error:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ في حذف المحادثة",
    });
  }
});

/**
 * إحصائيات المحادثات للمستخدم
 * GET /ai/stats/:userId
 */
exports.getConversationStats = asyncHandler(async (req, res, next) => {
  try {
    const { userId } = req.params;

    console.log("📊 [AI-Controller] Getting stats for user:", userId);

    const stats = await Conversation.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalConversations: { $sum: 1 },
          totalMessages: { $sum: { $size: "$messages" } },
          totalActions: { $sum: "$metadata.totalActions" },
          activeConversations: {
            $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
          },
          lastActivity: { $max: "$lastActivity" },
        },
      },
    ]);

    const result = stats[0] || {
      totalConversations: 0,
      totalMessages: 0,
      totalActions: 0,
      activeConversations: 0,
      lastActivity: null,
    };

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("❌ [AI-Controller] Stats error:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ في الحصول على الإحصائيات",
    });
  }
});
