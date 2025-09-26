# دليل SMSA Webhook

## 📋 نظرة عامة

هذا الدليل يوضح كيفية إعداد واستخدام webhook SMSA Express لتحديث حالة الشحنات تلقائياً.

## 🔗 نقاط النهاية (Endpoints)

### 1. SMSA Webhook الرئيسي

```
POST /api/shipment/webhook-smsa
```

### 2. اختبار SMSA Webhook

```
POST /api/shipment/webhook-smsa/test
```

### 3. التحقق من صحة SMSA Webhook

```
POST /api/shipment/webhook-smsa/validate
```

## 📦 تنسيق البيانات

### تنسيق SMSA Webhook

```json
[
  {
    "AWB": "231200021000",
    "Reference": "REF1234567890",
    "Pieces": 1,
    "CODAmount": 0.0,
    "ContentDesc": "Shipment contents description",
    "RecipientName": "Abdulaziz",
    "OriginCity": "Jeddah",
    "OriginCountry": "SA",
    "DesinationCity": "Riyadh",
    "DesinationCountry": "SA",
    "isDelivered": true,
    "Scans": [
      {
        "ReferenceID": 10611,
        "ReceivedBy": "Abdulaziz",
        "City": "Riyadh",
        "ScanType": "DL",
        "ScanDescription": "Delivered",
        "ScanDateTime": "2024-01-10T11:00:00",
        "ScanTimeZone": "+03:00"
      }
    ]
  }
]
```

## 🧪 طرق الاختبار

### 1. الاختبار اليدوي باستخدام curl

```bash
# اختبار SMSA webhook
curl -X POST https://www.marasil.site/api/shipment/webhook-smsa \
  -H "Content-Type: application/json" \
  -d '[
    {
      "AWB": "231200021000",
      "Reference": "REF1234567890",
      "Pieces": 1,
      "CODAmount": 0.0,
      "ContentDesc": "Test shipment",
      "RecipientName": "Test User",
      "OriginCity": "Jeddah",
      "OriginCountry": "SA",
      "DesinationCity": "Riyadh",
      "DesinationCountry": "SA",
      "isDelivered": false,
      "Scans": [
        {
          "ReferenceID": 10611,
          "City": "Riyadh",
          "ScanType": "OD",
          "ScanDescription": "Out for Delivery",
          "ScanDateTime": "2024-01-10T10:00:00",
          "ScanTimeZone": "+03:00"
        }
      ]
    }
  ]'

# اختبار التحقق من الصحة
curl -X POST https://www.marasil.site/api/shipment/webhook-smsa/validate \
  -H "Content-Type: application/json" \
  -d '{
    "AWB": "231200021000",
    "Reference": "REF1234567890"
  }'

# اختبار test endpoint
curl -X POST https://www.marasil.site/api/shipment/webhook-smsa/test \
  -H "Content-Type: application/json"
```

### 2. الاختبار باستخدام السكريبت

```bash
# تشغيل السكريبت الشامل
node test-smsa-webhook.js

# أو تشغيل اختبارات محددة
node -e "
const { testSMSAWebhook } = require('./test-smsa-webhook.js');
testSMSAWebhook();
"
```

## 📊 أنواع الـ Scans المدعومة

| Scan Type | الوصف               | الحالة في النظام   |
| --------- | ------------------- | ------------------ |
| `DL`      | Delivered           | `Delivered`        |
| `OD`      | Out for Delivery    | `OUT_FOR_DELIVERY` |
| `AF`      | Arrived at Facility | `IN_TRANSIT`       |
| `PU`      | Picked Up           | `IN_TRANSIT`       |
| `DP`      | Departed            | `IN_TRANSIT`       |

## 🔍 معالجة البيانات

### 1. البحث عن الشحنة

النظام يبحث عن الشحنة باستخدام:

- `AWB` (Air Waybill Number)
- `Reference` (Reference Number)
- `orderId` (Order ID)

