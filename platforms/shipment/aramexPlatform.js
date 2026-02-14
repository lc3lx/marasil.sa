const axios = require("axios");

class AramexService {
  constructor() {
    // Shipping API URLs
    this.shippingBaseURL =
      "https://ws.aramex.net/ShippingAPI.V2/Shipping/Service_1_0.svc/json"; // Testing Environment
    // this.shippingBaseURL = "https://ws.aramex.net/shippingapi.v2/shipping/service_1_0.svc/json"; // Live Environment

    // Tracking API URL
    this.trackingBaseURL =
      "https://ws.aramex.net/ShippingAPI.V2/Tracking/Service_1_0.svc/json"; // Testing Environment
    // this.trackingBaseURL = "https://ws.aramex.net/ShippingAPI.V2/Tracking/Service_1_0.svc/json"; // Live Environment

    // Location API URL
    this.locationBaseURL =
      "https://ws.aramex.net/LocationAPI.V2/Location/Service_1_0.svc/json"; // Testing Environment
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
   * تحويل رمز/اسم الدولة إلى ISO Alpha-2 (أرامكس تقبل رموز فقط مثل SA)
   */
  _toCountryCode(value) {
    const v = (value || "").toString().trim();
    if (!v) return "SA";
    if (v.length === 2) return v.toUpperCase();
    const n = v.replace(/\s+/g, " ").toLowerCase();
    if (n.includes("سعود") || n.includes("السعودية") || n.includes("saudi") || n === "sa") return "SA";
    return v.slice(0, 2).toUpperCase();
  }

  /**
   * تحويل عنوان العميل إلى صيغة Aramex
   * @param {Object} address عنوان العميل من قاعدة البيانات
   * @returns {Object} عنوان بصيغة Aramex
   */
  formatAddress(address) {
    return {
      Line1: `${address.address || address.Line1 || ""}    `,
      Line2: `${address.address || address.Line2 || ""}    `,
      Line3: address.addressLine3 || address.Line3 || "    ",
      City: address.city || address.City || "",
      StateOrProvinceCode: address.state || address.StateOrProvinceCode || "",
      PostCode: address.postalCode || address.PostCode || "",
      CountryCode: this._toCountryCode(address.country || address.CountryCode),
    };
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
   * بناء مصفوفة Pickup Items حسب الدليل (Table 32 - Pickup Item Structure).
   * يجب أن تتطابق مع الشحنة: ProductGroup, ProductType, NumberOfPieces, Payment, الوزن، الحجم.
   * - NumberOfPieces: نفس عدد قطع الشحنة المُنشأة (إلا يفشل الحفظ ERR33).
   * - ShipmentVolume: بالـ CBM (متر مكعب) حسب دليل أرامكس.
   * - Payment: "3" للطرف الثالث (مطابق لـ PaymentType في الشحنة).
   */
  buildPickupItems(pickupData) {
    if (Array.isArray(pickupData.pickupItems) && pickupData.pickupItems.length > 0) {
      return pickupData.pickupItems;
    }
    const weight = Math.max(0.1, Number(pickupData.weight) || 1);
    const length = Math.max(0, Number(pickupData.length) || 10);
    const width = Math.max(0, Number(pickupData.width) || 10);
    const height = Math.max(0, Number(pickupData.height) || 10);
    const volumeCBM = Number(pickupData.volumeCBM);
    const volumeValue =
      Number.isFinite(volumeCBM) && volumeCBM > 0
        ? volumeCBM
        : (length * width * height) / 1_000_000;
    const pieces = Math.max(1, Math.min(100, Number(pickupData.numberOfPieces) || 1));
    const numShipments = Math.max(1, Math.min(100, Number(pickupData.numberOfShipments) || 1));
    const productGroup = (pickupData.productGroup || "DOM").toString().trim().slice(0, 3);
    const productType = (pickupData.productType || "CDS").toString().trim().slice(0, 3);
    const payment =
      pickupData.paymentType === "3" || pickupData.payment === "3" ? "3" : (pickupData.payment || "P").slice(0, 1);

    return [
      {
        ProductGroup: productGroup,
        ProductType: productType,
        Payment: payment,
        NumberOfPieces: pieces,
        NumberOfShipments: numShipments,
        PackageType: (pickupData.packageType || "Box").slice(0, 50),
        ShipmentWeight: { Value: weight, Unit: "KG" },
        ShipmentVolume: { Value: Math.max(0.0001, volumeValue), Unit: "CBM" },
        CashAmount: { CurrencyCode: "SAR", Value: Number(pickupData.cashAmount) || 0 },
        ExtraCharges: { CurrencyCode: "SAR", Value: 0 },
        ShipmentDimensions: {
          Length: length,
          Width: width,
          Height: height,
          Unit: "CM",
        },
        Comments: (pickupData.comments || "").slice(0, 50) || "Pickup request from Marasil",
      },
    ];
  }

  /**
   * إنشاء استلام (Create Pickup)
   * @param {Object} pickupData - بيانات الاستلام
   * @returns {Promise<Object>} - { success, pickupId?, pickupGUID?, errors? }
   * - عند النجاح: success: true مع ProcessedPickup.ID و ProcessedPickup.GUID فقط
   * - عند الفشل: success: false مع errors من Notifications (لا يُستخدم رقم الشحنة كبديل)
   */
  async createPickup(pickupData) {
    const addr = pickupData.pickupAddress || {};
    const line1 = (addr.Line1 ?? addr.AddressLine1 ?? "Address not specified").trim();
    const readyMs = Number(pickupData.pickupDateTime);
    const closingMs = Number(pickupData.closingDateTime);

    // الحقول النصية الفارغة كـ "" وليس مسافات (حسب متطلبات أرامكس)
    const emptyStr = (v) => (v != null && String(v).trim() !== "" ? String(v).trim() : "");

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
        Reference1: pickupData.reference || "PICKUP-" + Date.now(),
        Reference2: "",
        Reference3: "",
        Reference4: "",
        Reference5: "",
      },
      Pickup: {
        PickupAddress: {
          Line1: line1.length >= 3 ? line1 : line1 + "   ",
          Line2: emptyStr(addr.Line2 ?? addr.AddressLine2),
          Line3: emptyStr(addr.Line3),
          City: (addr.City ?? "").trim() || " ",
          StateOrProvinceCode: emptyStr(addr.StateOrProvinceCode ?? addr.State),
          PostCode: emptyStr(addr.PostCode ?? addr.PostalCode),
          CountryCode: (addr.CountryCode ?? "SA").toString().toUpperCase().slice(0, 2),
        },
        PickupLocation:
          typeof pickupData.pickupLocation === "string"
            ? pickupData.pickupLocation
            : (addr.Line1 || addr.AddressLine1 || "استلام من العنوان"),
        PickupContact: {
          PersonName: (pickupData.contactName || "غير محدد").slice(0, 50),
          CompanyName: (pickupData.companyName || "غير محدد").slice(0, 50),
          PhoneNumber1: (pickupData.phone || "0000000000").slice(0, 30),
          PhoneNumber2: (pickupData.phone2 || pickupData.phone || pickupData.mobile || "0000000000").slice(0, 30),
          CellPhone: (pickupData.mobile || "0000000000").slice(0, 30),
          EmailAddress: (pickupData.email || "test@example.com").slice(0, 50),
          Type: (pickupData.contactType || "Business").slice(0, 50),
        },
        PickupDate: "/Date(" + readyMs + ")/",
        ReadyTime: "/Date(" + readyMs + ")/",
        LastPickupTime: "/Date(" + closingMs + ")/",
        ClosingTime: "/Date(" + closingMs + ")/",
        Vehicle: (pickupData.vehicle || "Van").slice(0, 50),
        Status: pickupData.status === "Pending" ? "Pending" : "Ready",
        Reference1: (pickupData.reference || "").slice(0, 50),
        Comments: (pickupData.comments || "Pickup request from Marasil").slice(0, 1000),
        PickupItems: this.buildPickupItems(pickupData),
      },
    };

    console.log("📦 [Aramex] Pickup Data Received:", JSON.stringify(pickupData, null, 2));
    console.log("📤 [Aramex] Pickup Payload:", JSON.stringify(payload, null, 2));

    let response;
    try {
      response = await axios.post(
        `${this.shippingBaseURL}/CreatePickup`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
          validateStatus: () => true,
        }
      );
    } catch (err) {
      console.error("Aramex Create Pickup Error:", err.message);
      return {
        success: false,
        errors: [{ Code: "NETWORK", Message: err.message || "فشل الاتصال بأرامكس" }],
      };
    }

