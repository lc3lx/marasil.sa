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
 * تحويل عنوان العميل إلى صيغة Aramex
 * @param {Object} address عنوان العميل من قاعدة البيانات
 * @returns {Object} عنوان بصيغة Aramex
 */
exports.formatAddress = (address) => {
  return {
    Line1: `${address.address}    `,
    Line2: `${address.address}    `,
    Line3: address.addressLine3 || "    ",
    City: address.city,

    PostCode: address.postCode || "",
    CountryCode: address.country ? address.country.toUpperCase() : "SA",
  };
};

/**
 * تحويل بيانات الطرف (الشاحن/المستلم) إلى صيغة Aramex
 * @param {Object} partyData بيانات الطرف
 * @returns {Object} بيانات الطرف بصيغة Aramex
 */
exports.formatParty = (partyData) => {
  return {
    AccountEntity: process.env.ARAMEX_ACCOUNT_ENTITY || "JED",
    AccountNumber: process.env.ARAMEX_ACCOUNT_NUMBER,

    Reference1: partyData._id || "Ref1",
    PartyAddress: {
      Line1: partyData.city + partyData.country + (partyData.address || ""),
      Line2: partyData.addressLine2 || "",
      Line3: partyData.addressLine3 || "",
      City: partyData.city,
      PostCode: partyData.postCode || "",
      CountryCode: partyData.country ? partyData.country.toUpperCase() : "SA",
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
  dimension = {}
) => {
  // التحقق من البيانات المطلوبة
  if (!order || !shipperAddress || !weight || !Parcels) {
    throw new Error(
      "جميع البيانات مطلوبة: order, shipperAddress, weight, Parcels"
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
          DescriptionOfGoods: orderDescription,
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
      new Date(pickupData.pickup_date_time || Date.now())
    ),
    closingDateTime: exports.formatAramexDate(
      new Date(pickupData.closing_date_time || Date.now() + 3600000)
    ),
  };
};

/**
 * إنشاء بيانات طلب الاستلام من بيانات المرسل
 * @param {Object} shipperData بيانات المرسل
 * @param {Object} shipmentInfo معلومات الشحنة
 * @returns {Object} بيانات طلب الاستلام
 */
exports.createPickupRequestData = (shipperData, shipmentInfo = {}) => {
  // تحديد وقت الاستلام (اليوم التالي من الساعة 9 صباحاً)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0); // 9:00 AM

  // وقت انتهاء الاستلام (اليوم التالي من الساعة 5 مساءً)
  const closingTime = new Date(tomorrow);
  closingTime.setHours(17, 0, 0, 0); // 5:00 PM

  return {
    pickupAddress: exports.formatAddress(shipperData),
    contactName: shipperData.full_name || shipperData.contactName || "غير محدد",
    companyName: shipperData.full_name || shipperData.companyName || "Marasil",
    phone: shipperData.mobile || shipperData.phone || "0000000000",
    mobile: shipperData.mobile || shipperData.phone || "0000000000",
    email: shipperData.email || "test@example.com",
    pickupDateTime: tomorrow.toISOString(),
    closingDateTime: closingTime.toISOString(),
    // إضافة معلومات إضافية للشحنة
    reference: shipmentInfo.trackingNumber || "غير محدد",
    comments: `استلام شحنة رقم: ${shipmentInfo.trackingNumber || "غير محدد"}`,
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
      new Date(deliveryData.delivery_date_time || Date.now())
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
      shipmentInfo
    );

    console.log("📦 [AramexService] إنشاء طلب استلام:", {
      trackingNumber: shipmentInfo.trackingNumber,
      shipperAddress: shipperAddress.address,
      pickupTime: pickupData.pickupDateTime,
    });

    // إنشاء طلب الاستلام
    const pickupResult = await aramex.createPickup(pickupData);

    console.log(
      "✅ [AramexService] تم إنشاء طلب الاستلام بنجاح:",
      pickupResult
    );

    return {
      success: true,
      pickupId: pickupResult?.pickupId || pickupResult?.GUID || "غير محدد",
      pickupData: pickupData,
      message: "تم إنشاء طلب الاستلام بنجاح",
      scheduledDate: pickupData.pickupDateTime,
      ...pickupResult,
    };
  } catch (error) {
    console.error(
      "❌ [AramexService] فشل في إنشاء طلب الاستلام:",
      error.message
    );

    return {
      success: false,
      error: error.message,
      message: "فشل في إنشاء طلب الاستلام",
    };
  }
};
