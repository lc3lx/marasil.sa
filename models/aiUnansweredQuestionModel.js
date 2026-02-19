const mongoose = require("mongoose");

function normalizeForSearch(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\u0600-\u06FF\s]/g, "")
    .toLowerCase();
}

const aiUnansweredQuestionSchema = new mongoose.Schema(
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
    sourceUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      default: null,
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "answered", "ignored"],
      default: "pending",
      index: true,
    },
    answer: {
      type: String,
      trim: true,
      default: null,
    },
    answeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    answeredAt: {
      type: Date,
      default: null,
    },
    occurrences: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

aiUnansweredQuestionSchema.index({ questionNormalized: 1, status: 1 });
aiUnansweredQuestionSchema.index({ status: 1, occurrences: -1, createdAt: 1 });

aiUnansweredQuestionSchema.pre("save", function (next) {
  if (this.isModified("question")) {
    this.questionNormalized = normalizeForSearch(this.question);
  }
  next();
});

aiUnansweredQuestionSchema.statics.normalizeForSearch = normalizeForSearch;

module.exports = mongoose.model(
  "AiUnansweredQuestion",
  aiUnansweredQuestionSchema
);
