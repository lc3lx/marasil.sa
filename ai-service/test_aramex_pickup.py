#!/usr/bin/env python3
"""
اختبار وظيفة إنشاء طلب الاستلام في أرامكس
"""

import sys
import os

# إضافة مجلد mararsil-main إلى path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_aramex_pickup_data():
    """اختبار دالة إنشاء بيانات طلب الاستلام"""
    try:
        # استيراد الدالة
        from services.AramexService import createPickupRequestData

        # بيانات المرسل التجريبية
        shipperData = {
            "full_name": "أحمد محمد",
            "mobile": "0512345678",
            "email": "ahmed@example.com",
            "address": "شارع الملك فيصل، الرياض",
            "company_name": "متجر أحمد"
        }

        # معلومات الشحنة التجريبية
        shipmentInfo = {
            "trackingNumber": "123456789"
        }

        # إنشاء بيانات طلب الاستلام
        pickupData = createPickupRequestData(shipperData, shipmentInfo)

        print("✅ تم إنشاء بيانات طلب الاستلام بنجاح:")
        print(f"  - اسم الاتصال: {pickupData['contactName']}")
        print(f"  - رقم الهاتف: {pickupData['phone']}")
        print(f"  - البريد الإلكتروني: {pickupData['email']}")
        print(f"  - رقم التتبع: {pickupData['reference']}")
        print(f"  - وقت الاستلام: {pickupData['pickupDateTime']}")
        print(f"  - وقت الانتهاء: {pickupData['closingDateTime']}")

        return True

    except Exception as e:
        print(f"❌ خطأ في اختبار بيانات طلب الاستلام: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_format_address():
    """اختبار دالة تنسيق العنوان"""
    try:
        from services.AramexService import formatAddress

        address = {
            "address": "شارع الملك فيصل، الرياض",
            "city": "الرياض",
            "country": "SA"
        }

        formatted = formatAddress(address)

        print("✅ تم تنسيق العنوان بنجاح:")
        print(f"  - Line1: {formatted['Line1']}")
        print(f"  - City: {formatted['City']}")
        print(f"  - CountryCode: {formatted['CountryCode']}")

        return True

    except Exception as e:
        print(f"❌ خطأ في اختبار تنسيق العنوان: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """الدالة الرئيسية للاختبار"""
    print("🧪 اختبار وظائف أرامكس - إنشاء طلب الاستلام")
    print("=" * 50)

    tests = [
        ("اختبار إنشاء بيانات طلب الاستلام", test_aramex_pickup_data),
        ("اختبار تنسيق العنوان", test_format_address),
    ]

    passed = 0
    total = len(tests)

    for test_name, test_func in tests:
        print(f"\n🔍 {test_name}:")
        print("-" * 30)

        if test_func():
            passed += 1
            print(f"✅ {test_name}: نجح")
        else:
            print(f"❌ {test_name}: فشل")

    print(f"\n📊 نتائج الاختبار: {passed}/{total} نجح")
    print("🎉 انتهى الاختبار!" if passed == total else "⚠️ يوجد أخطاء تحتاج إصلاح")

if __name__ == "__main__":
    main()
