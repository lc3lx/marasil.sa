const axios = require("axios");
const crypto = require("crypto");
const { Shopify } = require("@shopify/shopify-api");

class ShopifyPlatform {
  constructor(storeName = null, accessToken = null) {
    if (!process.env.SHOPIFY_API_KEY || !process.env.SHOPIFY_API_SECRET) {
      throw new Error("Shopify API credentials are not configured");
    }

    this.storeName = storeName || process.env.SHOPIFY_SHOP_NAME;
    this.accessToken = accessToken || process.env.SHOPIFY_ACCESS_TOKEN;
    this.apiVersion = process.env.SHOPIFY_API_VERSION || "2024-01";
      this.apiUrl = `https://${this.storeName}.myshopify.com/admin/api/${this.apiVersion}`;


  }

  sanitizeStoreName(name) {
    // تأكد من أن الاسم لا يحتوي على رموز غير صالحة
    return name.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  }

  // ✅ تعديل: توليد رابط الأذونات بشكل آمن
  getAuthorizationUrl(storeName) {
    if (!process.env.BASE_URL) {
      throw new Error("BASE_URL environment variable is not configured");
    }

    const sanitizedStore = this.sanitizeStoreName(storeName);

    const scopes = [
      "read_orders",
      "write_orders",
      "read_products",
      "read_customers",
      "read_inventory",
    ].join(",");

    const redirectUri = `${process.env.BASE_URL}/api/shopify/auth/callback`;
    const state = crypto.randomBytes(16).toString("hex");

    const authUrl =
      `https://${sanitizedStore}.myshopify.com/admin/oauth/authorize?` +
      `client_id=${process.env.SHOPIFY_API_KEY}&` +
      `scope=${scopes}&` +
      `redirect_uri=${redirectUri}&` +
      `state=${state}`;

    return { authUrl, state };
  }

  // باقي الكود كما هو (بدون تغيير)
  async getAccessToken(storeName, code) {
    try {
      if (!code) throw new Error("Authorization code is required");

      const response = await axios.post(
        `https://${storeName}.myshopify.com/admin/oauth/access_token`,
        {
          client_id: process.env.SHOPIFY_API_KEY,
          client_secret: process.env.SHOPIFY_API_SECRET,
          code,
        }
      );

      if (!response.data.access_token) {
        throw new Error("Failed to get access token from Shopify");
      }

      return response.data.access_token;
    } catch (error) {
      console.error(
        "Error getting access token:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to get access token: ${
          error.response?.data?.error || error.message
        }`
      );
    }
  }

  // Get store information
  async getStoreInfo() {
    try {
      if (!this.storeName || !this.accessToken) {
        throw new Error("Store name and access token are required");
      }

      const response = await axios.get(
        `https://${this.storeName}.myshopify.com/admin/api/${this.apiVersion}/shop.json`,
        {
          headers: {
            "X-Shopify-Access-Token": this.accessToken,
          },
        }
      );

      if (!response.data.shop) {
        throw new Error("Invalid response format from Shopify");
      }

      return response.data.shop;
    } catch (error) {
      console.error(
        "Error getting store info:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to get store info: ${
          error.response?.data?.error || error.message
        }`
      );
    }
  }

  // Fetch orders from Shopify
  async getOrders(params = {}) {
    try {
      if (!this.storeName || !this.accessToken) {
        throw new Error("Store name and access token are required");
      }

      const response = await axios.get(
        `https://${this.storeName}.myshopify.com/admin/api/${this.apiVersion}/orders.json`,
        {
          headers: {
            "X-Shopify-Access-Token": this.accessToken,
          },
          params,
        }
      );

      if (!response.data.orders) {
        throw new Error("Invalid response format from Shopify");
      }

