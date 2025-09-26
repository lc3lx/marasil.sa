// معالج webhook مخصص لـ OmniLama
const asyncHandler = require("express-async-handler");
const Shapment = require("../models/shipmentModel");
const Notification = require("../models/notificationModel");
const ApiEror = require("../utils/apiError");

// معالج webhook OmniLama
module.exports.omnilamaWebhookHandler = asyncHandler(async (req, res, next) => {
  try {
    console.log(
      "📦 استقبال webhook من OmniLama:",
      JSON.stringify(req.body, null, 2)
    );

    // التحقق من وجود البيانات
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({
        error: "Invalid webhook data format",
        message: "Expected JSON object",
      });
    }

    const { event, data } = req.body;

    // التحقق من المعاملات المطلوبة
    if (!event || !data) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "event and data are required",
      });
    }

    const result = await processOmniLamaWebhook(event, data);

    // إرجاع النتيجة
    res.status(200).json({
      success: true,
      message: "OmniLama webhook processed successfully",
      result: result,
    });
  } catch (error) {
    console.error("💥 خطأ في معالجة webhook OmniLama:", error);
    return next(
      new ApiEror(`خطأ في معالجة webhook OmniLama: ${error.message}`, 500)
    );
  }
});

// معالجة webhook OmniLama
async function processOmniLamaWebhook(event, data) {
  console.log(`🔍 معالجة event: ${event}`);

  switch (event) {
    case "order.create":
      return await handleOrderCreate(data);
    case "order.update":
      return await handleOrderUpdate(data);
    case "order.change_status":
      return await handleOrderStatusChange(data);
    case "bid.create":
      return await handleBidCreate(data);
    case "bid.update":
      return await handleBidUpdate(data);
    case "bid.change_status":
      return await handleBidStatusChange(data);
    default:
      throw new Error(`Unknown event type: ${event}`);
  }
}

// معالجة إنشاء طلب جديد
async function handleOrderCreate(data) {
  const {
    order_number,
    uid,
    vendor_number,
    vendor_uid,
    logistician_order_number,
    logistician_order_uid,
    description,
    created_at,
    status,
  } = data;

  console.log(`📋 إنشاء طلب جديد: ${order_number}`);

  // البحث عن الشحنة باستخدام order_number أو uid
  let shipment = await Shapment.findOne({
    $or: [
      { orderId: order_number },
      { trackingId: order_number },
      { _id: uid },
    ],
    shapmentCompany: "omniclama",
  });

  if (!shipment) {
    console.log(`⚠️  الشحنة غير موجودة: ${order_number}`);
    throw new Error(`Shipment not found: ${order_number}`);
  }

  console.log(`✅ تم العثور على الشحنة: ${shipment._id}`);

  // تحديث معلومات الشحنة
  shipment.omnilamaOrderData = {
    order_number,
    uid,
    vendor_number,
    vendor_uid,
    logistician_order_number,
    logistician_order_uid,
    description,
    created_at,
    status,
  };

  await shipment.save();
  console.log(`✅ تم تحديث الشحنة: ${shipment._id}`);

  // إرسال إشعار للعميل
  try {
    await Notification.create({
      customerId: shipment.customerId,
      type: "order",
      message: `تم إنشاء طلب جديد رقم ${order_number}`,
      data: {
        shipmentId: shipment._id,
        trackingId: shipment.trackingId,
        orderNumber: order_number,
        event: "order.create",
      },
    });
    console.log(`📱 تم إرسال إشعار للعميل: ${shipment.customerId}`);
  } catch (notificationError) {
    console.error("❌ خطأ في إرسال الإشعار:", notificationError.message);
  }

  return {
    event: "order.create",
    shipmentId: shipment._id,
    orderNumber: order_number,
    status: "Order created successfully",
  };
}

// معالجة تحديث الطلب
async function handleOrderUpdate(data) {
  const { order_number, uid, updated_at } = data;

  console.log(`📝 تحديث الطلب: ${order_number}`);

  // البحث عن الشحنة
  let shipment = await Shapment.findOne({
    $or: [
      { orderId: order_number },
      { trackingId: order_number },
      { _id: uid },
    ],
    shapmentCompany: "omniclama",
  });

  if (!shipment) {
    throw new Error(`Shipment not found: ${order_number}`);
  }

  // تحديث معلومات الشحنة
  if (shipment.omnilamaOrderData) {
    shipment.omnilamaOrderData = {
      ...shipment.omnilamaOrderData,
      ...data,
      updated_at,
    };
  } else {
    shipment.omnilamaOrderData = data;
  }

  await shipment.save();

  return {
    event: "order.update",
    shipmentId: shipment._id,
    orderNumber: order_number,
    status: "Order updated successfully",
  };
}

