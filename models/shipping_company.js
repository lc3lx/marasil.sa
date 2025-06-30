const mongoose = require("mongoose");

const ShippingCompanySchema = new mongoose.Schema({
  company: {
    type: String,
    enum: ["smsa", "redbox", "omniclama", "aramex"],
    required: true,
  },
  caver: {
    type: String,
  },
  deliveryAt: {
    type: String,
  },
  shipmentDelivertype: {
    type: String,
  },

  shippingTypes: [
    {
      type: {
        type: String,
        enum: ["Dry", "Cold", "Quick", "Box", "offices"],
        required: true,
      },
      code: { type: String, required: true }, // رمز الشحن العادي (اختياري)
      RTOcode: { type: String, required: true }, // رمز شحن الاسترجاع (اختياري)
      COD: { type: Boolean, required: true },
      maxCodAmount: { type: Number, required: true },
      maxWeight: { type: Number, required: true },
      maxBoxes: { type: Number, required: true },
      priceaddedtax: { type: Number, required: true, default: 0.15 },
      basePrice: { type: Number, required: true },
      profitPrice: { type: Number, required: true },
      baseRTOprice: { type: Number, required: true, default: 0.0 },
      profitRTOprice: { type: Number, required: true },
      baseAdditionalweigth: { type: Number, required: true },
      profitAdditionalweigth: { type: Number, required: true },
      baseCODfees: { type: Number, required: true },
      profitCODfees: { type: Number, required: true },
      insurancecost: { type: Number, required: true },
      basepickUpPrice: { type: Number, required: true, default: 0.0 },
      profitpickUpPrice: { type: Number, required: true, default: 0.0 },
    },
  ],
  points: [
    {
      ids: String,
    },
  ],

  minShipments: { type: Number, required: true },
  status: {
    type: String,
    required: true,
    enum: ["Enabled", "Disabled"],
  },
  conditions: { type: String, required: true },
  details: { type: String, required: true },
  conditionsAr: { type: String, required: true },
  detailsAr: { type: String, required: true },
  trackingURL: { type: String, required: true },
  pickUpStatus: {
    type: String,
    required: true,
    enum: ["Yes", "No"],
  },

  // 👇 الجديد هنا
  allowedBoxSizes: {
    type: [
      {
        length: { type: Number, required: true },
        width: { type: Number, required: true },
        height: { type: Number, required: true },
      },
    ],
    validate: {
      validator: function (value) {
        const companyName = this.company;
        if (["omniclama", "redbox"].includes(companyName)) {
          return Array.isArray(value) && value.length > 0;
        }
        return true; // غير إلزامي للشركات الأخرى
      },
      message: "allowedBoxSizes is required for omniclama and redbox",
    },
  },
});
const ShippingCompany = mongoose.model(
  "ShippingCompany",
  ShippingCompanySchema
);
module.exports = ShippingCompany;
