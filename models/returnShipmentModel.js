const mongoose = require("mongoose");
const returnShipmentSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Types.ObjectId,
      ref: "Customer",
    
    },
    shipment: {
      type: mongoose.Types.ObjectId,
      ref: "Shapment",
      // required: true, // Not required initially, will be set after request creation
    },
    typerequesst: {
      type: String,
      required: false, // ستصبح مطلوبة فقط عند إنشاء طلب الإرجاع
      enum: ["return", "exchange"],
    },
    reqstatus: {
      type: String,
      required: true,
      enum: ["yes", "no", "pending"],
      default: "pending",
    },
    requestNote: {
      type: String, // ← سبب الاسترجاع أو الاستبدال
      required: false, // ستصبح مطلوبة فقط عند إنشاء طلب الإرجاع
    },
  
  },
  { timestamps: true }
);

module.exports = mongoose.model("ReturnShipment", returnShipmentSchema);
