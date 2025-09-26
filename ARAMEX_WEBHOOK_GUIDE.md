# دليل Aramex Webhook

## 📋 نظرة عامة

هذا الدليل يوضح كيفية إعداد واستخدام webhook Aramex لتحديث حالة الشحنات تلقائياً.

## 🔗 نقاط النهاية (Endpoints)

### 1. Aramex Webhook الرئيسي

```
POST /api/shipment/webhook-aramex
```

### 2. اختبار Aramex Webhook

```
POST /api/shipment/webhook-aramex/test
```

### 3. التحقق من صحة Aramex Webhook

```
POST /api/shipment/webhook-aramex/validate
```

## 📦 تنسيق البيانات

### تنسيق Aramex Webhook

```json
{
  "tracking_number": "TEST123456789",
  "awb_number": "AWB123456789",
  "status": "Out for Delivery",
  "status_description": "Out for Delivery",
  "status_code": "OUT_FOR_DELIVERY",
  "location": "Riyadh",
  "timestamp": "2024-01-10T10:00:00.000Z",
  "event_type": "status_update",
  "shipment_id": "TEST123456789"
}
```

## 🧪 طرق الاختبار

### 1. الاختبار اليدوي باستخدام curl

```bash
# اختبار Aramex webhook
curl -X POST https://www.marasil.site/api/shipment/webhook-aramex \
  -H "Content-Type: application/json" \
  -d '{
    "tracking_number": "TEST123456789",
    "awb_number": "AWB123456789",
    "status": "Out for Delivery",
    "status_description": "Out for Delivery",
    "status_code": "OUT_FOR_DELIVERY",
    "location": "Riyadh",
    "timestamp": "2024-01-10T10:00:00.000Z",
    "event_type": "status_update",
    "shipment_id": "TEST123456789"
  }'

# اختبار التحقق من الصحة
curl -X POST https://www.marasil.site/api/shipment/webhook-aramex/validate \
  -H "Content-Type: application/json" \
  -d '{
    "tracking_number": "TEST123456789",
    "awb_number": "AWB123456789",
    "shipment_id": "TEST123456789"
  }'

# اختبار test endpoint
curl -X POST https://www.marasil.site/api/shipment/webhook-aramex/test \
  -H "Content-Type: application/json"
```

### 2. الاختبار باستخدام السكريبت

```bash
# تشغيل السكريبت الشامل
node test-aramex-webhook.js

# أو تشغيل اختبارات محددة
node -e "
const { testAramexWebhook } = require('./test-aramex-webhook.js');
testAramexWebhook();
"
```

## 📊 أنواع الـ Status Codes المدعومة

| Status Code | الوصف | الحالة في النظام |
|-------------|--------|------------------|
| `PICKED_UP` | تم الاستلام | `IN_TRANSIT` |
| `IN_TRANSIT` | في الطريق | `IN_TRANSIT` |
| `OUT_FOR_DELIVERY` | جاهزة للتسليم | `OUT_FOR_DELIVERY` |
| `DELIVERED` | تم التسليم | `Delivered` |
| `FAILED_DELIVERY` | فشل في التسليم | `FAILED_DELIVERY` |
| `RETURNED` | مرتجعة | `Returned` |
| `CANCELLED` | ملغاة | `Canceled` |
| `EXCEPTION` | استثناء | `EXCEPTION` |

## 🔍 معالجة البيانات

### 1. البحث عن الشحنة

النظام يبحث عن الشحنة باستخدام:

- `tracking_number` (Tracking Number)
- `awb_number` (AWB Number)
- `shipment_id` (Shipment ID)

### 2. تحديث الحالة

- يتم تحديث حالة الشحنة بناءً على `status_code` أو `status`
- يتم حفظ معلومات الـ webhook في قاعدة البيانات
- يتم إرسال إشعار للعميل

### 3. الإشعارات

```javascript
{
  customerId: "customer_id",
  type: "order",
  message: "تم تحديث حالة الشحنة رقم XXX إلى: الحالة الجديدة",
  data: {
    shipmentId: "shipment_id",
    trackingId: "tracking_id",
    newStatus: "new_status",
    webhookData: "webhook_data"
  }
}
```

## ✅ اختبارات التحقق

### 1. اختبار البيانات الصحيحة

```json
{
  "tracking_number": "TEST123456789",
  "awb_number": "AWB123456789",
  "status": "Out for Delivery",
  "status_description": "Out for Delivery",
  "status_code": "OUT_FOR_DELIVERY",
  "location": "Riyadh",
  "timestamp": "2024-01-10T10:00:00.000Z",
  "event_type": "status_update",
  "shipment_id": "TEST123456789"
}
```

