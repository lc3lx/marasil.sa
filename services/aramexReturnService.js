const mongoose = require("mongoose");
const ApiEror = require("../utils/apiError");

/**
 * تحضير بيانات شحنة الإرجاع لشركة Aramex
 * @param {Object} originalShipment - بيانات الشحنة الأصلية
 * @returns {Object} - بيانات الشحنة المرتجعة
 */
const prepareAramexReturnShipment = (originalShipment) => {
  try {
    if (!originalShipment) {
      throw new Error("بيانات الشحنة الأصلية مطلوبة");
    }

    // نسخ بيانات الشحنة الأصلية
    const returnShipment = JSON.parse(JSON.stringify(originalShipment));

    // تبديل المرسل والمستلم
    const temp = returnShipment.receiverAddress;
    returnShipment.receiverAddress = returnShipment.senderAddress;
    returnShipment.senderAddress = temp;

    // تحديث الحقول المطلوبة للشحنة المرتجعة
    returnShipment.ordervalue = 0; // لا توجد قيمة للشحنة المرتجعة
    returnShipment.paymentMathod = "Prepaid";
    returnShipment.shapmentType = "reverse";
    returnShipment.isReturnShipment = true;
    returnShipment.originalShipmentId = originalShipment._id;

    // إضافة بادئة لرقم التتبع للإشارة إلى أنها شحنة مرتجعة
    if (returnShipment.trackingId) {
      returnShipment.originalTrackingId = returnShipment.trackingId;
      returnShipment.trackingId = `RET-${returnShipment.trackingId}`;
    }

    // تحديث وصف الطلب
    if (returnShipment.orderDescription) {
      returnShipment.orderDescription = `إرجاع - ${returnShipment.orderDescription}`;
    }

    return returnShipment;
  } catch (error) {
    console.error("Error in prepareAramexReturnShipment:", error);
    throw new ApiEror(
      `فشل في تحضير بيانات الشحنة المرتجعة: ${error.message}`,
      500
    );
  }
};

/**
 * إنشاء شحنة إرجاع جديدة بناءً على شحنة موجودة
 * @param {Object} originalShipment - بيانات الشحنة الأصلية
 * @param {Object} aramexService - خدمة Aramex
 * @returns {Promise<Object>} - نتيجة إنشاء الشحنة المرتجعة
 */
const aramexDataService = require("./AramexService");

const createAramexReturnShipment = async (originalShipment, aramexPlatform) => {
  try {
    // بناء طلب CreateShipments بصيغة Aramex الصحيحة (مرسل=المستلم الأصلي، مستلم=المرسل الأصلي)
    const aramexPayload = aramexDataService.returnShipmentData(originalShipment);

    // إنشاء الشحنة العكسية في نظام Aramex فقط؛ سجل الشحنة في DB يُنشأ في الـ controller مع مبادلة المرسل/المستلم
    const aramexResult = await aramexPlatform.createShipment(aramexPayload);

    return {
      success: true,
      returnShipment: null,
      aramexResult,
    };
  } catch (error) {
    console.error("Error in createAramexReturnShipment:", error);
    throw new ApiEror(`فشل في إنشاء شحنة الإرجاع: ${error.message}`, 500);
  }
};

module.exports = {
  prepareAramexReturnShipment,
  createAramexReturnShipment,
};
