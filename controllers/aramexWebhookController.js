// معالج webhook مخصص لـ Aramex
const asyncHandler = require("express-async-handler");
const Shapment = require("../models/shipmentModel");
const Notification = require("../models/notificationModel");
const ApiEror = require("../utils/apiError");

// معالج webhook Aramex
module.exports.aramexWebhookHandler = asyncHandler(async (req, res, next) => {
  try {
    console.log(
      "📦 استقبال webhook من Aramex:",
      JSON.stringify(req.body, null, 2)
    );

    // التحقق من وجود البيانات
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({
        error: "Invalid webhook data format",
        message: "Expected JSON object",
      });
    }

    const {
      tracking_number,
      awb_number,
      status,
      status_description,
      status_code,
      location,
      timestamp,
      event_type,
      shipment_id,
    } = req.body;

    // التحقق من المعاملات المطلوبة
    if (!tracking_number && !awb_number && !shipment_id) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "tracking_number, awb_number, or shipment_id is required",
      });
    }

    const result = await processAramexWebhook({
      tracking_number,
      awb_number,
      status,
      status_description,
      status_code,
      location,
      timestamp,
      event_type,
      shipment_id,
    });

    // إرجاع النتيجة
    res.status(200).json({
      success: true,
      message: "Aramex webhook processed successfully",
      result: result,
    });
  } catch (error) {
    console.error("💥 خطأ في معالجة webhook Aramex:", error);
    return next(
      new ApiEror(`خطأ في معالجة webhook Aramex: ${error.message}`, 500)
    );
  }
});

// معالجة webhook Aramex
async function processAramexWebhook(webhookData) {
  const {
    tracking_number,
    awb_number,
    status,
    status_description,
    status_code,
    location,
    timestamp,
    event_type,
    shipment_id,
  } = webhookData;

  console.log(
    `🔍 البحث عن الشحنة: tracking_number=${tracking_number}, awb_number=${awb_number}, shipment_id=${shipment_id}`
  );

  // البحث عن الشحنة باستخدام tracking_number أو awb_number أو shipment_id
  let shipment = await Shapment.findOne({
    $or: [
      { trackingId: tracking_number },
      { trackingId: awb_number },
      { orderId: tracking_number },
      { orderId: awb_number },
      { _id: shipment_id },
    ],
    shapmentCompany: "aramex",
  });

  if (!shipment) {
    console.log(
      `⚠️  الشحنة غير موجودة: tracking_number=${tracking_number}, awb_number=${awb_number}, shipment_id=${shipment_id}`
    );
    throw new Error(
      `Shipment not found: tracking_number=${tracking_number}, awb_number=${awb_number}, shipment_id=${shipment_id}`
    );
  }

  console.log(`✅ تم العثور على الشحنة: ${shipment._id}`);

  // تحديد الحالة الجديدة بناءً على status أو status_code
  let newStatus = shipment.shipmentstates; // الحالة الحالية
  let statusMessage = status_description || status || "تم تحديث حالة الشحنة";

  // تحويل status إلى حالة النظام
  switch (status_code || status) {
    case "PICKED_UP":
    case "Picked Up":
      newStatus = "IN_TRANSIT";
      statusMessage = "تم استلام الشحنة";
      break;
    case "IN_TRANSIT":
    case "In Transit":
      newStatus = "IN_TRANSIT";
      statusMessage = "الشحنة في الطريق";
      break;
    case "OUT_FOR_DELIVERY":
    case "Out for Delivery":
      newStatus = "OUT_FOR_DELIVERY";
      statusMessage = "الشحنة جاهزة للتسليم";
      break;
    case "DELIVERED":
    case "Delivered":
      newStatus = "Delivered";
      statusMessage = "تم التسليم بنجاح";
      break;
    case "FAILED_DELIVERY":
    case "Failed Delivery":
      newStatus = "FAILED_DELIVERY";
      statusMessage = "فشل في التسليم";
      break;
    case "RETURNED":
    case "Returned":
      newStatus = "Returned";
      statusMessage = "تم إرجاع الشحنة";
      break;
    case "CANCELLED":
    case "Cancelled":
      newStatus = "Canceled";
      statusMessage = "تم إلغاء الشحنة";
      break;
    case "EXCEPTION":
    case "Exception":
      newStatus = "EXCEPTION";
      statusMessage = "استثناء في الشحنة";
      break;
    default:
      newStatus = "IN_TRANSIT";
      statusMessage = status_description || status || "تم تحديث حالة الشحنة";
  }

  // تحديث حالة الشحنة إذا تغيرت
  if (newStatus !== shipment.shipmentstates) {
    console.log(`🔄 تحديث الحالة: ${shipment.shipmentstates} → ${newStatus}`);

    shipment.shipmentstates = newStatus;
    shipment.updatedAt = new Date();

    // حفظ معلومات الـ webhook
    shipment.aramexWebhookData = {
      tracking_number,
      awb_number,
      status,
      status_description,
      status_code,
      location,
      timestamp,
      event_type,
      shipment_id,
    };

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
          webhookData: webhookData,
        },
      });
      console.log(`📱 تم إرسال إشعار للعميل: ${shipment.customerId}`);
    } catch (notificationError) {
      console.error("❌ خطأ في إرسال الإشعار:", notificationError.message);
    }
  }

  return {
    shipmentId: shipment._id,
    trackingId: shipment.trackingId,
    tracking_number,
    awb_number,
    oldStatus: shipment.shipmentstates,
    newStatus: newStatus,
    statusMessage: statusMessage,
    status_code,
    status,
    location,
    timestamp,
  };
}

