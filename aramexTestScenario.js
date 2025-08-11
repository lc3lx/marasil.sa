const AramexService = require("./platforms/shipment/aramexPlatform");
const { Shapmentdata } = require("./services/AramexService");

// إنشاء مثيل من خدمة أرامكس
const aramexService = new AramexService();

// بيانات طلب وهمية بناءً على Order.js
const mockOrder = {
  orderId: "MARASIL-ORD-001",
  total: {
    amount: 250.75,
    currency: "SAR",
  },
  paymentMethod: "COD", // يمكن أن يكون "Prepaid" أو "COD"
  items: [
    {
      name: "هاتف ذكي",
      quantity: 1,
      price: 200,
      weight: 0.5, // الوزن بالكيلوغرام
      sku: "SMARTPHONE-001",
    },
    {
      name: "سماعات أذن",
      quantity: 2,
      price: 25,
      weight: 0.1, // الوزن بالكيلوغرام
      sku: "HEADPHONES-002",
    },
  ],
  customer: {
    full_name: "ليلى أحمد",
    first_name: "ليلى",
    last_name: "أحمد",
    mobile: "966551234567",
    email: "layla.ahmed@example.com",
    city: "جدة",
    country: "SA",
    addressLine1: "شارع الأمير سلطان، حي الزهراء",
    addressLine2: "مبنى رقم 45",
    postalCode: "23521",
    state: "مكة المكرمة",
  },
  number_of_boxes: 1,
  weight: 0.7, // الوزن الإجمالي للشحنة
  box_dimensions: {
    length: 30,
    width: 20,
    height: 15,
  },
  product_description: "إلكترونيات ومنتجات رقمية",
  product_value: 250.75,
  order_number: "MARASIL-ORD-001",
};

// بيانات المرسل الوهمية (يمكن أن تكون بيانات ثابتة للمتجر)
const mockShipper = {
  full_name: "مراسل للخدمات اللوجستية",
  company: "Marasil Logistics",
  phone: "966112345678",
  email: "info@marasil.sa",
  addressLine1: "طريق الملك فهد، حي العليا",
  city: "الرياض",
  country: "SA",
  postalCode: "12214",
  state: "الرياض",
};

// بيانات الشحنة الوهمية بناءً على shipmentModel.js
const mockShipmentModel = {
  ordervalue: mockOrder.total.amount,
  orderId: mockOrder.orderId,
  senderAddress: mockShipper,
  boxNum: mockOrder.number_of_boxes,
  weight: mockOrder.weight,
  dimension: mockOrder.box_dimensions,
  orderDescription: mockOrder.product_description,
  paymentMathod: mockOrder.paymentMethod,
  shapmentingType: "Quick", // يمكن أن يكون "Dry", "Cold", "Quick", "Box"
  shapmentCompany: "aramex",
  shapmentType: "straight", // يمكن أن يكون "straight" أو "reverse"
  // باقي الحقول يمكن تعبئتها لاحقاً أو تركها كقيم افتراضية
};

async function runAramexTests() {
  console.log("\n=== بدء اختبارات أرامكس ===");

  // 1. إنشاء شحنة
  console.log("\n--- اختبار إنشاء شحنة ---");
  try {
    const shipmentData = Shapmentdata(
      mockOrder,
      mockShipper,
      mockShipmentModel.weight,
      mockShipmentModel.boxNum,
      mockShipmentModel.orderDescription,
      "0", // retailID - قيمة افتراضية
      aramexService.getServiceCode(mockShipmentModel.shapmentingType) // serviceCode
    );

    console.log(
      "بيانات الشحنة المرسلة:\n",
      JSON.stringify(shipmentData, null, 2)
    );

    const createShipmentResult = await aramexService.createShipment(
      shipmentData
    );
    console.log(
      "نتيجة إنشاء الشحنة:\n",
      JSON.stringify(createShipmentResult, null, 2)
    );

    const trackingNumber = createShipmentResult.trackingNumber;
    console.log(`تم إنشاء الشحنة بنجاح. رقم التتبع: ${trackingNumber}`);

    // 2. تتبع الشحنة
    console.log("\n--- اختبار تتبع الشحنة ---");
    const trackShipmentResult = await aramexService.trackShipment(
      trackingNumber
    );
    console.log(
      "نتيجة تتبع الشحنة:\n",
      JSON.stringify(trackShipmentResult, null, 2)
    );

    // 3. إنشاء شحنة مرتجعة
    console.log("\n--- اختبار إنشاء شحنة مرتجعة ---");
    const returnShipmentData = {
      orderId: `RTN-${mockOrder.orderId}`,
      pickupAddress: mockOrder.customer, // العميل هو من يقوم بالإرجاع
      returnToAddress: mockShipper, // المرسل هو من يستقبل الإرجاع
      weight: mockShipmentModel.weight,
      boxNum: mockShipmentModel.boxNum,
      orderValue: mockOrder.total.amount,
      description: `إرجاع لطلب رقم ${mockOrder.orderId}`,
    };

    const createReturnShipmentResult = await aramexService.createReturnShipment(
      returnShipmentData
    );
    console.log(
      "نتيجة إنشاء الشحنة المرتجعة:\n",
      JSON.stringify(createReturnShipmentResult, null, 2)
    );
    console.log(
      `تم إنشاء الشحنة المرتجعة بنجاح. رقم التتبع: ${createReturnShipmentResult.trackingNumber}`
    );
  } catch (error) {
    console.error("\n!!! حدث خطأ أثناء الاختبارات:\n", error.message);
    if (error.response) {
      console.error(
        "تفاصيل الاستجابة:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
  }
  console.log("\n=== انتهاء اختبارات أرامكس ===");
}

runAramexTests();
