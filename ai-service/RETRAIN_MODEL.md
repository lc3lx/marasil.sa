# 🔄 إعادة تدريب النموذج - إصلاح مشكلة Size Mismatch

## 🚨 المشكلة
النموذج تم تدريبه على `Qwen/Qwen2.5-3B-Instruct` لكن التطبيق يحاول تحميله على نموذج مختلف.

## ✅ الحل

### 1. حذف النموذج القديم
```bash
rm -rf marasil-ai-v1.0/
```

### 2. التأكد من النموذج الأساسي في fine_tune.py
```python
BASE_MODEL = "Qwen/Qwen2.5-3B-Instruct"  # تأكد من هذا
```

### 3. إعادة التدريب
```bash
python fine_tune.py
```

### 4. إعادة تشغيل الخدمة
```bash
python app.py
```

## 📊 التأكد من النجاح
بعد التشغيل، يجب أن ترى:
```
🎯 تم العثور على نموذج مدرب في: ./marasil-ai-v1.0
🔄 تحميل النموذج المدرب على GPU: ./marasil-ai-v1.0 (fp16)
🔧 تم تحميل محول LoRA بنجاح
✅ تم تحميل النموذج مدرب (مراسيل 1.0): ./marasil-ai-v1.0
```

## 🔧 إعدادات النموذج
- **نموذج التدريب**: `Qwen/Qwen2.5-3B-Instruct`
- **نموذج التطبيق**: `Qwen/Qwen2.5-3B-Instruct`
- **أبعاد متوقعة**: 2048, 11008
- **LoRA Rank**: 16

## 🚀 بدء سريع
```bash
# حذف القديم
rm -rf marasil-ai-v1.0/

# تدريب جديد
python fine_tune.py

# تشغيل
python app.py
```