    const respData = response.data || {};
    const status = response.status;

    if (status !== 200) {
      const errBody = typeof respData === "string" ? respData : JSON.stringify(respData);
      console.error("❌ [Aramex] CreatePickup HTTP Error:", { status, data: errBody });
      return {
        success: false,
        errors: [
          {
            Code: "HTTP" + status,
            Message: status === 400 ? `طلب غير صالح: ${errBody.substring(0, 300)}` : `خطأ من الخادم (${status})`,
          },
        ],
      };
    }

    console.log("📥 [Aramex] CreatePickup API Response:", JSON.stringify(respData, null, 2));

    const hasErrors = respData.HasErrors === true;
    const notifications = Array.isArray(respData.Notifications) ? respData.Notifications : [];
    const errors = notifications
      .filter((n) => n && (n.Code || n.Message))
      .map((n) => ({ Code: n.Code || "Error", Message: n.Message || "Unknown" }));

    if (hasErrors) {
      console.error("❌ [Aramex] CreatePickup فشل (HasErrors):", errors);
      return { success: false, errors };
    }

    const processed = respData.ProcessedPickup || {};
    const NULL_GUID = "00000000-0000-0000-0000-000000000000";
    const guid = processed.GUID;
    const id = processed.ID;

    const validGUID = guid && String(guid).toLowerCase() !== NULL_GUID.toLowerCase();
    const validId = id != null && String(id).trim() !== "";

