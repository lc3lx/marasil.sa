const axios = require("axios");

class AramexService {
  constructor() {
    // Shipping API URLs
    this.shippingBaseURL =
      "https://ws.aramex.net/ShippingAPI.V2/Shipping/Service_1_0.svc/json"; // Testing Environment
    // this.shippingBaseURL = "https://ws.aramex.net/shippingapi.v2/shipping/service_1_0.svc/json"; // Live Environment

    // Tracking API URL
    this.trackingBaseURL =
      "https://ws.dev.aramex.net/ShippingAPI.V2/Tracking/Service_1_0.svc/json"; // Testing Environment
    // this.trackingBaseURL = "https://ws.aramex.net/ShippingAPI.V2/Tracking/Service_1_0.svc/json"; // Live Environment

    // Location API URL
    this.locationBaseURL =
      "https://ws.dev.aramex.net/LocationAPI.V2/Location/Service_1_0.svc/json"; // Testing Environment
    // this.locationBaseURL = "https://ws.aramex.net/LocationAPI.V2/Location/Service_1_0.svc/json"; // Live Environment

    // Default credentials (replace with your actual credentials)
    this.username = process.env.ARAMEX_USERNAME;
    this.password = process.env.ARAMEX_PASSWORD;
    this.accountNumber = process.env.ARAMEX_ACCOUNT_NUMBER;
    this.accountPin = process.env.ARAMEX_ACCOUNT_PIN;
    this.accountEntity = process.env.ARAMEX_ACCOUNT_ENTITY || "JED";
    this.accountCountryCode = process.env.ARAMEX_ACCOUNT_COUNTRY_CODE || "SA";

    // Configure axios defaults
    this.axiosInstance = axios.create({
      timeout: 300000, // 30 seconds timeout
      maxContentLength: 50 * 1024 * 1024, // 50MB max content length
      maxBodyLength: 50 * 1024 * 1024, // 50MB max body length
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Host: "ws.aramex.net",
      },
    });
  }

  /**
   * إنشاء شحنة جديدة
   * @param {Object} shipmentData - بيانات الشحنة
   * @returns {Promise<Object>} - تفاصيل الشحنة
   */
  async createShipment(shipmentData) {
    try {
      console.log(
        "Attempting to create Aramex shipment with data:",
        JSON.stringify(shipmentData, null, 2)
      );

      const response = await this.axiosInstance.post(
        `${this.shippingBaseURL}/CreateShipments`,
        shipmentData
      );

      if (response.status !== 200 || !response.data.Shipments?.[0]) {
        console.error(
          "Aramex API Error Response:",
          JSON.stringify(response.data, null, 2)
        );
        throw new Error(
          `خطأ في إنشاء الشحنة: ${JSON.stringify(response.data)}`
        );
      }

      const shipment = response.data.Shipments[0];
      console.log(
        "Aramex shipment response received:",
        JSON.stringify(shipment, null, 2)
      );

      // Check if Aramex returned errors
      if (shipment.HasErrors) {
        const errorMessages = shipment.Notifications.map(
          (n) => `${n.Code}: ${n.Message}`
        ).join(", ");
        throw new Error(`Aramex Error: ${errorMessages}`);
      }

      return {
        success: true,
        trackingNumber: shipment.ID,
        labelURL: shipment.ShipmentLabel?.LabelURL || "",
        status: "Success", // Assuming success if no errors
        estimatedDeliveryDate: shipment.ShipmentDetails?.DeliveryDate,
        details: {
          reference: shipment.Reference1,
          pieces: shipment.ShipmentDetails?.NumberOfPieces || 1,
          weight: shipment.ShipmentDetails?.ActualWeight?.Value || 0,
          dimensions: {
            length: shipment.ShipmentDetails?.Dimensions?.Length || 0,
            width: shipment.ShipmentDetails?.Dimensions?.Width || 0,
            height: shipment.ShipmentDetails?.Dimensions?.Height || 0,
          },
        },
      };
    } catch (error) {
      console.error(
        "Aramex Create Shipment Error:",
        error.response?.data || error.message,
        "\nFull error:",
        error
      );

      // تحسين رسالة الخطأ
      let errorMessage = "فشل في إنشاء الشحنة";
      if (error.code === "ETIMEDOUT") {
        errorMessage =
          "انتهت مهلة الاتصال بخدمة Aramex. يرجى المحاولة مرة أخرى";
      } else if (error.response?.data) {
        errorMessage = `خطأ من خدمة Aramex: ${JSON.stringify(
          error.response.data
        )}`;
      } else if (error.message) {
        errorMessage = `خطأ: ${error.message}`;
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * طباعة ملصق الشحنة
   * @param {String} shipmentID - رقم الشحنة
   * @returns {Promise<Object>} - رابط الملصق
   */
  async printLabel(shipmentID) {
    try {
      const payload = {
        ClientInfo: {
          UserName: this.username,
          Password: this.password,
          Version: "v1.0",
          AccountNumber: this.accountNumber,
          AccountPin: this.accountPin,
          AccountEntity: this.accountEntity,
          AccountCountryCode: this.accountCountryCode,
        },
        Shipments: [shipmentID],
        LabelInfo: {
          ReportID: 9201,
          ReportType: "URL",
        },
      };

      const response = await axios.post(
        `${this.shippingBaseURL}/PrintLabel`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.status !== 200) {
        throw new Error(
          `خطأ في طباعة الملصق: ${JSON.stringify(response.data)}`
        );
      }

      return {
        success: true,
        labelURL: response.data.Labels[0].URL,
      };
    } catch (error) {
      console.error(
        "Aramex Print Label Error:",
        error.response?.data || error.message
      );
      throw new Error(`فشل طباعة الملصق: ${error.message}`);
    }
  }

  /**
   * إنشاء استلام
   * @param {Object} pickupData - بيانات الاستلام
   * @returns {Promise<Object>} - تفاصيل الاستلام
   */
  async createPickup(pickupData) {
    try {
      const payload = {
        ClientInfo: {
          UserName: this.username,
          Password: this.password,
          Version: "v1.0",
          AccountNumber: this.accountNumber,
          AccountPin: this.accountPin,
          AccountEntity: this.accountEntity,
          AccountCountryCode: this.accountCountryCode,
        },
        Pickup: {
          PickupLocation: this.formatAddress(pickupData.pickupAddress),
          PickupContact: {
            PersonName: pickupData.contactName || "غير محدد",
            CompanyName: pickupData.companyName || "غير محدد",
            PhoneNumber1: pickupData.phone || "0000000000",
            CellPhone: pickupData.mobile || "0000000000",
            EmailAddress: pickupData.email || "test@example.com",
          },
          PickupDateTime: `\\/Date(${
            pickupData.pickupDateTime || Date.now()
          })\\/`,
          ClosingDateTime: `\\/Date(${
            pickupData.closingDateTime || Date.now() + 3600000
          })\\/`,
          Status: "Ready",
        },
      };

      const response = await axios.post(
        `${this.shippingBaseURL}/CreatePickup`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.status !== 200) {
        throw new Error(
          `خطأ في إنشاء الاستلام: ${JSON.stringify(response.data)}`
        );
      }

      return {
        success: true,
        pickupGUID: response.data.PickupGUID,
      };
    } catch (error) {
      console.error(
        "Aramex Create Pickup Error:",
        error.response?.data || error.message
      );
      throw new Error(`فشل إنشاء الاستلام: ${error.message}`);
    }
  }

  /**
   * إلغاء استلام
   * @param {String} pickupGUID - GUID الخاص بالاستلام
   * @returns {Promise<Object>} - نتيجة الإلغاء
   */
  async cancelPickup(pickupGUID) {
    try {
      const payload = {
        ClientInfo: {
          UserName: this.username,
          Password: this.password,
          Version: "v1.0",
          AccountNumber: this.accountNumber,
          AccountPin: this.accountPin,
          AccountEntity: this.accountEntity,
          AccountCountryCode: this.accountCountryCode,
        },
        PickupGUID: pickupGUID,
      };

      const response = await axios.post(
        `${this.shippingBaseURL}/CancelPickup`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.status !== 200) {
        throw new Error(
          `خطأ في إلغاء الاستلام: ${JSON.stringify(response.data)}`
        );
      }

      return {
        success: true,
        message: "تم إلغاء الاستلام بنجاح",
      };
    } catch (error) {
      console.error(
        "Aramex Cancel Pickup Error:",
        error.response?.data || error.message
      );
      throw new Error(`فشل إلغاء الاستلام: ${error.message}`);
    }
  }

  /**
   * حجز نطاق أرقام الشحنات
   * @param {Object} rangeData - بيانات النطاق
   * @returns {Promise<Object>} - النطاق المحجوز
   */
  async reserveShipmentNumberRange(rangeData) {
    try {
      const payload = {
        ClientInfo: {
          UserName: this.username,
          Password: this.password,
          Version: "v1.0",
          AccountNumber: this.accountNumber,
          AccountPin: this.accountPin,
          AccountEntity: this.accountEntity,
          AccountCountryCode: this.accountCountryCode,
        },
        Range: {
          Start: rangeData.start || 1,
          End: rangeData.end || 10,
        },
      };

      const response = await axios.post(
        `${this.shippingBaseURL}/ReserveShipmentNumberRange`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.status !== 200) {
        throw new Error(`خطأ في حجز النطاق: ${JSON.stringify(response.data)}`);
      }

      return {
        success: true,
        reservedRange: response.data.ReservedRange,
      };
    } catch (error) {
      console.error(
        "Aramex Reserve Shipment Number Range Error:",
        error.response?.data || error.message
      );
      throw new Error(`فشل حجز النطاق: ${error.message}`);
    }
  }

  /**
   * الحصول على آخر نطاق لأرقام الشحنات
   * @returns {Promise<Object>} - آخر نطاق محجوز
   */
  async getLastShipmentsNumbersRange() {
    try {
      const payload = {
        ClientInfo: {
          UserName: this.username,
          Password: this.password,
          Version: "v1.0",
          AccountNumber: this.accountNumber,
          AccountPin: this.accountPin,
          AccountEntity: this.accountEntity,
          AccountCountryCode: this.accountCountryCode,
        },
      };

      const response = await axios.post(
        `${this.shippingBaseURL}/GetLastShipmentsNumbersRange`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.status !== 200) {
        throw new Error(
          `خطأ في الحصول على النطاق: ${JSON.stringify(response.data)}`
        );
      }

      return {
        success: true,
        lastRange: response.data.LastRange,
      };
    } catch (error) {
      console.error(
        "Aramex Get Last Shipments Numbers Range Error:",
        error.response?.data || error.message
      );
      throw new Error(`فشل الحصول على النطاق: ${error.message}`);
    }
  }

  /**
   * جدولة تسليم
   * @param {Object} deliveryData - بيانات الجدولة
   * @returns {Promise<Object>} - تفاصيل الجدولة
   */
  async scheduleDelivery(deliveryData) {
    try {
      const payload = {
        ClientInfo: {
          UserName: this.username,
          Password: this.password,
          Version: "v1.0",
          AccountNumber: this.accountNumber,
          AccountPin: this.accountPin,
          AccountEntity: this.accountEntity,
          AccountCountryCode: this.accountCountryCode,
        },
        Delivery: {
          DeliveryDateTime: `\\/Date(${
            deliveryData.deliveryDateTime || Date.now()
          })\\/`,
          Address: this.formatAddress(deliveryData.address),
          Contact: {
            PersonName: deliveryData.contactName || "غير محدد",
            CompanyName: deliveryData.companyName || "غير محدد",
            PhoneNumber1: deliveryData.phone || "0000000000",
            CellPhone: deliveryData.mobile || "0000000000",
            EmailAddress: deliveryData.email || "test@example.com",
          },
        },
      };

      const response = await axios.post(
        `${this.shippingBaseURL}/ScheduleDelivery`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.status !== 200) {
        throw new Error(
          `خطأ في جدولة التسليم: ${JSON.stringify(response.data)}`
        );
      }

      return {
        success: true,
        scheduledDelivery: response.data.ScheduledDelivery,
      };
    } catch (error) {
      console.error(
        "Aramex Schedule Delivery Error:",
        error.response?.data || error.message
      );
      throw new Error(`فشل جدولة التسليم: ${error.message}`);
    }
  }

  /**
   * تتبع الشحنات
   * @param {Array<String>} trackNumbers - قائمة بأرقام التتبع
   * @returns {Promise<Object>} - حالة الشحنات
   */
  async trackShipment(trackNumbers) {
    try {
      const payload = {
        ClientInfo: {
          UserName: this.username,
          Password: this.password,
          Version: "v1.0",
          AccountNumber: this.accountNumber,
          AccountPin: this.accountPin,
          AccountEntity: this.accountEntity,
          AccountCountryCode: this.accountCountryCode,
        },
        Transaction: {
          Reference1: "TRACK_REF1",
          Reference2: "",
          Reference3: "",
          Reference4: "",
          Reference5: "",
        },
        GetLastTrackingUpdateOnly: false, // الحصول على آخر تحديث فقط
        Shipments: trackNumbers, // قائمة بأرقام التتبع
      };

      const response = await axios.post(
        `${this.trackingBaseURL}/TrackShipments`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.status !== 200) {
        throw new Error(
          `خطأ في تتبع الشحنات: ${JSON.stringify(response.data)}`
        );
      }

      return {
        success: true,
        trackingResults: response.data.TrackingResults,
      };
    } catch (error) {
      console.error(
        "Aramex Track Shipment Error:",
        error.response?.data || error.message
      );
      throw new Error(`فشل تتبع الشحنات: ${error.message}`);
    }
  }

  /**
   * التحقق من صحة العنوان
   * @param {Object} addressData - بيانات العنوان
   * @returns {Promise<Object>} - نتيجة التحقق من صحة العنوان
   */
  async validateAddress(addressData) {
    try {
      const payload = {
        ClientInfo: {
          UserName: this.username,
          Password: this.password,
          Version: "v1.0",
          AccountNumber: this.accountNumber,
          AccountPin: this.accountPin,
          AccountEntity: this.accountEntity,
          AccountCountryCode: this.accountCountryCode,
        },
        Address: this.formatAddress(addressData),
      };

      const response = await axios.post(
        `${this.locationBaseURL}/ValidateAddress`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.status !== 200) {
        throw new Error(
          `خطأ في التحقق من صحة العنوان: ${JSON.stringify(response.data)}`
        );
      }

      return {
        success: true,
        isValid: response.data.IsValid,
        suggestions: response.data.Suggestions || [],
      };
    } catch (error) {
      console.error(
        "Aramex Validate Address Error:",
        error.response?.data || error.message
      );
      throw new Error(`فشل التحقق من صحة العنوان: ${error.message}`);
    }
  }

  /**
   * جلب قائمة المدن في دولة معينة
   * @param {String} countryCode - رمز الدولة (ISO Alpha-2)
   * @returns {Promise<Object>} - قائمة المدن
   */
  async fetchCities(countryCode) {
    try {
      const payload = {
        ClientInfo: {
          UserName: this.username,
          Password: this.password,
          Version: "v1.0",
          AccountNumber: this.accountNumber,
          AccountPin: this.accountPin,
          AccountEntity: this.accountEntity,
          AccountCountryCode: this.accountCountryCode,
        },
        CountryCode: countryCode,
      };

      const response = await axios.post(
        `${this.locationBaseURL}/FetchCities`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.status !== 200) {
        throw new Error(`خطأ في جلب المدن: ${JSON.stringify(response.data)}`);
      }

      return {
        success: true,
        cities: response.data.Cities || [],
      };
    } catch (error) {
      console.error(
        "Aramex Fetch Cities Error:",
        error.response?.data || error.message
      );
      throw new Error(`فشل جلب المدن: ${error.message}`);
    }
  }

  /**
   * جلب قائمة الدول
   * @returns {Promise<Object>} - قائمة الدول
   */
  async fetchCountries() {
    try {
      const payload = {
        ClientInfo: {
          UserName: this.username,
          Password: this.password,
          Version: "v1.0",
          AccountNumber: this.accountNumber,
          AccountPin: this.accountPin,
          AccountEntity: this.accountEntity,
          AccountCountryCode: this.accountCountryCode,
        },
      };

      const response = await axios.post(
        `${this.locationBaseURL}/FetchCountries`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.status !== 200) {
        throw new Error(`خطأ في جلب الدول: ${JSON.stringify(response.data)}`);
      }

      return {
        success: true,
        countries: response.data.Countries || [],
      };
    } catch (error) {
      console.error(
        "Aramex Fetch Countries Error:",
        error.response?.data || error.message
      );
      throw new Error(`فشل جلب الدول: ${error.message}`);
    }
  }

  /**
   * جلب تفاصيل دولة معينة
   * @param {String} countryCode - رمز الدولة (ISO Alpha-2)
   * @returns {Promise<Object>} - تفاصيل الدولة
   */
  async fetchCountry(countryCode) {
    try {
      const payload = {
        ClientInfo: {
          UserName: this.username,
          Password: this.password,
          Version: "v1.0",
          AccountNumber: this.accountNumber,
          AccountPin: this.accountPin,
          AccountEntity: this.accountEntity,
          AccountCountryCode: this.accountCountryCode,
        },
        CountryCode: countryCode,
      };

      const response = await axios.post(
        `${this.locationBaseURL}/FetchCountry`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.status !== 200) {
        throw new Error(
          `خطأ في جلب تفاصيل الدولة: ${JSON.stringify(response.data)}`
        );
      }

      return {
        success: true,
        countryDetails: response.data.Country || {},
      };
    } catch (error) {
      console.error(
        "Aramex Fetch Country Error:",
        error.response?.data || error.message
      );
      throw new Error(`فشل جلب تفاصيل الدولة: ${error.message}`);
    }
  }

  /**
   * جلب مكاتب Aramex المتاحة في دولة معينة
   * @param {String} countryCode - رمز الدولة (ISO Alpha-2)
   * @returns {Promise<Object>} - قائمة المكاتب
   */
  async fetchOffices(countryCode) {
    try {
      const payload = {
        ClientInfo: {
          UserName: this.username,
          Password: this.password,
          Version: "v1.0",
          AccountNumber: this.accountNumber,
          AccountPin: this.accountPin,
          AccountEntity: this.accountEntity,
          AccountCountryCode: this.accountCountryCode,
        },
        CountryCode: countryCode,
      };

      const response = await axios.post(
        `${this.locationBaseURL}/FetchOffices`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.status !== 200) {
        throw new Error(`خطأ في جلب المكاتب: ${JSON.stringify(response.data)}`);
      }

      return {
        success: true,
        offices: response.data.Offices || [],
      };
    } catch (error) {
      console.error(
        "Aramex Fetch Offices Error:",
        error.response?.data || error.message
      );
      throw new Error(`فشل جلب المكاتب: ${error.message}`);
    }
  }
}

module.exports = new AramexService();
