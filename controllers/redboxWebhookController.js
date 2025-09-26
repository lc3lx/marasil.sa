// معالج webhook مخصص لـ RedBox
const asyncHandler = require("express-async-handler");
const Shapment = require("../models/shipmentModel");
const Notification = require("../models/notificationModel");
const ApiEror = require("../utils/apiError");

// معالج webhook RedBox
module.exports.redboxWebhookHandler = asyncHandler(async (req, res, next) => {
  try {
    console.log(
      "📦 استقبال webhook من RedBox:",
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
      shipment_id,
      tracking_number,
      status_name,
      status_label,
      status_code,
      date,
      customer_message,
    } = req.body;

    // التحقق من المعاملات المطلوبة
    if (!shipment_id && !tracking_number) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "shipment_id or tracking_number is required",
      });
    }

    const result = await processRedBoxShipment({
      shipment_id,
      tracking_number,
      status_name,
      status_label,
      status_code,
      date,
      customer_message,
    });

    // إرجاع النتيجة
    res.status(200).json({
      success: true,
      message: "RedBox webhook processed successfully",
      result: result,
    });
  } catch (error) {
    console.error("💥 خطأ في معالجة webhook RedBox:", error);
    return next(
      new ApiEror(`خطأ في معالجة webhook RedBox: ${error.message}`, 500)
    );
  }
});

// معالجة شحنة RedBox واحدة
async function processRedBoxShipment(webhookData) {
  const {
    shipment_id,
    tracking_number,
    status_name,
    status_label,
    status_code,
    date,
    customer_message,
  } = webhookData;

  console.log(
    `🔍 البحث عن الشحنة: shipment_id=${shipment_id}, tracking_number=${tracking_number}`
  );

  // البحث عن الشحنة باستخدام shipment_id أو tracking_number
  let shipment = await Shapment.findOne({
    $or: [
      { _id: shipment_id },
      { trackingId: tracking_number },
      { orderId: tracking_number },
    ],
    shapmentCompany: "redbox",
  });

  if (!shipment) {
    console.log(
      `⚠️  الشحنة غير موجودة: shipment_id=${shipment_id}, tracking_number=${tracking_number}`
    );
    throw new Error(
      `Shipment not found: shipment_id=${shipment_id}, tracking_number=${tracking_number}`
    );
  }

  console.log(`✅ تم العثور على الشحنة: ${shipment._id}`);

  // تحديد الحالة الجديدة بناءً على status_code
  let newStatus = shipment.shipmentstates; // الحالة الحالية
  let statusMessage = status_label || status_name || "تم تحديث حالة الشحنة";

  // تحويل status_code إلى حالة النظام
  switch (status_code) {
    case "delivered":
      newStatus = "Delivered";
      statusMessage = "تم التسليم بنجاح";
      break;
    case "out_for_delivery":
      newStatus = "OUT_FOR_DELIVERY";
      statusMessage = "الشحنة جاهزة للتسليم";
      break;
    case "in_transit":
      newStatus = "IN_TRANSIT";
      statusMessage = "الشحنة في الطريق";
      break;
    case "picked_up":
      newStatus = "IN_TRANSIT";
      statusMessage = "تم استلام الشحنة";
      break;
    case "processing":
      newStatus = "READY_FOR_PICKUP";
      statusMessage = "جاري معالجة الشحنة";
      break;
    case "cancelled":
      newStatus = "Canceled";
      statusMessage = "تم إلغاء الشحنة";
      break;
    case "returned":
      newStatus = "Returned";
      statusMessage = "تم إرجاع الشحنة";
      break;
    default:
      newStatus = "IN_TRANSIT";
      statusMessage = status_label || status_name || "تم تحديث حالة الشحنة";
  }

  // تحديث حالة الشحنة إذا تغيرت
  if (newStatus !== shipment.shipmentstates) {
    console.log(`🔄 تحديث الحالة: ${shipment.shipmentstates} → ${newStatus}`);

    shipment.shipmentstates = newStatus;
    shipment.updatedAt = new Date();

    // حفظ معلومات الـ webhook
    shipment.redboxWebhookData = {
      shipment_id,
      tracking_number,
      status_name,
      status_label,
      status_code,
      date,
      customer_message,
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
    shipment_id,
    tracking_number,
    oldStatus: shipment.shipmentstates,
    newStatus: newStatus,
    statusMessage: statusMessage,
    status_code,
    status_name,
    status_label,
    date,
  };
}

// معالج webhook للاختبار
module.exports.testRedBoxWebhook = asyncHandler(async (req, res, next) => {
  try {
    console.log("🧪 اختبار webhook RedBox...");

    // بيانات اختبار
    const testData = {
      shipment_id: "TEST123456789",
      tracking_number: "TRK123456789",
      status_name: "Out for Delivery",
      status_label: "Out for Delivery",
      status_code: "out_for_delivery",
      date: new Date().toISOString(),
      customer_message: "Your shipment is out for delivery",
    };

    // محاكاة معالجة البيانات
    const result = await processRedBoxShipment(testData);

    res.status(200).json({
      success: true,
      message: "RedBox webhook test completed",
      result: result,
    });
  } catch (error) {
    console.error("❌ خطأ في اختبار webhook RedBox:", error);
    return next(
      new ApiEror(`خطأ في اختبار webhook RedBox: ${error.message}`, 500)
    );
  }
});

// معالج webhook للتحقق من الصحة
module.exports.validateRedBoxWebhook = asyncHandler(async (req, res, next) => {
  try {
    console.log("🔍 التحقق من صحة webhook RedBox...");

    const { shipment_id, tracking_number } = req.body;

    if (!shipment_id && !tracking_number) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "shipment_id or tracking_number is required",
      });
    }

    // البحث عن الشحنة
    const shipment = await Shapment.findOne({
      $or: [
        { _id: shipment_id },
        { trackingId: tracking_number },
        { orderId: tracking_number },
      ],
      shapmentCompany: "redbox",
    });

    if (!shipment) {
      return res.status(404).json({
        error: "Shipment not found",
        message: `No shipment found with shipment_id=${shipment_id} or tracking_number=${tracking_number}`,
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
    console.error("❌ خطأ في التحقق من webhook RedBox:", error);
    return next(
      new ApiEror(`خطأ في التحقق من webhook RedBox: ${error.message}`, 500)
    );
  }
});