    if (!validGUID && !validId) {
      console.error("❌ [Aramex] CreatePickup لا يوجد معرف صالح من ProcessedPickup:", processed);
      return {
        success: false,
        errors: [{ Code: "INVALID_RESPONSE", Message: "لم تُرجع أرامكس معرف استلام صالح (ID/GUID)" }],
      };
    }

    return {
      success: true,
      pickupId: validId ? String(id) : (validGUID ? String(guid) : undefined),
      pickupGUID: validGUID ? String(guid) : undefined,
    };
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
      // تحويل trackNumbers إلى مصفوفة إذا كانت سلسلة نصية
      const trackNumbersArray = Array.isArray(trackNumbers)
        ? trackNumbers
        : [trackNumbers];

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
        Shipments: trackNumbersArray,
        GetLastTrackingUpdateOnly: false,
      };

      console.log(
        "Sending tracking request to Aramex:",
        JSON.stringify(payload, null, 2)
      );

      // إرسال طلب التتبع
      const response = await this.axiosInstance.post(
        `${this.trackingBaseURL}/TrackShipments`,
        payload
      );

      console.log(
        "Aramex tracking response received:",
        JSON.stringify(response.data, null, 2)
      );

      if (!response.data) {
        throw new Error("لا توجد بيانات في الاستجابة");
      }

      // إرجاع البيانات كما هي للمعالجة في الدالة formatAramexResponse
      return response.data;
    } catch (error) {
      let errorMessage;

      if (error.code === "ECONNRESET") {
        errorMessage = "تم إغلاق الاتصال من قبل الخادم";
      } else if (error.response) {
        // خطأ من الخادم مع استجابة
        errorMessage = `خطأ من خدمة Aramex: ${
          error.response.status
        } - ${JSON.stringify(error.response.data || {})}`;
      } else if (error.request) {
        // تم إرسال الطلب ولكن لم يتم استلام استجابة
        errorMessage = "لم يتم استلام استجابة من خدمة تتبع Aramex";
      } else {
        // خطأ أثناء إعداد الطلب
        errorMessage = `خطأ في إرسال طلب التتبع: ${error.message}`;
      }

      console.error("Aramex Track Shipment Error:", {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        stack: error.stack,
      });

      throw new Error(errorMessage);
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
