/**
 * تحويل التاريخ إلى صيغة Aramex المطلوبة (/Date(timestamp)/)
 * @param {Date} date التاريخ
 * @returns {String} التاريخ بصيغة Aramex
 */
exports.formatAramexDate = (date) => {
  const timestamp = date.getTime();
  return `\/Date(${timestamp})\/`;
};

/**
 * تحويل اسم/رمز الدولة إلى رمز ISO Alpha-2 (أرامكس تقبل رموز فقط مثل SA)
 */
function toAramexCountryCode(value) {
  const v = (value || "").toString().trim();
  if (!v) return "SA";
  const upper = v.toUpperCase();
  if (upper.length === 2) return upper;
  const normalized = v.replace(/\s+/g, " ").toLowerCase();
  if (
    normalized.includes("سعود") ||
    normalized.includes("السعودية") ||
    normalized.includes("saudi") ||
    normalized === "sa"
  )
    return "SA";
  return upper.slice(0, 2);
}

/**
 * تحويل عنوان العميل إلى صيغة Aramex
 * @param {Object} address عنوان العميل من قاعدة البيانات
 * @returns {Object} عنوان بصيغة Aramex
 */
exports.formatAddress = (address) => {
  return {
    Line1: address.address || address.Line1 || "Address not specified",
    Line2: address.addressLine2 || address.Line2 || "",
    Line3: address.addressLine3 || address.Line3 || "",
    City: address.city || address.City || "Riyadh",
    StateOrProvinceCode: address.state || address.StateOrProvinceCode || "",
    PostCode: address.postalCode || address.postCode || "",
    CountryCode: toAramexCountryCode(address.country || address.CountryCode),
  };
};

/**
 * تحويل بيانات الطرف (الشاحن/المستلم) إلى صيغة Aramex
 * @param {Object} partyData بيانات الطرف
 * @returns {Object} بيانات الطرف بصيغة Aramex
 */
exports.formatParty = (partyData) => {
  const countryCode = toAramexCountryCode(
    partyData.country || partyData.CountryCode,
  );
  return {
    AccountEntity: process.env.ARAMEX_ACCOUNT_ENTITY || "JED",
    AccountNumber: process.env.ARAMEX_ACCOUNT_NUMBER,

    Reference1: partyData._id || "Ref1",
    PartyAddress: {
      Line1: [partyData.address, partyData.city, partyData.country].filter(Boolean).join("، ") || "Address not specified",
      Line2: partyData.addressLine2 || "",
      Line3: partyData.addressLine3 || "",
      City: partyData.city,
      PostCode: partyData.postCode || "",
      CountryCode: countryCode,
    },
    Contact: {
      PersonName: partyData.full_name,
      CompanyName: partyData.full_name,
      PhoneNumber1: partyData.mobile,
      PhoneNumber2: partyData.phone2 || "",
      Type: partyData.type || "Business",
      CellPhone: partyData.mobile || "0000000000",
      EmailAddress: partyData.email || "test@example.com",
    },
  };
};

/**
 * تحويل بيانات الشحنة إلى صيغة Aramex
 * @param {Object} order بيانات الطلب
 * @param {Object} shipperAddress عنوان المرسل
 * @param {Number} weight الوزن
 * @param {Number} Parcels عدد الطرود
 * @param {String} orderDescription وصف الطلب
 * @param {Object} dimension الأبعاد
 * @returns {Object} بيانات الشحنة بصيغة Aramex
 */
