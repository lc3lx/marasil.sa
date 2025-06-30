const { default: mongoose } = require("mongoose");
const mngoose = require("mongoose");
const couponSchema = new mngoose.Schema({
  name: {
    type: String,
    required: true,
    trme: true,
    unique: true,
  },
  expire: {
    type: Date,
    required: true,
  },
  discount: {
    type: Number,
    required: true,
  },
});
const coupon = mongoose.model("Coupon", couponSchema);
module.exports = coupon;