### 2. تحديث الحالة

- يتم تحديث حالة الشحنة بناءً على آخر scan
- يتم حفظ جميع الـ scans في قاعدة البيانات
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
    scanDetails: "scan_details"
  }
}
```

## ✅ اختبارات التحقق

### 1. اختبار البيانات الصحيحة

```json
[
  {
    "AWB": "231200021000",
    "Reference": "REF1234567890",
    "Pieces": 1,
    "CODAmount": 0.0,
    "ContentDesc": "Test shipment",
    "RecipientName": "Test User",
    "OriginCity": "Jeddah",
    "OriginCountry": "SA",
    "DesinationCity": "Riyadh",
    "DesinationCountry": "SA",
    "Scans": [
      {
        "ReferenceID": 10611,
        "City": "Riyadh",
        "ScanType": "OD",
        "ScanDescription": "Out for Delivery",
        "ScanDateTime": "2024-01-10T10:00:00",
        "ScanTimeZone": "+03:00"
      }
    ]
  }
]
```

**النتيجة المتوقعة:**

```json
{
  "success": true,
  "message": "SMSA webhook processed successfully",
  "processed": 1,
  "errors": 0,
  "results": [
    {
      "shipmentId": "...",
      "trackingId": "231200021000",
      "AWB": "231200021000",
      "Reference": "REF1234567890",
      "oldStatus": "READY_FOR_PICKUP",
      "newStatus": "OUT_FOR_DELIVERY",
      "statusMessage": "الشحنة جاهزة للتسليم",
      "scansCount": 1,
      "isDelivered": false
    }
  ]
}
```

### 2. اختبار البيانات غير الصحيحة

#### بدون AWB و Reference:

```json
[
  {
    "Pieces": 1,
    "CODAmount": 0.0,
    "ContentDesc": "Invalid shipment"
  }
]
```

**النتيجة المتوقعة:** `400 Bad Request`

#### شحنة غير موجودة:

```json
[
  {
    "AWB": "NONEXISTENT123",
    "Reference": "NONEXISTENT_REF",
    "Pieces": 1,
    "CODAmount": 0.0,
    "ContentDesc": "Non-existent shipment"
  }
]
```

**النتيجة المتوقعة:** `404 Not Found`

## 🔍 مراقبة الـ Webhooks

### 1. فحص الـ Logs

```bash
# فحص logs الخادم
tail -f /var/log/nginx/access.log | grep webhook-smsa
tail -f /var/log/nginx/error.log | grep webhook-smsa

# فحص logs التطبيق
pm2 logs marasil-backend | grep smsa
```

### 2. فحص قاعدة البيانات

```javascript
// فحص الشحنات المحدثة مؤخراً
db.shipments
  .find({
    shapmentCompany: "smsa",
    updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  })
  .sort({ updatedAt: -1 });

// فحص الـ scans
db.shipments
  .find({
    shapmentCompany: "smsa",
    smsaScans: { $exists: true },
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

- **السبب:** AWB أو Reference غير موجود في قاعدة البيانات
- **الحل:** تأكد من وجود الشحنة أو استخدم AWB/Reference صحيح

#### خطأ 400 - Invalid webhook data format

- **السبب:** تنسيق البيانات غير صحيح
- **الحل:** تأكد من إرسال array من البيانات

#### خطأ 500 - Internal server error

- **السبب:** خطأ في الخادم
- **الحل:** فحص logs الخادم وتحديد المشكلة

### 2. فحص الاتصال

```bash
# فحص الاتصال بالخادم
curl -I https://www.marasil.site/api/shipment/webhook-smsa

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
location /api/shipment/webhook-smsa {
    limit_req zone=smsa_webhook burst=5 nodelay;
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
  "/api/shipment/webhook-smsa",
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 50, // 50 طلب لكل IP
    message: "Too many SMSA webhook requests",
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
