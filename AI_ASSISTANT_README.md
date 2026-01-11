# 🤖 مراسيل AI Assistant

مساعد ذكي مبني بـ Google Gemini API لمساعدة التجار في إدارة شحناتهم.

## 🚀 الميزات

- **دردشة ذكية**: ردود باللغة العربية
- **تنفيذ عمليات**: إنشاء شحنات، تتبع، إلغاء، رصيد المحفظة
- **حفظ المحادثات**: تاريخ كامل للمحادثات
- **أمان عالي**: لا يتم مشاركة التوكن مع Gemini

## 📋 المتطلبات

### 1. تثبيت المكتبات

```bash
npm install @google/generative-ai
```

### 2. متغيرات البيئة

أضف إلى ملف `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. الحصول على Gemini API Key

1. اذهب إلى [Google AI Studio](https://makersuite.google.com/app/apikey)
2. أنشئ API key جديد
3. أضفه إلى متغير البيئة

### 4. اختبار الإعداد

```bash
# اختبار Gemini API
node test_gemini.js
```

## 🔧 استكشاف الأخطاء

## 🔧 الـ Endpoints

### 1. دردشة مع AI

```http
POST /api/ai/chat
```

**Request Body:**

```json
{
  "message": "تتبع الشحنة رقم 123456",
  "user_id": "60d5ecb74bb2c72b8c8b4567",
  "user_token": "jwt_token_here",
  "session_id": "optional_session_id"
}
```

**Response:**

```json
{
  "success": true,
  "message": "تم العثور على الشحنة. الحالة: تم التسليم",
  "action": "TRACK_SHIPMENT",
  "data": {
    "conversation_id": "60d5ecb74bb2c72b8c8b4567",
    "session_id": "abc123",
    "execution_result": {
      "success": true,
      "trackingNumber": "123456",
      "status": "تم التسليم",
      "details": {...}
    }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 2. تاريخ المحادثة

```http
GET /api/ai/conversation/:userId?limit=10&session_id=abc123
```

### 3. حذف محادثة

```http
DELETE /api/ai/conversation/:conversationId
```

### 4. إحصائيات المحادثات

```http
GET /api/ai/stats/:userId
```

## 🎯 الأوامر المدعومة

### تتبع شحنة

```
"تتبع الشحنة رقم 123456"
"track shipment 123456"
"حالة الشحنة MRSL789"
```

### إنشاء شحنة

```
"أريد إنشاء شحنة إلى الرياض وزن 2 كيلو"
"create shipment to jeddah 1.5kg"
"شحنة جديدة للدمام 3 كيلو"
```

### إلغاء شحنة

```
"ألغِ الشحنة رقم 123"
"cancel shipment 60d5ecb74bb2c72b8c8b4567"
```

### رصيد المحفظة

```
"كم رصيدي"
"what is my balance"
"رصيد المحفظة"
```

### قائمة الشحنات

```
"عرض شحناتي"
"show my shipments"
"قائمة الشحنات"
```

## 📊 نموذج البيانات

### Conversation Model

```javascript
{
  userId: ObjectId, // مرجع للمستخدم
  sessionId: String, // معرف الجلسة
  messages: [{
    type: "user" | "ai" | "system",
    content: String,
    timestamp: Date,
    geminiResponse: Object, // رد Gemini الخام
    executionResult: Object, // نتيجة التنفيذ
    action: String // نوع العملية
  }],
  lastActivity: Date,
  isActive: Boolean,
  metadata: {
    totalMessages: Number,
    totalActions: Number,
    lastIntent: String
  }
}
```

## 🔄 تدفق العمل

1. **استقبال الرسالة** ← المستخدم
2. **البحث عن آخر 10 رسائل** ← قاعدة البيانات
3. **بناء السياق** ← بناء النص
4. **إرسال لـ Gemini** ← API call
5. **تحليل الرد** ← JSON parsing
6. **تنفيذ العملية** ← Services
7. **حفظ المحادثة** ← قاعدة البيانات
8. **إرجاع الرد** ← JSON response

## 🛡️ الأمان

- **عدم مشاركة التوكن**: لا يتم إرسال JWT لـ Gemini
- **تحقق الهوية**: جميع الطلبات تتطلب مصادقة
- **تشفير البيانات**: البيانات الحساسة محمية
- **سجلات الأمان**: جميع العمليات مسجلة

## 🧪 الاختبار

### اختبار بسيط

```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "message": "كم رصيدي",
    "user_id": "YOUR_USER_ID"
  }'
```

### اختبار إنشاء شحنة

```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "message": "أريد إنشاء شحنة إلى الرياض وزن 2 كيلو",
    "user_id": "YOUR_USER_ID"
  }'
```

## 🚨 ملاحظات مهمة

1. **اللغة**: جميع الردود بالعربية فقط
2. **التنسيق**: Gemini يجب أن يرجع JSON فقط
3. **الأخطاء**: في حالة خطأ، يتم إرجاع رسالة خطأ واضحة
4. **الحدود**: Gemini له حدود على عدد الطلبات في الدقيقة
5. **التكلفة**: استخدام Gemini API مدفوع

## 🔧 استكشاف الأخطاء

### خطأ في JSON parsing

```
❌ [Gemini] Failed to parse JSON response
```

**الحل**: تأكد من أن Gemini يرجع JSON صالح فقط

### خطأ في API

```
❌ [Gemini] Error communicating with Gemini API
```

**الحل**: تحقق من GEMINI_API_KEY والاتصال بالإنترنت

### خطأ في تنفيذ العملية

```
❌ [AI-Shipment] Create error
```

**الحل**: تحقق من صحة البيانات وصلاحيات المستخدم

### أخطاء Gemini API

#### ❌ `models/gemini-pro is not found`
```
Error: models/gemini-pro is not found for API version v1beta
```

**الحل**: النموذج `gemini-pro` قديم. استخدم `gemini-1.5-pro` أو `gemini-1.5-flash`.

#### ❌ `GEMINI_API_KEY not found`
```
❌ [Gemini] GEMINI_API_KEY not found in environment variables
```

**الحل**: أضف مفتاح API إلى ملف `.env`:
```env
GEMINI_API_KEY=your_actual_api_key_here
```

#### ❌ `Error fetching from https://generativelanguage.googleapis.com`
```
GoogleGenerativeAIFetchError: [404 Not Found]
```

**الحل**:
- تحقق من صحة مفتاح API
- تأكد من اتصال الإنترنت
- جرب نموذج آخر
- تحقق من الحدود اليومية

#### ❌ `Cannot read properties of undefined (reading 'message')`
```
TypeError: Cannot read properties of undefined (reading 'message')
```

**الحل**: تم إصلاح هذا الخطأ في الكود. تأكد من تحديث الملفات.

## 📈 التوسع المستقبلي

- إضافة المزيد من العمليات (تعديل شحنة، إعادة جدولة)
- دعم صوتي للرسائل
- تحليل السلوكيات لتحسين الخدمة
- دعم لغات إضافية
- تكامل مع WhatsApp Business API

---

## 📞 الدعم

لأي استفسارات حول AI Assistant، يرجى مراجعة الكود أو إنشاء issue في المستودع.
