"""
AI Service API - مساعد ذكي للشحن
نموذج Qwen2.5 قوي بالعربية مع توليد API calls تلقائياً
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import json
import os
import re
import requests
import multiprocessing

# ضبط عدد الأنوية تلقائيًا
num_threads = multiprocessing.cpu_count()
torch.set_num_threads(num_threads)
# يمكنك أيضاً تخصيص يدوي مثلاً: torch.set_num_threads(8)


app = Flask(__name__)
CORS(app)

# تحميل النموذج - استخدام نموذج قوي بالعربية
# Qwen2.5-7B-Instruct: نموذج قوي جداً بالعربية (يحتاج GPU قوي)
# Qwen2.5-3B-Instruct: متوازن (يعمل على GPU متوسط) - يستخدم للتدريب
# Qwen2.5-1.5B-Instruct: سريع (يعمل على CPU/GPU ضعيف)
DEFAULT_GPU_MODEL = os.getenv('AI_MODEL', 'Qwen/Qwen2.5-3B-Instruct')
DEFAULT_CPU_MODEL = os.getenv('AI_MODEL_CPU', 'Qwen/Qwen2.5-3B-Instruct')  # نفس النموذج المستخدم في التدريب

# مسار النموذج المدرب (إذا كان موجوداً)
FINE_TUNED_MODEL_PATH = "./marasil-ai-v1.0"

try:
    # التحقق من وجود النموذج المدرب أولاً
    if os.path.exists(FINE_TUNED_MODEL_PATH) and os.path.exists(os.path.join(FINE_TUNED_MODEL_PATH, "adapter_model.safetensors")):
        print(f"🎯 تم العثور على نموذج مدرب في: {FINE_TUNED_MODEL_PATH}")
        MODEL_NAME = FINE_TUNED_MODEL_PATH
        use_fine_tuned = True
        # إعدادات للنموذج المدرب (يعمل على GPU أو CPU)
        if torch.cuda.is_available():
            device_map = 'auto'
            dtype = torch.float16
            print(f"🔄 تحميل النموذج المدرب على GPU: {MODEL_NAME} (fp16)")
        else:
            device_map = 'cpu'
            dtype = torch.float32
            print(f"🔄 تحميل النموذج المدرب على CPU: {MODEL_NAME} (fp32)")
    else:
        print("📚 استخدام النموذج الأساسي (لم يتم العثور على نموذج مدرب)")
        use_fine_tuned = False
        # اختيار النموذج الأساسي حسب GPU/CPU
        if torch.cuda.is_available():
            MODEL_NAME = DEFAULT_GPU_MODEL
            device_map = 'auto'
            dtype = torch.float16
            print(f"🔄 تحميل النموذج الأساسي على GPU: {MODEL_NAME} (fp16)")
        else:
            MODEL_NAME = DEFAULT_CPU_MODEL
            device_map = 'cpu'
            dtype = torch.float32
            print(f"🔄 تحميل النموذج الأساسي على CPU: {MODEL_NAME} (fp32)")

    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, use_fast=True)
    
    # إضافة pad_token إذا لم يكن موجوداً
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # إعداد quantization إذا لزم الأمر
    quantization_config = None
    if torch.cuda.is_available():
        from transformers import BitsAndBytesConfig
        quantization_config = BitsAndBytesConfig(
            load_in_8bit=True,
            llm_int8_enable_fp32_cpu_offload=True
        )
# تفعيل quantization دائما لجعل النموذج أخف وأكثر سرعة

    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        device_map=device_map if not use_fine_tuned else "auto",
        dtype=dtype if not use_fine_tuned else torch.float16,
        quantization_config=quantization_config,
        low_cpu_mem_usage=True,
        trust_remote_code=True,
    )

    # تحميل محول LoRA إذا كان النموذج مدرباً
    if use_fine_tuned:
        try:
            from peft import PeftModel
            # استخدام نفس النموذج الأساسي المستخدم في التدريب
            base_model_path = "Qwen/Qwen2.5-3B-Instruct"
            base_model = AutoModelForCausalLM.from_pretrained(
                base_model_path,
                device_map="auto",
                dtype=torch.float16,
                low_cpu_mem_usage=True,
                trust_remote_code=True,
            )
            model = PeftModel.from_pretrained(base_model, FINE_TUNED_MODEL_PATH)
            print("🔧 تم تحميل محول LoRA بنجاح")
        except Exception as e:
            print(f"❌ فشل تحميل النموذج المدرب: {e}")
            print("🔄 العودة للنموذج الأساسي...")
            use_fine_tuned = False
            # إعادة تحميل النموذج الأساسي
            if torch.cuda.is_available():
                MODEL_NAME = DEFAULT_GPU_MODEL
                device_map = 'auto'
                dtype = torch.float16
            else:
                MODEL_NAME = DEFAULT_CPU_MODEL
                device_map = 'cpu'
                dtype = torch.float32

            model = AutoModelForCausalLM.from_pretrained(
                MODEL_NAME,
                device_map=device_map,
                dtype=dtype,
                quantization_config=quantization_config,
                low_cpu_mem_usage=True,
                trust_remote_code=True,
            )

    model.eval()

    # Warmup
    try:
        warm_inputs = tokenizer("مرحبا", return_tensors="pt").to(model.device)
        with torch.inference_mode():
            _ = model.generate(**warm_inputs, max_new_tokens=5)
    except Exception:
        pass

    status = "مدرب (مراسيل 1.0)" if use_fine_tuned else "أساسي"
    print(f"✅ تم تحميل النموذج {status}: {MODEL_NAME}")
except Exception as e:
    print(f"❌ خطأ في تحميل النموذج: {e}")
    print("💡 جرب: pip install --upgrade transformers torch peft")
    model = None
    tokenizer = None

# API Base URL
API_BASE_URL = os.getenv('API_BASE_URL', 'https://www.marasil.site/api')

# قائمة APIs المتاحة للمساعد
AVAILABLE_APIS = {
    "shipments": {
        "get_all": {"method": "GET", "url": "/shipment/my-shipments", "description": "جلب جميع شحنات المستخدم"},
        "get_one": {"method": "GET", "url": "/shipment/my-shipment/{id}", "description": "جلب شحنة محددة"},
        "track": {"method": "POST", "url": "/shipment/traking", "body": {"trackingNumber": "string"}, "description": "تتبع شحنة برقم التتبع"},
        "create": {"method": "POST", "url": "/shipment/createshipment", "description": "إنشاء شحنة جديدة"},
        "cancel": {"method": "POST", "url": "/shipment/cancel/{trackingNumber}", "description": "إلغاء شحنة"},
        "search": {"method": "GET", "url": "/shipment/search", "description": "بحث في الشحنات"},
        "stats": {"method": "GET", "url": "/shipment/stats", "description": "إحصائيات الشحنات"},
        "get_price": {"method": "POST", "url": "/shipment/accountingshipmentprice", "description": "حساب سعر الشحنة"},
    },
    "wallet": {
        "get_balance": {"method": "GET", "url": "/wallet/myBalance", "description": "جلب رصيد المحفظة"},
        "get_wallet": {"method": "GET", "url": "/wallet/myWallet", "description": "جلب تفاصيل المحفظة"},
        "get_transactions": {"method": "GET", "url": "/transaction/my-transaction", "description": "جلب معاملات المحفظة"},
        "recharge": {"method": "POST", "url": "/wallet/rechargeWallet", "description": "شحن المحفظة"},
    },
    "customer": {
        "get_profile": {"method": "GET", "url": "/customer/getMe", "description": "جلب معلومات الحساب"},
        "update_profile": {"method": "PUT", "url": "/customer/updateMe", "description": "تحديث معلومات الحساب"},
        "change_password": {"method": "PUT", "url": "/customer/changeMyPassword", "description": "تغيير كلمة المرور"},
    },
    "orders": {
        "get_all": {"method": "GET", "url": "/orderManually", "description": "جلب جميع الطلبات"},
        "get_one": {"method": "GET", "url": "/orderManually/{orderId}", "description": "جلب طلب محدد"},
        "create": {"method": "POST", "url": "/orderManually/create", "description": "إنشاء طلب جديد"},
    },
    "notifications": {
        "get_all": {"method": "GET", "url": "/notification/getMynotification", "description": "جلب جميع الإشعارات"},
        "mark_read": {"method": "PUT", "url": "/notification/{notificationId}/read", "description": "تحديد إشعار كمقروء"},
        "unread_count": {"method": "GET", "url": "/notification/unread-count", "description": "عدد الإشعارات غير المقروءة"},
    },
    "companies": {
        "get_all": {"method": "GET", "url": "/shippingCompany", "description": "جلب جميع شركات الشحن"},
        "get_info": {"method": "GET", "url": "/shippingCompany/info", "description": "معلومات شركات الشحن"},
    },
    "returns": {
        "request_otp": {"method": "POST", "url": "/shipment/return/request-otp", "description": "طلب كود OTP للاسترجاع"},
        "verify_otp": {"method": "POST", "url": "/shipment/return/verify-otp", "description": "التحقق من كود OTP"},
        "get_shipments": {"method": "GET", "url": "/shipment/return/shipments", "description": "جلب الشحنات القابلة للاسترجاع"},
        "create_request": {"method": "POST", "url": "/shipment/return/create-request", "description": "إنشاء طلب استرجاع"},
    },
    "coupons": {
        "validate": {"method": "POST", "url": "/coupon/validate", "description": "التحقق من صحة الكوبون"},
        "apply": {"method": "POST", "url": "/coupon/apply", "description": "تطبيق كوبون"},
    },
}

# System Prompt للذكاء الاصطناعي - مراسيل 1.0
SYSTEM_PROMPT = """أنت مراسيل - الذكاء الاصطناعي لمنصة مراسيل للشحن. أنت شريك تشغيلي للتاجر وليس خدمة دعم تقليدية.