// معالجة تغيير حالة الطلب
async function handleOrderStatusChange(data) {
  const {
    order_number,
    uid,
    status,
    initiator_status_code,
    initiator_status_name,
    status_changed_at,
  } = data;

  console.log(
    `🔄 تغيير حالة الطلب: ${order_number} - ${initiator_status_name}`
  );

  // البحث عن الشحنة
  let shipment = await Shapment.findOne({
    $or: [
      { orderId: order_number },
      { trackingId: order_number },
      { _id: uid },
    ],
    shapmentCompany: "omniclama",
  });

  if (!shipment) {
    throw new Error(`Shipment not found: ${order_number}`);
  }

  // تحديد الحالة الجديدة بناءً على status
  let newStatus = shipment.shipmentstates;
  let statusMessage = initiator_status_name || "تم تحديث حالة الشحنة";

  // تحويل status إلى حالة النظام
  switch (status) {
    case 40: // Order successfully created
      newStatus = "READY_FOR_PICKUP";
      statusMessage = "الطلب جاهز للاستلام";
      break;
    case 50: // Order accepted
      newStatus = "IN_TRANSIT";
      statusMessage = "تم قبول الطلب";
      break;
    case 60: // Order in transit
      newStatus = "IN_TRANSIT";
      statusMessage = "الطلب في الطريق";
      break;
    case 70: // Order delivered
      newStatus = "Delivered";
      statusMessage = "تم التسليم";
      break;
    case 80: // Order cancelled
      newStatus = "Canceled";
      statusMessage = "تم إلغاء الطلب";
      break;
    case 90: // Order returned
      newStatus = "Returned";
      statusMessage = "تم إرجاع الطلب";
      break;
    default:
      newStatus = "IN_TRANSIT";
      statusMessage = initiator_status_name || "تم تحديث حالة الشحنة";
  }

  // تحديث حالة الشحنة إذا تغيرت
  if (newStatus !== shipment.shipmentstates) {
    console.log(`🔄 تحديث الحالة: ${shipment.shipmentstates} → ${newStatus}`);

    shipment.shipmentstates = newStatus;
    shipment.updatedAt = new Date();

    // تحديث معلومات الـ webhook
    if (shipment.omnilamaOrderData) {
      shipment.omnilamaOrderData = {
        ...shipment.omnilamaOrderData,
        status,
        initiator_status_code,
        initiator_status_name,
        status_changed_at,
      };
    } else {
      shipment.omnilamaOrderData = data;
    }

    await shipment.save();
    console.log(`✅ تم تحديث الشحنة: ${shipment._id}`);

    // إرسال إشعار للعميل
    try {
      await Notification.create({
        customerId: shipment.customerId,
        type: "order",
        message: `تم تحديث حالة الشحنة رقم ${shipment._id} إلى: ${statusMessage}`,
        data: {
          shipmentId: shipment._id,
          trackingId: shipment.trackingId,
          newStatus: newStatus,
          orderNumber: order_number,
          event: "order.change_status",
          statusCode: status,
          statusName: initiator_status_name,
        },
      });
      console.log(`📱 تم إرسال إشعار للعميل: ${shipment.customerId}`);
    } catch (notificationError) {
      console.error("❌ خطأ في إرسال الإشعار:", notificationError.message);
    }
  }

  return {
    event: "order.change_status",
    shipmentId: shipment._id,
    orderNumber: order_number,
    oldStatus: shipment.shipmentstates,
    newStatus: newStatus,
    statusMessage: statusMessage,
    statusCode: status,
    statusName: initiator_status_name,
  };
}

// معالجة إنشاء مكالمة سائق
async function handleBidCreate(data) {
  const { uid, call_number, company, pickup_date, contact_fio, contact_phone } =
    data;

  console.log(`📞 إنشاء مكالمة سائق: ${call_number}`);

  // البحث عن الشحنة
  let shipment = await Shapment.findOne({
    $or: [{ orderId: call_number }, { trackingId: call_number }, { _id: uid }],
    shapmentCompany: "omniclama",
  });

  if (!shipment) {
    throw new Error(`Shipment not found: ${call_number}`);
  }

  // حفظ معلومات المكالمة
  shipment.omnilamaCallData = {
    uid,
    call_number,
    company,
    pickup_date,
    contact_fio,
    contact_phone,
    created_at: new Date().toISOString(),
  };

  await shipment.save();

  return {
    event: "bid.create",
    shipmentId: shipment._id,
    callNumber: call_number,
    status: "Call created successfully",
  };
}

