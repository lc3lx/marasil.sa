const mongoose = require("mongoose");

/**
 * معرفة مُتعلمة من المحادثات: أزواج (سؤال، جواب) لاستخدامها عند الرد على أسئلة مشابهة
 * تُحقن في الـ prompt وتُستعلم عند انخفاض الثقة
 */
const aiKnowledgeSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    questionNormalized: {
      type: String,
      trim: true,
      index: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
    // من علّم هذه المعلومة (اختياري؛ إن وُجد تُفضل للمستخدم لاحقاً)
    taughtBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    // استخدامات (اختياري للتحليل)
    useCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

aiKnowledgeSchema.index({ questionNormalized: "text", question: "text" });
aiKnowledgeSchema.index({ taughtBy: 1, createdAt: -1 });
aiKnowledgeSchema.index({ createdAt: -1 });

// قبل الحفظ: تعبئة questionNormalized (إزالة التشكيل والفواصل لتسهيل المطابقة لاحقاً)
function normalizeForSearch(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\u0600-\u06FF\s]/g, "")
    .toLowerCase();
}

aiKnowledgeSchema.pre("save", function (next) {
  if (this.isModified("question")) {
    this.questionNormalized = normalizeForSearch(this.question);
  }
  next();
});

/**
 * البحث عن معرفة مطابقة لسؤال المستخدم (بسيط: تطابق جزئي أو تطابق normalized)
 */
aiKnowledgeSchema.statics.findBestMatch = async function (userQuestion, limit = 5) {
  const normalized = normalizeForSearch(userQuestion);
  if (!normalized) return [];

  const all = await this.find({})
    .sort({ useCount: -1, createdAt: -1 })
    .limit(200)
    .lean();

  const scored = all
    .map((doc) => {
      const qNorm = doc.questionNormalized || normalizeForSearch(doc.question);
      const exact = qNorm === normalized ? 10 : 0;
      const contains = normalized.includes(qNorm) ? 5 : qNorm.includes(normalized) ? 4 : 0;
      const words = normalized.split(/\s+/).filter(Boolean);
      const matchWords = words.filter((w) => qNorm.includes(w)).length;
      const score = exact + contains + matchWords;
      return { ...doc, score };
    })
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
};

module.exports = mongoose.model("AiKnowledge", aiKnowledgeSchema);