// معالج webhook للاختبار
module.exports.testAramexWebhook = asyncHandler(async (req, res, next) => {
  try {
    console.log("🧪 اختبار webhook Aramex...");

    // بيانات اختبار
    const testData = {
      tracking_number: "TEST123456789",
      awb_number: "AWB123456789",
      status: "Out for Delivery",
      status_description: "Out for Delivery",
      status_code: "OUT_FOR_DELIVERY",
      location: "Riyadh",
      timestamp: new Date().toISOString(),
      event_type: "status_update",
      shipment_id: "TEST123456789",
    };

    // محاكاة معالجة البيانات
    const result = await processAramexWebhook(testData);

    res.status(200).json({
      success: true,
      message: "Aramex webhook test completed",
      result: result,
    });
  } catch (error) {
    console.error("❌ خطأ في اختبار webhook Aramex:", error);
    return next(
      new ApiEror(`خطأ في اختبار webhook Aramex: ${error.message}`, 500)
    );
  }
});

// معالج webhook للتحقق من الصحة
module.exports.validateAramexWebhook = asyncHandler(async (req, res, next) => {
  try {
    console.log("🔍 التحقق من صحة webhook Aramex...");

    const { tracking_number, awb_number, shipment_id } = req.body;

    if (!tracking_number && !awb_number && !shipment_id) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "tracking_number, awb_number, or shipment_id is required",
      });
    }

    // البحث عن الشحنة
    const shipment = await Shapment.findOne({
      $or: [
        { trackingId: tracking_number },
        { trackingId: awb_number },
        { orderId: tracking_number },
        { orderId: awb_number },
        { _id: shipment_id },
      ],
      shapmentCompany: "aramex",
    });

    if (!shipment) {
      return res.status(404).json({
        error: "Shipment not found",
        message: `No shipment found with tracking_number=${tracking_number}, awb_number=${awb_number}, or shipment_id=${shipment_id}`,
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
    console.error("❌ خطأ في التحقق من webhook Aramex:", error);
    return next(
      new ApiEror(`خطأ في التحقق من webhook Aramex: ${error.message}`, 500)
    );
  }
});
