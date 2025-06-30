const axios = require("axios");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

class SallaPlatform {
  constructor(clientId, clientSecret, redirectUri) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.baseUrl = "https://api.salla.dev/admin/v2";
  }

  static getAuthUrl(clientId, redirectUri, state) {
    return `https://accounts.salla.sa/oauth2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=offline_access&state=${state}`;
  }

  async getAccessToken(code) {
    try {
      const response = await fetch("https://accounts.salla.sa/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: "authorization_code",
          code,
          redirect_uri: this.redirectUri,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to get access token: ${error.message}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Salla API Error:", error);
      throw error;
    }
  }

  async refreshAccessToken(refreshToken) {
    try {
      const response = await fetch("https://accounts.salla.sa/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to refresh token: ${error.message}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Salla API Error:", error);
      throw error;
    }
  }

  async getStoreInfo(accessToken) {
    try {
      const response = await axios.get(
        "https://api.salla.dev/admin/v2/store/info",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data.data; // تأكد من هيكل الاستجابة
    } catch (error) {
      console.error(
        "Error getting store info:",
        error.response?.data || error.message
      );
      throw new Error(`Failed to get store info: ${error.message}`);
    }
  }

  async getOrders(accessToken, params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`${this.baseUrl}/orders?${queryString}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to get orders: ${error.message}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Salla API Error:", error);
      throw error;
    }
  }

  async updateOrderStatus(accessToken, orderId, status) {
    try {
      const body = {};
  
      if (status.slug) {
        body.slug = status.slug;
      }
  
      if (status.id) {
        body.status_id = status.id;
      }
  
      const response = await fetch(`${this.baseUrl}/orders/${orderId}/status`, {
        method: "POST", // ✅ مو PUT
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
  
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to update order status: ${JSON.stringify(error)}`);
      }
  
      return await response.json();
    } catch (error) {
      console.error("Salla API Error:", error);
      throw error;
    }
}
}

module.exports = SallaPlatform;
