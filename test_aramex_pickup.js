#!/usr/bin/env node

/**
 * اختبار بسيط لميزة إنشاء طلب الاستلام في أرامكس
 */

const AramexService = require('./services/AramexService');

async function testAramexPickup() {
  console.log('🧪 اختبار ميزة إنشاء طلب الاستلام في أرامكس');
  console.log('=' .repeat(50));

  // بيانات المرسل التجريبية
  const shipperAddress = {
    full_name: "أحمد محمد التاجر",
    mobile: "0512345678",
    email: "ahmed@store.com",
    address: "شارع الملك فيصل، الرياض",
    company_name: "متجر أحمد"
  };

  // معلومات الشحنة التجريبية
  const shipmentInfo = {
    trackingNumber: "123456789"
  };

  console.log('📦 بيانات الاختبار:');
  console.log('  - المرسل:', shipperAddress.full_name);
  console.log('  - رقم التتبع:', shipmentInfo.trackingNumber);
  console.log('');

  try {
    console.log('🚛 بدء إنشاء طلب الاستلام...');

    const result = await AramexService.createPickupRequest(shipperAddress, shipmentInfo);

    console.log('📊 نتيجة الاختبار:');
    console.log('  - نجح:', result.success);
    console.log('  - الرسالة:', result.message);

    if (result.success) {
      console.log('  - رقم طلب الاستلام:', result.pickupId);
      console.log('  - التاريخ المجدول:', result.scheduledDate);
      console.log('✅ تم إنشاء طلب الاستلام بنجاح!');
    } else {
      console.log('  - الخطأ:', result.error);
      console.log('❌ فشل في إنشاء طلب الاستلام');
    }

  } catch (error) {
    console.error('❌ خطأ في الاختبار:', error.message);
    console.error('Stack:', error.stack);
  }
}

// تشغيل الاختبار
testAramexPickup().catch(console.error);
