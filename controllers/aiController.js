const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Conversation = require("../models/conversationModel");
const AiKnowledge = require("../models/aiKnowledgeModel");
const AiUnansweredQuestion = require("../models/aiUnansweredQuestionModel");
const AIServices = require("../services/aiServices");
const geminiService = require("../services/geminiService");

const ADMIN_ROLES = new Set(["admin", "superadmin"]);

function normalizeForMatch(text = "") {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\u0600-\u06FF\s]/g, "");
}

function isLearningTriggerMessage(message = "") {
  const normalized = normalizeForMatch(message);
  return (
    normalized.includes("شو عندك استفسارات ما عرفت تجاوب عليها") ||
    normalized.includes("شو عندك استفسارات") ||
    normalized.includes("ايش عندك استفسارات ما عرفت تجاوب عليها") ||
    normalized.includes("ما عرفت تجاوب عليها")
  );
}

function isLearningStopCommand(message = "") {
  const normalized = normalizeForMatch(message);
  return (
    normalized === "وقف" ||
    normalized === "انهاء" ||
    normalized === "إنهاء" ||
    normalized === "خلاص" ||
    normalized === "توقف"
  );
}

function isLearningSkipCommand(message = "") {
  const normalized = normalizeForMatch(message);
  return (
    normalized === "تخطي" ||
    normalized === "تجاوز" ||
    normalized === "عدي" ||
    normalized === "تعدي"
  );
}

function shouldQueueAsUnanswered(geminiResponse, finalMessage) {
  const intent = String(geminiResponse?.intent || "").toUpperCase();
  if (intent !== "CHAT") return false;

  const confidence = Number(geminiResponse?.confidence ?? 0.5);
  const messageText = String(finalMessage || "").trim();
  const genericPattern =
    /(لم أفهم|لا أعرف|حدث خطأ|يرجى المحاولة|خطأ تقني|عذر[اًا])/i;

  return confidence < 0.5 || genericPattern.test(messageText);
}

