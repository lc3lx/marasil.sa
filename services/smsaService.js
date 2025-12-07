/**
 * تحويل عنوان العميل إلى صيغة SMSA
 * @param {Object} address عنوان العميل من قاعدة البيانات
 * @returns {Object} عنوان بصيغة SMSA
 */
exports.formatAddress = (address) => {
  return {
    ContactName: address.full_name, // بين 5 و150 حرف
    ContactPhoneNumber: address.mobile, // رقم الهاتف
    Country: address.country, // رمز الدولة
    City: address.city,
    AddressLine1: `${address.address}        `,
    // District: address.address, // اسم المدينة
  };
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
    ConsigneeAddress: exports.formatAddress(order.customer),

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
 * @param {Object} originalShipment بيانات الشحنة الأصلية الكاملة من قاعدة البيانات
 * @returns {Object} بيانات الشحنة بصيغة SMSA للإرجاع
 */
exports.ShapmentdataC2b = (originalShipment, smsaRetailId) => {
  // ملاحظة: نفترض أن `originalShipment` هو مستند Mongoose كامل

  // المستلم الأصلي (العميل) هو المرسل الجديد
  const newShipperAddress = originalShipment.receiverAddress;

  // المرسل الأصلي (المتجر) هو المستلم الجديد
  const newConsigneeAddress = originalShipment.senderAddress;

  // التحقق من وجود العناوين قبل استخدامها لمنع الأخطاء
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
    PickupAddress: exports.formatAddress(newConsigneeAddress), // عنوان المستلم (المتجر)
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