**النتيجة المتوقعة:**

```json
{
  "success": true,
  "message": "Aramex webhook processed successfully",
  "result": {
    "shipmentId": "...",
    "trackingId": "TEST123456789",
    "tracking_number": "TEST123456789",
    "awb_number": "AWB123456789",
    "oldStatus": "IN_TRANSIT",
    "newStatus": "OUT_FOR_DELIVERY",
    "statusMessage": "الشحنة جاهزة للتسليم",
    "status_code": "OUT_FOR_DELIVERY",
    "status": "Out for Delivery",
    "location": "Riyadh",
    "timestamp": "2024-01-10T10:00:00.000Z"
  }
}
```

### 2. اختبار البيانات غير الصحيحة

#### بدون tracking_number و awb_number و shipment_id:

```json
{
  "status": "Out for Delivery",
  "status_code": "OUT_FOR_DELIVERY"
}
```

**النتيجة المتوقعة:** `400 Bad Request`

#### شحنة غير موجودة:

```json
{
  "tracking_number": "NONEXISTENT123",
  "awb_number": "NONEXISTENT_AWB",
  "shipment_id": "NONEXISTENT_ID",
  "status_code": "OUT_FOR_DELIVERY"
}
```

**النتيجة المتوقعة:** `404 Not Found`

## 🔍 مراقبة الـ Webhooks

### 1. فحص الـ Logs

```bash
# فحص logs الخادم
tail -f /var/log/nginx/access.log | grep webhook-aramex
tail -f /var/log/nginx/error.log | grep webhook-aramex

# فحص logs التطبيق
pm2 logs marasil-backend | grep aramex
```

### 2. فحص قاعدة البيانات

```javascript
// فحص الشحنات المحدثة مؤخراً
db.shipments
  .find({
    shapmentCompany: "aramex",
    updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  })
  .sort({ updatedAt: -1 });

// فحص الـ webhook data
db.shipments
  .find({
    shapmentCompany: "aramex",
    aramexWebhookData: { $exists: true },
  })
  .sort({ updatedAt: -1 });

// فحص الإشعارات
db.notifications
  .find({
    type: "order",
    "data.shipmentId": { $exists: true },
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  })
  .sort({ createdAt: -1 });
```

## 🚨 استكشاف الأخطاء

### 1. مشاكل شائعة

#### خطأ 404 - Shipment not found

- **السبب:** tracking_number أو awb_number أو shipment_id غير موجود في قاعدة البيانات
- **الحل:** تأكد من وجود الشحنة أو استخدم معرفات صحيحة

#### خطأ 400 - Missing required fields

- **السبب:** معاملات مطلوبة مفقودة
- **الحل:** تأكد من إرسال tracking_number أو awb_number أو shipment_id

#### خطأ 500 - Internal server error

- **السبب:** خطأ في الخادم
- **الحل:** فحص logs الخادم وتحديد المشكلة

### 2. فحص الاتصال

```bash
# فحص الاتصال بالخادم
curl -I https://www.marasil.site/api/shipment/webhook-aramex

# فحص SSL
openssl s_client -connect www.marasil.site:443
```

## 📈 مراقبة الأداء

### 1. إحصائيات الاستجابة

- **متوسط وقت الاستجابة:** < 1000ms
- **معدل النجاح:** > 99%
- **الحد الأقصى للطلبات:** 50/دقيقة

### 2. مراقبة الموارد

```bash
# فحص استخدام الذاكرة
free -h

# فحص استخدام CPU
top -p $(pgrep node)

# فحص مساحة القرص
df -h
```

## 🔧 إعدادات الإنتاج

### 1. Nginx Configuration

```nginx
location /api/shipment/webhook-aramex {
    limit_req zone=aramex_webhook burst=5 nodelay;
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 2. Rate Limiting

```javascript
// في server.js
app.use(
  "/api/shipment/webhook-aramex",
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 50, // 50 طلب لكل IP
    message: "Too many Aramex webhook requests",
  })
);
```

## 📞 الدعم الفني

في حالة وجود مشاكل:

1. فحص الـ logs أولاً
2. اختبار الاتصال بالخادم
3. التحقق من صحة البيانات المرسلة
4. التواصل مع فريق التطوير

---
**آخر تحديث:** $(date)
**الإصدار:** 1.0.0
