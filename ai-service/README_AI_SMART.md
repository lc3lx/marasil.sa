# 🤖 مساعد مراسل الذكي - Intelligent AI Assistant

## 🎯 نظرة عامة

مساعد ذكي باللغة العربية يستخدم نموذج Qwen2.5 القوي لفهم طلبات المستخدمين وتوليد API calls تلقائياً للوصول إلى بياناتهم في منصة مراسل.

## ✨ المميزات الرئيسية

### 🧠 ذكاء اصطناعي قوي
- **نموذج Qwen2.5-3B-Instruct**: نموذج قوي جداً باللغة العربية
- **فهم طبيعي**: يفهم اللغة العربية بلهجة سعودية طبيعية
- **ردود ذكية**: يرد بذكاء وليس فقط حفظ ردود

### 🔌 توليد API Calls تلقائياً
- **تحديد تلقائي**: يحدد API المناسب بناءً على طلب المستخدم
- **توليد JSON**: يولد API call بصيغة JSON صحيحة
- **تنفيذ تلقائي**: ينفذ API call ويعرض النتائج

### 🔒 أمان كامل
- **Token-based**: يستخدم token المستخدم فقط
- **مصادقة**: كل طلب مصادق عليه
- **عزل البيانات**: لا يمكن الوصول لبيانات مستخدمين آخرين

### 📋 دعم شامل لجميع المهام
- ✅ تتبع الشحنات
- ✅ عرض الشحنات والطلبات
- ✅ إدارة المحفظة
- ✅ معلومات الحساب
- ✅ الإشعارات
- ✅ الكوبونات
- ✅ الاسترجاع
- ✅ شركات الشحن
- ✅ وأكثر...

## 🚀 التثبيت والتشغيل

### 1. تثبيت المتطلبات

```bash
cd mararsil-main/ai-service
pip install -r requirements.txt
```

### 2. تشغيل الخدمة

```bash
python app.py
```

أو على Windows:
```bash
start.bat
```

### 3. التحقق من التشغيل

افتح المتصفح على: `http://localhost:5000/health`

يجب أن ترى:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_name": "Qwen/Qwen2.5-3B-Instruct"
}
```

## 📡 API Endpoints

### POST `/chat`
المحادثة الرئيسية مع المساعد

**Request:**
```json
{
  "message": "وين شحنتي رقم 123456",
  "token": "user_jwt_token",
  "userName": "أحمد",
  "history": []
}
```

**Response:**
```json
{
  "response": "حبيبي أحمد، راح أتتبع لك الشحنة الآن! 📦\n\n📦 رقم التتبع: 123456\n📍 الحالة: IN_TRANSIT",
  "api_call": {
    "api_call": {
      "method": "POST",
      "url": "/shipment/traking",
      "headers": {
        "Authorization": "Bearer user_jwt_token",
        "Content-Type": "application/json"
      },
      "body": {
        "trackingNumber": "123456"
      }
    }
  },
  "data": {
    "data": {
      "trackingId": "123456",
      "status": "IN_TRANSIT"
    }
  }
}
```

### GET `/apis`
قائمة جميع APIs المتاحة

**Response:**
```json
{
  "apis": {
    "shipments": {...},
    "wallet": {...},
    "customer": {...},
    ...
  },
  "base_url": "https://www.marasil.site/api"
}
```

### GET `/health`
فحص صحة الخدمة

## 🎓 أمثلة الاستخدام

### مثال 1: تتبع شحنة
```
المستخدم: "وين شحنتي رقم 123456"
المساعد: "حبيبي، راح أتتبع لك الشحنة الآن! 📦

[يولد API call تلقائياً]
[ينفذ الطلب]
[يعرض النتائج]

📦 رقم التتبع: 123456
📍 الحالة: IN_TRANSIT
🚚 الموقع: الرياض"
```

### مثال 2: عرض الشحنات
```
المستخدم: "شحناتي"
المساعد: "بكل سرور! راح أجيب لك جميع شحناتك 📦

[يولد: GET /shipment/my-shipments]
[ينفذ]
[يعرض]

✅ وجدت 5 شحنات! إذا تحتاج تفاصيل أكثر عن أي واحدة، قولي وأساعدك 😊"
```

### مثال 3: رصيد المحفظة
```
المستخدم: "كم رصيد المحفظة؟"
المساعد: "راح أشوف لك رصيد محفظتك الآن 💰

[يولد: GET /wallet/myBalance]
[ينفذ]
[يعرض]

💰 رصيد محفظتك: 150.50 ريال"
```

### مثال 4: معلومات الحساب
```
المستخدم: "معلومات حسابي"
المساعد: "راح أجيب لك معلومات حسابك 👤

[يولد: GET /customer/getMe]
[ينفذ]
[يعرض]

👤 الاسم: أحمد محمد
📧 الإيميل: ahmed@example.com"
```

## 🔧 الإعدادات

### متغيرات البيئة

يمكنك تعديل النموذج عبر متغيرات البيئة:

```bash
# للنموذج على GPU (أقوى)
export AI_MODEL=Qwen/Qwen2.5-7B-Instruct

