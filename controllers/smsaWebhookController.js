// معالج webhook مخصص لـ SMSA Express
const asyncHandler = require("express-async-handler");
const Shapment = require("../models/shipmentModel");
const Notification = require("../models/notificationModel");
const ApiEror = require("../utils/apiError");

// معالج webhook SMSA
module.exports.smsaWebhookHandler = asyncHandler(async (req, res, next) => {
  try {
    console.log(
      "📦 استقبال webhook من SMSA:",
      JSON.stringify(req.body, null, 2)
    );

    // التحقق من وجود البيانات
    if (!req.body || !Array.isArray(req.body) || req.body.length === 0) {
      return res.status(400).json({
        error: "Invalid webhook data format",
        message: "Expected array of shipment data",
      });
    }

    const results = [];
    const errors = [];

    // معالجة كل شحنة في الـ webhook
    for (const shipmentData of req.body) {
      try {
        const result = await processSMSAShipment(shipmentData);
        results.push(result);
      } catch (error) {
        console.error("❌ خطأ في معالجة شحنة SMSA:", error.message);
        errors.push({
          AWB: shipmentData.AWB,
          Reference: shipmentData.Reference,
          error: error.message,
        });
      }
    }

    // إرجاع النتيجة
    res.status(200).json({
      success: true,
      message: "SMSA webhook processed successfully",
      processed: results.length,
      errors: errors.length,
      results: results,
      errors: errors,
    });
  } catch (error) {
    console.error("💥 خطأ في معالجة webhook SMSA:", error);
    return next(
      new ApiEror(`خطأ في معالجة webhook SMSA: ${error.message}`, 500)
    );
  }
});

// معالجة شحنة SMSA واحدة
async function processSMSAShipment(shipmentData) {
  const { AWB, Reference, Scans, isDelivered } = shipmentData;

  console.log(`🔍 البحث عن الشحنة: AWB=${AWB}, Reference=${Reference}`);

  // البحث عن الشحنة باستخدام AWB أو Reference
  let shipment = await Shapment.findOne({
    $or: [
      { trackingId: AWB },
      { trackingId: Reference },
      { orderId: Reference },
    ],
    shapmentCompany: "smsa",
  });

  if (!shipment) {
    console.log(`⚠️  الشحنة غير موجودة: AWB=${AWB}, Reference=${Reference}`);
    throw new Error(`Shipment not found: AWB=${AWB}, Reference=${Reference}`);
  }

  console.log(`✅ تم العثور على الشحنة: ${shipment._id}`);

  // تحديد الحالة الجديدة بناءً على آخر scan
  let newStatus = shipment.shipmentstates; // الحالة الحالية
  let statusMessage = "";

  if (Scans && Scans.length > 0) {
    // ترتيب الـ scans حسب التاريخ (الأحدث أولاً)
    const sortedScans = Scans.sort(
      (a, b) => new Date(b.ScanDateTime) - new Date(a.ScanDateTime)
    );

    const latestScan = sortedScans[0];
    console.log(
      `📊 آخر scan: ${latestScan.ScanType} - ${latestScan.ScanDescription}`
    );

    // تحويل scan type إلى حالة النظام
    switch (latestScan.ScanType) {
      case "DL": // Delivered
        newStatus = "Delivered";
        statusMessage = "تم التسليم بنجاح";
        break;
      case "OD": // Out for Delivery
        newStatus = "OUT_FOR_DELIVERY";
        statusMessage = "الشحنة جاهزة للتسليم";
        break;
      case "AF": // Arrived at Facility
        newStatus = "IN_TRANSIT";
        statusMessage = "وصلت إلى منشأة التوزيع";
        break;
      case "PU": // Picked Up
        newStatus = "IN_TRANSIT";
        statusMessage = "تم استلام الشحنة";
        break;
      case "DP": // Departed
        newStatus = "IN_TRANSIT";
        statusMessage = "الشحنة في الطريق";
        break;
      default:
        newStatus = "IN_TRANSIT";
        statusMessage = latestScan.ScanDescription || "تم تحديث حالة الشحنة";
    }
  }

  // تحديث حالة الشحنة إذا تغيرت
  if (newStatus !== shipment.shipmentstates) {
    console.log(`🔄 تحديث الحالة: ${shipment.shipmentstates} → ${newStatus}`);

    shipment.shipmentstates = newStatus;
    shipment.updatedAt = new Date();

    // حفظ معلومات الـ scans
    if (Scans && Scans.length > 0) {
      shipment.smsaScans = Scans.map((scan) => ({
        referenceId: scan.ReferenceID,
        city: scan.City,
        scanType: scan.ScanType,
        scanDescription: scan.ScanDescription,
        scanDateTime: scan.ScanDateTime,
        scanTimeZone: scan.ScanTimeZone,
        receivedBy: scan.ReceivedBy,
      }));
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
          scanDetails: Scans && Scans.length > 0 ? Scans[0] : null,
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
    AWB: AWB,
    Reference: Reference,
    oldStatus: shipment.shipmentstates,
    newStatus: newStatus,
    statusMessage: statusMessage,
    scansCount: Scans ? Scans.length : 0,
    isDelivered: isDelivered || false,
  };
}

// معالج webhook للاختبار
module.exports.testSMSAWebhook = asyncHandler(async (req, res, next) => {
  try {
    console.log("🧪 اختبار webhook SMSA...");

    // بيانات اختبار
    const testData = [
      {
        AWB: "TEST123456789",
        Reference: "REF1234567890",
        Pieces: 1,
        CODAmount: 0.0,
        ContentDesc: "Test shipment",
        RecipientName: "Test User",
        OriginCity: "Jeddah",
        OriginCountry: "SA",
        DesinationCity: "Riyadh",
        DesinationCountry: "SA",
        isDelivered: false,
        Scans: [
          {
            ReferenceID: 10611,
            City: "Riyadh",
            ScanType: "OD",
            ScanDescription: "Out for Delivery",
            ScanDateTime: new Date().toISOString(),
            ScanTimeZone: "+03:00",
          },
        ],
      },
    ];

    // محاكاة معالجة البيانات
    const result = await processSMSAShipment(testData[0]);

    res.status(200).json({
      success: true,
      message: "SMSA webhook test completed",
      result: result,
    });
  } catch (error) {
    console.error("❌ خطأ في اختبار webhook SMSA:", error);
    return next(
      new ApiEror(`خطأ في اختبار webhook SMSA: ${error.message}`, 500)
    );
  }
});

// معالج webhook للتحقق من الصحة
module.exports.validateSMSAWebhook = asyncHandler(async (req, res, next) => {
  try {
    console.log("🔍 التحقق من صحة webhook SMSA...");

    const { AWB, Reference } = req.body;

    if (!AWB && !Reference) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "AWB or Reference is required",
      });
    }

    // البحث عن الشحنة
    const shipment = await Shapment.findOne({
      $or: [
        { trackingId: AWB },
        { trackingId: Reference },
        { orderId: Reference },
      ],
      shapmentCompany: "smsa",
    });

    if (!shipment) {
      return res.status(404).json({
        error: "Shipment not found",
        message: `No shipment found with AWB=${AWB} or Reference=${Reference}`,
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
    console.error("❌ خطأ في التحقق من webhook SMSA:", error);
    return next(
      new ApiEror(`خطأ في التحقق من webhook SMSA: ${error.message}`, 500)
    );
  }
});
