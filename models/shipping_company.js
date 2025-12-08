const mongoose = require("mongoose");

const AllowedBoxSizeSchema = new mongoose.Schema(
  {
    length: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
  },
  { _id: false }
);

const ShippingTypeSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    code: { type: String },
    RTOcode: { type: String },
    COD: { type: Boolean, default: false },
    maxCodAmount: { type: Number, default: 0 },
    maxWeight: { type: Number, default: 0 },
    maxBoxes: { type: Number, default: 0 },
    priceaddedtax: { type: Number, default: 0 },
    basePrice: { type: Number, default: 0 },
    profitPrice: { type: Number, default: 0 },
    baseRTOprice: { type: Number, default: 0 },
    profitRTOprice: { type: Number, default: 0 },
    baseAdditionalweigth: { type: Number, default: 0 },
    profitAdditionalweigth: { type: Number, default: 0 },
    baseCODfees: { type: Number, default: 0 },
    profitCODfees: { type: Number, default: 0 },
    insurancecost: { type: Number, default: 0 },
    deliveryTime: { type: String },
  },
  { _id: false }
);

const ShippingCompanySchema = new mongoose.Schema(
  {
    company: { type: String, required: true, unique: true },
    shippingTypes: { type: [ShippingTypeSchema], default: [] },
    minShipments: { type: Number, default: 0 },
    status: { type: String, enum: ["Enabled", "Disabled"], default: "Enabled" },
    conditions: { type: String },
    details: { type: String },
    conditionsAr: { type: String },
    detailsAr: { type: String },
    trackingURL: { type: String },
    pickUpStatus: { type: String, enum: ["Yes", "No"], default: "No" },
    allowedBoxSizes: { type: [AllowedBoxSizeSchema], default: [] },
    deliveryTime: { type: String, default: "2-3 أيام عمل" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ShippingCompany", ShippingCompanySchema);

