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
    // تحضير بيانات الشحنة المرتجعة
    const returnShipmentData = prepareRedboxReturnShipment(originalShipment);
    
    // تحضير البيانات المطلوبة لإنشاء الشحنة في Redbox
    // نستخدم معرف الشحنة الأصلية كـ original_shipment_id
    const redboxShipmentData = {
      original_shipment_id: originalShipment.redboxShipmentId || originalShipment._id.toString()
    };
    
    // إضافة الحقول الاختيارية فقط إذا كانت موجودة
    if (returnShipmentData.reference) {
      redboxShipmentData.reference = returnShipmentData.reference;
    }
    
    // إنشاء الشحنة في نظام Redbox
    const redboxResult = await redboxService.createShipment(redboxShipmentData);
    
    if (!redboxResult || !redboxResult.success) {
      throw new Error(redboxResult.message || 'فشل في إنشاء شحنة الإرجاع في Redbox');
    }
    
    // تحديث بيانات الشحنة المرتجعة بالاستجابة من Redbox
    returnShipmentData.trackingId = redboxResult.tracking_number || `RET-${Date.now()}`;
    returnShipmentData.redboxShipmentId = redboxResult.shipment_id || redboxResult.id;
    returnShipmentData.shippingLabelUrl = redboxResult.shipping_label_url;
    returnShipmentData.redboxResponse = redboxResult;
    
    // الحصول على نموذج العناوين
    const ClientAddress = mongoose.model('ClientAddress');
    
    // تحضير بيانات المرسل والمستلم مع القيم الافتراضية
    const prepareAddressData = (address, isReceiver = true) => {
      if (!address) {
        const defaultName = isReceiver ? 'عميل' : 'متجر';
        return {
          full_name: defaultName,
          mobile: '0500000000',
          email: isReceiver ? 'no-email@example.com' : 'store@example.com',
          address: isReceiver ? 'عنوان غير محدد' : 'عنوان المتجر',
          city: 'غير محدد',
          country: 'SA',
          district: 'غير محدد'
        };
      }
      return {
        full_name: address.full_name || (isReceiver ? 'عميل' : 'متجر'),
        mobile: address.mobile || address.phone || '0500000000',
        email: address.email || (isReceiver ? 'no-email@example.com' : 'store@example.com'),
        address: address.address || address.address_line1 || (isReceiver ? 'عنوان غير محدد' : 'عنوان المتجر'),
        city: address.city || 'غير محدد',
        country: address.country || 'SA',
        district: address.district || address.city || 'غير محدد',
        ...address
      };
    };
    
    const senderAddress = prepareAddressData(originalShipment.senderAddress, true);
    const receiverAddress = prepareAddressData(originalShipment.receiverAddress, false);
    
    // تسجيل بيانات العناوين للتصحيح
    console.log('Sender Address Data:', JSON.stringify(senderAddress, null, 2));
    console.log('Receiver Address Data:', JSON.stringify(receiverAddress, null, 2));
    
    // دالة مساعدة للبحث عن عنوان موجود أو إنشاء عنوان جديد
    const findOrCreateAddress = async (addressData, isReceiver = true) => {
      try {
        // محاولة العثور على عنوان موجود
        const existingAddress = await ClientAddress.findOne({
          clientPhone: phone,
          customerId: originalShipment.customerId
        });
        
        if (existingAddress) {
          console.log('Found existing address:', existingAddress._id);
          return existingAddress;
        }
        
        console.log('Creating new address with data:', {
          clientName: addressName,
          clientPhone: phone,
          clientEmail: email,
          clientAddress: addressText,
          addressDetails: addressText,
          district: district,
          city: city,
          country: country,
          customer: originalShipment.customerId,
          isDefault: false
        });
        
        // إنشاء عنوان جديد
        const newAddress = new ClientAddress({
          clientName: addressName,
          clientPhone: phone,
          clientEmail: email,
          clientAddress: addressText,
          addressDetails: addressText, // Using the same as clientAddress for now
          district: district,
          city: city,
          country: country,
          customer: originalShipment.customerId,
          isDefault: false
        });
        
        // التحقق من صحة النموذج قبل الحفظ
        const validationError = newAddress.validateSync();
        if (validationError) {
          console.error('Validation error before save:', validationError);
          throw validationError;
        }
        
        return await newAddress.save();
      } catch (error) {
        console.error('Error in findOrCreateAddress:', error);
        // إعادة رمي الخطأ مع رسالة أوضح
        if (error.name === 'ValidationError') {
          const missingFields = Object.keys(error.errors).join(', ');
          throw new Error(`حقول مطلوبة مفقودة: ${missingFields}. ${error.message}`);
        }
        throw error;
      }
    };
    
    // البحث عن أو إنشاء عنوان المستلم (المرسل الأصلي)
    const savedReceiverAddress = await findOrCreateAddress(senderAddress, true);
    
    // البحث عن أو إنشاء عنوان المرسل (المستلم الأصلي)
    const savedSenderAddress = await findOrCreateAddress(receiverAddress, false);
    
    // تحضير بيانات الشحنة المرتجعة مع الحقول المطلوبة
    const returnShipmentToSave = {
      ...returnShipmentData,
      customerId: originalShipment.customerId, // إضافة معرف العميل المطلوب
      receiverAddress: savedReceiverAddress._id, // استخدام معرف العنوان المحفوظ
      senderAddress: savedSenderAddress._id, // استخدام معرف العنوان المحفوظ
      paymentMathod: 'Prepaid', // دائمًا مدفوع مسبقًا للشحنات المرتجعة
      shapmentCompany: 'redbox',
      status: 'created',
      // نسخ باقي الحقول المطلوبة من الشحنة الأصلية
      orderId: originalShipment.orderId,
      weight: originalShipment.weight,
      dimension: originalShipment.dimension,
      orderDescription: originalShipment.orderDescription ? `إرجاع - ${originalShipment.orderDescription}` : 'شحنة إرجاع',
      originalShipmentId: originalShipment._id // حفظ معرف الشحنة الأصلية
    };
    
    // حفظ الشحنة المرتجعة في قاعدة البيانات
    const ReturnShipment = mongoose.model('Shapment', require('../models/shipmentModel').shapmentSchema);
    const newReturnShipment = await ReturnShipment.create(returnShipmentToSave);
    
    return {
      success: true,
      returnShipment: newReturnShipment,
      redboxResult
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
