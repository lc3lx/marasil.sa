/**
 * تحويل التاريخ إلى صيغة Aramex المطلوبة (/Date(timestamp)/)
 * @param {Date} date التاريخ
 * @returns {String} التاريخ بصيغة Aramex
 */
exports.formatAramexDate = (date) => {
  const timestamp = date.getTime();
  return `/Date(${timestamp})/`;
};

/**
 * تحويل عنوان العميل إلى صيغة Aramex
 * @param {Object} address عنوان العميل من قاعدة البيانات
 * @returns {Object} عنوان بصيغة Aramex
 */
exports.formatAddress = (address) => {
  return {
    Line1:
      address.line1 ||
      `${address.city || "الرياض"}, ${address.country || "SA"}`,
    Line2: address.addressLine2 || "",
    Line3: address.addressLine3 || "",
    City: address.city || "الرياض",
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
    PartyName: partyData.full_name || partyData.company_name || "Marasil", // قيمة افتراضية
    AccountEntity: "RUH", // ثابت RUH للشحنات المحلية
    AccountNumber: process.env.ARAMEX_ACCOUNT_NUMBER,
    Reference1: "Ref1",
    PartyAddress: exports.formatAddress(partyData), // استخدام formatAddress
    Contact: {
      PersonName: partyData.full_name || partyData.company_name || "Marasil", // قيمة افتراضية
      CompanyName: partyData.company_name || "Marasil",
      PhoneNumber1: partyData.mobile || "0000000000",
      PhoneNumber2: partyData.phone2 || "",
      Type: partyData.type || "Business",
      CellPhone: partyData.phone || "0000000000",
      EmailAddress: partyData.email || "info@marasil.sa", // بريد إلكتروني صالح
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

  // تحديد PaymentType و PaymentOptions بناءً على طريقة الدفع
  const paymentType = order.payment_method === "COD" ? "C" : "P";
  const paymentOptions = ""; // فارغ للشحنات المحلية

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
      AccountEntity: process.env.ARAMEX_ACCOUNT_ENTITY || "RUH", // ثابت RUH للشحنات المحلية
      AccountCountryCode: process.env.ARAMEX_ACCOUNT_COUNTRY_CODE || "SA",
      Source: 24,
    },
    Shipments: [
      {
        Reference1: order._id || `ORD-${Date.now()}`,
        Reference2: order.order_number || "",
        Reference3: order.platform || "manual",
        Shipper: exports.formatParty(shipperAddress),
        Consignee: exports.formatParty(order.customer),
        ShippingDateTime: exports.formatAramexDate(now),
        DueDate: exports.formatAramexDate(dueDate),
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
          NumberOfPieces: Parcels,
          ProductGroup: "DOM", // DOM للشحنات المحلية
          ProductType: "CDS", // CDS للدفع عند الاستلام المحلي
          PaymentType: paymentType, // P أو C بناءً على طريقة الدفع
          PaymentOptions: paymentOptions, // فارغ للشحنات المحلية
          Services: "", // حقل مطلوب
          ItemCount: order.items?.length || 1,
          CustomsValueAmount: {
            Value: parseFloat(order.total?.amount),
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
    contactName: pickupData.full_name || pickupData.company_name || "Marasil",
    companyName: pickupData.company_name || "Marasil",
    phone: pickupData.mobile || "0000000000",
    mobile: pickupData.mobile || "0000000000",
    email: pickupData.email || "info@marasil.sa",
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
    contactName:
      deliveryData.full_name || deliveryData.company_name || "Marasil",
    companyName: deliveryData.company_name || "Marasil",
    phone: deliveryData.mobile || "0000000000",
    mobile: deliveryData.mobile || "0000000000",
    email: deliveryData.email || "info@marasil.sa",
  };
};
