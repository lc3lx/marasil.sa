const mongoose = require('mongoose');
const ApiEror = require('../utils/apiError');

/**
 * تحضير بيانات شحنة الإرجاع لشركة Redbox
 * @param {Object} originalShipment - بيانات الشحنة الأصلية
 * @returns {Object} - بيانات الشحنة المرتجعة
 */
const prepareRedboxReturnShipment = (originalShipment) => {
  try {
    if (!originalShipment) {
      throw new Error('بيانات الشحنة الأصلية مطلوبة');
    }

    // استخراج البيانات المطلوبة من الشحنة الأصلية
    const { 
      _id,
      orderId,
      receiverAddress,
      senderAddress,
      paymentMathod,
      trackingId,
      codAmount = 0,
      codCurrency = 'SAR'
    } = originalShipment;

    // إنشاء كائن الشحنة المرتجعة مع الحقول المطلوبة فقط
    const returnShipment = {
      // الحقول المطلوبة من قبل Redbox API
      reference: orderId?.toString() || _id?.toString() || `RET-${Date.now()}`,
      cod_amount: paymentMathod === 'COD' ? (codAmount || 0) : 0,
      cod_currency: codCurrency || 'SAR',
      customer_name: senderAddress?.name || 'Customer',
      customer_phone: senderAddress?.phone || '0500000000',
      customer_address: [
        senderAddress?.address_line1,
        senderAddress?.address_line2,
        senderAddress?.city,
        senderAddress?.state,
        senderAddress?.country
      ].filter(Boolean).join(', '),
      
      // حقول إضافية للاستخدام الداخلي
      _originalShipmentId: _id,
      isReturnShipment: true,
      originalTrackingId: trackingId,
      trackingId: `RET-${trackingId || Date.now()}`,
      paymentMathod: 'Prepaid', // دائمًا مدفوع مسبقًا للشحنات المرتجعة
      shapmentType: 'reverse'
    };
    
    return returnShipment;
  } catch (error) {
    console.error('Error in prepareRedboxReturnShipment:', error);
    throw new ApiEror(`فشل في تحضير بيانات الشحنة المرتجعة: ${error.message}`, 500);
  }
};

/**
 * إنشاء شحنة إرجاع جديدة في Redbox
 * @param {Object} originalShipment - بيانات الشحنة الأصلية
 * @param {Object} redboxService - خدمة Redbox
 * @returns {Promise<Object>} - نتيجة إنشاء الشحنة المرتجعة
 */
const createRedboxReturnShipment = async (originalShipment, redboxService) => {
  try {
    const returnShipmentData = prepareRedboxReturnShipment(originalShipment);
    const redboxShipmentData = {
      original_shipment_id: originalShipment.redboxShipmentId || originalShipment._id.toString(),
      ...(returnShipmentData.reference && { reference: returnShipmentData.reference }),
    };

    const redboxResult = await redboxService.createShipment(redboxShipmentData);

    if (!redboxResult || !redboxResult.success) {
      throw new Error(redboxResult.message || 'فشل في إنشاء شحنة الإرجاع في Redbox');
    }

    // سجل الشحنة العكسية في DB يُنشأ في الـ controller مع مبادلة المرسل/المستلم
    return {
      success: true,
      returnShipment: null,
      redboxResult: {
        ...redboxResult,
        trackingNumber: redboxResult.tracking_number || redboxResult.trackingNumber,
        tracking_number: redboxResult.tracking_number || redboxResult.trackingNumber,
        shipping_label_url: redboxResult.shipping_label_url,
      },
    };
  } catch (error) {
    console.error('Error in createRedboxReturnShipment:', error);
    throw new ApiEror(`فشل في إنشاء شحنة الإرجاع: ${error.message}`, 500);
  }
};

module.exports = {
  prepareRedboxReturnShipment,
  createRedboxReturnShipment
};
