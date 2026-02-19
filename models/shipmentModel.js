const mongoose = require("mongoose");

const shapmentSchema = new mongoose.Schema(
  {
    receiverAddress: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClientAddress",
      required: true,
    },
    senderAddress: {
      type: Object,
      required: true,
    },
    weight: {
      type: Number,
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
    // حفظ الأبعاد لعرضها في الواجهة
    dimension: {
      length: { type: Number, default: 0 },
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
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
      enum: ["Dry", "Cold", "Quick", "Box", "offices"],
      required: true,
    },
    shapmentCompany: {
      type: String,
      enum: ["smsa", "aramex", "redbox", "omniclama"],
      required: true,
    },
    shapmentType: {
      type: String,
      enum: ["straight", "reverse"],
      default: "straight",
    },
    isReturnShipment: { type: Boolean, default: false },
    originalShipmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Shapment" },

    // Tracking Information
    trackingId: String,
    trackingURL: String,
    shippingLabelUrl: String,

    // Order Information
    orderSou: String,
    ordervalue: Number,
    storId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
    },

    // API Responses
    redboxResponse: { type: Object, default: null },
    omniclamaResponse: { type: Object, default: null },
    smsaResponse: { type: Object, default: null },
    aramexResponse: { type: Object, default: null },
    // طلب استلام أرامكس: pickupId, pickupGUID (يُحفظان عند إنشاء طلب الاستلام بعد الشحنة)
    pickupRequest: {
      success: { type: Boolean },
      pickupId: { type: String },
      pickupGUID: { type: String },
      scheduledDate: { type: Date },
      message: { type: String },
      error: { type: mongoose.Schema.Types.Mixed },
    },
    companyshipmentid: String,
    totalprice: { type: Number },
    // Pricing Information
    shapmentPrice: {
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
  },

  {
    timestamps: true, // This will automatically add createdAt and updatedAt fields
  }
);

// إضافة indexes إضافية
shapmentSchema.index({ trackingId: 1 });
shapmentSchema.index({ orderId: 1 });
shapmentSchema.index({ status: 1 });

// Always auto-populate referenced fields
function autoPopulateAll(next) {
  this.populate("receiverAddress")
    .populate({ path: "customerId", select: "-password" })
    .populate("orderId")
    .populate("storId");
  next();
}

shapmentSchema.pre("find", autoPopulateAll);
shapmentSchema.pre("findOne", autoPopulateAll);
shapmentSchema.pre("findById", autoPopulateAll);
shapmentSchema.pre("findOneAndUpdate", autoPopulateAll);
shapmentSchema.pre("findByIdAndUpdate", autoPopulateAll);

const Shapment = mongoose.model("Shapment", shapmentSchema);
// --- Auto wallet credit on Delivered + COD ---
const Wallet = require("./walletModel");
const Transaction = require("./transactionModel");
const Order = require("./Order");

const sendmail = require("../utils/SendMail");
const Customer = require("./customerModel");
const Notification = require("./notificationModel");

async function creditWalletIfNeeded(shipment) {
  try {
    if (
      shipment.shipmentstates === "Delivered" &&
      shipment.paymentMathod === "COD" &&
      shipment.customerId &&
      shipment.orderId &&
      shipment.ordervalue > 0
    ) {
      // Prevent duplicate credit: check if transaction exists for this shipment
      const existing = await Transaction.findOne({
        referenceId: shipment._id,
        type: "credit",
        method: "cod_delivery",
      });
      if (existing) return;
      // Find wallet
      let wallet = await Wallet.findOne({ customerId: shipment.customerId });
      if (!wallet) {
        wallet = await Wallet.create({
          customerId: shipment.customerId,
          balance: 0,
          transactions: [],
        });
      }
      // Credit
      wallet.balance += shipment.ordervalue;
      await wallet.save();
      // Create transaction
      const tx = await Transaction.create({
        customerId: shipment.customerId,
        type: "credit",
        description: `إيداع قيمة الطلب عند التسليم للشحنة ${shipment._id}`,
        amount: shipment.ordervalue,
        method: "cod_delivery",
        status: "completed",
        referenceId: shipment._id,
        walletId: wallet._id,
      });
      wallet.transactions.push(tx._id);
      await wallet.save();
      // --- Send notification and email ---
      // 1. Get customer email
      const customer = await Customer.findById(shipment.customerId);
      const email = customer?.email;
      const shipmentNumber = shipment._id;
      const message = `تم استرجاع مبلغ الدفع عند الاستلام إلى محفظتك بنجاح. رقم الشحنة: ${shipmentNumber}`;
      // 2. Notification
      await Notification.create({
        customerId: shipment.customerId,
        type: "order",
        message,
      });
      // 3. Email
      if (email) {
        sendmail({
          to: email,
          subject: "استرجاع مبلغ الدفع عند الاستلام",
          text: message,
        });
      }
    }
  } catch (e) {
    console.error("Wallet credit error:", e.message);
  }
}

shapmentSchema.post("findOneAndUpdate", async function (doc) {
  if (doc) await creditWalletIfNeeded(doc);
});
shapmentSchema.post("save", async function (doc) {
  if (doc) await creditWalletIfNeeded(doc);
});

module.exports = Shapment;
