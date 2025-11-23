# 🚀 دليل البدء السريع - المساعد الذكي

## ⚡ تشغيل سريع

```bash
cd mararsil-main/ai-service
pip install -r requirements.txt
python app.py
```

## 🎯 المميزات الجديدة

### ✅ توليد API Calls تلقائياً
المساعد الآن يولد API calls تلقائياً بناءً على طلب المستخدم!

**مثال:**
```
المستخدم: "وين شحنتي رقم 123456"
المساعد: [يولد API call تلقائياً]
         [ينفذ الطلب]
         [يعرض النتائج]
```

### ✅ دعم شامل لجميع APIs
- الشحنات (تتبع، عرض، إنشاء، إلغاء)
- المحفظة (رصيد، معاملات، شحن)
- الحساب (معلومات، تحديث)
- الطلبات
- الإشعارات
- الكوبونات
- الاسترجاع
- شركات الشحن

### ✅ أمان كامل
- Token-based authentication
- عزل بيانات المستخدمين
- لا تخترع بيانات

## 📝 مثال الاستخدام

### Request:
```json
{
  "message": "كم رصيد المحفظة؟",
  "token": "user_jwt_token_here",
  "userName": "أحمد"
}
```

### Response:
```json
{
  "response": "راح أشوف لك رصيد محفظتك الآن 💰\n\n💰 رصيد محفظتك: 150.50 ريال",
  "api_call": {
    "api_call": {
      "method": "GET",
      "url": "/wallet/myBalance",
      "headers": {
        "Authorization": "Bearer user_jwt_token_here",
        "Content-Type": "application/json"
      }
    }
  },
  "data": {
    "data": 150.50
  }
}
```

## 🔧 الإعدادات

### اختيار النموذج

**للـ GPU (موصى به):**
```bash
export AI_MODEL=Qwen/Qwen2.5-7B-Instruct  # أقوى
export AI_MODEL=Qwen/Qwen2.5-3B-Instruct  # متوازن
export AI_MODEL=Qwen/Qwen2.5-1.5B-Instruct # سريع
```

**للـ CPU:**
```bash
export AI_MODEL_CPU=Qwen/Qwen2.5-1.5B-Instruct
```

### تغيير API Base URL
```bash
export API_BASE_URL=https://www.marasil.site/api
```

## 🎓 أمثلة الطلبات

### تتبع شحنة
```
"وين شحنتي رقم 123456"
"تتبع شحنة ABC123"
"شو حالة شحنتي 789"
```

### عرض الشحنات
```
"شحناتي"
"عرض شحناتي"
"كل الشحنات"
```

### المحفظة
```
"كم رصيد المحفظة؟"
"رصيدي"
"شو رصيد محفظتي"
```

### معلومات الحساب
```
"معلومات حسابي"
"حسابي"
"ملفي الشخصي"
```

### الإشعارات
```
"إشعاراتي"
"شو الإشعارات الجديدة"
```

## ✅ التحقق من التشغيل

افتح: `http://localhost:5000/health`

يجب أن ترى:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_name": "Qwen/Qwen2.5-3B-Instruct"
}
```

## 🎉 جاهز!

المساعد الآن:
- ✅ ذكي ويولد API calls تلقائياً
- ✅ يدعم جميع مهام المنصة
- ✅ آمن ومصادق عليه
- ✅ يتحدث بالعربية بلهجة سعودية

**استمتع بالمساعد الذكي! 🚀**

