# إعداد Google Gemini AI API

## خطوات الإعداد:

### 1. الحصول على API Key
1. اذهب إلى: https://makersuite.google.com/app/apikey
2. قم بتسجيل الدخول بحساب Google
3. أنشئ مفتاح API جديد
4. انسخ المفتاح

### 2. إعداد متغيرات البيئة
أضف هذا السطر إلى ملف `.env`:

```bash
GEMINI_API_KEY=your_actual_api_key_here
```

### 3. التحقق من الإعداد
تأكد من أن المفتاح صحيح وأن النموذج متوفر:

```bash
# في terminal الخادم
node -e "
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
console.log('✅ Gemini API key configured successfully');
"
```

## استكشاف الأخطاء:

### خطأ: `models/gemini-pro is not found`
**الحل**: تأكد من استخدام النموذج الصحيح:
- ✅ `gemini-1.5-pro` (موصى به)
- ❌ `gemini-pro` (قديم)

### خطأ: `GEMINI_API_KEY not found`
**الحل**: أضف المفتاح إلى ملف `.env`

### خطأ: `Error fetching from...`
**الحل**:
- تحقق من اتصال الإنترنت
- تأكد من صحة المفتاح
- تحقق من أن الحساب لديه صلاحية استخدام Gemini API

## النماذج المتاحة:

- `gemini-1.5-pro`: الأكثر ذكاءً وأدق
- `gemini-1.5-flash`: أسرع وأقل تكلفة

## ملاحظات مهمة:

- Gemini API ليس مجانياً بالكامل
- هناك حدود يومية للاستخدام
- تأكد من عدم مشاركة مفتاح API علناً
- استخدم متغيرات البيئة لأمان أكبر
