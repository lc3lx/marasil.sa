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

app = Flask(__name__)
CORS(app)

# تحميل النموذج - استخدام نموذج قوي بالعربية
# Qwen2.5-7B-Instruct: نموذج قوي جداً بالعربية (يحتاج GPU قوي)
# Qwen2.5-3B-Instruct: متوازن (يعمل على GPU متوسط)
# Qwen2.5-1.5B-Instruct: سريع (يعمل على CPU/GPU ضعيف)
DEFAULT_GPU_MODEL = os.getenv('AI_MODEL', 'Qwen/Qwen2.5-3B-Instruct')
DEFAULT_CPU_MODEL = os.getenv('AI_MODEL_CPU', 'Qwen/Qwen2.5-1.5B-Instruct')

try:
    if torch.cuda.is_available():
        MODEL_NAME = DEFAULT_GPU_MODEL
        device_map = 'auto'
        dtype = torch.float16
        print(f"🔄 تحميل النموذج على GPU: {MODEL_NAME} (fp16)")
    else:
        MODEL_NAME = DEFAULT_CPU_MODEL
        device_map = 'cpu'
        dtype = torch.float32
        print(f"🔄 تحميل نموذج للـ CPU: {MODEL_NAME} (fp32)")

    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, use_fast=True)
    
    # إضافة pad_token إذا لم يكن موجوداً
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        device_map=device_map,
        torch_dtype=dtype,
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

    print(f"✅ تم تحميل النموذج: {MODEL_NAME}")
except Exception as e:
    print(f"❌ خطأ في تحميل النموذج: {e}")
    print("💡 جرب: pip install --upgrade transformers torch")
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

