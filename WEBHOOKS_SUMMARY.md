# ملخص شامل - Webhooks لشركات الشحن

## 🎯 الهدف

تحديث حالة الشحنات تلقائياً عند استقبال webhooks من شركات الشحن المختلفة.

## ✅ ما تم إنجازه

### 1. SMSA Express Webhook

- **الملف:** `controllers/smsaWebhookController.js`
- **نقاط النهاية:**
  - `POST /api/shipment/webhook-smsa` - Webhook الرئيسي
  - `POST /api/shipment/webhook-smsa/test` - اختبار Webhook
  - `POST /api/shipment/webhook-smsa/validate` - التحقق من صحة البيانات
- **تنسيق البيانات:** Array من الشحنات مع Scans
- **المميزات:**
  - البحث باستخدام AWB أو Reference
  - معالجة أنواع مختلفة من Scans
  - حفظ معلومات الـ scans في قاعدة البيانات

### 2. RedBox Webhook

- **الملف:** `controllers/redboxWebhookController.js`
- **نقاط النهاية:**
  - `POST /api/shipment/webhook-redbox` - Webhook الرئيسي
  - `POST /api/shipment/webhook-redbox/test` - اختبار Webhook
  - `POST /api/shipment/webhook-redbox/validate` - التحقق من صحة البيانات
- **تنسيق البيانات:** JSON object مع shipment_id و status_code
- **المميزات:**
  - البحث باستخدام shipment_id أو tracking_number
  - معالجة status codes مختلفة
  - حفظ معلومات الـ webhook في قاعدة البيانات

### 3. OmniLama Webhook

- **الملف:** `controllers/omnilamaWebhookController.js`
- **نقاط النهاية:**
  - `POST /api/shipment/webhook-omnilama` - Webhook الرئيسي
  - `POST /api/shipment/webhook-omnilama/test` - اختبار Webhook
  - `POST /api/shipment/webhook-omnilama/validate` - التحقق من صحة البيانات
- **تنسيق البيانات:** JSON object مع event و data
- **المميزات:**
  - البحث باستخدام order_number أو uid
  - معالجة أحداث مختلفة (order.create, order.update, order.change_status, bid.create, bid.update, bid.change_status)
  - حفظ معلومات الـ webhook في قاعدة البيانات

### 4. Aramex Webhook

- **الملف:** `controllers/aramexWebhookController.js`
- **نقاط النهاية:**
  - `POST /api/shipment/webhook-aramex` - Webhook الرئيسي
  - `POST /api/shipment/webhook-aramex/test` - اختبار Webhook
  - `POST /api/shipment/webhook-aramex/validate` - التحقق من صحة البيانات
- **تنسيق البيانات:** JSON object مع tracking_number و status_code
- **المميزات:**
  - البحث باستخدام tracking_number أو awb_number أو shipment_id
  - معالجة status codes مختلفة
  - حفظ معلومات الـ webhook في قاعدة البيانات

### 5. Webhook عام

- **الملف:** `controllers/shapmentController.js`
- **نقطة النهاية:** `POST /api/shipment/webhook-update-shipment-status`
- **تنسيق البيانات:** JSON object مع trackingNumber و newStatus
- **المميزات:**
  - معالجة عامة لجميع شركات الشحن
  - البحث باستخدام trackingNumber
  - تحديث حالة الشحنة

## 📊 مقارنة الـ Webhooks

| الميزة             | SMSA                 | RedBox                      | OmniLama                 | Aramex                     | General                   |
| ------------------ | -------------------- | --------------------------- | ------------------------ | -------------------------- | ------------------------- |
| **تنسيق البيانات** | Array                | Object                      | Object                   | Object                     | Object                    |
| **البحث**          | AWB/Reference        | shipment_id/tracking_number | order_number/uid         | tracking_number/awb_number | trackingNumber            |
| **أنواع التحديث**  | Scan Types           | Status Codes                | Events                   | Status Codes               | Status Names              |
| **حفظ البيانات**   | smsaScans            | redboxWebhookData           | omnilamaOrderData        | aramexWebhookData          | -                         |
| **الاختبار**       | test-smsa-webhook.js | test-redbox-webhook.js      | test-omnilama-webhook.js | test-aramex-webhook.js     | test-shipping-webhooks.js |

## 🔧 كيفية العمل

### 1. SMSA Express

```javascript
// تنسيق البيانات
[
  {
    AWB: "231200021000",
    Reference: "REF1234567890",
    Scans: [
      {
        ScanType: "OD",
        ScanDescription: "Out for Delivery",
        ScanDateTime: "2024-01-10T10:00:00",
      },
    ],
  },
];
```

### 2. RedBox

```javascript
// تنسيق البيانات
{
  "shipment_id": "TEST123456789",
  "tracking_number": "TRK123456789",
  "status_code": "out_for_delivery",
  "status_name": "Out for Delivery",
  "date": "2024-01-10T10:00:00.000Z"
}
```

### 3. OmniLama

```javascript
// تنسيق البيانات
{
  "event": "order.change_status",
  "data": {
    "order_number": "8200521059",
    "uid": "b26e28bd004a4d51a7b0b33fecc20d01",
    "status": 50,
    "initiator_status_code": "111",
    "initiator_status_name": "Order accepted",
    "status_changed_at": "2025-05-15T17:00:01.347703+03:00"
  }
}
```

