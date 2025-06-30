const axios = require("axios");

class RedBoxService {
  constructor(apiToken = process.env.REDBOX_API_TOKEN, sandbox = false) {
    // استخدام التوكن الافتراضي إذا لم يتم تمرير توكن
    this.apiToken =
      apiToken ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcmdhbml6YXRpb25faWQiOiI2Nzg0ZjdjY2IxZWY2ZjYyNWE1ODM2ZDQiLCJrZXkiOiIyMDI1LTAxLTEzVDExOjI0OjEwLjUxMloiLCJpYXQiOjE3MzY3Njc0NTB9.a_ULB21e7nZuOruU4qurTxVvKi18lk6cgpnWGkA_SYs";

    this.baseURL = sandbox
      ? "https://stage.api.redboxsa.com"
      : "https://api.redboxsa.com";

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      validateStatus: function (status) {
        return status < 500; // Resolve only if the status code is less than 500
      },
    });

    // إضافة معالج للأخطاء
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          // تم استلام رد من الخادم مع رمز حالة خارج نطاق 2xx
          switch (error.response.status) {
            case 401:
              throw new Error("غير مصرح: تأكد من صحة API Token");
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
          // تم إرسال الطلب ولكن لم يتم استلام رد
          throw new Error("لا يمكن الوصول إلى خادم RedBox");
        } else {
          // حدث خطأ أثناء إعداد الطلب
          throw new Error(`خطأ في الطلب: ${error.message}`);
        }
      }
    );
  }

  // -------------------- Shipments --------------------
  /**
   * Create a new shipment
   */
  async createShipment(data) {
    try {
      const res = await this.client.post("/v3/shipments", data);
      return {
        success: true,
        trackingNumber: res.data.tracking_number,
        shipmentId: res.data.shipment_id,
        label: res.data.shipping_label_url,
      };
    } catch (error) {
      console.error("RedBox Create Shipment Error:", error);
      throw error;
    }
  }

  /**
   * Create a return shipment
   */
  async createReturn(data) {
    const payload = data.originalShipmentId
      ? { original_shipment_id: data.originalShipmentId }
      : {
          reference: data.reference,
          customer_name: data.customerName,
          customer_phone: data.customerPhone,
          customer_address: data.customerAddress,
          customer_address_coordinates: data.customerCoordinates,
          customer_city: data.customerCity,
          customer_country: data.customerCountry,
          customer_email: data.customerEmail,
          sender_name: data.senderName,
          sender_phone: data.senderPhone,
          sender_email: data.senderEmail,
          sender_address: data.senderAddress,
          dimension_height: data.dimensionHeight,
          dimension_length: data.dimensionLength,
          dimension_width: data.dimensionWidth,
          dimension_unit: data.dimensionUnit,
          items: data.items || [],
          weight_value: data.weightValue,
          weight_unit: data.weightUnit,
        };
    const res = await this.client.post("/v3/shipments/returns", payload);
    return {
      shipmentId: res.data.shipment_id,
      trackingNumber: res.data.tracking_number,
    };
  }

  /**
   * Get shipment details, status, label, activities, tracking page
   */
  async trackShipment(id) {
    const detail = await this.client.get(`/v3/shipments/${id}`);
    const status = await this.client.get(`/v3/shipments/${id}/status`);
    const label = await this.client.get(`/v3/shipments/${id}/label`);
    const trackingPage = await this.client.get(
      `/v3/shipments/${id}/tracking-page`
    );
    const activities = await this.client.get(`/v3/shipments/${id}/activities`);
    return {
      detail: detail.data.shipment,
      status: status.data.status,
      labelURL: label.data.url,
      trackingPage: trackingPage.data.short_url,
      activities: activities.data.activities,
    };
  }

  /**
   * Update, cancel, update COD or extend a shipment
   */
  async updateShipment(id, data) {
    await this.client.put(`/v3/shipments/${id}`, data);
    return { success: true };
  }
  async cancelShipment(id) {
    await this.client.post(`/v3/shipments/${id}/cancel`);
    return { success: true };
  }
  async updateCod(id, amount, currency = "SAR") {
    await this.client.post(`/v3/shipments/${id}/cod`, {
      cod_amount: amount,
      cod_currency: currency,
    });
    return { success: true };
  }
  async extendShipment(id, days) {
    await this.client.post(`/v3/shipments/${id}/extend`, {
      extension_days: days,
    });
    return { success: true };
  }

  // -------------------- Points & Regions --------------------
  async getCitiesByCountry(code) {
    const res = await this.client.get(`/v3/countries/${code}/cities`);
    return res.data.cities;
  }
  async getPointsByCity(cityCode, type = "all") {
    const res = await this.client.get(
      `/v3/cities/${cityCode}/points?type=${type}`
    );
    return res.data.points;
  }
  async getPointsByCountry(countryCode, type = "all", page = 1, pageSize = 50) {
    const res = await this.client.get(
      `/v3/countries/${countryCode}/points?type=${type}&page=${page}&page_size=${pageSize}`
    );
    return { paging: res.data.paging, points: res.data.points };
  }
  async searchNearby(lat, lng, radius = 5000, type = "all") {
    const res = await this.client.get(
      `/v3/points/search/nearby?lat=${lat}&lng=${lng}&radius=${radius}&type=${type}`
    );
    return res.data.points;
  }
  async getPointDetails(id) {
    const res = await this.client.get(`/v3/points/${id}`);
    return res.data.point;
  }

  // -------------------- Pickup Locations & Requests --------------------
  async listPickupLocations() {
    const res = await this.client.get("/v3/pickup-locations");
    return res.data.pickup_locations;
  }
  async createPickupLocation(loc) {
    const res = await this.client.post("/v3/pickup-locations", loc);
    return { locationId: res.data.location_id };
  }
  async updatePickupLocation(id, loc) {
    await this.client.put(`/v3/pickup-locations/${id}`, loc);
    return { success: true };
  }
  async createPickupRequest(reqData) {
    const res = await this.client.post("/v3/pickup-requests", reqData);
    return { requestId: res.data.request_id };
  }
  async getPickupRequest(id) {
    const res = await this.client.get(`/v3/pickup-requests/${id}`);
    return res.data.request;
  }

  // -------------------- Webhooks --------------------
  async listWebhooks() {
    const res = await this.client.get("/v3/webhooks");
    return res.data.webhooks;
  }
  async createWebhook(hook) {
    const res = await this.client.post("/v3/webhooks", hook);
    return { webhookId: res.data.webhook_id };
  }
  async deleteWebhook(originalId) {
    await this.client.delete(`/v3/webhooks/${originalId}`);
    return { success: true };
  }
}

module.exports = new RedBoxService();