exports.shipmentData = (
  order,
  shipperAddress,
  weight,
  Parcels,
  orderDescription,
  dimension = {},
) => {
  // التحقق من البيانات المطلوبة
  if (!order || !shipperAddress || !weight || !Parcels) {
    throw new Error(
      "جميع البيانات مطلوبة: order, shipperAddress, weight, Parcels",
    );
  }

  // التأكد من أن الوزن وعدد الطرود أرقام صحيحة
  if (isNaN(weight) || weight <= 0) {
    throw new Error("الوزن يجب أن يكون رقماً موجباً");
  }

  if (isNaN(Parcels) || Parcels <= 0) {
    throw new Error("عدد الطرود يجب أن يكون رقماً موجباً");
  }

  // تحديد نوع الدفع بشكل صحيح
  // 'C' for Cash on Delivery, 'P' for Prepaid
  const paymentType = order.payment_method === "COD" ? "C" : "P";
  // PaymentOptions is often not needed when PaymentType is clear, or should be compatible.
  // For COD, Aramex might expect a specific option, but for Prepaid ('P'), it's often left blank.
  const paymentOptions = order.payment_method === "COD" ? "C" : "P";

  // تحضير تواريخ الشحن والاستحقاق
  const now = new Date();
  const dueDate = new Date();
  dueDate.setDate(now.getDate() + 7);

  return {
    ClientInfo: {
      UserName: process.env.ARAMEX_USERNAME,
      Password: process.env.ARAMEX_PASSWORD,
      Version: "v1.0",
      AccountNumber: process.env.ARAMEX_ACCOUNT_NUMBER,
      AccountPin: process.env.ARAMEX_ACCOUNT_PIN,
      AccountEntity: process.env.ARAMEX_ACCOUNT_ENTITY || "JED",
      AccountCountryCode: process.env.ARAMEX_ACCOUNT_COUNTRY_CODE || "SA",
      Source: 24,
    },
    Shipments: [
      {
        Reference1: order._id || `ORD-${Date.now()}`,
        Reference2: order.order_number || "",
        Reference3: order.platform || "",
        Shipper: exports.formatParty(shipperAddress),
        Consignee: exports.formatParty(order.customer),
        ShippingDateTime: exports.formatAramexDate(now), // استخدام التنسيق الجديد
        DueDate: exports.formatAramexDate(dueDate), // استخدام التنسيق الجديد
        ThirdParty: {
          PartyId: process.env.ARAMEX_ACCOUNT_NUMBER,
          AccountNumber: process.env.ARAMEX_ACCOUNT_NUMBER,
          AccountEntity: process.env.ARAMEX_ACCOUNT_ENTITY || "JED",
          type: "Customer",
          Name: "Marasil",
          PartyAddress: {
            Line1: "حي النهضة",
            Line2: "",
            Line3: "",
            City: "الرياض",
            StateOrProvinceCode: "",
            PostCode: "12345",
            CountryCode: "SA",
          },
          Contact: {
            PersonName: "Marasil",
            CompanyName: "Marasil",
            PhoneNumber1: "00966123456789",
            PhoneNumber2: "",
            Type: "Business",
            CellPhone: "00966123456789",
            EmailAddress: "info@marasil.sa",
          },
        },
        Details: {
          Dimensions: {
            Length: dimension.length || 10,
            Width: dimension.width || 10,
            Height: dimension.height || 10,
            Unit: "cm",
          },
          ActualWeight: {
            Value: weight,
            Unit: "KG",
          },
          ChargeableWeight: {
            Value: weight,
            Unit: "KG",
          },
          DescriptionOfGoods: `${orderDescription}   ,nationalAddress:${order.customer.nationalAddress}`,
          GoodsOriginCountry: "SA",
          NumberOfPieces: 6,
          ProductGroup: "DOM",
          ProductType: "CDS",
          PaymentType: "3",
          PaymentOptions: "",
          ItemCount: order.items?.length || 1,
          CustomsValueAmount: {
            Value: parseFloat(order.total.amount),
            CurrencyCode: "SAR",
          },
        },
      },
    ],
    LabelInfo: {
      ReportID: 9729,
      ReportType: "URL",
    },
  };
};

/**
 * تحويل بيانات الاستلام إلى صيغة Aramex
 * @param {Object} pickupData بيانات الاستلام
 * @returns {Object} بيانات الاستلام بصيغة Aramex
 */
exports.pickupData = (pickupData) => {
  return {
    pickupAddress: exports.formatAddress(pickupData.address),
    contactName: pickupData.full_name || "customer marasil ",
    companyName: pickupData.full_name || "Marasil",
    phone: pickupData.mobile || "0000000000",
    mobile: pickupData.mobile || "0000000000",
    email: pickupData.email || "test@example.com",
    pickupDateTime: exports.formatAramexDate(
      new Date(pickupData.pickup_date_time || Date.now()),
    ),
    closingDateTime: exports.formatAramexDate(
      new Date(pickupData.closing_date_time || Date.now() + 3600000),
    ),
  };
};

/**
 * عنوان استلام مطابق للمرسل مع التأكد من Line1, Line2, City, CountryCode, PostCode
 */
function formatPickupAddress(shipperData) {
  const addr = exports.formatAddress(shipperData);
  return {
    Line1: String(addr.Line1 ?? "").trim() || "Address not specified",
    Line2: String(addr.Line2 ?? "").trim(),
    Line3: String(addr.Line3 ?? "").trim(),
    City: String(addr.City ?? "").trim() || "Riyadh",
    StateOrProvinceCode: String(addr.StateOrProvinceCode ?? "").trim(),
    PostCode: String(addr.PostCode ?? "").trim() || "00000",
    CountryCode: String(addr.CountryCode ?? "SA").trim().toUpperCase().slice(0, 2),
  };
}

/**
 * إنشاء بيانات طلب الاستلام من بيانات المرسل واستجابة الشحنة
 * - Reference1 = رقم تتبع الشحنة (TrackingNumber)
 * - العنوان والاتصال من المرسل (Shipper)
 * - pickupDateTime الآن أو بعد دقيقتين، closingDateTime بعد ساعة/ساعتين
 * - PaymentType متوافق مع الشحنة (Prepaid = 3)
 */