// معالجة تحديث مكالمة سائق
async function handleBidUpdate(data) {
  const { uid, call_number, updated_at } = data;

  console.log(`📝 تحديث مكالمة سائق: ${call_number}`);

  // البحث عن الشحنة
  let shipment = await Shapment.findOne({
    $or: [{ orderId: call_number }, { trackingId: call_number }, { _id: uid }],
    shapmentCompany: "omniclama",
  });

  if (!shipment) {
    throw new Error(`Shipment not found: ${call_number}`);
  }

  // تحديث معلومات المكالمة
  if (shipment.omnilamaCallData) {
    shipment.omnilamaCallData = {
      ...shipment.omnilamaCallData,
      ...data,
      updated_at,
    };
  } else {
    shipment.omnilamaCallData = data;
  }

  await shipment.save();

  return {
    event: "bid.update",
    shipmentId: shipment._id,
    callNumber: call_number,
    status: "Call updated successfully",
  };
}

// معالجة تغيير حالة مكالمة سائق
async function handleBidStatusChange(data) {
  const { uid, call_number, status, status_changed_at } = data;

  console.log(`🔄 تغيير حالة مكالمة سائق: ${call_number} - ${status}`);

  // البحث عن الشحنة
  let shipment = await Shapment.findOne({
    $or: [{ orderId: call_number }, { trackingId: call_number }, { _id: uid }],
    shapmentCompany: "omniclama",
  });

  if (!shipment) {
    throw new Error(`Shipment not found: ${call_number}`);
  }

  // تحديث معلومات المكالمة
  if (shipment.omnilamaCallData) {
    shipment.omnilamaCallData = {
      ...shipment.omnilamaCallData,
      ...data,
      status,
      status_changed_at,
    };
  } else {
    shipment.omnilamaCallData = data;
  }

  await shipment.save();

  return {
    event: "bid.change_status",
    shipmentId: shipment._id,
    callNumber: call_number,
    status: "Call status changed successfully",
    newStatus: status,
  };
}

// معالج webhook للاختبار
module.exports.testOmniLamaWebhook = asyncHandler(async (req, res, next) => {
  try {
    console.log("🧪 اختبار webhook OmniLama...");

    // بيانات اختبار
    const testData = {
      event: "order.change_status",
      data: {
        order_number: "TEST123456789",
        uid: "test-uid-123",
        status: 50,
        initiator_status_code: "111",
        initiator_status_name: "Order accepted",
        status_changed_at: new Date().toISOString(),
      },
    };

    // محاكاة معالجة البيانات
    const result = await processOmniLamaWebhook(testData.event, testData.data);

    res.status(200).json({
      success: true,
      message: "OmniLama webhook test completed",
      result: result,
    });
  } catch (error) {
    console.error("❌ خطأ في اختبار webhook OmniLama:", error);
    return next(
      new ApiEror(`خطأ في اختبار webhook OmniLama: ${error.message}`, 500)
    );
  }
});

// معالج webhook للتحقق من الصحة
module.exports.validateOmniLamaWebhook = asyncHandler(
  async (req, res, next) => {
    try {
      console.log("🔍 التحقق من صحة webhook OmniLama...");

      const { order_number, uid } = req.body;

      if (!order_number && !uid) {
        return res.status(400).json({
          error: "Missing required fields",
          message: "order_number or uid is required",
        });
      }

      // البحث عن الشحنة
      const shipment = await Shapment.findOne({
        $or: [
          { orderId: order_number },
          { trackingId: order_number },
          { _id: uid },
        ],
        shapmentCompany: "omniclama",
      });

      if (!shipment) {
        return res.status(404).json({
          error: "Shipment not found",
          message: `No shipment found with order_number=${order_number} or uid=${uid}`,
        });
      }

      res.status(200).json({
        success: true,
        message: "Shipment found",
        shipment: {
          id: shipment._id,
          trackingId: shipment.trackingId,
          status: shipment.shipmentstates,
          customerId: shipment.customerId,
        },
      });
    } catch (error) {
      console.error("❌ خطأ في التحقق من webhook OmniLama:", error);
      return next(
        new ApiEror(`خطأ في التحقق من webhook OmniLama: ${error.message}`, 500)
      );
    }
  }
);
