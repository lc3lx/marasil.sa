const axios = require("axios");
const crypto = require("crypto");

class WooCommercePlatform {
  constructor(storeUrl, consumerKey, consumerSecret) {
    this.baseUrl = `${storeUrl}/wp-json/wc/v3`;
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;
  }

  // Generate OAuth URL for store authorization
  getAuthUrl(storeUrl) {
    const state = crypto.randomBytes(16).toString("hex");
    const redirectUri = `${process.env.APP_URL}/api/woocommerce/auth/callback`;

    return {
      url: `${storeUrl}/wp-admin/admin.php?page=wc-settings&tab=advanced&section=rest_api`,
      state,
    };
  }

  // Make authenticated request to WooCommerce API
  async _makeRequest(endpoint, method = "GET", data = null) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const auth = {
        username: this.consumerKey,
        password: this.consumerSecret,
      };

      const config = {
        auth,
        method,
        url,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(
        "WooCommerce API Error:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  // Fetch orders from WooCommerce
  async getOrders(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      return await this._makeRequest(`/orders?${queryString}`);
    } catch (error) {
      console.error("Error fetching orders:", error);
      throw error;
    }
  }

  // Update order status in WooCommerce
  async updateOrderStatus(orderId, status) {
    try {
      return await this._makeRequest(`/orders/${orderId}`, "PUT", {
        status,
      });
    } catch (error) {
      console.error("Error updating order status:", error);
      throw error;
    }
  }

  // Get store information
  async getStoreInfo() {
    try {
      return await this._makeRequest("/system_status");
    } catch (error) {
      console.error("Error getting store info:", error);
      throw error;
    }
  }

  // Verify webhook signature
  verifyWebhookSignature(payload, signature, webhookSecret) {
    const calculatedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(JSON.stringify(payload))
      .digest("base64");

    return calculatedSignature === signature;
  }
}

module.exports = WooCommercePlatform;
