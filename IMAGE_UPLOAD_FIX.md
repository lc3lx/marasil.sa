# إصلاح مشكلة رفع الصور

## المشاكل التي تم إصلاحها

### 1. مشكلة في الباك إند (Backend)

#### المشكلة الأولى: التحقق من Content-Type
في `controllers/adminController.js`، كان الـ middleware `UploadCustomerImage` يتحقق من أن الـ `Content-Type` يحتوي على `multipart/form-data` قبل تشغيل multer. هذا كان يسبب رفض الطلبات.

**الحل:**
```javascript
// قبل:
exports.UploadCustomerImage = (req, res, next) => {
  if (!req.headers["content-type"].includes("multipart/form-data")) {
    return res.status(400).json({ error: "..." });
  }
  // ...
};

// بعد:
exports.UploadCustomerImage = UploadArrayofImages([
  { name: "profileImage", maxCount: 1 },
  { name: "brand_logo", maxCount: 1 },
]);
```

### 2. مشكلة في الفرونت إند (Frontend)

#### المشكلة الثانية: إضافة Content-Type يدوياً
في `app/api/customBaseQuery.ts`، كان الكود يضيف `Content-Type: application/json` تلقائياً لجميع الطلبات، حتى عند إرسال FormData. هذا يمنع المتصفح من إضافة الـ boundary الصحيح للـ multipart/form-data.

**الحل:**
```typescript
// قبل:
prepareHeaders: (headers, { endpoint, type }) => {
  // ...
  if (!headers.get("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

// بعد:
prepareHeaders: (headers, { endpoint, type, getState }) => {
  // ...
  // لا نضيف Content-Type هنا، سيتم إضافته تلقائياً حسب نوع الـ body
  if (!headers.has("Content-Type")) {
    // لا نضيف Content-Type هنا
  }
  return headers;
}
```

### 3. تحسينات في الـ Logging

تم إضافة logging مفصل في:
- `ResizeImage` middleware
- `updateLoggedCustomerdata` controller
- `getMe` controller

هذا سيساعد في تتبع مسار الصورة من الرفع حتى الحفظ في الـ database.

## كيفية الاختبار

1. **تشغيل الباك إند:**
   ```bash
   npm start
   ```

2. **تشغيل الفرونت إند:**
   ```bash
   npm run dev
   ```

3. **رفع صورة البروفيل:**
   - اذهب إلى صفحة الملف الشخصي
   - اضغط على أيقونة الكاميرا لرفع صورة
   - اختر صورة (أقل من 5MB)
   - راقب الـ console في الباك إند

4. **رفع شعار الشركة:**
   - اذهب إلى تبويب "معلومات الشركة"
   - اضغط على "رفع اللوجو"
   - اختر صورة
   - اضغط "حفظ التغييرات"

## ما يجب أن تراه في الـ Console

### عند رفع الصورة بنجاح:

```
========== ResizeImage Middleware ==========
📁 req.files: { profileImage: [ { ... } ] }
✅ profileImage found in req.files
✅ تم حفظ صورة البروفيل: profileImage-xxx-xxx.jpeg
========== End ResizeImage Middleware ==========

========== updateLoggedCustomerdata Controller ==========
📝 req.body.profileImage: profileImage-xxx-xxx.jpeg
✅ سيتم تحديث profileImage في الـ database: profileImage-xxx-xxx.jpeg
✅ تم تحديث العميل في الـ database
✅ profileImage في الـ database: profileImage-xxx-xxx.jpeg
🔍 raw profileImage: profileImage-xxx-xxx.jpeg
✅ profileImage في الـ response: /uploads/customers/profileImage-xxx-xxx.jpeg
========== End updateLoggedCustomerdata Controller ==========
```

### إذا لم تصل الصورة:

```
========== ResizeImage Middleware ==========
❌ لا توجد صورة بروفيل في req.files
========== End ResizeImage Middleware ==========

========== updateLoggedCustomerdata Controller ==========
❌ لا يوجد profileImage في req.body
========== End updateLoggedCustomerdata Controller ==========
```

## الملفات المعدلة

1. `controllers/adminController.js` - تبسيط middleware وإضافة logging وإصلاح تكرار المسارات
2. `app/api/customBaseQuery.ts` - إزالة إضافة Content-Type التلقائي
3. `app/api/customerApi.ts` - إضافة logging للـ FormData
4. `models/customerModel.js` - إزالة hooks التي تضيف BASE_URL تلقائياً
5. `scripts/cleanImagePaths.js` - script لتنظيف البيانات القديمة

## تنظيف البيانات القديمة

إذا كانت لديك بيانات قديمة في الـ database تحتوي على مسارات كاملة للصور، قم بتشغيل الـ script التالي:

```bash
cd d:\work\last 1\mararsil-main
node scripts/cleanImagePaths.js
```

هذا الـ script سيقوم بـ:
- جلب جميع العملاء من الـ database
- التحقق من مسارات الصور (profileImage و brand_logo)
- إزالة المسارات الكاملة والاحتفاظ باسم الملف فقط
- تحديث الـ database

## ملاحظات مهمة

- **لا تضيف Content-Type يدوياً** عند إرسال FormData - سيتم إضافته تلقائياً من المتصفح مع الـ boundary الصحيح
- **تأكد من وجود مجلدات الرفع:**
  - `uploads/customers/` للصور الشخصية
  - `uploads/Logo/` لشعارات الشركات
- **حجم الملف الأقصى:** 5MB
- **الأنواع المدعومة:** صور (image/*) و PDF
- **مسارات الصور في الـ database:** يجب أن تحتوي على اسم الملف فقط (مثل `profileImage-xxx.jpeg`)، وليس المسار الكامل
