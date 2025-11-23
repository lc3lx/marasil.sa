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

    // دعم الـ format الجديد (Key/Value) والقديم
    let webhookData = {};

    // التحقق من الـ format الجديد (Key/Value)
    if (req.body.Key && req.body.Value) {
      const { Key, Value } = req.body;
      
      // استخراج البيانات من الـ format الجديد
      webhookData = {
        waybill_number: Value.WaybillNumber || Key,
        update_code: Value.UpdateCode,
        update_date_time: Value.UpdateDateTime,
        comments: Value.Comments,
        update_location: Value.UpdateLocation,
        problem_code: Value.ProblemCode || "",
        // تحويل UpdateCode إلى status_code
        status_code: mapUpdateCodeToStatus(Value.UpdateCode),
        status_description: Value.Comments || Value.UpdateCode,
        location: Value.UpdateLocation,
        timestamp: Value.UpdateDateTime,
      };
    } else {
      // الـ format القديم
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

      webhookData = {
        tracking_number,
        awb_number,
        waybill_number: awb_number || tracking_number,
        status,
        status_description,
        status_code,
        location,
        timestamp,
        event_type,
        shipment_id,
      };
    }

    // التحقق من المعاملات المطلوبة
    if (!webhookData.waybill_number && !webhookData.tracking_number && !webhookData.awb_number && !webhookData.shipment_id) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "WaybillNumber, tracking_number, awb_number, or shipment_id is required",
      });
    }

    const result = await processAramexWebhook(webhookData);

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

// دالة لتحويل UpdateCode إلى status_code
function mapUpdateCodeToStatus(updateCode) {
  if (!updateCode) return null;
  
  // Aramex UpdateCode mapping
  // SH001 = Shipment Created
  // SH002 = Picked Up
  // SH003 = In Transit
  // SH004 = Out for Delivery
  // SH005 = Delivered
  // SH006 = Failed Delivery
  // SH007 = Returned
  // SH008 = Cancelled
  // SH009 = Exception
  
  const codeMap = {
    "SH001": "READY_FOR_PICKUP",
    "SH002": "PICKED_UP",
    "SH003": "IN_TRANSIT",
    "SH004": "OUT_FOR_DELIVERY",
    "SH005": "DELIVERED",
    "SH006": "FAILED_DELIVERY",
    "SH007": "RETURNED",
    "SH008": "CANCELLED",
    "SH009": "EXCEPTION",
  };

  return codeMap[updateCode] || updateCode;
}

// معالجة webhook Aramex
async function processAramexWebhook(webhookData) {
  const {
    tracking_number,
    awb_number,
    waybill_number,
    status,
    status_description,
    status_code,
    location,
    update_location,
    timestamp,
    update_date_time,
    event_type,
    shipment_id,
    update_code,
    comments,
    problem_code,
  } = webhookData;

  // استخدام waybill_number كأولوية إذا كان موجوداً
  const searchNumber = waybill_number || awb_number || tracking_number;

  console.log(
    `🔍 البحث عن الشحنة: waybill_number=${waybill_number}, tracking_number=${tracking_number}, awb_number=${awb_number}, shipment_id=${shipment_id}`
  );

  // البحث عن الشحنة باستخدام waybill_number أو tracking_number أو awb_number أو shipment_id
  let shipment = await Shapment.findOne({
    $or: [
      { trackingId: waybill_number },
      { trackingId: awb_number },
      { trackingId: tracking_number },
      { orderId: waybill_number },
      { orderId: awb_number },
      { orderId: tracking_number },
      { _id: shipment_id },
    ],
    shapmentCompany: "aramex",
  });

  if (!shipment) {
    console.log(
      `⚠️  الشحنة غير موجودة: waybill_number=${waybill_number}, tracking_number=${tracking_number}, awb_number=${awb_number}, shipment_id=${shipment_id}`
    );
    throw new Error(
      `Shipment not found: waybill_number=${waybill_number}, tracking_number=${tracking_number}, awb_number=${awb_number}, shipment_id=${shipment_id}`
    );
  }

  console.log(`✅ تم العثور على الشحنة: ${shipment._id}`);

  // تحديد الحالة الجديدة بناءً على status_code أو update_code أو status
  let newStatus = shipment.shipmentstates; // الحالة الحالية
  let statusMessage = comments || status_description || status || "تم تحديث حالة الشحنة";
  
  // استخدام location من update_location إذا كان موجوداً
  const finalLocation = update_location || location;

  // تحويل status_code أو update_code إلى حالة النظام
  const codeToCheck = status_code || update_code || status;
  
  switch (codeToCheck) {
    case "READY_FOR_PICKUP":
    case "SH001":
      newStatus = "READY_FOR_PICKUP";
      statusMessage = comments || "الشحنة جاهزة للاستلام";
      break;
    case "PICKED_UP":
    case "Picked Up":
    case "SH002":
      newStatus = "IN_TRANSIT";
      statusMessage = comments || "تم استلام الشحنة";
      break;
    case "IN_TRANSIT":
    case "In Transit":
    case "SH003":
      newStatus = "IN_TRANSIT";
      statusMessage = comments || "الشحنة في الطريق";
      break;
    case "OUT_FOR_DELIVERY":
    case "Out for Delivery":
    case "SH004":
      newStatus = "OUT_FOR_DELIVERY";
      statusMessage = comments || "الشحنة جاهزة للتسليم";
      break;
    case "DELIVERED":
    case "Delivered":
    case "SH005":
      newStatus = "Delivered";
      statusMessage = comments || "تم التسليم بنجاح";
      break;
    case "FAILED_DELIVERY":
    case "Failed Delivery":
    case "SH006":
      newStatus = "FAILED_DELIVERY";
      statusMessage = comments || "فشل في التسليم";
      break;
    case "RETURNED":
    case "Returned":
    case "SH007":
      newStatus = "Returned";
      statusMessage = comments || "تم إرجاع الشحنة";
      break;
    case "CANCELLED":
    case "Cancelled":
    case "SH008":
      newStatus = "Canceled";
      statusMessage = comments || "تم إلغاء الشحنة";
      break;
    case "EXCEPTION":
    case "Exception":
    case "SH009":
      newStatus = "EXCEPTION";
      statusMessage = comments || "استثناء في الشحنة";
      break;
    default:
      newStatus = "IN_TRANSIT";
      statusMessage = comments || status_description || status || "تم تحديث حالة الشحنة";
  }
  
  // إذا كان هناك ProblemCode، نضيفه للرسالة
  if (problem_code && problem_code.trim() !== "") {
    statusMessage += ` (مشكلة: ${problem_code})`;
    newStatus = "EXCEPTION";
  }

  // تحديث حالة الشحنة إذا تغيرت
  if (newStatus !== shipment.shipmentstates) {
    console.log(`🔄 تحديث الحالة: ${shipment.shipmentstates} → ${newStatus}`);

    shipment.shipmentstates = newStatus;
    shipment.updatedAt = new Date();

    // حفظ معلومات الـ webhook
    shipment.aramexWebhookData = {
      waybill_number,
      tracking_number,
      awb_number,
      status,
      status_description,
      status_code,
      update_code,
      update_date_time: update_date_time || timestamp,
      comments,
      update_location: finalLocation,
      location: finalLocation,
      timestamp: update_date_time || timestamp,
      problem_code,
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
    waybill_number,
    tracking_number,
    awb_number,
    oldStatus: shipment.shipmentstates,
    newStatus: newStatus,
    statusMessage: statusMessage,
    update_code,
    status_code,
    status,
    location: finalLocation,
    timestamp: update_date_time || timestamp,
    problem_code,
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
