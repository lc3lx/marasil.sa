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
    Line1: address.addressLine1 || "غير محدد",
    Line2: address.addressLine2 || "",
    Line3: address.addressLine3 || "",
    City: address.city || "غير محدد",
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

    Reference1: partyData.reference || "Ref1",
    PartyAddress: {
      Line1: partyData.addressLine1 || "غير محدد",
      Line2: partyData.addressLine2 || "",
      Line3: partyData.addressLine3 || "",
      City: partyData.city || "غير محدد",
      PostCode: partyData.postCode || "",
      CountryCode: partyData.country ? partyData.country.toUpperCase() : "SA",
    },
    Contact: {
      PersonName: partyData.full_name || "غير محدد",
      CompanyName: partyData.company_name || "غير محدد",
      PhoneNumber1: partyData.phone || "0000000000",
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
  const paymentOptions = order.payment_method === "COD" ? "" : "";

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
        Reference1: order.reference_id || `ORD-${Date.now()}`,
        Reference2: order.order_number || "",
        Reference3: order.platform || "",
        Shipper: exports.formatParty(shipperAddress),
        Consignee: exports.formatParty(order.customer || {}),
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
          DescriptionOfGoods:
            orderDescription || order.description || "منتجات عامة",
          GoodsOriginCountry: "SA",
          NumberOfPieces: 6,
          ProductGroup: "DOM",
          ProductType: "CDS",
          PaymentType: "3",
          PaymentOptions: paymentOptions,
          ItemCount: order.items?.length || 1,
          CustomsValueAmount: {
            Value: parseFloat(order.total || 0),
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
    contactName: pickupData.contact_name || "غير محدد",
    companyName: pickupData.company_name || "غير محدد",
    phone: pickupData.phone || "0000000000",
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
    contactName: deliveryData.contact_name || "غير محدد",
    companyName: deliveryData.company_name || "غير محدد",
    phone: deliveryData.phone || "0000000000",
    mobile: deliveryData.mobile || "0000000000",
    email: deliveryData.email || "test@example.com",
  };
};