### 4. Aramex

```javascript
// تنسيق البيانات
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

### 5. General

```javascript
// تنسيق البيانات
{
  "trackingNumber": "TRK123456789",
  "newStatus": "OUT_FOR_DELIVERY",
  "company": "smsa"
}
```

## 🧪 الاختبار

### 1. SMSA Express

```bash
# اختبار سريع
node test-smsa-webhook.js

# اختبار debug
node test-smsa-debug.js

# اختبار validation
node test-smsa-validation.js
```

### 2. RedBox

```bash
# اختبار شامل
node test-redbox-webhook.js

# اختبار curl
curl -X POST https://www.marasil.site/api/shipment/webhook-redbox \
  -H "Content-Type: application/json" \
  -d '{
    "shipment_id": "TEST123456789",
    "tracking_number": "TRK123456789",
    "status_code": "out_for_delivery"
  }'
```

### 3. OmniLama

```bash
# اختبار شامل
node test-omnilama-webhook.js

# اختبار curl
curl -X POST https://www.marasil.site/api/shipment/webhook-omnilama \
  -H "Content-Type: application/json" \
  -d '{
    "event": "order.change_status",
    "data": {
      "order_number": "8200521059",
      "uid": "b26e28bd004a4d51a7b0b33fecc20d01",
      "status": 50,
      "initiator_status_code": "111",
      "initiator_status_name": "Order accepted"
    }
  }'
```

### 4. Aramex

```bash
# اختبار شامل
node test-aramex-webhook.js

# اختبار curl
curl -X POST https://www.marasil.site/api/shipment/webhook-aramex \
  -H "Content-Type: application/json" \
  -d '{
    "tracking_number": "TEST123456789",
    "awb_number": "AWB123456789",
    "status": "Out for Delivery",
    "status_code": "OUT_FOR_DELIVERY"
  }'
```

### 5. General

```bash
# اختبار شامل
node test-shipping-webhooks.js

# اختبار curl
curl -X POST https://www.marasil.site/api/shipment/webhook-update-shipment-status \
  -H "Content-Type: application/json" \
  -d '{
    "trackingNumber": "TRK123456789",
    "newStatus": "OUT_FOR_DELIVERY",
    "company": "smsa"
  }'
```

## 🔍 المراقبة

### 1. فحص الـ Logs

```bash
# فحص logs التطبيق
pm2 logs marasil-backend | grep webhook

# فحص logs Nginx
tail -f /var/log/nginx/access.log | grep webhook
```

### 2. فحص قاعدة البيانات

```javascript
// فحص الشحنات المحدثة مؤخراً
db.shipments
  .find({
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
- **الحل:** تأكد من وجود الشحنة أو استخدم معرفات صحيحة

#### خطأ 400 - Invalid webhook data format

- **السبب:** تنسيق البيانات غير صحيح
- **الحل:** تأكد من إرسال البيانات بالتنسيق الصحيح

#### خطأ 500 - Internal server error

- **السبب:** خطأ في الخادم
- **الحل:** فحص logs الخادم وتحديد المشكلة

### 2. فحص الاتصال

```bash
# فحص الاتصال بالخادم
curl -I https://www.marasil.site/api/shipment/webhook-smsa
curl -I https://www.marasil.site/api/shipment/webhook-redbox
curl -I https://www.marasil.site/api/shipment/webhook-omnilama
curl -I https://www.marasil.site/api/shipment/webhook-aramex
curl -I https://www.marasil.site/api/shipment/webhook-update-shipment-status

# فحص SSL
openssl s_client -connect www.marasil.site:443
```

## 📈 مراقبة الأداء

### 1. إحصائيات الاستجابة

- **متوسط وقت الاستجابة:** < 1000ms
- **معدل النجاح:** > 99%
- **الحد الأقصى للطلبات:** 50/دقيقة لكل webhook

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
# SMSA Webhook
location /api/shipment/webhook-smsa {
    limit_req zone=smsa_webhook burst=5 nodelay;
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# RedBox Webhook
location /api/shipment/webhook-redbox {
    limit_req zone=redbox_webhook burst=5 nodelay;
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# OmniLama Webhook
location /api/shipment/webhook-omnilama {
    limit_req zone=omnilama_webhook burst=5 nodelay;
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Aramex Webhook
location /api/shipment/webhook-aramex {
    limit_req zone=aramex_webhook burst=5 nodelay;
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# General Webhook
location /api/shipment/webhook-update-shipment-status {
    limit_req zone=general_webhook burst=10 nodelay;
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

app.use(
  "/api/shipment/webhook-redbox",
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 50, // 50 طلب لكل IP
    message: "Too many RedBox webhook requests",
  })
);

app.use(
  "/api/shipment/webhook-omnilama",
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 50, // 50 طلب لكل IP
    message: "Too many OmniLama webhook requests",
  })
);

app.use(
  "/api/shipment/webhook-aramex",
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 50, // 50 طلب لكل IP
    message: "Too many Aramex webhook requests",
  })
);

app.use(
  "/api/shipment/webhook-update-shipment-status",
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 100, // 100 طلب لكل IP
    message: "Too many webhook requests",
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
