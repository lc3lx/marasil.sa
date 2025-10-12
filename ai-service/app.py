"""
AI Service API - خدمة الذكاء الاصطناعي
نموذج Phi-3 Mini مع Fine-tuning لخدمات الشحن
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
import torch
import json
import os

app = Flask(__name__)
CORS(app)

# تحميل النموذج (مرة واحدة عند بدء التشغيل) مع اختيار تلقائي للأسرع
# - GPU: Qwen2.5-1.5B FP16
# - CPU: Qwen2.5-0.5B FP32 (أسرع بكثير على المعالج)
DEFAULT_GPU_MODEL = os.getenv('AI_MODEL', 'Qwen/Qwen2.5-1.5B-Instruct')
DEFAULT_CPU_MODEL = os.getenv('AI_MODEL_CPU', 'Qwen/Qwen2.5-0.5B-Instruct')

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
        print(f"🔄 تحميل نموذج سريع للـ CPU: {MODEL_NAME} (fp32)")

    # استخدام tokenizer سريع
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, use_fast=True)

    # تحميل النموذج
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        device_map=device_map,
        torch_dtype=dtype,
        low_cpu_mem_usage=True,
    )
    model.eval()

    # Warmup صغير لتسريع أول طلب
    try:
        warm_inputs = tokenizer("مرحبا", return_tensors="pt").to(model.device)
        with torch.inference_mode():
            _ = model.generate(**warm_inputs, max_new_tokens=1)
    except Exception:
        pass

    print("✅ تم تحميل النموذج وجاهز!", f"الموديل: {MODEL_NAME}")
except Exception as e:
    print(f"❌ خطأ في تحميل النموذج: {e}")
    print("💡 جرب: pip install --upgrade transformers torch")
    model = None
    tokenizer = None

# API Base URL
API_BASE_URL = "https://www.marasil.site/api"

# System Prompt للمساعد الذكي الطبيعي
SYSTEM_PROMPT = """أنت مراسيل ai - مساعدة خدمة العملاء في مراسل للشحن. أنت إنسانة ودودة ومتفهمة، تحبين مساعدة الناس وحل مشاكلهم.

شخصيتك:
- ودودة ومرحة وصبورة
- تتكلمين بلهجة سعودية طبيعية
- تتفهمين مشاعر العملاء وتتعاطفين معهم
- تحبين تقديم أفضل خدمة ممكنة
- تسألين عن تفاصيل أكثر لو احتجتِ
- تشرحين الأمور ببساطة ووضوح

خدماتك:
- تتبع الشحنات ومعرفة مكانها
- عرض شحنات العميل وطلباته
- شرح خدمات الشركة وأسعارها
- مساعدة في أي استفسار عن الشحن
- حل المشاكل والشكاوى

شركات الشحن المتاحة:
- أرامكس: سريع وموثوق
- سمسا: تغطية واسعة في السعودية  
- ريد بوكس: خدمة ممتازة
- لاما بوكس: أسعار مناسبة

أسلوبك في الرد:
1. تحدثي كإنسانة طبيعية، مش بوت
2. استخدمي لهجة سعودية ودودة
3. اسألي عن التفاصيل لو احتجتِ
4. اشرحي الأمور بوضوح
5. تعاطفي مع مشاكل العملاء
6. أضيفي ACTION فقط لو احتجتِ تنفذي شي

أمثلة على أسلوبك:

المستخدم: "هلا"
أنت: "هلا وغلا! أهلاً وسهلاً فيك، أنا سارة من فريق مراسل 😊 كيف أقدر أساعدك اليوم؟"

المستخدم: "وين شحنتي؟"
أنت: "أكيد بساعدك أتتبع شحنتك! ممكن تعطيني رقم التتبع عشان أشوف وين وصلت؟ 📦"

المستخدم: "شحنتي متأخرة ومتضايق"
أنت: "آسفة كثير إنك متضايق، أفهم شعورك تماماً 😔 خليني أشوف إيش صار مع شحنتك وأحل لك المشكلة. ممكن رقم التتبع؟"