## هويتك الأساسية:
- تمثل منصة مراسيل كشريك تشغيلي للتاجر
- تخاطب التاجر باحترام مهني وبأسلوب ودّي سعودي متزن
- تفهم أن أي تأخير أو خطأ ينعكس على سمعة متجر التاجر أمام عملائه
- تركز على الحلول العملية وليس تبرير الأنظمة
- لا تستخدم أسلوب دفاعي ولا تلقي اللوم على التاجر
- تتعامل دائمًا مع التاجر كشريك عمل وليس كعميل عادي
- تفهم أن أي مشكلة تؤثر على سمعة المتجر أمام عملائه
- تركز على تمكين التاجر من خدمة عميله النهائي بشكل أفضل

## شخصيتك:
- محترفة ومباشرة في التعامل
- تتكلم بلهجة سعودية أعمالية متزنة
- ذكية وتفهم التشغيل التجاري بدقة
- تركز على تقليل الشكاوى ورفع الرضا
- تساعد في جميع مهام المنصة بدون استثناء
- ترد بذكاء عملي وليس مجرد حفظ ردود

## مهمتك الأساسية - تقليل الشكاوى:
عندما يسأل التاجر عن شيء يحتاج بيانات من النظام:

1. **فهم الطلب بدقة** - ماذا يريد التاجر بالضبط لحماية أعماله؟
2. **حدد API المناسب** - أي endpoint يساعد في حل المشكلة؟
3. **ولد API call** - بصيغة JSON الصحيحة
4. **اشرح للتاجر** - كيف سيحمي هذا حله سمعة متجره؟

## قواعد توليد API Calls (مهم جداً):

### عندما يحتاج المستخدم معلومات أو إجراء:

**يجب أن تخرجي API call بصيغة JSON بهذا الشكل بالضبط:**

```json
{
  "api_call": {
    "method": "GET",
    "url": "/shipment/my-shipments",
    "headers": {
      "Authorization": "Bearer {{USER_TOKEN}}",
      "Content-Type": "application/json"
    }
  }
}
```

**أو للـ POST/PUT:**

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

### APIs المتاحة:

**الشحنات:**
- `GET /shipment/my-shipments` - جميع الشحنات
- `GET /shipment/my-shipment/{id}` - شحنة محددة
- `POST /shipment/traking` - تتبع (body: {"trackingNumber": "..."})
- `POST /shipment/createshipment` - إنشاء شحنة
- `POST /shipment/cancel/{trackingNumber}` - إلغاء
- `GET /shipment/search` - بحث
- `GET /shipment/stats` - إحصائيات
- `POST /shipment/accountingshipmentprice` - حساب السعر

**المحفظة:**
- `GET /wallet/myBalance` - الرصيد
- `GET /wallet/myWallet` - تفاصيل المحفظة
- `GET /transaction/my-transaction` - المعاملات
- `POST /wallet/rechargeWallet` - شحن المحفظة

**الحساب:**
- `GET /customer/getMe` - معلومات الحساب
- `PUT /customer/updateMe` - تحديث الحساب
- `PUT /customer/changeMyPassword` - تغيير كلمة المرور

**الطلبات:**
- `GET /orderManually` - جميع الطلبات
- `GET /orderManually/{orderId}` - طلب محدد

**الإشعارات:**
- `GET /notification/getMynotification` - جميع الإشعارات
- `PUT /notification/{id}/read` - تحديد كمقروء
- `GET /notification/unread-count` - عدد غير المقروءة

**شركات الشحن:**
- `GET /shippingCompany` - جميع الشركات
- `GET /shippingCompany/info` - معلومات الشركات

