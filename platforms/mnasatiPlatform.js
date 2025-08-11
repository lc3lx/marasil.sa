const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

class MnasatiPlatform {
  constructor(clientId, clientSecret, redirectUri) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.baseUrl = "https://admin.mnasati.com/api";
  }

  static getAuthUrl(clientId, redirectUri, state) {
    return `https://admin.mnasati.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${state}`;
  }

  async getAccessToken(code) {
    try {
      const response = await fetch(`${this.baseUrl}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grant_type: "authorization_code",
          client_id: this.clientId,
          client_secret: this.clientSecret,
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
      console.error("Mnasati API Error:", error);
      throw error;
    }
  }

  async refreshAccessToken(refreshToken) {
    try {
      const response = await fetch(`${this.baseUrl}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grant_type: "refresh_token",
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to refresh token: ${error.message}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Mnasati API Error:", error);
      throw error;
    }
  }

  async getStoreInfo(accessToken) {
    try {
      const response = await fetch(`${this.baseUrl}/store/info`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to get store info: ${error.message}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Mnasati API Error:", error);
      throw error;
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
      console.error("Mnasati API Error:", error);
      throw error;
    }
  }

  async updateOrderStatus(accessToken, orderId, status) {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to update order status: ${error.message}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Mnasati API Error:", error);
      throw error;
    }
  }
}

module.exports = MnasatiPlatform;
