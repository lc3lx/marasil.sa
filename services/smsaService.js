/**
 * تحويل اسم/رمز الدولة إلى رمز ISO Alpha-2 (سمسا وأرامكس تقبل رموز فقط مثل SA)
 */
function toCountryCode(value) {
  const v = (value || "").toString().trim();
  if (!v) return "SA";
  const upper = v.toUpperCase();
  if (upper.length === 2 && /^[A-Z]{2}$/.test(upper)) return upper;
  const normalized = v.replace(/\s+/g, " ").toLowerCase();
  if (
    normalized.includes("سعود") ||
    normalized.includes("السعودية") ||
    normalized.includes("saudi") ||
    normalized === "sa"
  )
    return "SA";
  if (normalized.includes("البحرين") || normalized.includes("bahrain")) return "BH";
  if (normalized.includes("مصر") || normalized.includes("egypt")) return "EG";
  if (normalized.includes("الكويت") || normalized.includes("kuwait")) return "KW";
  if (normalized.includes("امارات") || normalized.includes("uae") || normalized.includes("emirates")) return "AE";
  if (normalized.includes("الاردن") || normalized.includes("jordan")) return "JO";
  if (normalized.includes("عمان") && !normalized.includes("عمان ")) return "OM";
  if (normalized.includes("قطر") || normalized.includes("qatar")) return "QA";
  return "SA";
}

/**
 * توحيد عنوان من أي صيغة (ClientAddress أو مرسل) إلى حقول موحدة
 * ClientAddress: clientName, clientPhone, clientAddress, addressDetails, nationalAddress, country, city
 * مرسل: full_name, mobile, address, cite, country, city, nationalAddress
 */
function normalizeAddressForSmsa(address = {}) {
  const name =
    address.full_name ||
    address.clientName ||
    address.name ||
    " ";
  const phone =
    address.mobile ||
    address.clientPhone ||
    address.phone ||
    "0000000000";
  const country = toCountryCode(address.country);
  const city = address.city || " ";
  const line1 =
    [address.address, address.cite, address.clientAddress, address.addressDetails]
      .filter(Boolean)
      .join(" ")
      .trim() || (address.city || "العنوان غير محدد");
  const nationalAddress = address.nationalAddress || "";
  return { name, phone, country, city, line1, nationalAddress };
}

/**
 * تحويل عنوان العميل إلى صيغة SMSA
 * يدعم صيغة ClientAddress (clientName, clientPhone, clientAddress) وصيغة المرسل (full_name, mobile, address)
 * @param {Object} address عنوان العميل من قاعدة البيانات
 * @param {Object} [options]
 * @param {boolean} [options.isRecipient=false] إذا true يُضاف العنوان الوطني (ShortCode) للمستلم فقط - ويجب أن يكون 8 أحرف بالضبط
 * @returns {Object} عنوان بصيغة SMSA
 */
exports.formatAddress = (address = {}, options = {}) => {
  const isRecipient = Boolean(options.isRecipient);
  const a = normalizeAddressForSmsa(address);

  const addressLine1 = (String(a.line1 || "").trim() || a.city || "غير محدد").slice(0, 200);
  const formattedAddress = {
    ContactName: (a.name || " ").slice(0, 150),
    ContactPhoneNumber: String(a.phone || "0000000000").slice(0, 20),
    Country: a.country,
    City: (a.city || " ").slice(0, 50),
    AddressLine1: addressLine1,
  };

  // ShortCode مطلوب للمستلم ويجب أن يكون بالضبط 8 أحرف
  if (isRecipient) {
    const raw = (a.nationalAddress || "").replace(/\s/g, "").slice(0, 8);
    formattedAddress.ShortCode =
      raw.length === 8 ? raw : raw.padEnd(8, "0").slice(0, 8);
  }

  return formattedAddress;
};