      return response.data.orders;
    } catch (error) {
      console.error(
        "Error fetching orders:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to fetch orders: ${
          error.response?.data?.error || error.message
        }`
      );
    }
  }

  async registerOrderCreationWebhook() {
  try {
    const response = await axios.post(
      `https://${this.storeName}.myshopify.com/admin/api/${this.apiVersion}/webhooks.json`,
      {
        webhook: {
          topic: 'orders/create',
          address: 'https://yourdomain.com/webhook/orders/create',
          format: 'json'
        }
      },
      {
        headers: {
          'X-Shopify-Access-Token': this.accessToken
        }
      }
    );

    if (!response.data.webhook) {
      throw new Error('Failed to register webhook');
    }

    console.log('Webhook registered successfully:', response.data.webhook);
  } catch (error) {
    console.error('Error registering webhook:', error);
    throw new Error('Failed to register webhook');
  }
}
  async getOrder(orderId) {
    try {
      const response = await axios.get(
        `https://${this.storeName}.myshopify.com/admin/api/${this.apiVersion}/orders/${orderId}.json`,
        {
          headers: {
            "X-Shopify-Access-Token": this.accessToken,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data.order;
    } catch (error) {
      console.error("Error fetching order:", error.response?.data || error.message);
      throw new Error("Failed to fetch order from Shopify");
    }
  }

  async getLocations() {
    try {
      const response = await axios.get(
        `https://${this.storeName}.myshopify.com/admin/api/${this.apiVersion}/locations.json`,
        {
          headers: {
            "X-Shopify-Access-Token": this.accessToken,
          },
        }
      );


      return response.data.locations;
    } catch (error) {
      console.error("Error fetching locations:", error.response?.data || error.message);
      throw new Error("Failed to fetch locations");
    }
  }

  async createFulfillment(orderId, fulfillmentData) {
    try {
      const order = await this.getOrder(orderId);

      const lineItems = fulfillmentData.line_items || order.line_items.map(item => ({
        id: item.id,
        quantity: item.quantity,
      }));
      // console.log("Line items from order:", order.line_items);


      let locationId = fulfillmentData.location_id;
      if (!locationId) {
        const locations = await this.getLocations();
        // console.log("Available Locations:", locations);

        if (!locations.length) {
          throw new Error("No locations found for this store");
        }
        locationId = locations[0].id;
      }

      const trackingInfo = fulfillmentData.trackingNumber
        ? {
            number: fulfillmentData.trackingNumber,
            company: fulfillmentData.trackingCompany || "Other",
            url: fulfillmentData.trackingUrl || undefined,
          }
        : undefined;

      const payload = {
        fulfillment: {
          location_id: locationId,
          line_items: lineItems,
          notify_customer:
            typeof fulfillmentData.notifyCustomer === "boolean"
              ? fulfillmentData.notifyCustomer
              : true,
          ...(trackingInfo ? { tracking_info: trackingInfo } : {}),
        },
      };

      const response = await axios.post(
        `https://${this.storeName}.myshopify.com/admin/api/${this.apiVersion}/orders/${orderId}/fulfillments.json`,
        payload,
        {
          headers: {
            "X-Shopify-Access-Token": this.accessToken,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data.fulfillment;
    } catch (error) {
      console.error("Error creating fulfillment:", error.response?.data || error.message);
      throw new Error(
        `Failed to create fulfillment: ${error.response?.data?.error || error.message}`
      );
    }
  }

  async updateOrderStatus(orderId, status) {
    try {
      if (status === "cancelled") {
        const response = await axios.post(
          `https://${this.storeName}.myshopify.com/admin/api/${this.apiVersion}/orders/${orderId}/cancel.json`,
          {},
          {
            headers: {
              "X-Shopify-Access-Token": this.accessToken,
              "Content-Type": "application/json",
            },
          }
        );
        return response.data;
      } else if (status === "open") {
        const response = await axios.post(
          `https://${this.storeName}.myshopify.com/admin/api/${this.apiVersion}/orders/${orderId}/open.json`,
          {},
          {
            headers: {
              "X-Shopify-Access-Token": this.accessToken,
              "Content-Type": "application/json",
            },
          }
        );
        return response.data;
      } else {
        throw new Error("Unsupported status for direct update (only 'cancelled' and 'open' allowed)");
      }
    } catch (error) {
      console.error("Error updating order status:", error.response?.data || error.message);
      throw new Error(
        `Failed to update order status: ${error.response?.data?.error || error.message}`
      );
    }
  }
    async checkInventory(locationId, variantId, requiredQty = 1) {
    try {
      const response = await axios.get(
        `https://${this.storeName}.myshopify.com/admin/api/${this.apiVersion}/inventory_levels.json`,
        {
          headers: {
            "X-Shopify-Access-Token": this.accessToken,
            "Content-Type": "application/json",
          },
          params: {
            location_ids: locationId,
            inventory_item_ids: variantId, // yes, it's inventory_item_id not variant_id!
          },
        }
      );

      const level = response.data.inventory_levels?.[0];

      if (!level) {
        console.warn("🔴 No inventory level found for this variant/location");
        return { success: false, reason: "No inventory level found" };
      }

      if (level.available < requiredQty) {
        console.warn(`⚠️ Not enough inventory: ${level.available} < ${requiredQty}`);
        return { success: false, reason: "Not enough inventory" };
      }

      return { success: true, available: level.available };
    } catch (error) {
      console.error("Error checking inventory:", error.response?.data || error.message);
      return {
        success: false,
        reason: "Failed to check inventory",
        details: error.response?.data || error.message,
      };
    }
  }
  async getInventoryItemId(variantId) {
  try {
    const response = await axios.get(
      `https://${this.storeName}.myshopify.com/admin/api/${this.apiVersion}/variants/${variantId}.json`,
      {
        headers: {
          "X-Shopify-Access-Token": this.accessToken,
        },
      }
    );

    const inventoryItemId = response.data?.variant?.inventory_item_id;

    if (!inventoryItemId) {
      throw new Error("Inventory item ID not found");
    }

    return inventoryItemId;
  } catch (error) {
    console.error("Error fetching inventory item ID:", error.response?.data || error.message);
    throw new Error("Failed to get inventory_item_id");
  }
}

}


module.exports = ShopifyPlatform;
