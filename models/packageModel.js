const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    dimensions: {
      length: {
        type: Number,
        required: true,
      },
      width: {
        type: Number,
        required: true,
      },
      height: {
        type: Number,
        required: true,
      },
    },
    customer: {
      type: mongoose.Schema.ObjectId,
      ref: "Customer",
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

packageSchema.pre(/^find/,function(next){
  this.populate({
    path: "customer",
    select: "firstName",
  });
  next();
})

module.exports = mongoose.model("Package", packageSchema);