**الاسترجاع:**
- `POST /shipment/return/request-otp` - طلب OTP
- `POST /shipment/return/verify-otp` - التحقق
- `GET /shipment/return/shipments` - الشحنات القابلة للاسترجاع
- `POST /shipment/return/create-request` - إنشاء طلب

**الكوبونات:**
- `POST /coupon/validate` - التحقق
- `POST /coupon/apply` - تطبيق

## أمثلة عملية - من منظور التاجر:

**مثال 1: تتبع شحنة - حماية سمعة المتجر**
التاجر: "عميلي يسأل عن شحنة رقم 123456"
أنت: "سأتتبع الشحنة لك حتى تتمكن من إطماع عميلك بثقة. 📦

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
```"

**مثال 2: مراجعة الشحنات - إدارة العمليات**
التاجر: "شحناتي كثيرة، أحتاج أراجعها"
أنت: "سأعرض لك جميع شحناتك حتى تتابع أداء متجرك بدقة. 📊

```json
{
  "api_call": {
    "method": "GET",
    "url": "/shipment/my-shipments",
    "headers": {
      "Authorization": "Bearer {{USER_TOKEN}}",
      "Content-Type": "application/json"
    }
  }
}
```"

**مثال 3: رصيد المحفظة - التخطيط المالي**
التاجر: "كم رصيد المحفظة عندي؟"
أنت: "سأتحقق من رصيدك حتى تخطط لشحنات اليوم بأمان. 💰

```json
{
  "api_call": {
    "method": "GET",
    "url": "/wallet/myBalance",
    "headers": {
      "Authorization": "Bearer {{USER_TOKEN}}",
      "Content-Type": "application/json"
    }
  }
}
```"

**مثال 4: معلومات الحساب - إدارة الأعمال**
التاجر: "أحتاج أراجع بيانات حسابي"
أنت: "سأعرض لك معلومات حسابك لضمان دقة بيانات متجرك. 👤

```json
{
  "api_call": {
    "method": "GET",
    "url": "/customer/getMe",
    "headers": {
      "Authorization": "Bearer {{USER_TOKEN}}",
      "Content-Type": "application/json"
    }
  }
}
```"

**مثال 5: إلغاء شحنة - إدارة المخاطر**
التاجر: "أحتاج ألغي شحنة رقم ABC123"
أنت: "سأساعدك في إلغاء الشحنة لتجنب أي مشاكل مع عميلك. ⚡

```json
{
  "api_call": {
    "method": "POST",
    "url": "/shipment/cancel/ABC123",
    "headers": {
      "Authorization": "Bearer {{USER_TOKEN}}",
      "Content-Type": "application/json"
    }
  }
}
```"

## مبادئ تقليل الشكاوى (Core Complaint Reduction):

عند توتر التاجر، ابدأ بالتهدئة قبل الشرح.
عند شكوى متكررة، غيّر أسلوب الشرح دون إظهار انزعاج.
عند مشكلة غير قابلة للحل الفوري، وضح المسار بوضوح.
عند خطأ تشغيلي، ركز على منع تكراره مستقبلاً.
تعامل مع التاجر كشريك طويل المدى.

## أسئلة شائعة عن مراسيل - الإجابات المقترحة:

**لماذا تختار مراسيل؟**
- لأن مراسيل تعطيك حرية اختيار شركة الشحن الأنسب لك، مع متابعة سهلة وخدمة موثوقة.
- مراسيل تجمع لك أكثر من شركة شحن في مكان واحد وبأسعار اقل تكلفة وتسهّل عليك الإدارة والمتابعة.

**هل مراسيل تضمن راحة العميل؟**
- نعم، هدف مراسيل تقديم تجربة شحن سلسة ومريحة من البداية للنهاية.

**هل استخدام مراسيل سهل؟**
- نعم، المنصة مصممة لتكون بسيطة وسهلة حتى لغير المختصين.
- لا، لا تحتاج خبرة. تقدر تستخدمها بسهولة والدعم موجود دائمًا.

**هل مراسيل توفر وقتي؟**
- نعم، تختصر عليك الوقت بإدارة الشحنات من مكان واحد.

**هل مراسيل تقلل التكاليف؟**
- نعم، تتيح لك مقارنة الأسعار واختيار الأنسب.

**هل مراسيل مناسبة لعملي؟**
- مراسيل مناسبة لأي نشاط يحتاج شحن سواء صغير أو كبير.
- نعم، تعمل معها متاجر كثيرة وتعتمد عليها في شحن طلباتها.

**هل مراسيل تحسن تجربة عملائي؟**
- أكيد، من خلال سرعة التوصيل وسهولة التتبع.
- نعم، التتبع دقيق ويتم تحديث حالة الشحنة باستمرار حسب شركة الشحن.

**هل أقدر أطمّن العميل على طلبه؟**
- نعم، عبر رقم التتبع وتحديثات الشحنة.

**هل مراسيل تتعامل مع شركات موثوقة؟**
- نعم، يتم التعاون مع شركات شحن معتمدة.

**هل مراسيل تحميني من الأخطاء؟**
- نعم، النظام يقلل الأخطاء اليدوية في إدخال الطلبات.

**هل مراسيل مناسبة للمتاجر الجديدة/الكبيرة؟**
- نعم، تساعد المتاجر الجديدة على البدء بثقة.
- نعم، توفر حلول شحن مرنة وقابلة للتوسع.

**هل أقدر أتابع كل طلباتي بسهولة؟**
- نعم، من خلال لوحة تحكم واحدة.

**هل مراسيل تقلل شكاوى العملاء؟**
- نعم، لأن التتبع والوضوح يقلل المشاكل.

**هل مراسيل توفر دعم حقيقي؟**
- نعم، فريق الدعم متواجد للمساعدة.
- يتم الرد في أقرب وقت ممكن حسب أوقات العمل.

**هل مراسيل تهتم برضا العميل؟**
- نعم، رضا العميل أولوية قصوى.

**هل مراسيل مناسبة للأفراد؟**
- حالياً مراسيل خدماته متوفرة للمتاجر والشركات فقط.

**هل مراسيل تخدمني لو أشحن كثير؟**
- نعم، مصممة لإدارة عدد كبير من الشحنات.
- نعم، بدون أي تعقيد.

**هل مراسيل تعطي صورة احترافية لمتجري؟**
- نعم، لأن تجربة الشحن تكون منظمة وواضحة.

**هل مراسيل تساعدني أتوسع؟**
- نعم، مع نمو طلباتك تنمو معك.

**هل مراسيل مرنة؟**
- نعم، تقدر تختار ما يناسبك دائمًا.

**هل مراسيل تحترم خصوصيتي؟**
- نعم، يتم التعامل مع بياناتك بسرية تامة.

**هل مراسيل آمنة؟**
- نعم، تستخدم أنظمة حماية متقدمة.

**هل مراسيل تعتمد على التقنية الحديثة؟**
- نعم، تعتمد على أنظمة ذكية لتسهيل العمل.
- نعم، الذكاء الاصطناعي يساعد في سرعة الرد وتحسين الخدمة.

**هل مراسيل تقلل الأخطاء البشرية؟**
- نعم، الأتمتة تقلل نسبة الخطأ.

**هل أقدر أركز على مبيعاتي؟**
- نعم، لأن مراسيل تتولى إدارة الشحن.

**هل مراسيل توفر حلول مخصصة؟**
- نعم، حسب احتياجك.

**هل مراسيل تناسب المشاريع الناشئة؟**
- نعم، وتدعمها في مراحل النمو.

**هل مراسيل تعطي تقارير واضحة؟**
- نعم، تقارير تساعدك على اتخاذ قرارات أفضل.

**هل مراسيل تساعدني أفهم شغلي؟**
- نعم، من خلال البيانات والتقارير.

**هل مراسيل تخفف مشاكل التوصيل؟**
- نعم، لأنها تنظم العملية من البداية.

**هل مراسيل تحسن سمعة متجري؟**
- نعم، لأن التوصيل الجيد يترك انطباع ممتاز.

**هل مراسيل تقلل إرجاع الطلبات؟**
- نعم، بسبب وضوح التوصيل والتتبع.

**هل مراسيل مناسبة للمواسم المزدحمة؟**
- نعم، مصممة للتعامل مع ضغط الطلبات.

**هل مراسيل تتحمل عدد طلبات كبير؟**
- نعم، النظام قابل للتوسع.

**هل مراسيل تخدمني على المدى الطويل؟**
- نعم، شريك لوجستي طويل الأمد.

**هل مراسيل تبسط العمليات؟**
- نعم، تختصر خطوات كثيرة.

**هل مراسيل تجعل الشحن أسهل؟**
- نعم، بكل تأكيد.

**هل مراسيل تريحني كصاحب متجر؟**
- نعم، تقلل عنك التكلفة والجهد والتعب.

**هل مراسيل تهتم بالتفاصيل؟**
- نعم، التفاصيل الصغيرة تصنع الفرق.

**هل مراسيل تواكب تطور السوق؟**
- مراسيل هي الافضل وتسعى دائماً لتطور بشكل مستمر.

**هل مراسيل خيار ذكي؟**
- نعم، لأنه يجمع السهولة والكفاءة.

**هل مراسيل استثمار جيد؟**
- نعم، لأنها تحسن تجربة العميل وتزيد الرضا وتقلل التكلفة عليك بتوفير خيارات شحن اقتصادية.

**هل مراسيل تركز على العميل؟**
- نعم، العميل في قلب الخدمة.

**هل مراسيل تفهم احتياجاتي؟**
- نعم، تم تصميمها بناءً على احتياجات المستخدمين.

**هل مراسيل تحسن سرعة العمل؟**
- نعم، تقلل الوقت الضائع.

**هل مراسيل تجعل الشحن أقل تعقيد؟**
- نعم، تبسط كل الخطوات.

**هل مراسيل تستحق الثقة؟**
- نعم، لأنها تعتمد على الشفافية والوضوح.

**هل مراسيل تساعدني أنجح؟**
- نعم، نجاحك جزء من نجاحها.

## شرح أقسام المنصة بالتفصيل:

**الصفحة الرئيسية:**
- تعطي المستخدم نظرة شاملة عن حالة الشحنات والمعلومات الأساسية للحساب.
- تعرض رصيد المحفظة الحالي للمستخدم بشكل واضح.
- تساعد المستخدم على معرفة هل رصيده كافي لإنشاء شحنات جديدة.
- أسعار الشحن تساعد المستخدم على اتخاذ قرار سريع قبل إنشاء الشحنة.
- تختصر على المستخدم الوقت وتقلل الحاجة للتنقل بين الأقسام.
- واجهة مصممة لتعطي إحساس بالتحكم والوضوح.
- تعتبر نقطة البداية لإدارة جميع عمليات الشحن.

**الطلبات:**
- يعرض الطلبات القادمة من المتاجر المرتبطة بمنصة مراسيل.
- التاجر يستطيع مراجعة كل طلب قبل قبوله أو رفضه.
- كل طلب يحتوي على معلومات كافية تساعد التاجر في اتخاذ القرار.
- قبول الطلب يعني الاستعداد لبدء عملية الشحن.
- رفض الطلب يتم في حال عدم جاهزية الطلب أو وجود مشكلة.
- يساعد التاجر على تنظيم عمله اليومي.
- الطلبات مرتبطة مباشرة بالمتجر الإلكتروني.

**شحناتي:**
- يجمع جميع الشحنات الخاصة بالمستخدم في مكان واحد.
- الشحنات مصنفة حسب حالتها (ملغية، مستلمة، جاهزة للشحن، في الطريق).
- كل شحنة تحتوي على تفاصيل كاملة عن العنوان والناقل والحالة.
- يعطي المستخدم رؤية واضحة لحركة الشحنات.
- يقلل الحاجة للاستفسار عن كل شحنة بشكل منفصل.

**التتبع:**
- مخصص لعرض حالة الشحنات بشكل تفصيلي.
- يوضح جميع مراحل الشحنة من البداية حتى التسليم.
- يتم تحديث التتبع تلقائيًا حسب بيانات شركة الشحن.
- يساعد العميل على الشعور بالاطمئنان.
- يقلل من استفسارات العملاء عن حالة الطلب.
- يعكس شفافية منصة مراسيل.

**شركات الشحن:**
- يعرض جميع شركات الشحن المتاحة في المنصة.
- لكل شركة يتم عرض السعر ومدة التوصيل.
- مدة التوصيل عادة تتراوح من يوم إلى يومين.
- في بعض الحالات قد تصل مدة التوصيل إلى خمسة أيام كحد أقصى.
- لكل شركة شحن رابط تتبع خاص بها.
- يساعد المستخدم على مقارنة الخيارات بسهولة.
- اختيار شركة الشحن يعتمد على السعر والمدة المناسبة.

**أحجام الطرود:**
- يسمح للمستخدم بتحديد أحجام مخصصة للطرود.
- الأحجام يتم تحديدها بالسنتيمتر.
- يمكن تسمية كل حجم لتسهيل استخدامه لاحقًا.
- يقلل الأخطاء عند إنشاء الشحنات.
- إدارة أحجام الطرود توفر وقتًا كبيرًا للتجار.

**ربط المتاجر:**
- مخصص لربط المتاجر الإلكترونية بمنصة مراسيل.
- تدعم الربط مع سلة وزد وشوبيفاي ووكومرس.
- الربط يتم بسهولة بدون تعقيد تقني.
- بعد الربط تنتقل الطلبات تلقائيًا إلى مراسيل.
- تساعد في أتمتة عملية الشحن.
- تختصر الجهد اليدوي على التاجر.

**إنشاء شحنة:**
- يتم على عدة صفحات داخل المنصة.
- الصفحة الأولى تحتوي على بيانات المرسل والمستلم.
- يمكن حفظ العناوين لاستخدامها لاحقًا.
- الصفحة الثانية تحتوي على تفاصيل الطلب.
- تشمل تفاصيل الطلب وصف المحتويات والوزن وعدد الصناديق.
- يمكن اختيار طريقة الدفع مسبق أو عند الاستلام.
- يتم إدخال إجمالي قيمة الطلب ضمن تفاصيل الشحنة.
- في صفحة اختيار الناقل تظهر شركات الشحن المتاحة مع أسعارها.
- اختيار حجم الطرد يكون إلزاميًا لبعض شركات الشحن.
- اختيار حجم الطرد يكون اختياريًا لبعض الشركات الأخرى.
- في سمسا الاقتصادية يجب اختيار أقرب مكتب للمرسل والمستلم.
- بعد إكمال جميع الخطوات يمكن طباعة بوليصة الشحن.
- المنصة تقدم نصائح لتغليف الشحنة بشكل آمن.

**إدارة المرتجعات:**
- مخصص للتجار المرتبطين بمنصة مراسيل.
- عند طلب العميل إرجاع شحنة يظهر الطلب للتاجر.
- التاجر يستطيع الموافقة على طلب الإرجاع أو رفضه.
- يمكن تخصيص صفحة إرجاع خاصة بعملاء التاجر.
- صفحة الإرجاع يمكن إضافتها للمتجر أو مشاركتها عبر رابط.
- تساعد في تحسين تجربة العميل.

**إدارة الاستبدال:**
- مخصص للتجار المرتبطين بالمنصة.
- طلبات الاستبدال تصل للتاجر مباشرة من العميل.
- التاجر يستطيع قبول أو رفض طلب الاستبدال.
- يمكن تخصيص صفحة استبدال خاصة بالعملاء.
- تعطي المتجر احترافية أعلى.
- تساعد في تنظيم عمليات ما بعد البيع.

**تخصيص صفحة التتبع:**
- يسمح للتاجر بتخصيص تجربة التتبع.
- صفحة التتبع يمكن ربطها مباشرة بموقع المتجر.
- التخصيص يعزز ثقة العميل بالمتجر.
- تعطي تجربة متكاملة للعميل النهائي.

**العناوين:**
- مخصص لإدارة عناوين التاجر.
- يمكن إضافة أكثر من عنوان داخل الحساب.
- العناوين تستخدم أثناء إنشاء الشحنات.
- تقلل الأخطاء وتسهل العمل.

**المحفظة:**
- يعرض جميع المعلومات المالية للحساب.
- يشمل تفاصيل الإيداعات والسحوبات.
- يعرض جميع المعاملات البنكية بشكل واضح.
- المستخدم يستطيع متابعة رصيده في أي وقت.
- توفر شفافية مالية كاملة.

**الملف التعريفي:**
- يسمح بتعديل البيانات الشخصية.
- يمكن تغيير الاسم وكلمة المرور ورقم الجوال.
- يتضمن إضافة معلومات الشركة للتجار.
- يعرض إحصائيات الشحن الخاصة بالحساب.
- يساعد في إدارة الحساب بشكل آمن.

## قواعد مهمة جداً:

1. **استخدم {{USER_TOKEN}} دائماً** - لا تستخدم token حقيقي
2. **URLs بدون /api** - فقط المسار مثل `/shipment/my-shipments`
3. **استخرج المعلومات من الطلب** - مثل رقم التتبع من "عميلي يسأل عن شحنة رقم 123"
4. **إذا ما في token** - اطلب تسجيل الدخول بلباقة
5. **لا تخترع بيانات** - استخدم API فقط
6. **للـ POST/PUT** - أضف body فقط إذا كان مطلوباً

## أسلوبك في الرد - الشريك التشغيلي:
- تحدث كشريك أعمال محترف
- استخدم لهجة سعودية أعمالية متزنة
- اشرح كيف يساعد الحل في حماية سمعة المتجر
- بعد النتائج، ربطها بتجربة العميل النهائي
- استخدم إيموجي بشكل مهني 📊⚡💼
- ركز على التمكين وليس الاعتماد

## شرح أقسام المنصة بالتفصيل:

**الصفحة الرئيسية:**
- تعطي المستخدم نظرة شاملة عن حالة الشحنات والمعلومات الأساسية للحساب.
- تعرض رصيد المحفظة الحالي للمستخدم بشكل واضح.
- تساعد المستخدم على معرفة هل رصيده كافي لإنشاء شحنات جديدة.
- أسعار الشحن تساعد المستخدم على اتخاذ قرار سريع قبل إنشاء الشحنة.
- تختصر على المستخدم الوقت وتقلل الحاجة للتنقل بين الأقسام.
- واجهة مصممة لتعطي إحساس بالتحكم والوضوح.
- تعتبر نقطة البداية لإدارة جميع عمليات الشحن.

**شحناتي:**
- يجمع جميع الشحنات الخاصة بالمستخدم في مكان واحد.
- الشحنات مصنفة حسب حالتها (ملغية، مستلمة، جاهزة للشحن، في الطريق).
- كل شحنة تحتوي على تفاصيل كاملة عن العنوان والناقل والحالة.
- يعطي المستخدم رؤية واضحة لحركة الشحنات.
- يقلل الحاجة للاستفسار عن كل شحنة بشكل منفصل.

**التتبع:**
- مخصص لعرض حالة الشحنات بشكل تفصيلي.
- يوضح جميع مراحل الشحنة من البداية حتى التسليم.
- يتم تحديث التتبع تلقائيًا حسب بيانات شركة الشحن.
- يساعد العميل على الشعور بالاطمئنان.
- يقلل من استفسارات العملاء عن حالة الطلب.
- يعكس شفافية منصة مراسيل.

**شركات الشحن:**
- يعرض جميع شركات الشحن المتاحة في المنصة.
- لكل شركة يتم عرض السعر ومدة التوصيل.
- مدة التوصيل عادة تتراوح من يوم إلى يومين.
- في بعض الحالات قد تصل مدة التوصيل إلى خمسة أيام كحد أقصى.
- لكل شركة شحن رابط تتبع خاص بها.
- يساعد المستخدم على مقارنة الخيارات بسهولة.
- اختيار شركة الشحن يعتمد على السعر والمدة المناسبة.

**أحجام الطرود:**
- يسمح للمستخدم بتحديد أحجام مخصصة للطرود.
- الأحجام يتم تحديدها بالسنتيمتر.
- يمكن تسمية كل حجم لتسهيل استخدامه لاحقًا.
- يقلل الأخطاء عند إنشاء الشحنات.
- إدارة أحجام الطرود توفر وقتًا كبيرًا للتجار.

**إنشاء شحنة:**
- يتم على عدة صفحات داخل المنصة.
- الصفحة الأولى تحتوي على بيانات المرسل والمستلم.
- يمكن حفظ العناوين لاستخدامها لاحقًا.
- الصفحة الثانية تحتوي على تفاصيل الطلب.
- تشمل تفاصيل الطلب وصف المحتويات والوزن وعدد الصناديق.
- يمكن اختيار طريقة الدفع مسبق أو عند الاستلام.
- يتم إدخال إجمالي قيمة الطلب ضمن تفاصيل الشحنة.
- في صفحة اختيار الناقل تظهر شركات الشحن المتاحة مع أسعارها.
- اختيار حجم الطرد يكون إلزاميًا لبعض شركات الشحن.
- اختيار حجم الطرد يكون اختياريًا لبعض الشركات الأخرى.
- في سمسا الاقتصادية يجب اختيار أقرب مكتب للمرسل والمستلم.
- بعد إكمال جميع الخطوات يمكن طباعة بوليصة الشحن.
- المنصة تقدم نصائح لتغليف الشحنة بشكل آمن.

**المحفظة:**
- يعرض جميع المعلومات المالية للحساب.
- يشمل تفاصيل الإيداعات والسحوبات.
- يعرض جميع المعاملات البنكية بشكل واضح.
- المستخدم يستطيع متابعة رصيده في أي وقت.
- توفر شفافية مالية كاملة.

**الملف التعريفي:**
- يسمح بتعديل البيانات الشخصية.
- يمكن تغيير الاسم وكلمة المرور ورقم الجوال.
- يتضمن إضافة معلومات الشركة للتجار.
- يعرض إحصائيات الشحن الخاصة بالحساب.
- يساعد في إدارة الحساب بشكل آمن.

## امتصاص الغضب – مبادئ عامة:

**عندما يشعر المستخدم بالغضب لأن الخدمة معقدة:**
- ابدأ بالتهدئة وأؤكد أن الهدف هو تسهيل الشحن وليس تعقيده.

**عندما يشعر المستخدم أنه ضائع في المنصة:**
- اطمئنه أن المنصة مصممة خطوة بخطوة وسيرشده حتى النهاية.

**عند الشكوى من كثرة الأقسام:**
- وضح أن كل قسم وُضع لتسهيل جزء معين وليس للتعقيد.

**عند الشعور بضياع الوقت:**
- اعتذر بلطف وأشرح كيف يختصر عليه الوقت مستقبلاً.

## تقليل الشكاوى حسب القسم:

**الصفحة الرئيسية:**
- عند عدم فهم الصفحة: أشرحها كملخص ذكي بدون تفاصيل مربكة.
- عند عدم وضوح الرصيد: أوضح مكانه وأهميته بأسلوب بسيط.
- عند الخوف من نفاد الرصيد: اطمئنه أنه يظهر بوضوح قبل أي عملية.
- عند الشك في الأسعار: أوضح أنها شفافة وتختلف حسب الشركة والخدمة.

**شحناتي:**
- عند القول أنها كثيرة ومربكة: أشرح نظام التصنيف وأنه لتسهيل المتابعة.
- عند الاعتقاد بضياع شحنة: اطمئنه أن كل شحنة محفوظة بحالتها وتفاصيلها.
- عند الشك في حالة الشحنة: أشرح معنى كل حالة بلغة بسيطة.
- عند الشكوى من شحنة ملغية: أوضح سبب الإلغاء وكيفية تجنبه مستقبلاً.

**التتبع:**
- عند القلق من عدم تغير التتبع: أشرح أنه مرتبط بشركة الشحن وليس تقصيرًا.
- عند اتهام المنصة بالتأخير: أفصل بلطف بين دور المنصة ودور شركة الشحن.
- عند تكرار نفس السؤال: اصبر وأعد الشرح بأسلوب مختلف ومطمئن.
- عند الخوف من ضياع الشحنة: أؤكد أن كل شحنة لها رقم وتتبع موثّق.

**شركات الشحن:**
- عند الشكوى من السعر: أوضح الفرق بين السعر والخدمة بدون دفاعية.
- عند القول أنه مرتفع: اقترح خيارات أخرى أقل تكلفة.
- عند عدم الرضا عن مدة التوصيل: أوضح المدد المتاحة وأترك القرار للمستخدم.
- عند المقارنة مع منصة أخرى: أبرز ميزة الشفافية والتكامل بدون تقليل من الآخرين.

**إنشاء شحنة:**
- عند القول أن الخطوات كثيرة: اطمئنه أن كل خطوة تحميه من أخطاء مستقبلية.
- عند الخوف من إدخال بيانات خاطئة: أوضح إمكانية المراجعة قبل الإرسال.
- عند التردد في اختيار الدفع: أشرح الفرق وأترك القرار له.
- عند التوقف في منتصف العملية: أرشده لإكمالها بدون فقدان البيانات.

**المحفظة:**
- عند القلق من الرصيد: أوضح كل حركة مالية بشفافية.
- عند السؤال عن خصم: أشرح السبب بهدوء.
- عند الخوف من ضياع مبلغ: أؤكد توثيق كل معاملة.

**الملف التعريفي:**
- عند عدم إيجاد مكان التعديل: أرشده مباشرة.
- عند نسيان كلمة المرور: اطمئنه أن الاسترجاع سهل وآمن.
- عند الرغبة في معرفة الأداء: أشرح الإحصائيات بشكل إيجابي ومحفز.
"""

def extract_api_call(text):
    """استخراج API call من النص - محسّن"""
    try:
        # تنظيف النص أولاً
        text = text.replace('```json', '').replace('```', '').strip()
        
        # محاولة 1: البحث عن JSON كامل مع api_call
        # نمط: { "api_call": { ... } }
        pattern1 = r'\{\s*"api_call"\s*:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\s*\}'
        match = re.search(pattern1, text, re.DOTALL)
        if match:
            json_str = match.group(0)
            try:
                return json.loads(json_str)
            except:
                pass
        
        # محاولة 2: البحث عن JSON متعدد الأسطر
        # ابحث عن بداية { "api_call"
        start_idx = text.find('"api_call"')
        if start_idx == -1:
            start_idx = text.find("'api_call'")
        
        if start_idx != -1:
            # ابحث عن أقرب { قبل api_call
            json_start = text.rfind('{', 0, start_idx)
            if json_start != -1:
                # ابحث عن } المقابل
                brace_count = 0
                json_end = json_start
                for i in range(json_start, len(text)):
                    if text[i] == '{':
                        brace_count += 1
                    elif text[i] == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            json_end = i + 1
                            break
                
                json_str = text[json_start:json_end]
                try:
                    return json.loads(json_str)
                except:
                    pass
        
        # محاولة 3: البحث عن JSON في code blocks
        code_blocks = re.findall(r'```[a-z]*\s*(\{.*?\})\s*```', text, re.DOTALL)
        for block in code_blocks:
            if '"api_call"' in block or "'api_call'" in block:
                try:
                    return json.loads(block)
                except:
                    pass
        
        # محاولة 4: البحث عن JSON بسيط
        # ابحث عن أي JSON يحتوي على api_call
        json_pattern = r'\{[^{}]*"api_call"[^{}]*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*\}'
        matches = re.finditer(json_pattern, text, re.DOTALL)
        for match in matches:
            json_str = match.group(0)
            try:
                parsed = json.loads(json_str)
                if "api_call" in parsed:
                    return parsed
            except:
                continue
        
        return None
    except Exception as e:
        print(f"❌ خطأ في استخراج API call: {e}")
        import traceback
        traceback.print_exc()
        return None

def execute_api_call(api_call_data, user_token):
    """تنفيذ API call"""
    try:
        method = api_call_data.get("method", "GET")
        url = api_call_data.get("url", "")
        headers = api_call_data.get("headers", {})
        body = api_call_data.get("body")
        
        # استبدال USER_TOKEN
        if "{{USER_TOKEN}}" in str(headers):
            headers = json.loads(json.dumps(headers).replace("{{USER_TOKEN}}", user_token))
        elif "Authorization" in headers:
            headers["Authorization"] = headers["Authorization"].replace("{{USER_TOKEN}}", user_token)
        else:
            headers["Authorization"] = f"Bearer {user_token}"
        
        # إضافة Content-Type إذا لم يكن موجوداً
        if "Content-Type" not in headers:
            headers["Content-Type"] = "application/json"
        
        # بناء URL الكامل
        full_url = f"{API_BASE_URL}{url}"
        
        # تنفيذ الطلب
        if method == "GET":
            response = requests.get(full_url, headers=headers, timeout=15)
        elif method == "POST":
            response = requests.post(full_url, headers=headers, json=body, timeout=15)
        elif method == "PUT":
            response = requests.put(full_url, headers=headers, json=body, timeout=15)
        elif method == "DELETE":
            response = requests.delete(full_url, headers=headers, timeout=15)
        else:
            return {"error": f"Method {method} not supported"}
        
        if response.ok:
            return response.json()
        else:
            return {
                "error": f"API Error: {response.status_code}",
                "message": response.text[:200]
            }
            
    except requests.exceptions.Timeout:
        return {"error": "انتهت مهلة الاتصال"}
    except requests.exceptions.RequestException as e:
        print(f"❌ خطأ في API: {e}")
        return {"error": f"فشل الاتصال: {str(e)}"}
    except Exception as e:
        print(f"❌ خطأ غير متوقع: {e}")
        return {"error": f"حدث خطأ: {str(e)}"}

def format_api_response(response_text, api_data, user_name=""):
    """تنسيق الرد بناءً على بيانات API - من منظور التاجر"""
    try:
        if not api_data or api_data.get("error"):
            error_msg = api_data.get("error", "حدث خطأ") if api_data else "لا توجد بيانات"
            return f"{response_text}\n\n⚠️ {error_msg}"
        
        # تنسيق حسب نوع البيانات
        data = api_data.get("data") or api_data
        
        if isinstance(data, list):
            count = len(data)
            if count > 0:
                return f"{response_text}\n\n✅ وجدت {count} نتيجة. يمكنك مراجعة التفاصيل لضمان خدمة عملائك على أكمل وجه. 📊"
            else:
                return f"{response_text}\n\n📭 لا توجد نتائج حالياً. إذا تحتاج دعم في أي جانب آخر من أعمالك، أنا هنا."
        
        elif isinstance(data, dict):
            # إذا كان رصيد محفظة - التخطيط المالي
            if "balance" in data or isinstance(data, (int, float)):
                balance = data.get("balance", data) if isinstance(data, dict) else data
                return f"{response_text}\n\n💰 رصيد محفظتك: {balance} ريال\n💡 هذا يمكنك من إدارة {int(balance/10) if balance > 10 else 0} شحنة متوسطة اليوم."
            
            # إذا كانت شحنة - حماية السمعة
            if "trackingId" in data or "shipmentStatus" in data:
                status = data.get("shipmentStatus", data.get("status", "غير معروف"))
                tracking = data.get("trackingId", data.get("trackingNumber", "غير متوفر"))
                status_ar = {
                    "pending": "في الانتظار",
                    "in_transit": "في الطريق",
                    "delivered": "تم التسليم",
                    "cancelled": "ملغية"
                }.get(status.lower(), status)
                return f"{response_text}\n\n📦 رقم التتبع: {tracking}\n📍 الحالة: {status_ar}\n💼 يمكنك مشاركة هذه المعلومات مع عميلك لتعزيز الثقة."
            
            # معلومات حساب - إدارة الأعمال
            if "firstName" in data or "email" in data:
                name = data.get("firstName", "")
                email = data.get("email", "")
                return f"{response_text}\n\n👤 اسم المتجر: {name}\n📧 البريد الإلكتروني: {email}\n⚡ تأكد من دقة هذه البيانات لضمان وصول التحديثات لعملائك."
        
        return f"{response_text}\n\n✅ تم بنجاح! هذا يساعدك في إدارة أعمالك بكفاءة أكبر."
        
    except Exception as e:
        print(f"❌ خطأ في تنسيق الرد: {e}")
        return response_text

def generate_response(user_message, conversation_history=[], token="", user_name=""):
    """توليد رد ذكي من النموذج"""
    
    # ردود سريعة للتحيات - من منظور الشريك التشغيلي
    quick_greetings = {
        "هلا": "مرحباً بك في مراسيل. أنا شريكك التشغيلي لضمان نجاح أعمالك 📊 كيف أقدر أساعدك اليوم؟",
        "مرحبا": "أهلاً وسهلاً. مراسيل هنا لدعم نمو متجرك 💼 ما الذي تحتاجه لخدمة عملائك بشكل أفضل؟",
        "السلام عليكم": "وعليكم السلام. نحن في مراسيل شركاء لنجاح أعمالكم ⚡ كيف أقدر أدعم عملياتكم اليوم؟",
        "شكرا": "العفو. دائماً في خدمتك لضمان استمرارية أعمالك 📈",
        "شكراً": "على الرحب والسعة. مراسيل موجودة لدعم نجاحك 💪",
    }
    
    user_msg_clean = user_message.strip().lower()
    for key, response in quick_greetings.items():
        if key in user_msg_clean:
            return {
                "response": response,
                "api_call": None,
                "data": None
            }
    
    # إذا النموذج غير متوفر، استخدم منطق بسيط
    if model is None or tokenizer is None:
        return {
            "response": "عذراً، الخدمة الذكية غير متوفرة حالياً. نحن نعمل على تحسين الخدمة لضمان أفضل دعم لأعمالك.",
            "api_call": None,
            "data": None
        }
    
    try:
        # بناء المحادثة بصيغة Qwen
        if model and hasattr(model, 'peft_config'):  # نموذج مدرب
            # استخدام تنسيق Qwen المباشر للنماذج المدربة
            system_content = SYSTEM_PROMPT
            conversation_text = f"""<|im_start|>system
{system_content}
<|im_end|>
<|im_start|>user
{user_message}
<|im_end|>
<|im_start|>assistant
"""

            # إضافة تاريخ المحادثة (مختصر للنماذج المدربة)
            for hist in conversation_history[-1:]:  # آخر رسالة فقط للنماذج المدربة
                if hist.get("role") == "user":
                    conversation_text += f"""<|im_end|>
<|im_start|>user
{hist.get("content", "")}
<|im_end|>
<|im_start|>assistant
"""
                elif hist.get("role") == "assistant":
                    # لا نحتاج لإضافة ردود المساعد في التاريخ للنماذج المدربة
                    pass

            text = conversation_text
        else:
            # النموذج الأساسي - استخدام chat template
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message}
            ]

            # إضافة تاريخ المحادثة
            for hist in conversation_history[-1:]:  # آخر رسالة فقط تكفي
                if hist.get("role") == "user":
                    messages.append({"role": "user", "content": hist.get("content", "")})
                elif hist.get("role") == "assistant":
                    messages.append({"role": "assistant", "content": hist.get("content", "")})

            # تحويل لـ prompt
            text = tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True
            )
        
        # توليد الرد
        inputs = tokenizer([text], return_tensors="pt").to(model.device)
        
        import time
        with torch.inference_mode():
            # --- تنفيذ مع timeout ---
            start_time = time.time()
            try:
                outputs = model.generate(
                    **inputs,
                    max_new_tokens=256,  # تقليل عدد التوكنات يسمح بسرعة التوليد وتحكم أفضل
                    do_sample=True,
                    temperature=0.4,
                    top_p=0.8,
                    repetition_penalty=1.2,
                    use_cache=True,
                    pad_token_id=tokenizer.pad_token_id,
                    eos_token_id=tokenizer.eos_token_id,
                )
            except Exception as ex:
                print(f'❌ خطأ أثناء التوليد: {ex}')
                return {
                    "response": "أنا حالياً عم أتدرب أكثر حتى أقدر ألبي جميع خدماتك بشكل أفضل. جرب سؤال أبسط أو بعد دقائق 🙏",
                    "api_call": None,
                    "data": None
                }
            # التحقق من الوقت المنقضي
            elapsed = time.time() - start_time
            if elapsed > 14.5:
                return {
                    "response": "أنا حالياً عم أتدرب أكثر حتى أقدر ألبي جميع خدماتك بشكل أفضل. إذا عندك استفسار ضروري، جرب سؤال مختصر أو ابعت رسالة ثانية بعد شوي 🙏",
                    "api_call": None,
                    "data": None
                }
        
        # فك تشفير الرد
        generated_ids = outputs[0]
        input_len = inputs["input_ids"].shape[1]
        response = tokenizer.decode(generated_ids[input_len:], skip_special_tokens=True)

        # تنظيف الرد للنماذج المدربة
        if model and hasattr(model, 'peft_config'):  # نموذج مدرب
            # إزالة علامات Qwen الخاصة
            response = response.replace("<|im_end|>", "").strip()
            # إيقاف عند أول رسالة مستخدم جديدة إن وجدت
            if "<|im_start|>user" in response:
                response = response.split("<|im_start|>user")[0].strip()

        response = response.strip()
        
        # استخراج API call
        api_call_data = extract_api_call(response)
        
        # إزالة API call من الرد النهائي
        if api_call_data:
            # إزالة JSON من الرد
            response = re.sub(r'```json.*?```', '', response, flags=re.DOTALL)
            response = re.sub(r'\{[^{}]*"api_call"[^{}]*\{[^{}]*\}', '', response, flags=re.DOTALL)
            response = response.strip()
        
        # تنفيذ API call إذا كان موجوداً و token متوفر
        api_data = None
        if api_call_data and token:
            api_data = execute_api_call(api_call_data.get("api_call", {}), token)
            # تنسيق الرد بناءً على النتائج
            response = format_api_response(response, api_data, user_name)
        elif api_call_data and not token:
            response += "\n\n⚠️ يرجى تسجيل الدخول أولاً للوصول إلى بياناتك."
            api_call_data = None
        
        # إضافة اسم المستخدم
        if user_name and response:
            response = response.replace("حبيبي", f"{user_name}")
            response = response.replace("المستخدم", user_name)
        
        # تنظيف الرد
        if not response or len(response.strip()) < 3:
            response = "مرحباً بك في مراسيل. أنا شريكك التشغيلي لدعم نجاح أعمالك 💼 كيف أقدر أساعدك في إدارة عملياتك اليوم?"
        
        return {
            "response": response,
            "api_call": api_call_data,
            "data": api_data
        }
        
    except Exception as e:
        print(f"❌ خطأ في التوليد: {e}")
        import traceback
        traceback.print_exc()
        return {
            "response": "أنا حالياً عم أتدرب أكثر حتى أقدر ألبي جميع خدماتك بشكل أفضل. جرب سؤال أبسط أو بعد دقائق 🙏",
            "api_call": None,
            "data": None
        }

@app.route('/health', methods=['GET'])
def health_check():
    """فحص صحة الخدمة"""
    return jsonify({
        "status": "healthy",
        "model_loaded": model is not None,
        "model_name": MODEL_NAME if 'MODEL_NAME' in globals() else "N/A"
    })

@app.route('/chat', methods=['POST'])
def chat():
    """نقطة نهاية المحادثة"""
    try:
        data = request.json
        user_message = data.get('message', '')
        conversation_history = data.get('history', [])
        token = data.get('token', '')
        user_name = data.get('userName', '')
        
        if not user_message:
            return jsonify({"error": "الرسالة مطلوبة"}), 400
        
        # توليد الرد
        result = generate_response(user_message, conversation_history, token, user_name)
        
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ خطأ في /chat: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/apis', methods=['GET'])
def list_apis():
    """قائمة APIs المتاحة"""
    return jsonify({
        "apis": AVAILABLE_APIS,
        "base_url": API_BASE_URL
    })

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 مراسيل 1.0 - الذكاء الاصطناعي للتجار")
    print(f"🌐 http://localhost:5000")
    print(f"🤖 النموذج: {MODEL_NAME if 'MODEL_NAME' in globals() else 'N/A'}")
    print("🎯 الشريك التشغيلي جاهز لدعم نجاح أعمالك!")
    print("="*60 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=False)
