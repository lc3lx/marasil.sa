const omnidPlatform = require("../platforms/shipment/omnidPlatform");

/**
 * تحويل بيانات الاتصال إلى صيغة OmniDelivery
 * @param {Object} contact بيانات الاتصال
 * @returns {Object} بيانات الاتصال بصيغة OmniDelivery
 */
exports.formatContact = (contact) => {
  return {
    company_name: contact.company_name || "غير محدد",
    company_reg_number: contact.company_reg_number || "",
    email: contact.email || "test@example.com",
    name: contact.full_name || "غير محدد",
    phone: contact.phone || "0000000000",
  };
};

/**
 * الحصول على نقطة استلام وتسليم مناسبة
 * @param {Object} location بيانات الموقع
 * @param {Boolean} isPickup هل هي نقطة استلام
 * @returns {Promise<Object>} بيانات نقطة الاستلام والتسليم
 */
exports.getSuitablePoint = async (location, isPickup = true) => {
  try {
    // التحقق من وجود البيانات الأساسية
    if (!location || !location.country || !location.city) {
      throw new Error("بيانات الموقع غير مكتملة");
    }

    const params = {
      country_name: location.country,
      city_name: location.city,
      is_pickup: isPickup,
      is_delivery: !isPickup,
      status: 30, // LAUNCHED INTO OPERATION
      page: 1,
      page_size: 10, // زيادة عدد النتائج للبحث عن نقطة مناسبة
    };

    console.log("Searching for points with params:", params);

    const response = await omnidPlatform.listPickupDeliveryPoints(params);

    if (!response.success) {
      throw new Error(response.message || "فشل في البحث عن النقاط");
    }

    if (!response.data.results || response.data.results.length === 0) {
      // إذا لم يتم العثور على نقاط، نعيد بيانات الموقع الأصلي
      console.log("No points found, using original location data");
      return {
        uid: 1,
        location: {
          full_address: location.address || "",
          city: { name: location.city || "" },
          country: { name: location.country || "SA" },
          latitude: location.coordinates?.lat || 0,
          longitude: location.coordinates?.lng || 0,
          postal_index: location.post_code || "",
        },
      };
    }

    // اختيار النقطة الأولى المناسبة
    const point = response.data.results[0];
    console.log("Found suitable point:", point.uid);
    return point;
  } catch (error) {
    console.error("خطأ في الحصول على نقطة الاستلام/التسليم:", error);
    // في حالة حدوث خطأ، نعيد بيانات الموقع الأصلي
    return {
      uid: 1,
      location: {
        full_address: location?.address || "",
        city: { name: location?.city || "" },
        country: { name: location?.country || "SA" },
        latitude: location?.coordinates?.lat || 0,
        longitude: location?.coordinates?.lng || 0,
        postal_index: location?.post_code || "",
      },
    };
  }
};

/**
 * تحويل بيانات الموقع إلى صيغة OmniDelivery
 * @param {Object} location بيانات الموقع
 * @returns {Object} بيانات الموقع بصيغة OmniDelivery
 */
exports.formatLocation = (location) => {
  return {
    address: location.address || "غير محدد",
    city: location.city || "غير محدد",
    country: location.country || "SA",
    coordinates: location.coordinates || { lat: 0, lng: 0 },
    post_code: location.post_code || "",
  };
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
    throw new Error("عدد الطرود يجب أن يكون رقماً موجباً");
  }

  // إنشاء رقم فريد للشحنة
  const shipmentNumber = `ORD-${Date.now()}`;

  try {
    const shipmentData = {
      cost: {
        cod_value:
          order.paymentMethod === "COD" ? parseFloat(order.total || 0) : 0,
        declared_cost: parseFloat(order.total || 0),
        services_payment: [],
      },

      description: orderDescription || order.description || "منتجات عامة",

      direction_type: 0, // إضافة نوع الاتجاه

      height: dimension.height || 10,
      length: dimension.length || 10,
      location_from: {
        city: "Dammam",
        street: "عبدالرحمن بن عوف",
        address: " شارع عبدالرحمن بن عوف، الحي طيبه ،, الدمام, السعودية",
        country_code: "SA",
      },

      location_to: {
        city: "Dammam",
        street: "عبدالرحمن بن عوف",
        address: " شارع عبدالرحمن بن عوف، الحي طيبه ،, الدمام, السعودية",
        country_code: "SA",
      },

      number: shipmentNumber,
      places: [
        {
          items: [
            {
              articul: order.items?.[0]?.sku || "001230124",
              cost: parseFloat(order.total || 0),
              cost_vat: 20,
              height: parseInt(dimension.high || 0),
              length: parseInt(dimension.length || 230),
              marking: `cnivun-${Date.now()}`,
              name: order.items?.[0]?.name || "منتج عام",
              provider_inn: order.provider?.inn || "74162944192",
              provider_name: order.provider?.name || "TechnoPolis",
              quantity: parseInt(order.items?.[0]?.quantity || 1),
              weight: Math.ceil(weight),
              width: parseInt(dimension.width || 130),
            },
          ],
          barcode: `[BCD]${shipmentNumber}_01`,
          height: parseInt(dimension.high || 0),
          length: parseInt(dimension.length || 230),
          number: `${shipmentNumber}_01`,
          weight: Math.ceil(weight),
          width: parseInt(dimension.width || 130),
        },
      ],
      receiver: {
        company_name: order.customer.full_name || "",
        company_reg_number: order.customer.reg_number || "",
        email: order.customer.email || "",
        name: order.customer.full_name || "",
        phone: order.customer.mobile || "",
      },
      weight: Math.ceil(weight),
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
