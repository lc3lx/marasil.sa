"""
مراسيل AI Service - الإصدار المحسّن 2026
سرعة فائقة + ذكاء عالي + تحسين مستمر
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import torch
import json
import re
import requests
import os
import time
from datetime import datetime

app = Flask(__name__)
CORS(app)

# إعدادات النموذج
FINE_TUNED_PATH = "./marasil-ai-v1.0"
BASE_MODEL = "Qwen/Qwen2.5-1.5B-Instruct"

if os.path.exists(FINE_TUNED_PATH):
    MODEL_NAME = FINE_TUNED_PATH
    USE_LORA = True
    print("🎯 تحميل النموذج المدرب (مراسيل 1.0)")
else:
    MODEL_NAME = BASE_MODEL
    USE_LORA = False
    print("📚 تحميل النموذج الأساسي")

# تحميل النموذج مع 4-bit لأقصى سرعة
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, use_fast=True)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

if USE_LORA:
    base_model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL, torch_dtype=torch.float16, device_map="auto", trust_remote_code=True
    )
    model = PeftModel.from_pretrained(base_model, FINE_TUNED_PATH)
else:
    from transformers import BitsAndBytesConfig
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True
    )

model.eval()
print("✅ النموذج جاهز بسرعة فائقة!")

API_BASE_URL = os.getenv('API_BASE_URL', 'https://www.marasil.site/api')

SYSTEM_PROMPT = """أنت مراسيل - الذكاء الاصطناعي التشغيلي لمنصة مراسيل.
أنت شريك التاجر، تحمي سمعته، تقلل شكاواه، وتساعده في نمو أعماله.
تتحدث بأسلوب سعودي مهني ودّي، مباشر، وتركز على الحلول العملية."""

def extract_api_call(text):
    match = re.search(r'\{.*"api_call".*\}', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except:
            return None
    return None

def execute_api_call(call_data, token):
    try:
        headers = call_data.get("headers", {})
        headers["Authorization"] = headers.get("Authorization", "").replace("{{USER_TOKEN}}", token)
        headers.setdefault("Content-Type", "application/json")
        
        url = API_BASE_URL + call_data["url"]
        method = call_data["method"]
        
        if method == "GET":
            r = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            r = requests.post(url, headers=headers, json=call_data.get("body"), timeout=10)
        else:
            return None
            
        return r.json() if r.ok else {"error": r.text[:200]}
    except:
        return {"error": "فشل الاتصال"}

def generate_response(message, history=[], token="", name=""):
    quick = {
        "هلا": "هلا فيك! كيف أقدر أساعدك في عملياتك اليوم؟ 💼",
        "مرحبا": "أهلاً! مراسيل شريكك دائماً ⚡",
        "السلام عليكم": "وعليكم السلام، كيف أدعم أعمالك اليوم؟"
    }
    if message.strip().lower() in [k.lower() for k in quick]:
        return {"response": quick.get(message.strip(), quick["هلا"]), "api_call": None, "data": None}

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in history[-3:]:  # آخر 3 فقط للسرعة
        messages.extend([{"role": "user", "content": h[0]}, {"role": "assistant", "content": h[1]}])
    messages.append({"role": "user", "content": message})

    inputs = tokenizer.apply_chat_template(messages, tokenize=True, add_generation_prompt=True, return_tensors="pt").to(model.device)

    start = time.time()
    with torch.no_grad():
        outputs = model.generate(
            inputs,
            max_new_tokens=128,
            do_sample=False,
            temperature=0.6,
            repetition_penalty=1.1,
            pad_token_id=tokenizer.eos_token_id,
        )
    
    if time.time() - start > 8:
        return {"response": "لحظة بس، أنا أجهز لك أفضل رد ممكن 🙏", "api_call": None, "data": None}

    response = tokenizer.decode(outputs[0][inputs.shape[1]:], skip_special_tokens=True).strip()
    api_call = extract_api_call(response)
    
    if api_call:
        clean_response = re.sub(r'```json.*?```', '', response, flags=re.DOTALL).strip()
        clean_response = re.sub(r'\{.*"api_call".*\}', '', clean_response, flags=re.DOTALL).strip()
    else:
        clean_response = response
        api_call = None

    if not clean_response:
        clean_response = "كيف أقدر أساعدك في إدارة شحناتك اليوم؟ 📦"

    data = execute_api_call(api_call["api_call"], token) if api_call and token else None

    # تسجيل للتعلم المستقبلي
    try:
        with open("conversations_log.jsonl", "a", encoding="utf-8") as f:
            json.dump({"user": message, "assistant": clean_response, "timestamp": datetime.now().isoformat()}, f, ensure_ascii=False)
            f.write("\n")
    except:
        pass

    return {"response": clean_response, "api_call": api_call, "data": data}

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    result = generate_response(
        data.get('message', ''),
        data.get('history', []),
        data.get('token', ''),
        data.get('userName', '')
    )
    return jsonify(result)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "super_fast", "model": "مراسيل 1.0 محسن"})

if __name__ == '__main__':
    print("🚀 مراسيل AI - سريع، ذكي، ويتعلم لوحده!")
    app.run(host='0.0.0.0', port=5000, debug=False)