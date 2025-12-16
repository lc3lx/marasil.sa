const omnidPlatform = require("../platforms/shipment/omnidPlatform");

/**
 * توليد رقم عشوائي مكون من 8 أرقام
 * @returns {String} رقم عشوائي مكون من 8 أرقام
 */
const generateRandom8DigitNumber = () => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};

/**
 * تحويل بيانات الشحنة إلى صيغة OmniDelivery
 * @param {Object} order بيانات الطلب
 * @param {Object} shipperAddress عنوان المرسل
 * @param {Number} weight الوزن
 * @param {Number} Parcels عدد الطرود
 * @param {String} orderDescription وصف الطلب
 * @param {Object} dimension الأبعاد
 * @returns {Promise<Object>} بيانات الشحنة بصيغة OmniDelivery
 */
exports.shipmentData = async (
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

  // التحقق من بيانات المستلم
  if (!order.customer || !order.customer.full_name || !order.customer.mobile) {
    throw new Error("بيانات المستلم غير مكتملة: يجب تحديد الاسم ورقم الهاتف");
  }

  // التأكد من أن الوزن وعدد الطرود أرقام صحيح
  if (isNaN(weight) || weight <= 0) {
    throw new Error("الوزن يجب أن يكون رقماً موجباً");
  }

  if (isNaN(Parcels) || Parcels <= 0) {
    throw new Error("عدد الطرودc  يجب أن يكون رقماً موجباً");
  }

  // إنشاء رقم فريد للشحنة
  const shipmentNumber = order._id;
  let cod = 0;
  if (order.payment_method === "COD") {
    cod = Number(order?.total?.amount || 0);
  } else {
    cod = 0;
  }

  try {
    const shipmentData = {
      cost: {
        cod_value: parseFloat(cod),
        declared_cost: parseFloat(cod),
        services_payment: [],
      },
      initial_status: 11,

      description: order.description || "منتجات عامة",

      direction_type: 0, // إضافة نوع الاتجاه

      height: dimension.height || 10,
      length: dimension.length || 10,
      location_from: {
        city: shipperAddress.city,
        region: shipperAddress.city,
        address: shipperAddress.address,
        country_code: "SA",
      },

      location_to: {
        city: order.customer.city,
        address: order.customer.address,
        region: order.customer.city,
        country_code: "SA",
      },

      number: generateRandom8DigitNumber(),
      places: [
        {
          items: [
            {
              articul: order.items?.[0]?.sku || "001230124",
              cost: parseFloat(order.total.amount || 0),
              cost_vat: 20,
              height: parseInt(dimension.high || 0),
              length: parseInt(dimension.length || 230),
              marking: `cnivun-${Date.now()}`,
              name: orderDescription,
              provider_inn: order.provider?.inn || "74162944192",
              provider_name: order.provider?.name || "TechnoPolis",
              quantity: parseInt(order.items?.[0]?.quantity || 1),
              weight: Math.ceil(weight),
              width: parseInt(dimension.width || 130),
            },
          ],
          barcode: generateRandom8DigitNumber(),
          height: parseInt(dimension.high || 0),
          length: parseInt(dimension.length || 230),
          number: generateRandom8DigitNumber(),
          weight: weight,
          width: parseInt(dimension.width || 130),
        },
      ],
      sender: {
        name: shipperAddress.full_name || "",
        phone: `+966${shipperAddress.mobile}`,
      },

      receiver: {
        company_name: order.customer.full_name,
        company_reg_number: order.customer.mobile,
        email: order.customer.email,
        name: order.customer.full_name,
        phone: `+966${order.customer.mobile}`,
      },
      weight: weight,
      width: dimension.width || 10,
    };

    console.log(
      "Shipment data prepared:",
      JSON.stringify(shipmentData, null, 2)
    );
    return shipmentData;
  } catch (error) {
    console.error("Error in shipmentData:", error);
    throw new Error(`فشل في إنشاء بيانات الشحنة: ${error.message}`);
  }
};

/**
 * تحويل بيانات التتبع إلى صيغة OmniDelivery
 * @param {Object} trackingData بيانات التتبع
 * @returns {Object} بيانات التتبع بصيغة OmniDelivery
 */
exports.trackingData = (trackingData) => {
  return {
    order_uid: trackingData.order_uid || "",
    logistician_order_number: trackingData.logistician_order_number || "",
    status_code: trackingData.status_code || 0,
    status_name: trackingData.status_name || "",
    updated_at: trackingData.updated_at || new Date().toISOString(),
  };
};
