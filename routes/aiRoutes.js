const express = require("express");
const {
  chatWithAI,
  getConversationHistory,
  deleteConversation,
  getConversationStats,
  exportConversations,
} = require("../controllers/aiController");

const AuthService = require("../controllers/authController");

const router = express.Router();

// تطبيق middleware للمصادقة على جميع الـ routes
router.use(AuthService.Protect);

// Routes للـ AI Assistant

/**
 * @desc    دردشة مع AI Assistant
 * @route   POST /ai/chat
 * @access  Private (Authenticated Users)
 */
router.post("/chat", chatWithAI);

/**
 * @desc    الحصول على تاريخ المحادثة
 * @route   GET /ai/conversation/:userId
 * @access  Private (Authenticated Users)
 */
router.get("/conversation/:userId", getConversationHistory);

/**
 * @desc    حذف محادثة
 * @route   DELETE /ai/conversation/:conversationId
 * @access  Private (Authenticated Users - Owner Only)
 */
router.delete("/conversation/:conversationId", deleteConversation);

/**
 * @desc    إحصائيات المحادثات للمستخدم
 * @route   GET /ai/stats/:userId
 * @access  Private (Authenticated Users)
 */
router.get("/stats/:userId", getConversationStats);

/**
 * @desc    تصدير المحادثات (صيغة تدريب/تحليل)
 * @route   GET /ai/export/:userId?format=training|full&limit=100
 * @access  Private (Authenticated Users)
 */
router.get("/export/:userId", exportConversations);

module.exports = router;
