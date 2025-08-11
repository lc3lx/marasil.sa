const axios = require("axios");

class ZidPlatform {
  // Generate OAuth URL for store authorization
  static getAuthUrl(clientId, redirectUri, state) {
    return `https://oauth.zid.sa/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=offline_access&state=${state}`;
  }

  // Exchange authorization code for access token
  static async getAccessToken(code, clientId, clientSecret, redirectUri) {
    const tokenUrl = "https://oauth.zid.sa/oauth/token";

    try {
      const formData = new URLSearchParams();
      formData.append("client_id", clientId);
      formData.append("client_secret", clientSecret);
      formData.append("grant_type", "authorization_code");
      formData.append("code", code);
      formData.append("redirect_uri", redirectUri);

      const response = await axios.post(tokenUrl, formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      return response.data;
    } catch (error) {
      console.error(
        "Error getting access token:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  // Refresh access token
  static async refreshAccessToken(refreshToken, clientId, clientSecret) {
    const tokenUrl = "https://oauth.zid.sa/oauth/token";

    try {
      const formData = new URLSearchParams();
      formData.append("client_id", clientId);
      formData.append("client_secret", clientSecret);
      formData.append("grant_type", "refresh_token");
      formData.append("refresh_token", refreshToken);

      const response = await axios.post(tokenUrl, formData.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      return response.data;
    } catch (error) {
      console.error(
        "Error refreshing token:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  // Fetch orders from Zid
  static async getOrders(accessToken, params = {}) {
    try {
      const response = await axios.get("https://api.zid.sa/v1/orders", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        params,
      });

      return response.data;
    } catch (error) {
      console.error(
        "Error fetching orders:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  // Update order status in Zid
  static async updateOrderStatus(accessToken, orderId, status) {
    try {
      const response = await axios.put(
        `https://api.zid.sa/v1/orders/${orderId}/status`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        "Error updating order status:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  // Get store information
  static async getStoreInfo(accessToken) {
    try {
      const response = await axios.get("https://api.zid.sa/v1/store", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      return response.data;
    } catch (error) {
      console.error(
        "Error getting store info:",
        error.response?.data || error.message
      );
      throw error;
    }
  }
}

module.exports = ZidPlatform;