# للنموذج على CPU (أسرع)
export AI_MODEL_CPU=Qwen/Qwen2.5-1.5B-Instruct

# عنوان API
export API_BASE_URL=https://www.marasil.site/api
```

### اختيار النموذج

#### للـ GPU (موصى به):
- **Qwen2.5-7B-Instruct**: أقوى نموذج (يحتاج GPU 16GB+)
- **Qwen2.5-3B-Instruct**: متوازن (يحتاج GPU 8GB+)
- **Qwen2.5-1.5B-Instruct**: سريع (يحتاج GPU 4GB+)

#### للـ CPU:
- **Qwen2.5-1.5B-Instruct**: سريع نسبياً
- **Qwen2.5-0.5B-Instruct**: أسرع (لكن أقل دقة)

## 📋 APIs المدعومة

### الشحنات (Shipments)
- `GET /shipment/my-shipments` - جلب جميع الشحنات
- `GET /shipment/my-shipment/{id}` - جلب شحنة محددة
- `POST /shipment/traking` - تتبع شحنة
- `POST /shipment/createshipment` - إنشاء شحنة
- `POST /shipment/cancel/{trackingNumber}` - إلغاء شحنة
- `GET /shipment/search` - بحث في الشحنات
- `GET /shipment/stats` - إحصائيات

### المحفظة (Wallet)
- `GET /wallet/myBalance` - رصيد المحفظة
- `GET /wallet/myWallet` - تفاصيل المحفظة
- `GET /transaction/my-transaction` - المعاملات
- `POST /wallet/rechargeWallet` - شحن المحفظة

### الحساب (Customer)
- `GET /customer/getMe` - معلومات الحساب
- `PUT /customer/updateMe` - تحديث الحساب
- `PUT /customer/changeMyPassword` - تغيير كلمة المرور

### الطلبات (Orders)
- `GET /orderManually` - جميع الطلبات
- `GET /orderManually/{orderId}` - طلب محدد
- `POST /orderManually/create` - إنشاء طلب

### الإشعارات (Notifications)
- `GET /notification/getMynotification` - جميع الإشعارات
- `PUT /notification/{id}/read` - تحديد كمقروء
- `GET /notification/unread-count` - عدد غير المقروءة

### الاسترجاع (Returns)
- `POST /shipment/return/request-otp` - طلب OTP
- `POST /shipment/return/verify-otp` - التحقق من OTP
- `GET /shipment/return/shipments` - الشحنات القابلة للاسترجاع
- `POST /shipment/return/create-request` - إنشاء طلب استرجاع

### الكوبونات (Coupons)
- `POST /coupon/validate` - التحقق من الكوبون
- `POST /coupon/apply` - تطبيق كوبون

### شركات الشحن (Companies)
- `GET /shippingCompany` - جميع الشركات
- `GET /shippingCompany/info` - معلومات الشركات

## 🔐 قواعد الأمان

### 1. Token Required
- كل API call يتطلب token المستخدم
- إذا لم يكن token متوفراً، يطلب المساعد تسجيل الدخول

### 2. User Data Only
- المساعد يصل فقط لبيانات المستخدم المسجل
- لا يمكن الوصول لبيانات مستخدمين آخرين

### 3. No Data Hallucination
- المساعد لا يخترع بيانات
- يستخدم فقط البيانات من APIs

## 🎯 كيف يعمل النظام

### 1. فهم الطلب
المستخدم يكتب: "وين شحنتي رقم 123456"

### 2. توليد API Call
المساعد يولد:
```json
{
  "api_call": {
    "method": "POST",
    "url": "/shipment/traking",
    "headers": {
      "Authorization": "Bearer {{USER_TOKEN}}",
      "Content-Type": "application/json"
    },
    "body": {
      "trackingNumber": "123456"
    }
  }
}
```

### 3. تنفيذ API Call
النظام ينفذ الطلب باستخدام token المستخدم

### 4. عرض النتائج
المساعد يفسر النتائج بطريقة طبيعية وودودة

## 🐛 استكشاف الأخطاء

### المشكلة: "النموذج غير متوفر"
**الحل:**
```bash
pip install --upgrade transformers torch
python app.py
```

### المشكلة: "Out of Memory"
**الحل:** استخدم نموذج أصغر:
```bash
export AI_MODEL=Qwen/Qwen2.5-1.5B-Instruct
```

### المشكلة: "API Error"
**الحل:** تأكد من:
1. API_BASE_URL صحيح
2. Token صالح
3. المستخدم مسجل دخول

## 📝 ملاحظات

- النموذج يحتاج وقت للتحميل عند البدء (30-60 ثانية)
- أول طلب قد يكون أبطأ (warmup)
- استخدم GPU إذا متوفر للأداء الأفضل

## 🚀 التطوير المستقبلي

- [ ] دعم WebSocket للمحادثات الفورية
- [ ] تحسين فهم السياق
- [ ] دعم الملفات والصور
- [ ] تحليل المشاعر
- [ ] تتبع المحادثات

---

**جاهز للاستخدام! 🎉**