exports.Shapmentdata = (
  order,
  shipperAddress,
  Weight,
  Parcels,
  orderDescription,
  serviceCode,
  retailID,
  senderOfficeCode,
  recipientOfficeCode,
  dimension = {}
) => {
  console.log("Order total amount:", order.total.amount);
  console.log("Payment method (paymentMethod):", order.paymentMethod);
  console.log("Payment method (payment_method):", order.payment_method);

  // دفع عند الاستلام (COD): قيمة الطلب كما هي. دفع مسبق (Prepaid): قيمة الطلب صفر.
  const payment = (order.paymentMethod || order.payment_method || "").toString().toUpperCase();
  const isCOD = payment === "COD";
  const orderValueForCOD = isCOD ? Number(order.total?.amount ?? 0) : 0;
  console.log("Is COD payment:", isCOD, "→ CODAmount:", orderValueForCOD);

  const parcelLength = Number(dimension.length || 0);
  const parcelWidth = Number(dimension.width || 0);
  const parcelHeight = Number(
    dimension.height || dimension.high || dimension?.Height || 0
  );

  // SMSA: رقم الطلب بحد أقصى 50 حرف
  const rawOrderNumber = order.order_number != null ? String(order.order_number) : String(order._id || "");
  const OrderNumber = rawOrderNumber.length > 50 ? rawOrderNumber.slice(0, 50) : rawOrderNumber;

  const shipmentData = {
    CODAmount: orderValueForCOD,
    ConsigneeAddress: exports.formatAddress(order.customer, {
      isRecipient: true,
    }),

    ShipperAddress: exports.formatAddress(shipperAddress),
    ContentDescription: (orderDescription || "").toString().trim() || "شحنة",
    DeclaredValue: Math.max(parseFloat(order.total?.amount || 0.1), 0.1),
    DutyPaid: false,
    OrderNumber,
    Parcels: Parcels,
    ServiceCode: serviceCode, // يتم تمريره من المتحكم
    ShipDate: new Date().toISOString(),
    ShipmentCurrency: "SAR",
    SMSARetailID: retailID, // يتم تحديده ديناميكياً
    VatPaid: true,
    WaybillType: "PDF",
    Weight: Weight,
    WeightUnit: "KG",
    Dimensions:
      parcelLength && parcelWidth && parcelHeight
        ? {
            Length: parcelLength,
            Width: parcelWidth,
            Height: parcelHeight,
            Unit: "CM",
          }
        : undefined,
  };

  // إضافة كود المكتب للمرسل والمستلم إذا كان متوفراً (لنوع الشحن offices)
  if (senderOfficeCode) {
    shipmentData.ShipperOfficeCode = senderOfficeCode;
  }
  if (recipientOfficeCode) {
    shipmentData.ConsigneeOfficeCode = recipientOfficeCode;
  }

  console.log("Formatted ConsigneeAddress:", shipmentData.ConsigneeAddress),
    console.log("Final CODAmount:", shipmentData.CODAmount);
  return shipmentData;
};

/**
 * تحويل بيانات شحنة الإرجاع إلى صيغة SMSA (من العميل إلى المتجر)
 * المرسل في الإرجاع = المستلم الأصلي (العميل)، المستلم في الإرجاع = المرسل الأصلي (المتجر)
 * @param {Object} originalShipment بيانات الشحنة الأصلية الكاملة من قاعدة البيانات
 * @returns {Object} بيانات الشحنة بصيغة SMSA للإرجاع
 */
exports.ShapmentdataC2b = (originalShipment, smsaRetailId) => {
  // المستلم الأصلي (العميل) = عنوان الإرجاع منه (ReturnToAddress)
  const newShipperAddress =
    originalShipment.receiverAddress &&
    (typeof originalShipment.receiverAddress.toObject === "function"
      ? originalShipment.receiverAddress.toObject()
      : originalShipment.receiverAddress);
  // المرسل الأصلي (المتجر) = عنوان الاستلام (PickupAddress)
  const newConsigneeAddress =
    originalShipment.senderAddress &&
    (typeof originalShipment.senderAddress.toObject === "function"
      ? originalShipment.senderAddress.toObject()
      : originalShipment.senderAddress);

  if (!newShipperAddress || !newConsigneeAddress) {
    throw new Error("عناوين المرسل والمستلم الأصليين مطلوبة في بيانات الشحنة.");
  }

  // تحديد نوع الخدمة بناءً على RetailID القادم من الواجهة الأمامية
  const isPUD = smsaRetailId && smsaRetailId !== "0";

  // تحديد ServiceCode و RetailID بناءً على نوع الخدمة
  const serviceCode = isPUD ? "EDCR" : "EDCR"; // RETP for PUD return, RETC for B2C return
  const retailID = isPUD ? smsaRetailId : "0";

  const shipmentData = {
    CODAmount: 0.0, // شحنات الإرجاع لا تحتوي على مبلغ تحصيل
    PickupAddress: exports.formatAddress(newConsigneeAddress, {
      isRecipient: true,
    }), // عنوان المستلم (المتجر)
    ReturnToAddress: exports.formatAddress(newShipperAddress), // عنوان المرسل (العميل)
    ContentDescription: originalShipment.orderDescription || "منتج مرتجع",
    DeclaredValue: originalShipment.ordervalue || 0.1,
    DutyPaid: false,
    OrderNumber: `RET-${originalShipment.trackingId}`, // رقم طلب جديد للإشارة للإرجاع
    Parcels: originalShipment.boxNum || 1,
    ServiceCode: serviceCode, // يتم تحديده ديناميكياً
    ShipDate: new Date().toISOString(),
    ShipmentCurrency: "SAR",
    SMSARetailID: retailID, // يتم تحديده ديناميكياً
    VatPaid: true,
    WaybillType: "PDF",
    Weight: originalShipment.weight || 1,
    WeightUnit: "KG",
  };
  return shipmentData;
};