async function queueUnansweredQuestion({
  userMessage,
  userId,
  conversationId,
  messageId = null,
  geminiResponse,
  executionMessage,
  isAdminUser = false,
}) {
  try {
    if (isAdminUser) return;
    const question = String(userMessage || "").trim();
    if (!question || question.length < 3) return;
    if (!shouldQueueAsUnanswered(geminiResponse, executionMessage)) return;

    const normalized =
      AiUnansweredQuestion.normalizeForSearch(question) || question.toLowerCase();

    await AiUnansweredQuestion.findOneAndUpdate(
      {
        questionNormalized: normalized,
        status: "pending",
      },
      {
        $setOnInsert: {
          question,
          questionNormalized: normalized,
          sourceUserId: userId || null,
          conversationId: conversationId || null,
          messageId: messageId || null,
          status: "pending",
          occurrences: 0,
        },
        $inc: {
          occurrences: 1,
        },
      },
      {
        upsert: true,
        new: true,
      }
    );
  } catch (error) {
    console.warn("⚠️ [AI-Controller] queueUnansweredQuestion failed:", error?.message);
  }
}

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
          "firstName lastName email phone addresses role"
        );
        if (!customer) {
          console.warn("⚠️ [AI-Controller] Customer not found:", user_id);
          customer = {
            _id: user_id,
            firstName: "عميل",
            lastName: "محترم",
            role: "user",
          };
        }
      } catch (dbError) {
        console.warn("⚠️ [AI-Controller] Database error:", dbError.message);
        customer = {
          _id: user_id,
          firstName: "عميل",
          lastName: "محترم",
          role: "user",
        };
      }
    }

    const messageText = String(message || "").trim();
    const userRole = String(customer?.role || "user").toLowerCase();
    const isAdminUser = ADMIN_ROLES.has(userRole);

    // 0. إيجاد أو إنشاء محادثة
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

    // 0.1 سير التعلم الموجّه للأدمن (عند الطلب فقط)
    if (isAdminUser) {
      const learningSession = conversation?.metadata?.learningSession || {};
      const isTrigger = isLearningTriggerMessage(messageText);

      if (isTrigger) {
        await conversation.addMessage("user", messageText, {
          timestamp: new Date(),
        });

        const firstPending = await AiUnansweredQuestion.findOne({
          status: "pending",
        }).sort({ occurrences: -1, createdAt: 1 });

        if (!firstPending) {
          conversation.metadata.learningSession = {
            active: false,
            currentQuestionId: null,
            startedAt: null,
            lastAskedAt: null,
          };
          await conversation.save();

          const noPendingMessage =
            "حياك الله، حالياً ما عندي استفسارات معلّقة. إذا ظهر استفسار جديد وما عرفت أجاوب عليه، برجع أسألك.";
          await conversation.addMessage("ai", noPendingMessage, {
            intent: "CHAT",
            timestamp: new Date(),
          });

          return res.status(200).json({
            success: true,
            intent: "CHAT",
            confidence: 0.95,
            message: noPendingMessage,
            data: {
              conversation_id: conversation._id,
              session_id: conversation.sessionId,
              learning_mode: true,
              pending_count: 0,
            },
            timestamp: new Date().toISOString(),
          });
        }

        conversation.metadata.learningSession = {
          active: true,
          currentQuestionId: firstPending._id,
          startedAt: new Date(),
          lastAskedAt: new Date(),
        };
        await conversation.save();

        const askFirstMessage =
          `حياك الله، عندي استفسارات ما عرفت أجاوب عليها.\n` +
          `السؤال الأول:\n${firstPending.question}\n\n` +
          "إذا فاضي تجاوبني عليه أكمل معك السؤال اللي بعده.";
        await conversation.addMessage("ai", askFirstMessage, {
          intent: "CHAT",
          timestamp: new Date(),
        });

        return res.status(200).json({
          success: true,
          intent: "CHAT",
          confidence: 0.95,
          message: askFirstMessage,
          data: {
            conversation_id: conversation._id,
            session_id: conversation.sessionId,
            learning_mode: true,
            current_question_id: firstPending._id,
          },
          timestamp: new Date().toISOString(),
        });
      }

      if (learningSession?.active) {
        await conversation.addMessage("user", messageText, {
          timestamp: new Date(),
        });

        if (isLearningStopCommand(messageText)) {
          conversation.metadata.learningSession = {
            active: false,
            currentQuestionId: null,
            startedAt: null,
            lastAskedAt: null,
          };
          await conversation.save();

          const stopMessage =
            "شكرًا لك، ما قصرت. إذا ظهر استفسار جديد وما عرفت أجاوب عليه، برجع أسألك.";
          await conversation.addMessage("ai", stopMessage, {
            intent: "CHAT",
            timestamp: new Date(),
          });

          return res.status(200).json({
            success: true,
            intent: "CHAT",
            confidence: 0.95,
            message: stopMessage,
            data: {
              conversation_id: conversation._id,
              session_id: conversation.sessionId,
              learning_mode: false,
            },
            timestamp: new Date().toISOString(),
          });
        }

        let currentQuestion = null;
        if (learningSession.currentQuestionId) {
          currentQuestion = await AiUnansweredQuestion.findOne({
            _id: learningSession.currentQuestionId,
            status: "pending",
          });
        }
        if (!currentQuestion) {
          currentQuestion = await AiUnansweredQuestion.findOne({
            status: "pending",
          }).sort({ occurrences: -1, createdAt: 1 });
        }

        if (!currentQuestion) {
          conversation.metadata.learningSession = {
            active: false,
            currentQuestionId: null,
            startedAt: null,
            lastAskedAt: null,
          };
          await conversation.save();

          const doneMessage =
            "يعطيك العافية، ما عندي حالياً استفسارات أخرى. شكرًا لتعاونك.";
          await conversation.addMessage("ai", doneMessage, {
            intent: "CHAT",
            timestamp: new Date(),
          });

          return res.status(200).json({
            success: true,
            intent: "CHAT",
            confidence: 0.95,
            message: doneMessage,
            data: {
              conversation_id: conversation._id,
              session_id: conversation.sessionId,
              learning_mode: false,
              pending_count: 0,
            },
            timestamp: new Date().toISOString(),
          });
        }

        if (isLearningSkipCommand(messageText)) {
          currentQuestion.status = "ignored";
          currentQuestion.answeredBy = user_id;
          currentQuestion.answeredAt = new Date();
          await currentQuestion.save();
        } else {
          await AiKnowledge.create({
            question: currentQuestion.question,
            answer: messageText,
            taughtBy: user_id,
          });

          currentQuestion.status = "answered";
          currentQuestion.answer = messageText;
          currentQuestion.answeredBy = user_id;
          currentQuestion.answeredAt = new Date();
          await currentQuestion.save();
        }

        const nextQuestion = await AiUnansweredQuestion.findOne({
          status: "pending",
        }).sort({ occurrences: -1, createdAt: 1 });

        if (!nextQuestion) {
          conversation.metadata.learningSession = {
            active: false,
            currentQuestionId: null,
            startedAt: null,
            lastAskedAt: null,
          };
          await conversation.save();

          const finishMessage =
            "يعطيك العافية، تم حفظ الإجابات كلها. شكرًا لك، وإذا ظهر استفسار جديد برجع أسألك.";
          await conversation.addMessage("ai", finishMessage, {
            intent: "CHAT",
            timestamp: new Date(),
          });

          return res.status(200).json({
            success: true,
            intent: "CHAT",
            confidence: 0.95,
            message: finishMessage,
            data: {
              conversation_id: conversation._id,
              session_id: conversation.sessionId,
              learning_mode: false,
              pending_count: 0,
            },
            timestamp: new Date().toISOString(),
          });
        }

        conversation.metadata.learningSession = {
          active: true,
          currentQuestionId: nextQuestion._id,
          startedAt: learningSession.startedAt || new Date(),
          lastAskedAt: new Date(),
        };
        await conversation.save();

        const askNextMessage =
          `يعطيك العافية، تم حفظ الإجابة.\n` +
          `السؤال التالي:\n${nextQuestion.question}\n\n` +
          "إذا فاضي نكمل عليه.";
        await conversation.addMessage("ai", askNextMessage, {
          intent: "CHAT",
          timestamp: new Date(),
        });

        return res.status(200).json({
          success: true,
          intent: "CHAT",
          confidence: 0.95,
          message: askNextMessage,
          data: {
            conversation_id: conversation._id,
            session_id: conversation.sessionId,
            learning_mode: true,
            current_question_id: nextQuestion._id,
          },
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 0.2 كشف "تعليم" المساعد: تعلم001 السؤال والجواب — إن لم تُضبط قائمة المسموحين يُسمح لأي من يعرف تعلم001
    const teaching = geminiService.parseTeachingMessage(message);
    const allowedTeachUserIds = (process.env.AI_TEACH_ALLOWED_USER_IDS || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const masterTeachId = (process.env.AI_TEACH_MASTER_USER_ID || "").trim();
    const hasRestriction = masterTeachId || allowedTeachUserIds.length > 0;
    const canTeach = !hasRestriction
      ? true
      : allowedTeachUserIds.includes(String(user_id)) ||
        (masterTeachId && String(user_id) === masterTeachId);

    if (teaching && canTeach) {
      await AiKnowledge.create({
        question: teaching.question,
        answer: teaching.answer,
        taughtBy: user_id,
      });
      await conversation.addMessage("user", messageText, { timestamp: new Date() });
      await conversation.addMessage(
        "ai",
        "تم حفظ المعلومة وتعلمتها، راح أستخدمها لاحقاً في الإجابة على أسئلة مشابهة.",
        { intent: "CHAT", timestamp: new Date() }
      );
      return res.status(200).json({
        success: true,
        intent: "CHAT",
        message:
          "تم حفظ المعلومة وتعلمتها، راح أستخدمها لاحقاً في الإجابة على أسئلة مشابهة.",
        data: { conversation_id: conversation._id, learned: true },
        timestamp: new Date().toISOString(),
      });
    }
    if (teaching && !canTeach) {
      await conversation.addMessage("user", messageText, { timestamp: new Date() });
      await conversation.addMessage(
        "ai",
        "عذراً، لا يمكن تنفيذ هذا الطلب.",
        { intent: "CHAT", timestamp: new Date() }
      );
      return res.status(200).json({
        success: true,
        intent: "CHAT",
        message: "عذراً، لا يمكن تنفيذ هذا الطلب.",
        data: { conversation_id: conversation._id },
        timestamp: new Date().toISOString(),
      });
    }

    // 2. الحصول على آخر 10 رسائل للسياق (تنسيق موحّد لـ buildContext: sender + message)
    const rawMessages = conversation.getRecentMessages(10);
    const recentMessages = rawMessages.map((msg) => ({
      sender: msg.type === "user" ? "user" : "assistant",
      message: msg.content || "",
    }));
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
        generalService: aiServices,
      },
      user_id,
      customer
    );

    console.log("✅ [AI-Controller] Execution result:", executionResult);

    // 7. حفظ الرسائل في المحادثة
    console.log("💾 [AI-Controller] Saving conversation...");

    // حفظ رسالة المستخدم
    const savedUserMessage = await conversation.addMessage("user", messageText, {
      timestamp: new Date(),
    });

    // حفظ رد AI مع النتائج (intent + intentData للتحليل والاستفادة لاحقاً)
    const intent = geminiResponse.intent || geminiResponse.action;
    await conversation.addMessage("ai", (executionResult.message || "").trim(), {
      geminiResponse,
      executionResult,
      intent: intent || null,
      intentData: geminiResponse.data || null,
      action: intent || geminiResponse.action || null,
      timestamp: new Date(),
    });

    // تسجيل الأسئلة غير المجاب عنها لاحقاً (تعلم موجّه عبر الأدمن)
    await queueUnansweredQuestion({
      userMessage: messageText,
      userId: user_id,
      conversationId: conversation._id,
      messageId:
        savedUserMessage?.messages?.[savedUserMessage.messages.length - 1]?._id ||
        null,
      geminiResponse,
      executionMessage: executionResult.message,
      isAdminUser,
    });

    // تحديث آخر intent في metadata المحادثة
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

    // الحصول على آخر الرسائل (مع intent و intentData للاستفادة لاحقاً)
    const messages = conversation.messages
      .slice(-parseInt(limit))
      .map((msg) => ({
        id: msg._id,
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp,
        intent: msg.intent || undefined,
        intentData: msg.intentData || undefined,
        action: msg.action || undefined,
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
 * تصدير المحادثات بصيغة قابلة للاستفادة (تحليل، تدريب، تقارير)
 * GET /ai/export/:userId?format=training&limit=100
 * format=training: مصفوفة turns فيها { role, content, intent?, timestamp? }
 * format=full: محادثات كاملة مع كل التفاصيل
 */
exports.exportConversations = asyncHandler(async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { format = "training", limit = 500 } = req.query;

    const conversations = await Conversation.find({ userId })
      .sort({ lastActivity: -1 })
      .limit(Math.min(parseInt(limit, 10) || 500, 1000))
      .lean();

    if (format === "training") {
      const turns = [];
      for (const conv of conversations) {
        for (const msg of conv.messages || []) {
          turns.push({
            role: msg.type === "user" ? "user" : "assistant",
            content: msg.content || "",
            ...(msg.intent && { intent: msg.intent }),
            ...(msg.timestamp && { timestamp: msg.timestamp }),
          });
        }
      }
      return res.status(200).json({
        success: true,
        data: { turns, totalTurns: turns.length },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        conversations: conversations.map((c) => ({
          _id: c._id,
          sessionId: c.sessionId,
          lastActivity: c.lastActivity,
          metadata: c.metadata,
          messageCount: (c.messages || []).length,
          messages: (c.messages || []).map((m) => ({
            type: m.type,
            content: m.content,
            intent: m.intent,
            intentData: m.intentData,
            timestamp: m.timestamp,
          })),
        })),
      },
    });
  } catch (error) {
    console.error("❌ [AI-Controller] Export error:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ في تصدير المحادثات",
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
