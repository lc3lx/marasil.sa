# 🤖 AI Service - خدمة الذكاء الاصطناعي

## نظرة عامة

خدمة AI مبنية على نموذج **Phi-3 Mini** من Microsoft - نموذج صغير وقوي يمكن استضافته محلياً.

## المميزات

✅ **نموذج صغير** - حجم ~2GB فقط
✅ **مفتوح المصدر** - قابل للتطوير والتعديل
✅ **Fine-tuning** - مدرب على بيانات الشحن
✅ **سريع** - استجابة في أقل من ثانية
✅ **محلي** - لا يحتاج API keys خارجية
✅ **آمن** - البيانات لا تخرج من السيرفر

## المتطلبات

### الأجهزة (Hardware)
- **RAM**: 8GB على الأقل (16GB موصى به)
- **GPU**: اختياري (يسرع التوليد 10x)
- **Storage**: 5GB مساحة فارغة

### البرمجيات (Software)
- Python 3.9 أو أحدث
- pip (مدير الحزم)
- CUDA (اختياري للـ GPU)

## التثبيت

### 1. تثبيت المتطلبات

```bash
cd ai-service
pip install -r requirements.txt
```

### 2. تحميل النموذج (أول مرة فقط)

النموذج سيتم تحميله تلقائياً عند أول تشغيل (~2GB)

### 3. تشغيل الخدمة

```bash
python app.py
```

الخدمة ستعمل على: `http://localhost:5000`

## الاستخدام

### API Endpoints

#### 1. فحص الصحة
```bash
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_name": "microsoft/Phi-3-mini-4k-instruct"
}
```

#### 2. المحادثة
```bash
POST /chat
Content-Type: application/json

{
  "message": "بدي أنشئ شحنة لأحمد في جدة",
  "history": [
    {"role": "user", "content": "مرحبا"},
    {"role": "assistant", "content": "أهلاً! كيف بقدر أساعدك؟"}
  ]
}
```

**Response:**
```json
{
  "response": "تمام! بنشئ شحنة لأحمد في جدة 📦\n\nبس أحتاج:\n- رقم الهاتف؟\n- العنوان؟\n- الوزن؟",
  "intent": "create_shipment",
  "entities": {
    "name": "أحمد",
    "city": "جدة"
  },
  "confidence": 0.92
}
```

#### 3. تحليل النية فقط
```bash
POST /analyze
Content-Type: application/json

{
  "message": "وين شحنتي؟"
}
```

**Response:**
```json
{
  "intent": "track_shipment",
  "entities": {},
  "confidence": 0.85
}
```

## Fine-tuning (إعادة التدريب)

### 1. تحضير البيانات

عدل ملف `fine_tune.py` وأضف أمثلة تدريب:

```python
TRAINING_DATA = [
    {
        "input": "بدي أنشئ شحنة",
        "output": "تمام! بنشئ شحنة..."
    },
    # أضف المزيد...
]
```

### 2. تشغيل التدريب

```bash
python fine_tune.py
```

سيتم حفظ النموذج المدرب في `./fine_tuned_model`

### 3. استخدام النموذج المدرب

عدل `app.py`:
```python
MODEL_NAME = "./fine_tuned_model"  # بدلاً من microsoft/Phi-3-mini-4k-instruct
```

## التحسينات

### تسريع التوليد

1. **استخدام GPU**:
```python
model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    device_map="cuda",  # بدلاً من "auto"
    torch_dtype=torch.float16,
)
```

2. **تقليل الدقة** (4-bit quantization):
```python
load_in_4bit=True  # موجود بالفعل
```

3. **تقليل max_new_tokens**:
```python
max_new_tokens=128  # بدلاً من 256
```

### توفير الذاكرة

1. **استخدام CPU فقط**:
```python
device_map="cpu"
```

2. **تقليل batch size**:
```python
# في التدريب
per_device_train_batch_size=1
```

## الإنتاج (Production)

### Docker

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 5000
CMD ["python", "app.py"]
```

### بناء وتشغيل:
```bash
docker build -t marasil-ai .
docker run -p 5000:5000 marasil-ai
```

### مع GPU:
```bash
docker run --gpus all -p 5000:5000 marasil-ai
```

## التكامل مع الفرونت اند

في `v7-ai-chat.tsx`:

```typescript
// تفعيل Backend AI
setAiEngine(new AIEngine(context, true)); // true = استخدام Backend
```

في `.env.local`:
```env
NEXT_PUBLIC_AI_API_URL=http://localhost:5000
```

## استكشاف الأخطاء

### المشكلة: "Out of Memory"
**الحل**: 
- استخدم `load_in_4bit=True`
- قلل `max_new_tokens`
- أغلق برامج أخرى

### المشكلة: "Model loading slow"
**الحل**:
- النموذج يحمل مرة واحدة فقط
- استخدم SSD بدلاً من HDD
- استخدم GPU إذا متوفر

### المشكلة: "Connection refused"
**الحل**:
- تأكد أن الخدمة تعمل: `python app.py`
- تحقق من البورت: `http://localhost:5000/health`
- تحقق من الـ firewall

## البدائل

### نماذج أخرى صغيرة:

1. **TinyLlama** (1.1B) - أصغر وأسرع
2. **Phi-2** (2.7B) - أصغر من Phi-3
3. **Gemma-2B** من Google - جودة عالية

### تغيير النموذج:

```python
MODEL_NAME = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
```

## الأداء

### Phi-3 Mini على CPU:
- **التحميل**: 10-30 ثانية (مرة واحدة)
- **التوليد**: 1-3 ثواني للرد
- **الذاكرة**: 4-6 GB RAM

### Phi-3 Mini على GPU:
- **التحميل**: 5-10 ثواني
- **التوليد**: 0.2-0.5 ثانية
- **الذاكرة**: 2-3 GB VRAM

## الدعم

للمساعدة أو الاستفسارات:
- راجع التوثيق أعلاه
- تحقق من الـ logs
- افحص `/health` endpoint

---

**تم التطوير بواسطة**: فريق مراسل
**الإصدار**: 1.0.0
**النموذج**: Phi-3 Mini (Microsoft)
