# ملخص SMSA Webhook - تحديث حالة الشحنات

## 🎯 الهدف

تحديث حالة الشحنات تلقائياً عند استقبال webhook من SMSA Express.

## ✅ ما تم إنجازه

### 1. معالج Webhook مخصص

- **الملف:** `controllers/smsaWebhookController.js`
- **الوظيفة:** معالجة webhooks من SMSA Express
- **المميزات:**
  - البحث عن الشحنة باستخدام AWB أو Reference
  - تحديث حالة الشحنة بناءً على آخر scan
  - حفظ معلومات الـ scans في قاعدة البيانات
  - إرسال إشعار للعميل

### 2. نقاط النهاية (Endpoints)

- **POST** `/api/shipment/webhook-smsa` - Webhook الرئيسي
- **POST** `/api/shipment/webhook-smsa/test` - اختبار Webhook
- **POST** `/api/shipment/webhook-smsa/validate` - التحقق من صحة البيانات

### 3. أنواع التحديثات المدعومة

| Scan Type | الوصف               | الحالة الجديدة     |
| --------- | ------------------- | ------------------ |
| `DL`      | Delivered           | `Delivered`        |
| `OD`      | Out for Delivery    | `OUT_FOR_DELIVERY` |
| `AF`      | Arrived at Facility | `IN_TRANSIT`       |
| `PU`      | Picked Up           | `IN_TRANSIT`       |
| `DP`      | Departed            | `IN_TRANSIT`       |

## 🔧 كيفية العمل

### 1. استقبال Webhook

```javascript
// عند استقبال webhook من SMSA
POST /api/shipment/webhook-smsa
Content-Type: application/json

[
  {
    "AWB": "231200021000",
    "Reference": "REF1234567890",
    "Scans": [
      {
        "ScanType": "OD",
        "ScanDescription": "Out for Delivery",
        "ScanDateTime": "2024-01-10T10:00:00"
      }
    ]
  }
]
```

### 2. معالجة البيانات

1. **البحث عن الشحنة** باستخدام AWB أو Reference
2. **تحديد الحالة الجديدة** بناءً على آخر scan
3. **تحديث الشحنة** في قاعدة البيانات
4. **إرسال إشعار** للعميل

### 3. النتيجة

```javascript
{
  "success": true,
  "message": "SMSA webhook processed successfully",
  "processed": 1,
  "errors": 0,
  "results": [
    {
      "shipmentId": "...",
      "trackingId": "231200021000",
      "oldStatus": "READY_FOR_PICKUP",
      "newStatus": "OUT_FOR_DELIVERY",
      "statusMessage": "الشحنة جاهزة للتسليم"
    }
  ]
}
```

## 🧪 الاختبار

### 1. اختبار سريع

```bash
# اختبار test endpoint
curl -X POST https://www.marasil.site/api/shipment/webhook-smsa/test \
  -H "Content-Type: application/json"
```

### 2. اختبار التحقق

```bash
# اختبار validate endpoint
curl -X POST https://www.marasil.site/api/shipment/webhook-smsa/validate \
  -H "Content-Type: application/json" \
  -d '{
    "AWB": "YOUR_AWB_NUMBER",
    "Reference": "YOUR_REFERENCE_NUMBER"
  }'
```

### 3. اختبار Webhook كامل

```bash
# اختبار webhook مع بيانات حقيقية
curl -X POST https://www.marasil.site/api/shipment/webhook-smsa \
  -H "Content-Type: application/json" \
  -d '[
    {
      "AWB": "YOUR_AWB_NUMBER",
      "Reference": "YOUR_REFERENCE_NUMBER",
      "Scans": [
        {
          "ScanType": "OD",
          "ScanDescription": "Out for Delivery",
          "ScanDateTime": "2024-01-10T10:00:00"
        }
      ]
    }
  ]'
```

## 🔍 المراقبة

### 1. فحص الـ Logs

```bash
# فحص logs التطبيق
pm2 logs marasil-backend | grep smsa

# فحص logs Nginx
tail -f /var/log/nginx/access.log | grep webhook-smsa
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

- **السبب:** الشحنة غير موجودة في قاعدة البيانات
- **الحل:**
  1. تأكد من وجود الشحنة
  2. تحقق من `trackingId` و `orderId`
  3. تأكد من أن `shapmentCompany` = "smsa"

#### خطأ 400 - Invalid webhook data format

- **السبب:** تنسيق البيانات غير صحيح
- **الحل:** تأكد من إرسال array من البيانات

#### خطأ 500 - Internal server error

- **السبب:** خطأ في الخادم
- **الحل:** فحص logs الخادم

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
