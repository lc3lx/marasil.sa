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
    reference: String(order._id || ""),
    cod_amount:
      order.payment_method === "COD" || order.paymentMethod === "COD"
        ? parseFloat(order.total?.amount || 0)
        : 0,
    cod_currency: "SAR",
    customer_name: order.customer?.full_name || "",
    customer_phone: order.customer?.mobile || "",
    customer_address: order.customer?.address || "",
    customer_national_address: {
      short_code: "",
      structured: {
        building_number: "",
        street_name: "",
        neighborhood: "",
        city: order.customer?.city || "",
        postal_code: "",
        additional_number: "",
      },
    },
    customer_address_coordinates: order.customer?.coordinates
      ? {
          lat: parseFloat(order.customer.coordinates.lat) || 0,
          lng: parseFloat(order.customer.coordinates.lng) || 0,
        }
      : {
          lat: 0,
          lng: 0,
        },
    customer_city: order.customer?.city || "",
    customer_country: order.customer?.country || "SA",
    customer_email: order.customer?.email || "",
    dimension_height: parseFloat(order.dimension?.height || order.dimension?.high) || 0,
    dimension_length: parseFloat(order.dimension?.length) || 0,
    dimension_unit: "CM",
    dimension_width: parseFloat(order.dimension?.width) || 0,
    from_platform: order.platform || "",
    items:
      order.items?.map((item) => ({
        currency: "SAR",
        description: orderDescription || "",
        name: item.name || "منتج",
        sku: item.sku || "",
        quantity: parseInt(item.quantity) || 1,
        unit_price: parseFloat(item.price) || 0,
      })) || [],
    original_tracking_number: String(order._id || ""),
    number_of_pieces: parseInt(parcels) || 1,
    pickup_location_id: shipperAddress.location_id || "",
    pickup_location_reference: shipperAddress.reference || "",
    point_id: shipperAddress.point_id || "",
    sender_name: shipperAddress.full_name || "",
    sender_phone: shipperAddress.mobile || "",
    sender_email: shipperAddress.email || "",
    sender_address: shipperAddress.address || "",
    sender_city: shipperAddress.city || "",
    sender_city_code: "",
    sender_country: shipperAddress.country || "SA",
    shipping_price: parseFloat(order.shipping_cost) || 0,
    shipping_price_currency: "SAR",
    weight_unit: "KG",
    weight_value: parseFloat(weight) || 1,
  };
  console.log(shipmentdata);
  return shipmentdata;
};