exports.createPickupRequestData = (shipperData, shipmentInfo = {}) => {
  const now = Date.now();
  const pickupDateTime = now + 2 * 60 * 1000;
  const closingDateTime = pickupDateTime + 60 * 60 * 1000;

  const dimension = shipmentInfo.dimension || {};
  const length = Number(dimension.length) || Number(shipmentInfo.length) || 10;
  const width = Number(dimension.width) || Number(shipmentInfo.width) || 10;
  const height = Number(dimension.height) || Number(shipmentInfo.height) || 10;

  const numberOfPiecesFromShipment = Number(shipmentInfo.numberOfPieces ?? shipmentInfo.Parcels ?? 6);
  const weightFromShipment = Number(shipmentInfo.weight);
  const trackingNumber = String(shipmentInfo.trackingNumber ?? "").trim();

  return {
    pickupAddress: formatPickupAddress(shipperData),
    contactName: shipperData.full_name || shipperData.contactName || "غير محدد",
    companyName: shipperData.full_name || shipperData.companyName || "Marasil",
    phone: shipperData.mobile || shipperData.phone || "0000000000",
    mobile: shipperData.mobile || shipperData.phone || "0000000000",
    email: shipperData.email || "test@example.com",
    pickupDateTime,
    closingDateTime,
    reference: trackingNumber,
    trackingNumber,
    comments: trackingNumber ? `استلام شحنة رقم: ${trackingNumber}` : "Pickup request from Marasil",
    productGroup: shipmentInfo.productGroup || "DOM",
    productType: shipmentInfo.productType || "CDS",
    paymentType: shipmentInfo.paymentType || "3",
    numberOfPieces: Math.max(1, Math.min(100, numberOfPiecesFromShipment)),
    weight: weightFromShipment > 0 ? weightFromShipment : 1,
    length,
    width,
    height,
    volumeCBM: Math.max(0.001, (length * width * height) / 1_000_000),
  };
};

/**
 * تحويل بيانات التسليم المجدول إلى صيغة Aramex
 * @param {Object} deliveryData بيانات التسليم
 * @returns {Object} بيانات التسليم بصيغة Aramex
 */
exports.deliveryData = (deliveryData) => {
  return {
    deliveryDateTime: exports.formatAramexDate(
      new Date(deliveryData.delivery_date_time || Date.now()),
    ),
    address: exports.formatAddress(deliveryData.address),
    contactName: deliveryData.full_name || "customer marasil ",
    companyName: deliveryData.full_name || "Marasil",
    phone: deliveryData.mobile || "0000000000",
    mobile: deliveryData.mobile || "0000000000",
    email: deliveryData.email || "test@example.com",
  };
};

/**
 * إنشاء طلب استلام تلقائي للشحنة
 * @param {Object} shipperAddress عنوان المرسل
 * @param {Object} shipmentInfo معلومات الشحنة المُنشأة
 * @returns {Promise<Object>} نتيجة إنشاء طلب الاستلام
 */
exports.createPickupRequest = async (shipperAddress, shipmentInfo) => {
  try {
    // استيراد الـ instance المُصدّر من aramexPlatform (ليس class)
    const aramex = require("../platforms/shipment/aramexPlatform");

    // إعداد بيانات طلب الاستلام
    const pickupData = exports.createPickupRequestData(
      shipperAddress,
      shipmentInfo,
    );

    console.log("📦 [AramexService] إنشاء طلب استلام - بيانات الإدخال:", {
      shipperAddress: JSON.stringify(shipperAddress, null, 2),
      shipmentInfo: JSON.stringify(shipmentInfo, null, 2),
    });

    console.log("📦 [AramexService] بيانات طلب الاستلام المُعدة:", {
      pickupAddress: JSON.stringify(pickupData.pickupAddress, null, 2),
      contactName: pickupData.contactName,
      phone: pickupData.phone,
      pickupDateTime: pickupData.pickupDateTime,
      closingDateTime: pickupData.closingDateTime,
      reference: pickupData.reference,
    });

    const pickupResult = await aramex.createPickup(pickupData);

    if (!pickupResult.success) {
      const errMessage =
        (pickupResult.errors || []).map((e) => `${e.Code || ""}: ${e.Message || ""}`).join("; ") ||
        "فشل في إنشاء طلب الاستلام";
      console.error("❌ فشل إنشاء طلب الاستلام (CreatePickup HasErrors):", pickupResult.errors || errMessage);
      return {
        success: false,
        errors: pickupResult.errors || [],
        message: errMessage,
        error: errMessage,
        pickupData,
      };
    }

    // النجاح فقط: استخدام ProcessedPickup.ID و ProcessedPickup.GUID دون بديل
    console.log("✅ [AramexService] تم إنشاء طلب الاستلام بنجاح:", {
      pickupId: pickupResult.pickupId,
      pickupGUID: pickupResult.pickupGUID,
    });

    return {
      success: true,
      pickupId: pickupResult.pickupId,
      pickupGUID: pickupResult.pickupGUID,
      pickupData,
      message: "تم إنشاء طلب الاستلام بنجاح",
      scheduledDate: pickupData.pickupDateTime,
    };
  } catch (error) {
    console.error("❌ [AramexService] فشل في إنشاء طلب الاستلام:", error.message);
    return {
      success: false,
      errors: [{ Code: "EXCEPTION", Message: error.message || "فشل في إنشاء طلب الاستلام" }],
      message: error.message || "فشل في إنشاء طلب الاستلام",
    };
  }
};