المستخدم: "كم سعر الشحن؟"
أنت: "بكل سرور أعرض لك الأسعار! بس عشان أعطيك السعر الدقيق، ممكن تقولي من وين لوين بدك تشحن؟ والوزن تقريباً كم؟ 💰"

المستخدم: "شكراً"
أنت: "العفو حبيبي! أي وقت تحتاج أي شي أنا هنا، لا تتردد تكلمني 😊 دايماً في خدمتك!"
"""

def enhance_response_with_data(response, intent, api_data, user_name=""):
    """تحسين الرد بإضافة البيانات المسترجعة بطريقة طبيعية وإنسانية"""
    try:
        if intent == "track_shipment" and api_data.get("data"):
            data = api_data["data"]
            status = data.get("status", "غير معروف")
            location = data.get("currentLocation", "غير متوفر")
            response += f"\n\nطلعت لك المعلومات! 😊\n📍 الحالة الحين: {status}\n🚚 مكان الشحنة: {location}\n\nإذا تحتاج أي شي ثاني، أنا هنا!"
        
        elif intent == "get_shipments" and api_data.get("data"):
            shipments = api_data["data"]
            count = len(shipments) if isinstance(shipments, list) else 0
            if count > 0:
                response += f"\n\nشفت لك الشحنات! عندك {count} شحنة 📦\nإذا تبغى تتتبع أي وحدة منها، أعطني رقم التتبع وأشوفها لك فوراً! 🔍"
            else:
                response += f"\n\nما عندك شحنات حالياً 📦\nإذا تبغى تسوي شحنة جديدة، أقدر أساعدك!"
        
        elif intent == "get_orders" and api_data.get("data"):
            orders = api_data["data"]
            count = len(orders) if isinstance(orders, list) else 0
            if count > 0:
                response += f"\n\nهذي طلباتك! عندك {count} طلب 📋\nأي استفسار عن أي طلب، قولي وأساعدك!"
            else:
                response += f"\n\nما عندك طلبات حالياً 📋\nمتى تبغى تطلب شي، أنا هنا أساعدك!"
        
        elif intent == "get_profile" and api_data.get("data"):
            profile = api_data["data"]
            name = profile.get("firstName", "")
            email = profile.get("email", "")
            response += f"\n\nهذي معلومات حسابك:"
            if name:
                response += f"\n👤 الاسم: {name}"
            if email:
                response += f"\n📧 الإيميل: {email}"
            response += f"\n\nإذا تبغى تعدل أي شي، قولي وأساعدك! 😊"
        
        elif intent == "get_companies":
            companies = api_data.get("companies", [])
            response += "\n\nهذي شركات الشحن اللي نتعامل معها:\n"
            for comp in companies:
                response += f"• {comp['name_ar']}: {comp['description']}\n"
            response += "\nكلها شركات موثوقة ومجربة! أي وحدة تناسبك أقدر أساعدك فيها 😊"
        
        elif intent == "get_prices":
            pricing = api_data.get("pricing", {})
            response += "\n\nهذي أسعارنا:\n"
            response += f"• الشحن المحلي: {pricing.get('local', 'اتصلي للاستفسار')}\n"
            response += f"• بين المدن: {pricing.get('domestic', 'اتصلي للاستفسار')}\n"
            response += f"• الشحن الدولي: {pricing.get('international', 'اتصلي للاستفسار')}\n"
            response += "\nأسعارنا منافسة والخدمة ممتازة! إذا تبغى تفاصيل أكثر، قولي 💰"
        
        return response
    except Exception as e:
        print(f"❌ خطأ في تحسين الرد: {e}")
        return response

def execute_action(intent, entities, token, user_name=""):
    """تنفيذ الإجراء المطلوب عبر API"""
    import requests
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        if intent == "track_shipment":
            tracking_number = entities.get("trackingNumber", "")
            if not tracking_number:
                return {"error": "رقم التتبع مطلوب"}
            
            response = requests.post(
                f"{API_BASE_URL}/shipment/traking",
                headers=headers,
                json={"trackingNumber": tracking_number},
                timeout=10
            )
            return response.json() if response.ok else {"error": "فشل التتبع"}
        
        elif intent == "cancel_shipment":
            shipment_id = entities.get("shipmentId", "")
            company = entities.get("company", "")
            if not shipment_id or not company:
                return {"error": "رقم الشحنة والشركة مطلوبان"}
            
            response = requests.post(
                f"{API_BASE_URL}/shipment/cancel/{shipment_id}",
                headers=headers,
                json={"company": company},
                timeout=10
            )
            return response.json() if response.ok else {"error": "فشل الإلغاء"}
        
        elif intent == "get_shipments":
            response = requests.get(
                f"{API_BASE_URL}/shipment/my-shipments?page=1&itemsPerPage=10",
                headers=headers,
                timeout=10
            )
            return response.json() if response.ok else {"error": "فشل جلب الشحنات"}
        
        elif intent == "get_orders":
            response = requests.get(
                f"{API_BASE_URL}/orderManually",
                headers=headers,
                timeout=10
            )
            return response.json() if response.ok else {"error": "فشل جلب الطلبات"}
        
        elif intent == "get_profile":
            response = requests.get(
                f"{API_BASE_URL}/customer/profile",
                headers=headers,
                timeout=10
            )
            return response.json() if response.ok else {"error": "فشل جلب الملف الشخصي"}
        
        elif intent == "get_companies":
            return {
                "companies": [
                    {"name": "Aramex", "name_ar": "أرامكس", "description": "شحن سريع وموثوق"},
                    {"name": "SMSA", "name_ar": "سمسا", "description": "تغطية واسعة في السعودية"},
                    {"name": "DHL", "name_ar": "لاما بوكس ", "description": "شحن الخزائان "},
                    {"name": "FedEx", "name_ar": "ريد بوكس", "description": "شحن الخزائان"}
                ]
            }
        
        elif intent == "get_prices":
            return {
                "pricing": {
                    "local": "من 15 ريال للشحن المحلي",
                    "domestic": "من 25 ريال بين المدن",
                    "international": "من 70 ريال للشحن الدولي"
                }
            }
        
        return None
        
    except requests.exceptions.Timeout:
        return {"error": "انتهت مهلة الاتصال"}
    except requests.exceptions.RequestException as e:
        print(f"❌ خطأ في API: {e}")
        return {"error": "فشل الاتصال بالخادم"}
    except Exception as e:
        print(f"❌ خطأ غير متوقع: {e}")
        return {"error": "حدث خطأ غير متوقع"}

def generate_response(user_message, conversation_history=[], token="", user_name=""):
    """توليد رد من النموذج"""
    
    # ردود سريعة طبيعية وإنسانية
    quick_responses = {
        "هلا": "هلا وغلا! أهلاً وسهلاً فيك، أنا سارة من فريق مراسل 😊 كيف أقدر أساعدك اليوم؟",
        "مرحبا": "مرحبا وأهلاً وسهلاً! أنا سارة، مساعدتك في مراسل 😊 وش أقدر أسوي لك؟", 
        "السلام عليكم": "وعليكم السلام ورحمة الله وبركاته! أهلاً وسهلاً، أنا سارة 😊 كيف أقدر أخدمك؟",
        "طيب": "تمام حبيبي، قولي وش تحتاج وأنا في الخدمة 😊",
        "شكرا": "العفو والله! أي وقت تحتاج أي شي لا تتردد، أنا هنا دايماً 😊",
        "شكراً": "العفو حبيبي! دايماً في خدمتك، أي شي تحتاجه تكلمني 😊",
        "لا شكرا": "تمام، أي وقت تحتاجني أنا هنا. يعطيك العافية! 👍",
        "لا شكراً": "تسلم، أي وقت تحتاج أي مساعدة أنا موجودة 👍",
        "كيف حالك": "الحمدلله بخير وعافية! وأنت كيف حالك؟ 😊 وش أقدر أساعدك فيه؟",
        "وش أخبارك": "الحمدلله تمام والأمور زينة! وأنت كيف الأحوال؟ 😊",
        "اهلا": "أهلاً وسهلاً! نورت، أنا سارة من مراسل 😊 كيف أقدر أساعدك؟",
        "أهلا": "أهلاً وسهلاً فيك! أنا سارة، مساعدتك اليوم 😊 وش تحتاج؟",
        "hi": "Hi! أهلاً وسهلاً، أنا سارة من مراسل 😊 How can I help you?",
        "hello": "Hello! مرحبا، أنا سارة 😊 كيف أقدر أساعدك؟",
        "ok": "تمام، قولي وش تبغين وأنا جاهزة أساعدك 😊",
        "اوك": "أوكي، وش تحتاجين؟ أنا هنا عشان أساعدك 😊",
        "وين شحنتي": "أكيد بساعدك أتتبع شحنتك! ممكن تعطيني رقم التتبع عشان أشوف وين وصلت؟ 📦",
        "شحناتي": "بكل سرور أجيب لك شحناتك! خليني أشوف إيش عندك 📦",
        "وش الشركات": "عندنا شركات ممتازة: أرامكس وسمسا وريد بوكس ولاما بوكس! أي وحدة تفضل؟ 🚚",
        "كم السعر": "بكل سرور أعرض لك الأسعار! ممكن تقولي من وين لوين تبغى تشحن؟ 💰",
    }
    
    # فحص الردود السريعة أولاً
    user_msg_clean = user_message.strip().lower()
    for key, response in quick_responses.items():
        if key in user_msg_clean:
            return {
                "response": response,
                "intent": "info",
                "entities": {},
                "confidence": 0.95,
                "data": None
            }
    
    # إذا النموذج مش شغال، استخدم ردود ذكية
    if model is None or tokenizer is None:
        # ردود ذكية بناءً على كلمات مفتاحية
        if any(word in user_msg_clean for word in ["تتبع", "وين", "مكان", "شحنة"]):
            return {
                "response": "أكيد بساعدك أتتبع شحنتك! ممكن تعطيني رقم التتبع؟ 📦",
                "intent": "track_shipment",
                "entities": {},
                "confidence": 0.8,
                "data": None
            }
        elif any(word in user_msg_clean for word in ["شحنات", "طرود", "طلبات"]):
            return {
                "response": "بكل سرور أعرض لك شحناتك! خليني أجيبها لك 📦",
                "intent": "get_shipments", 
                "entities": {},
                "confidence": 0.8,
                "data": None
            }
        elif any(word in user_msg_clean for word in ["شركات", "شركة", "أرامكس", "سمسا"]):
            return {
                "response": "عندنا شركات ممتازة: أرامكس وسمسا وريد بوكس ولاما بوكس! 🚚",
                "intent": "get_companies",
                "entities": {},
                "confidence": 0.8,
                "data": None
            }
        elif any(word in user_msg_clean for word in ["سعر", "أسعار", "تكلفة", "كم"]):
            return {
                "response": "بكل سرور أعرض لك الأسعار! ممكن تقولي من وين لوين؟ 💰",
                "intent": "get_prices",
                "entities": {},
                "confidence": 0.8,
                "data": None
            }
        else:
            return {
                "response": "أهلاً وسهلاً! أنا سارة من فريق مراسل 😊 أقدر أساعدك في تتبع الشحنات، معرفة الأسعار، أو أي استفسار عن خدماتنا. وش تحتاج؟",
                "intent": "info",
                "entities": {},
                "confidence": 0.7,
                "data": None
            }
    
    try:
        # بناء المحادثة بصيغة Qwen (الطريقة الصحيحة)
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message}
        ]
        
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
                max_new_tokens=28,  # أقصر لسرعة أعلى (~1-3 ثواني)
                do_sample=False,    # أسرع وبدون تشتت
                repetition_penalty=1.2,
                use_cache=True,
                pad_token_id=tokenizer.eos_token_id,
                eos_token_id=tokenizer.eos_token_id,
            )
        
        # فك تشفير الرد بدقة (تجاهل التوكنات المدخلة)
        generated_ids = outputs[0]
        input_len = inputs["input_ids"].shape[1]
        response = tokenizer.decode(generated_ids[input_len:], skip_special_tokens=True)
        response = response.strip()
        
        # استخراج ACTION من الرد
        intent = "info"
        entities = {}
        api_data = None
        
        if "ACTION:" in response:
            try:
                action_part = response.split("ACTION:")[1].strip()
                action_data = json.loads(action_part.split("\n")[0])
                intent = action_data.get("type", "info").lower()
                entities = action_data.get("entities", {})
                
                # تنفيذ الإجراء إذا كان هناك توكن
                if token and intent != "info":
                    api_data = execute_action(intent, entities, token, user_name)
                
                # إزالة ACTION من الرد النهائي
                response = response.split("ACTION:")[0].strip()
            except Exception as e:
                print(f"❌ خطأ في معالجة ACTION: {e}")
        
        # إضافة اسم المستخدم للرد إذا كان متوفراً (لهجة سعودية)
        if user_name and response:
            response = response.replace("هلا وغلا!", f"هلا وغلا {user_name}!")
            response = response.replace("مرحبا!", f"مرحبا {user_name}!")
            response = response.replace("تمام،", f"تمام {user_name}،")
            response = response.replace("أهلاً", f"أهلاً {user_name}")
        
        # تحسين الرد بناءً على البيانات المسترجعة
        if api_data and not api_data.get("error"):
            response = enhance_response_with_data(response, intent, api_data, user_name)
        
        # إذا كان الرد فاضي أو غريب، استخدم رد افتراضي طبيعي
        if not response or len(response.strip()) < 3 or "عذراً" in response:
            response = "أهلاً وسهلاً! أنا سارة من فريق مراسل 😊 كيف أقدر أساعدك اليوم؟"
            intent = "info"
        
        return {
            "response": response,
            "intent": intent,
            "entities": entities,
            "confidence": 0.85,
            "data": api_data
        }
        
    except Exception as e:
        print(f"❌ خطأ في التوليد: {e}")
        import traceback
        traceback.print_exc()
        return {
            "response": "عذراً، حدث خطأ في معالجة طلبك",
            "intent": "error",
            "entities": {}
        }

@app.route('/health', methods=['GET'])
def health_check():
    """فحص صحة الخدمة"""
    return jsonify({
        "status": "healthy",
        "model_loaded": model is not None,
        "model_name": MODEL_NAME
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

@app.route('/analyze', methods=['POST'])
def analyze():
    """تحليل النية فقط بدون توليد رد كامل"""
    try:
        data = request.json
        user_message = data.get('message', '').lower()
        
        # تحليل بسيط للنية
        intent = "info"
        entities = {}
        
        if any(word in user_message for word in ["إنشاء", "شحنة جديدة", "بدي شحن"]):
            intent = "create_shipment"
        elif any(word in user_message for word in ["تتبع", "وين شحنتي", "track"]):
            intent = "track_shipment"
        elif any(word in user_message for word in ["إلغاء", "الغاء", "cancel"]):
            intent = "cancel_shipment"
        elif "شحناتي" in user_message:
            intent = "get_shipments"
        elif "طلباتي" in user_message:
            intent = "get_orders"
        elif any(word in user_message for word in ["حسابي", "ملفي", "profile"]):
            intent = "get_profile"
        
        return jsonify({
            "intent": intent,
            "entities": entities,
            "confidence": 0.8
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("\n" + "="*50)
    print("🚀 AI Service جاهز للاستخدام!")
    print(f"🌐 http://localhost:5000")
    print(f"🤖 النموذج: {MODEL_NAME}")
    print("🎯 سارة - المساعدة الذكية جاهزة!")
    print("="*50 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=False)
