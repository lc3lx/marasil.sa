const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    clientName: {
      type: String,
      required: true,
      unique: true,
    },
    clientAddress: {
      type: String,
      required: true,
    },
    addressDetails: {
      type: String,
    },
    clientPhone: {
      type: String,
      required: true,
    },
    clientEmail: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },

    city: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
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
