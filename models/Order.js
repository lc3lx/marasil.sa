const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  id: { type: Number, required: false },

  total: {
    amount: Number,
    currency: { type: String },
  },

  status: {
    name: {
      type: String,
      enum: [
        "pending",
        "shipped",
        "completed",
        "canceled",
        "fulfilled",
        "ملغي",
        "تم التنفيذ",
        "بإنتظار الدفع",
        "بإنتظار المراجعة",
        "قيد التنفيذ",
        "جاري التوصيل",
        "تم التوصيل",
        "تم الشحن",
        "مسترجع",
        "قيد الإسترجاع",
      ],
      default: "pending",
    },
    slug: String,
  },
  payment_method: String,

  payment_actions: {
    paid_amount: {
      amount: Number,
      currency: { type: String },
    },
  },
  items: [
    {
      name: String,
      quantity: Number,
      price: Number,
    },
  ],
  customer: {
    id: String,
    full_name: String,
    first_name: String,
    last_name: String,
    mobile: String,
    email: String,
    city: String,
    country: String,
    currency: { type: String },
    location: String,

    // groups: { type: [String]},
  },
  storeId: {
    type: String,
    ref: "Store",
    required: false,
  },
  // platform: { type: String, default: "salla" },

  // order manually
  platform: {
    type: String,
    default: "Marasil",
  },
  number_of_boxes: {
    type: Number,
    // required: true,
  },
  weight: {
    type: Number,
    // required: true,
  },
  box_dimensions: {
    length: { type: Number },
    width: { type: Number },
    height: { type: Number },
  },
  product_description: {
    type: String,
    // required: true,
  },

  payment_method: {
    type: String,
    // required: true,
    enum: ["Prepaid", "COD"],
  },
  product_value: {
    type: Number,
    required: false,
  },
  order_number: {
    type: String,
    required: false,
  },

  clientAddress: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ClientAddress",
    // required: true,
  },

  Customer: {
    type: mongoose.Schema.ObjectId,
    ref: "Customer",
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

orderSchema.pre(/^find/, function (next) {
  this.populate({
    path: "clientAddress",
    select:
      "clientName clientAddress addressDetails clientPhone clientEmail country city district -_id,customer",
  });
  next();
});
orderSchema.index(
  { id: 1, storeId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      id: { $exists: true, $ne: null },
      storeId: { $exists: true, $ne: null },
    },
  }
);
const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
