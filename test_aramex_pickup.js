#!/usr/bin/env node

/**
 * اختبار شامل لميزة إنشاء طلب الاستلام في أرامكس
 */

const AramexService = require('./services/AramexService');

async function testDataFormatting() {
  console.log('🔍 اختبار تنسيق البيانات...');

  // بيانات المرسل التجريبية
  const shipperAddress = {
    full_name: "أحمد محمد التاجر",
    mobile: "0512345678",
    email: "ahmed@store.com",
    address: "شارع الملك فيصل، الرياض",
    city: "الرياض",
    country: "SA"
  };

  // معلومات الشحنة التجريبية
  const shipmentInfo = {
    trackingNumber: "123456789"
  };

  try {
    // اختبار createPickupRequestData
    const pickupData = AramexService.createPickupRequestData(shipperAddress, shipmentInfo);

    console.log('✅ تم إنشاء بيانات طلب الاستلام:');
    console.log('  - pickupAddress:', JSON.stringify(pickupData.pickupAddress, null, 2));
    console.log('  - contactName:', pickupData.contactName);
    console.log('  - pickupDateTime:', pickupData.pickupDateTime);
    console.log('  - reference:', pickupData.reference);

    return pickupData;
  } catch (error) {
    console.error('❌ خطأ في تنسيق البيانات:', error.message);
    throw error;
  }
}

async function testAramexPickup(pickupData) {
  console.log('\n🚛 اختبار إنشاء طلب الاستلام...');

  try {
    const result = await AramexService.createPickupRequest(
      pickupData.shipperAddress || {
        full_name: "أحمد محمد التاجر",
        mobile: "0512345678",
        email: "ahmed@store.com",
        address: "شارع الملك فيصل، الرياض",
        city: "الرياض",
        country: "SA"
      },
      { trackingNumber: "123456789" }
    );

    console.log('📊 نتيجة الاختبار:');
    console.log('  - نجح:', result.success);
    console.log('  - الرسالة:', result.message);

    if (result.success) {
      console.log('  - رقم طلب الاستلام:', result.pickupId);
      console.log('  - التاريخ المجدول:', result.scheduledDate);
      console.log('✅ تم إنشاء طلب الاستلام بنجاح!');
    } else {
      console.log('  - الخطأ:', result.error);
      console.log('⚠️ فشل في إنشاء طلب الاستلام (قد يكون بسبب بيانات الاختبار)');
    }

    return result;
  } catch (error) {
    console.error('❌ خطأ في الاختبار:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

async function main() {
  console.log('🧪 اختبار شامل لميزة إنشاء طلب الاستلام في أرامكس');
  console.log('=' .repeat(60));

  try {
    // اختبار 1: تنسيق البيانات
    const pickupData = await testDataFormatting();

    // اختبار 2: إنشاء طلب الاستلام
    const result = await testAramexPickup(pickupData);

    console.log('\n🎉 انتهى الاختبار بنجاح!');

  } catch (error) {
    console.error('\n❌ فشل الاختبار:', error.message);
    process.exit(1);
  }
}

// تشغيل الاختبار
main().catch(console.error);
