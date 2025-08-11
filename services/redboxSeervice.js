/**
 * تحويل بيانات الشحنة إلى صيغة RedBox
 * @param {Object} order بيانات الطلب
 * @param {Object} shipperAddress عنوان المرسل
 * @param {Number} weight وزن الشحنة
 * @param {Number} parcels عدد الطرود
 * @param {String} orderDescription وصف الشحنة
 * @returns {Object} بيانات الشحنة بصيغة RedBox
 */
exports.shipmentdata = (
  order,
  shipperAddress,
  weight,
  parcels,
  orderDescription
) => {
  // التحقق من البيانات المطلوبة
  if (!order || !shipperAddress || !weight) {
    throw new Error("البيانات الأساسية مطلوبة: order, shipperAddress, weight");
  }
  console.log(order);
  const shipmentdata = {
    // البيانات المطلوبة
    reference: order._id,
    cod_amount:
      order.payment_method === "COD" ? parseFloat(order.total.amount) || 0 : 0,
    cod_currency: "SAR",
    customer_name: order.customer?.full_name,
    customer_phone: order.customer?.mobile,
    customer_address: order.customer?.city,

    // البيانات الاختيارية
    customer_address_coordinates: order.customer?.coordinates
      ? {
          lat: parseFloat(order.customer.coordinates.lat) || 0,
          lng: parseFloat(order.customer.coordinates.lng) || 0,
        }
      : undefined,
    customer_city: order.customer?.city,
    customer_country: order.customer?.country || "SA",
    customer_email: order.customer?.email || "",

    // أبعاد الشحنة
    dimension_height: order.dimension?.height || 0,
    dimension_length: order.dimension?.length || 0,
    dimension_width: order.dimension?.width || 0,
    dimension_unit: "CM",

    // معلومات الوزن والطرود
    weight_value: parseFloat(weight) || 1,
    weight_unit: "KG",
    package_count: parseInt(parcels) || 1,

    // معلومات المنصة
    from_platform: order.platform,

    // معلومات نقطة الاستلام
    pickup_location_id: shipperAddress.location_id || "",
    pickup_location_reference: shipperAddress.reference || "",
    point_id: shipperAddress.point_id || "",

    // معلومات المرسل
    sender_address: `${shipperAddress.city}, ${shipperAddress.country}`,
    sender_email: shipperAddress.email,
    sender_name: shipperAddress.full_name,
    sender_phone: shipperAddress.mobile,

    // معلومات الشحن
    shipping_price: parseFloat(order.shipping_cost) || 0,
    shipping_price_currency: "SAR",

    // معلومات إضافية
    original_tracking_number: order.tracking_number || "",

    // تفاصيل المنتجات
    items:
      order.items?.map((item) => ({
        name: item.name || "منتج",
        quantity: item.quantity || 1,
        price: parseFloat(item.price) || 0,
        sku: item.sku || "",
        description: item.description || "",
      })) || [],
  };
  console.log(shipmentdata);
  return shipmentdata;
};
