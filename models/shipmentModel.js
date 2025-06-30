const mongoose = require("mongoose");

const shapmentSchema = new mongoose.Schema({
  receiverAddress: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ClientAddress",
    required: true,
  },
  senderAddress: {
    type: Object,
    required: true,
  },

  customerId: {
    type: mongoose.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },

  boxNum: {
    type: Number,
    required: true,
  },
  paymentMathod: {
    type: String,
    enum: ["Prepaid", "COD"],
    required: true,
  },
  shipmentstates: {
    type: String,
    enum: ["Delivered", "IN_TRANSIT", "READY_FOR_PICKUP", "Canceled"],
    required: true,
  },

  shapmentingType: {
    type: String,
    enum: ["Dry", "Cold", "Quick", "Box", "office"],
    required: true
  },
  shapmentCompany: {
    type: String,
    enum: ["smsa", "aramex", "redbox", "omniclama"],
    required: true
  },
  shapmentType: {
    type: String,

    enum: ["straight", "reverse"],
    default: "straight"
  },

  // Tracking Information
  trackingId: String,
  trackingURL: String,
  shippingLabelUrl: String,
  
  // Order Information
  orderSou: String,
  ordervalue: Number,
  storId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store"
  },

  // API Responses
  redboxResponse: { type: Object, default: null },
  omniclamaResponse: { type: Object, default: null },
  smsaResponse: { type: Object, default: null },
  aramexResponse: { type: Object, default: null },
  companyshipmentid: String,

  // Pricing Information
  shapmentPrice: { type: Number, required: true },
    priceaddedtax: { type: Number, default: 0.15 },
    basePrice: { type: Number }, // السعر الأساسي (للمتعاقدين فقط)
    profitPrice: { type: Number },
    profitRTOprice: { type: Number },
    baseAdditionalweigth: { type: Number },
    profitAdditionalweigth: { type: Number },
    baseCODfees: { type: Number },
    profitCODfees: { type: Number },
    insurancecost: { type: Number },
    byocPrice: { type: Number, default: 0.0 },
    basepickUpPrice: { type: Number, default: 0.0 },
    profitpickUpPrice: { type: Number, default: 0.0 },
    baseRTOprice: { type: Number, default: 0.0 },
  },
);

// إضافة indexes إضافية
shapmentSchema.index({ trackingId: 1 });
shapmentSchema.index({ orderId: 1 });
shapmentSchema.index({ status: 1 });

const Shapment = mongoose.model("Shapment", shapmentSchema);
module.exports = Shapment;
