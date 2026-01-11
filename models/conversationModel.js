const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["user", "ai", "system"],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  // للرسائل من الـ AI
  geminiResponse: {
    type: mongoose.Schema.Types.Mixed, // JSON response من Gemini
  },
  // نتيجة تنفيذ العملية
  executionResult: {
    type: mongoose.Schema.Types.Mixed, // نتيجة العملية المنفذة
  },
  // نوع العملية إن وجدت
  action: {
    type: String,
    enum: ["TRACK_SHIPMENT", "CREATE_SHIPMENT", "CANCEL_SHIPMENT", "GET_WALLET_BALANCE", "LIST_SHIPMENTS", "CHAT_RESPONSE"],
  }
});

const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true
  },
  sessionId: {
    type: String,
    default: () => Math.random().toString(36).substring(2, 15),
    index: true
  },
  messages: [messageSchema],
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    totalMessages: {
      type: Number,
      default: 0
    },
    totalActions: {
      type: Number,
      default: 0
    },
    lastIntent: String,
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual للحصول على عدد الرسائل
conversationSchema.virtual('messageCount').get(function() {
  return this.messages.length;
});

// Index مركب للبحث السريع
conversationSchema.index({ userId: 1, sessionId: 1 });
conversationSchema.index({ lastActivity: -1 });
conversationSchema.index({ "metadata.lastIntent": 1 });

// Method لإضافة رسالة جديدة
conversationSchema.methods.addMessage = function(type, content, additionalData = {}) {
  const message = {
    type,
    content,
    ...additionalData
  };

  this.messages.push(message);
  this.lastActivity = new Date();
  this.metadata.totalMessages = this.messages.length;

  if (additionalData.action && additionalData.action !== "CHAT_RESPONSE") {
    this.metadata.totalActions += 1;
  }

  return this.save();
};

// Method للحصول على آخر 10 رسائل
conversationSchema.methods.getRecentMessages = function(limit = 10) {
  return this.messages.slice(-limit);
};

// Method لتحديث آخر intent
conversationSchema.methods.updateLastIntent = function(intent) {
  this.metadata.lastIntent = intent;
  return this.save();
};

// Static method للعثور على أو إنشاء محادثة
conversationSchema.statics.findOrCreateConversation = async function(userId, sessionId = null) {
  let conversation;

  if (sessionId) {
    conversation = await this.findOne({ userId, sessionId });
  } else {
    // ابحث عن آخر محادثة نشطة للمستخدم
    conversation = await this.findOne({ userId, isActive: true }).sort({ lastActivity: -1 });
  }

  if (!conversation) {
    conversation = new this({
      userId,
      sessionId: sessionId || Math.random().toString(36).substring(2, 15),
    });
    await conversation.save();
  }

  return conversation;
};

// Pre-save middleware لتحديث الإحصائيات
conversationSchema.pre('save', function(next) {
  this.metadata.totalMessages = this.messages.length;
  this.metadata.totalActions = this.messages.filter(msg => msg.action && msg.action !== "CHAT_RESPONSE").length;
  next();
});

module.exports = mongoose.model("Conversation", conversationSchema);
