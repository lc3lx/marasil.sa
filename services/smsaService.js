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
  const country = address.country || "SA";
  const city = address.city || " ";
  const line1 =
    [address.address, address.cite, address.clientAddress, address.addressDetails]
      .filter(Boolean)
      .join(" ")
      .trim() || " ";
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

  const addressLine1 = (a.line1.trim() || " ").slice(0, 200);
  const formattedAddress = {
    ContactName: (a.name || " ").slice(0, 150),
    ContactPhoneNumber: String(a.phone || "0000000000").slice(0, 20),
    Country: (a.country || "SA").slice(0, 2),
    City: (a.city || " ").slice(0, 50),
    AddressLine1: addressLine1.length > 0 ? addressLine1 : " ",
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

  const isCOD = order.paymentMethod === "COD" || order.payment_method === "COD";
  console.log("Is COD payment:", isCOD);

  const parcelLength = Number(dimension.length || 0);
  const parcelWidth = Number(dimension.width || 0);
  const parcelHeight = Number(
    dimension.height || dimension.high || dimension?.Height || 0
  );

  const shipmentData = {
    CODAmount: isCOD ? order.total.amount : 0,
    ConsigneeAddress: exports.formatAddress(order.customer, {
      isRecipient: true,
    }),

    ShipperAddress: exports.formatAddress(shipperAddress),
    ContentDescription: orderDescription,
    DeclaredValue: Math.max(parseFloat(order.total.amount || 0.1), 0.1),
    DutyPaid: false,
    OrderNumber: String(order._id),
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