# System Prompt للمساعد الذكي
SYSTEM_PROMPT = """أنت سارة - مساعدة ذكية في منصة مراسل للشحن. أنت موظفة محترفة وذكية تساعد العملاء في جميع مهام المنصة.

## شخصيتك:
- ودودة ومرحة وصبورة
- تتكلمين بلهجة سعودية طبيعية
- ذكية وتفهمين طلبات العملاء بدقة
- تساعدين في جميع مهام المنصة بدون استثناء
- تردين بذكاء وليس فقط حفظ ردود

## مهمتك الأساسية:
عندما يسألك المستخدم عن شيء يحتاج بيانات من النظام:

1. **فهمي الطلب بدقة** - ماذا يريد المستخدم بالضبط؟
2. **حددي API المناسب** - أي endpoint يحتاج؟
3. **ولدي API call** - بصيغة JSON الصحيحة
4. **اشرحي للمستخدم** - ماذا ستفعلين

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

## أمثلة عملية:

**مثال 1: تتبع شحنة**
المستخدم: "وين شحنتي رقم 123456"
أنت: "حبيبي، راح أتتبع لك الشحنة الآن! 📦

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

**مثال 2: عرض الشحنات**
المستخدم: "شحناتي" أو "عرض شحناتي"
أنت: "بكل سرور! راح أجيب لك جميع شحناتك 📦

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

**مثال 3: رصيد المحفظة**
المستخدم: "كم رصيد المحفظة؟" أو "رصيدي"
أنت: "راح أشوف لك رصيد محفظتك الآن 💰

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

**مثال 4: معلومات الحساب**
المستخدم: "معلومات حسابي" أو "حسابي"
أنت: "راح أجيب لك معلومات حسابك 👤

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

**مثال 5: إلغاء شحنة**
المستخدم: "بدي ألغي شحنة رقم ABC123"
أنت: "تمام، راح ألغي لك الشحنة الآن ❌

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

## قواعد مهمة جداً:

1. **استخدمي {{USER_TOKEN}} دائماً** - لا تستخدمي token حقيقي
2. **URLs بدون /api** - فقط المسار مثل `/shipment/my-shipments`
3. **استخرجي المعلومات من الطلب** - مثل رقم التتبع من "وين شحنتي رقم 123"
4. **إذا ما في token** - اطلبي تسجيل الدخول
5. **لا تخترعي بيانات** - استخدمي API فقط
6. **للـ POST/PUT** - أضيفي body فقط إذا كان مطلوباً

## أسلوبك في الرد:
- تحدثي كإنسانة طبيعية
- استخدمي لهجة سعودية ودودة
- اشرحي ماذا ستفعلين قبل API call
- بعد النتائج، اشرحيها بوضوح
- استخدمي إيموجي بشكل طبيعي 😊
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
    """تنسيق الرد بناءً على بيانات API"""
    try:
        if not api_data or api_data.get("error"):
            error_msg = api_data.get("error", "حدث خطأ") if api_data else "لا توجد بيانات"
            return f"{response_text}\n\n⚠️ {error_msg}"
        
        # تنسيق حسب نوع البيانات
        data = api_data.get("data") or api_data
        
        if isinstance(data, list):
            count = len(data)
            if count > 0:
                return f"{response_text}\n\n✅ وجدت {count} نتيجة! إذا تحتاج تفاصيل أكثر عن أي واحدة، قولي وأساعدك 😊"
            else:
                return f"{response_text}\n\n📭 ما في نتائج حالياً. إذا تحتاج مساعدة في شيء ثاني، أنا هنا!"
        
        elif isinstance(data, dict):
            # إذا كان رصيد محفظة
            if "balance" in data or isinstance(data, (int, float)):
                balance = data.get("balance", data) if isinstance(data, dict) else data
                return f"{response_text}\n\n💰 رصيد محفظتك: {balance} ريال"
            
            # إذا كانت شحنة
            if "trackingId" in data or "shipmentStatus" in data:
                status = data.get("shipmentStatus", data.get("status", "غير معروف"))
                tracking = data.get("trackingId", data.get("trackingNumber", "غير متوفر"))
                return f"{response_text}\n\n📦 رقم التتبع: {tracking}\n📍 الحالة: {status}"
            
            # معلومات حساب
            if "firstName" in data or "email" in data:
                name = data.get("firstName", "")
                email = data.get("email", "")
                return f"{response_text}\n\n👤 الاسم: {name}\n📧 الإيميل: {email}"
        
        return f"{response_text}\n\n✅ تم بنجاح! إذا تحتاج أي شيء ثاني، أنا هنا 😊"
        
    except Exception as e:
        print(f"❌ خطأ في تنسيق الرد: {e}")
        return response_text

def generate_response(user_message, conversation_history=[], token="", user_name=""):
    """توليد رد ذكي من النموذج"""
    
    # ردود سريعة للتحيات
    quick_greetings = {
        "هلا": "هلا وغلا! أهلاً وسهلاً فيك، أنا سارة من فريق مراسل 😊 كيف أقدر أساعدك اليوم؟",
        "مرحبا": "مرحبا وأهلاً وسهلاً! أنا سارة، مساعدتك في مراسل 😊 وش أقدر أسوي لك؟",
        "السلام عليكم": "وعليكم السلام ورحمة الله وبركاته! أهلاً وسهلاً، أنا سارة 😊 كيف أقدر أخدمك؟",
        "شكرا": "العفو والله! أي وقت تحتاج أي شي لا تتردد، أنا هنا دايماً 😊",
        "شكراً": "العفو حبيبي! دايماً في خدمتك، أي شي تحتاجه تكلمني 😊",
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
            "response": "عذراً، النموذج غير متوفر حالياً. جرب لاحقاً.",
            "api_call": None,
            "data": None
        }
    
    try:
        # بناء المحادثة
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message}
        ]
        
        # إضافة تاريخ المحادثة
        for hist in conversation_history[-3:]:  # آخر 3 رسائل فقط
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
        
        with torch.inference_mode():
            outputs = model.generate(
                **inputs,
                max_new_tokens=512,  # زيادة للسماح بـ API calls
                do_sample=True,
                temperature=0.7,
                top_p=0.9,
                repetition_penalty=1.2,
                use_cache=True,
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id,
            )
        
        # فك تشفير الرد
        generated_ids = outputs[0]
        input_len = inputs["input_ids"].shape[1]
        response = tokenizer.decode(generated_ids[input_len:], skip_special_tokens=True)
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
            response = "أهلاً وسهلاً! أنا سارة من فريق مراسل 😊 كيف أقدر أساعدك اليوم؟"
        
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
            "response": "عذراً، حدث خطأ في معالجة طلبك. جرب مرة أخرى.",
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
    print("🚀 AI Service - مساعد ذكي للشحن")
    print(f"🌐 http://localhost:5000")
    print(f"🤖 النموذج: {MODEL_NAME if 'MODEL_NAME' in globals() else 'N/A'}")
    print("🎯 سارة - المساعدة الذكية جاهزة!")
    print("="*60 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=False)
