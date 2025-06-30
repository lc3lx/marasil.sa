const axios = require("axios");
const { URLSearchParams } = require("url");

class OmniDeliveryAPI {
  constructor(
    clientId = "zjShmQfZlM2DSXKVsZG5fbyt",
    clientSecret = "7IVhCT8zw3g9PdF17NwnrevFIEcshLr46V9BrJJzIelkokJp",
    isProduction = true
  ) {
    // استخدام بيانات الاعتماد الافتراضية إذا لم يتم تمريرها
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.isProduction = isProduction;
    this.accessToken = null;
    this.tokenExpiry = null;
    this.baseURL = isProduction
      ? "https://api.omnic.solutions"
      : "http://dev.ecomgate.omnic.solutions";

    // إعداد معالج الأخطاء
    this.client = axios.create({
      validateStatus: function (status) {
        return status < 500; // Resolve only if the status code is less than 500
      },
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          switch (error.response.status) {
            case 401:
              throw new Error("غير مصرح: تأكد من صحة بيانات الاعتماد");
            case 403:
              throw new Error("غير مصرح: ليس لديك صلاحية للوصول");
            case 404:
              throw new Error("الخدمة غير موجودة");
            case 422:
              const validationErrors = error.response.data.errors
                ? Object.entries(error.response.data.errors)
                    .map(([field, errors]) => `${field}: ${errors.join(", ")}`)
                    .join("\n")
                : error.response.data.message;
              throw new Error(`خطأ في البيانات:\n${validationErrors}`);
            default:
              throw new Error(
                `خطأ في الخادم: ${error.response.data.message || error.message}`
              );
          }
        } else if (error.request) {
          throw new Error("لا يمكن الوصول إلى خادم OmniDelivery");
        } else {
          throw new Error(`خطأ في الطلب: ${error.message}`);
        }
      }
    );
  }

  // === المصادقة ===
  async authenticate() {
    const authUrl = this.isProduction
      ? "https://id.omnic.solutions/oauth/token"
      : "https://id.dev.omnic.solutions/oauth/token";

    const basicAuth = Buffer.from(
      `${this.clientId}:${this.clientSecret}`
    ).toString("base64");

    const body = new URLSearchParams();
    body.append("grant_type", "client_credentials");

    try {
      console.log("Authenticating with:", {
        url: authUrl,
        clientId: this.clientId,
        isProduction: this.isProduction,
      });

      const response = await this.client.post(authUrl, body.toString(), {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      console.log("Auth Response:", JSON.stringify(response.data, null, 2));

      if (!response.data || !response.data.access_token) {
        return {
          success: false,
          status: response.status,
          message: "Invalid authentication response",
        };
      }

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000;
      this.headers = {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      };

      console.log("Auth successful, token set:", {
        tokenExpiry: new Date(this.tokenExpiry).toISOString(),
        hasToken: !!this.accessToken,
      });

      return {
        success: true,
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type,
      };
    } catch (error) {
      console.error("Authentication Error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      if (error.response) {
        return {
          success: false,
          status: error.response.status,
          message: error.response.data?.message || "Authentication failed",
        };
      } else {
        return {
          success: false,
          message: "Network error or server unavailable",
        };
      }
    }
  }

  async ensureAuth() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      console.log("Token expired or missing, authenticating...");
      const authResult = await this.authenticate();
      if (!authResult.success) {
        throw new Error(`Authentication failed: ${authResult.message}`);
      }
    }
    console.log("Using token:", {
      hasToken: !!this.accessToken,
      expiry: new Date(this.tokenExpiry).toISOString(),
    });
  }

  // === الطلبات ===
  async createOrder(payload) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/order`;
    const response = await axios.post(url, payload, { headers: this.headers });
    return response.data;
  }

  async updateOrder(orderUid, payload) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/order/${orderUid}`;
    const response = await axios.put(url, payload, { headers: this.headers });
    return response.data;
  }

  async cancelOrder(orderUid) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/order/${orderUid}`;
    const response = await axios.delete(url, { headers: this.headers });
    return response.data;
  }

  async getOrderInfo(orderUid) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/order/${orderUid}`;
    const response = await axios.get(url, { headers: this.headers });
    return response.data;
  }

  async listOrders(params = {}) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/order?` + new URLSearchParams(params);
    const response = await axios.get(url, { headers: this.headers });
    return response.data;
  }

  // === الويبهوكس ===
  async getWebhooks() {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/webhooks`;
    const response = await axios.get(url, { headers: this.headers });
    return response.data;
  }

  async createWebhook(payload) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/webhooks`;
    const response = await axios.post(url, payload, { headers: this.headers });
    return response.data;
  }

  async updateWebhook(webhookUid, payload) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/webhooks/${webhookUid}`;
    const response = await axios.patch(url, payload, { headers: this.headers });
    return response.data;
  }

  async deleteWebhook(webhookUid) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/webhooks/${webhookUid}`;
    const response = await axios.delete(url, { headers: this.headers });
    return response.data;
  }

  // === نقاط الشركة ===
  async listCompanyPoints(params = {}) {
    await this.ensureAuth();
    const url =
      `${this.baseURL}/delivery/warehouse?` + new URLSearchParams(params);
    const response = await axios.get(url, { headers: this.headers });
    return response.data;
  }

  async createCompanyPoint(payload) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/warehouse`;
    const response = await axios.post(url, payload, { headers: this.headers });
    return response.data;
  }

  async updateCompanyPoint(pointUid, payload) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/warehouse/${pointUid}`;
    const response = await axios.put(url, payload, { headers: this.headers });
    return response.data;
  }

  // === الطباعة ===
  async printLabels(orders, size) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/print/label`;
    const response = await axios.post(
      url,
      { orders, size },
      { headers: this.headers }
    );
    return response.data;
  }

  // === الشحن والتتبع ===
  async trackShipment(trackingNumber) {
    await this.ensureAuth();
    try {
      const response = await this.client.get(
        `${this.baseURL}/delivery/order/${trackingNumber}`,
        { headers: this.headers }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "فشل في تتبع الشحنة");
      }

      return {
        status: response.data.data.status_code,
        statusName: response.data.data.status_name,
        trackingNumber: response.data.data.logistician_order_number,
        shipmentId: response.data.data.order_uid,
        updatedAt: response.data.data.updated_at,
      };
    } catch (error) {
      console.error("OmniDelivery Track Shipment Error:", error);
      throw error;
    }
  }

  async createShipment(payload) {
    await this.ensureAuth();
    try {
      console.log(
        "Creating shipment with payload:",
        JSON.stringify(payload, null, 2)
      );
      console.log("Using headers:", this.headers);

      // التحقق من البيانات المطلوبة

      const response = await this.client.post(
        `${this.baseURL}/delivery/order`,
        payload,
        {
          headers: {
            ...this.headers,
            Accept: "application/json",
          },
        }
      );

      console.log(
        "Shipment creation response:",
        JSON.stringify(response.data, null, 2)
      );

      if (!response.data) {
        throw new Error("لم يتم استلام أي استجابة من الخادم");
      }

      if (!response.data.success) {
        const errorMessage = response.data.message || "فشل إنشاء الشحنة";
        const errorDetails = response.data.errors
          ? JSON.stringify(response.data.errors)
          : "";
        throw new Error(`${errorMessage} ${errorDetails}`);
      }

      const data = response.data.data;
      if (!data) {
        throw new Error("لم يتم استلام بيانات الشحنة");
      }

      // استخدام رقم الطلب من شركة الشحن كرقم تتبع
      const trackingNumber =
        data.vendor_order_number ||
        data.logistician_order_number ||
        data.order_number;

      if (!trackingNumber) {
        throw new Error("لم يتم استلام رقم التتبع");
      }

      return {
        success: true,
        trackingNumber: trackingNumber,
        shipmentId: data.order_uid || data.vendor_order_uid,
        status: {
          code: data.status_code,
          name: data.outer_status_name || data.status_name,
          outerCode: data.outer_status_code,
        },
        orderInfo: {
          number: data.order_number,
          vendorNumber: data.vendor_order_number,
          logisticianNumber: data.logistician_order_number,
        },
        timestamps: {
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
      };
    } catch (error) {
      console.error("OmniDelivery Create Shipment Error Details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
      });
      throw new Error(`فشل في إنشاء الشحنة: ${error.message}`);
    }
  }

  async cancelShipment(trackingNumber) {
    await this.ensureAuth();
    try {
      const response = await this.client.delete(
        `${this.baseURL}/delivery/order/${trackingNumber}`,
        { headers: this.headers }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "فشل في إلغاء الشحنة");
      }

      return {
        success: true,
        message: "تم إلغاء الشحنة بنجاح",
      };
    } catch (error) {
      console.error("OmniDelivery Cancel Shipment Error:", error);
      throw error;
    }
  }

  // === الحسابات ===
  async calculateDeliveryTariff(payload) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/calculator/delivery`;
    const response = await axios.post(url, payload, { headers: this.headers });
    return response.data;
  }

  // === استيراد/تصدير السجلات ===
  async importOrders(fileContent, importFlag = true, lang = "en") {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/order/import`;
    const response = await axios.post(
      url,
      { file_content: fileContent, import: importFlag, lang },
      { headers: this.headers }
    );
    return response.data;
  }

  async exportOrders(params = {}) {
    await this.ensureAuth();
    const url =
      `${this.baseURL}/delivery/order/export?` + new URLSearchParams(params);
    const response = await axios.get(url, { headers: this.headers });
    return response.data;
  }

  async getImportTemplate(lang, format) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/order/import/template?lang=${lang}&format=${format}`;
    const response = await axios.get(url, { headers: this.headers });
    return response.data;
  }

  // === حالة الطلب ===
  async listOrderStatuses() {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/order/statuses`;
    const response = await axios.get(url, { headers: this.headers });
    return response.data;
  }

  async getOrderStatusLog(orderUid) {
    await this.ensureAuth();
    const url = `${this.baseURL}/delivery/order/${orderUid}/status_log`;
    const response = await axios.get(url, { headers: this.headers });
    return response.data;
  }

  // === نقاط الاستلام والتسليم ===
  async listPickupDeliveryPoints(params = {}) {
    await this.ensureAuth();
    try {
      const url =
        `${this.baseURL}/delivery/points?` + new URLSearchParams(params);
      const response = await this.client.get(url, { headers: this.headers });

      if (!response.data.success) {
        throw new Error(
          response.data.message || "فشل في جلب قائمة نقاط الاستلام والتسليم"
        );
      }

      return {
        success: true,
        data: response.data.data,
        extra: response.data.extra,
        message: response.data.message,
        statusCode: response.data.status_code,
      };
    } catch (error) {
      console.error("OmniDelivery List Points Error:", error);
      throw error;
    }
  }
}

module.exports = new OmniDeliveryAPI();
