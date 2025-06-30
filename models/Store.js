const mongoose = require("mongoose");

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  platform: {
    type: String,
    enum: ["salla", "mnasati", "woocommerce", "shopify", "zid"],
    required: true,
  },

  // For Salla stores
  storeId: {
    type: String,
    required: function () {
      return this.platform === "salla";
    },
  },
  accessToken: {
    type: String,
    required: function () {
      return this.platform === "salla";
    },
  },
  refreshToken: {
    type: String,
    required: function () {
      return this.platform === "salla";
    },
  },
  tokenExpiresAt: {
    type: Date,
    required: function () {
      return this.platform === "salla";
    },
  },

  // For WooCommerce stores
  storeUrl: {
    type: String,
    required: function () {
      return this.platform === "woocommerce";
    },
  },
  credentials: {
    consumerKey: {
      type: String,
      required: function () {
        return this.platform === "woocommerce";
      },
    },
    consumerSecret: {
      type: String,
      required: function () {
        return this.platform === "woocommerce";
      },
    },
  },

  // For Mnasati stores
  storeId: {
    type: String,
    required: function () {
      return this.platform === "mnasati";
    },
    sparse: true,
  },
  accessToken: {
    type: String,
    required: function () {
      return this.platform === "mnasati" || this.platform === "salla";
    },
  },
  refreshToken: {
    type: String,
    required: function () {
      return this.platform === "mnasati" || this.platform === "salla";
    },
  },
  tokenExpiresAt: {
    type: Date,
    required: function () {
      return this.platform === "mnasati" || this.platform === "salla";
    },
  },

  // For Shopify stores
  storeId: {
    type: String,
    function() {
      return this.platform === "shopify";
    },
  },
  storeName: {
    type: String,
    required: function () {
      return this.platform === "shopify";
    },
  },

  accessToken: {
    type: String,
    required: function () {
      return this.platform === "shopify";
    },
  },
  // shopify refresh token is not needed
  // refreshToken: {
  //   type: String,
  //   required: function () {
  //     return this.platform === "shopify";
  //   },
  // },
  // tokenExpiresAt: {
  //   type: Date,
  //   required: function () {
  //     return this.platform === "shopify";
  //   },
  // },
  scopes: {
    type: [String],
    default: ["read_orders", "write_orders"],
    required: function () {
      return this.platform === "shopify";
    },
  },
  apiVersion: {
    type: String,
    default: "2024-01",
    required: function () {
      return this.platform === "shopify";
    },
  },

  webhookTopics: {
    type: [String],
    default: ["orders/create", "orders/updated", "orders/fulfilled"],
    required: function () {
      return this.platform === "shopify";
    },
  },

  // For Zid stores
  storeName: {
    type: String,
    required: function () {
      return this.platform === "zid";
    },
    unique: true,
  },
  accessToken: {
    type: String,
    required: function () {
      return this.platform === "zid";
    },
  },
  refreshToken: {
    type: String,
    required: function () {
      return this.platform === "zid";
    },
  },
  tokenExpiresAt: {
    type: Date,
    required: function () {
      return this.platform === "zid";
    },
  },
  storeId: {
    type: String,
    function() {
      return this.platform === "zid";
    },
  },

  storeInfo: {
    type: mongoose.Schema.Types.Mixed,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },

  customer: {
    type: mongoose.Schema.ObjectId,
    ref: "Customer",
  },
});

// Update the updatedAt field before saving
storeSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Store", storeSchema);
