const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    clientName: {
      type: String,
      required: true,
    },
    clientAddress: {
      type: String,
      required: true,
    },
    addressDetails: {
      type: String,
      required: true,
    },
    clientPhone: {
      type: String,
      required: true,
    },
    clientEmail: {
      type: String,
    },
    country: {
      type: String,
      required: true,
    },
    ///الرمز البريدي
    countrycode: {
      type: String,
    },

    city: {
      type: String,
      required: true,
    },
    city_en: {
      type: String,
    },
    district: {
      type: String,
    },
    // order: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Order",
    // },
    customer: {
      type: mongoose.Schema.ObjectId,
      ref: "Customer",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ClientAddress", clientSchema);
