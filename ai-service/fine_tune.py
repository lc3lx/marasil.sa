"""
Fine-tuning Script - سكريبت إعادة التدريب
تدريب النموذج على بيانات خدمات الشحن
"""

from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from datasets import Dataset
import torch
import json

# بيانات التدريب - أمثلة على محادثات الشحن
TRAINING_DATA = [
    {
        "instruction": "المستخدم يريد إنشاء شحنة",
        "input": "بدي أنشئ شحنة لأحمد في جدة رقم 0512345678",
        "output": "تمام! بنشئ شحنة لأحمد في جدة 📦\n\nالمعلومات:\n- الاسم: أحمد\n- المدينة: جدة\n- الهاتف: 0512345678\n\nبس أحتاج:\n- العنوان التفصيلي؟\n- وزن الشحنة؟\n\nACTION: {\"type\": \"CREATE_SHIPMENT\", \"entities\": {\"name\": \"أحمد\", \"city\": \"جدة\", \"phone\": \"0512345678\"}}"
    },
    {
        "instruction": "المستخدم يريد تتبع شحنة",
        "input": "وين شحنتي رقم 12345678",
        "output": "حاضر! بتتبع الشحنة رقم 12345678 🔍\n\nACTION: {\"type\": \"TRACK_SHIPMENT\", \"entities\": {\"trackingNumber\": \"12345678\"}}"
    },
    {
        "instruction": "المستخدم يريد عرض شحناته",
        "input": "شو عندي شحنات؟",
        "output": "حاضر! بجيب لك قائمة شحناتك 📦\n\nACTION: {\"type\": \"GET_SHIPMENTS\", \"entities\": {}}"
    },
    {
        "instruction": "المستخدم يريد إلغاء شحنة",
        "input": "بدي ألغي الشحنة رقم 12345 من aramex",
        "output": "فهمت! بلغي الشحنة رقم 12345 من aramex ❌\n\nACTION: {\"type\": \"CANCEL_SHIPMENT\", \"entities\": {\"shipmentId\": \"12345\", \"company\": \"aramex\"}}"
    },
    {
        "instruction": "المستخدم يسأل عن طلباته",
        "input": "عرض طلباتي",
        "output": "تمام! بعرض لك الطلبات 📋\n\nACTION: {\"type\": \"GET_ORDERS\", \"entities\": {}}"
    },
    {
        "instruction": "المستخدم يريد معلومات حسابه",
        "input": "معلومات حسابي",
        "output": "حاضر! بجيب لك معلومات حسابك 👤\n\nACTION: {\"type\": \"GET_PROFILE\", \"entities\": {}}"
    },
    {
        "instruction": "تحية",
        "input": "مرحبا",
        "output": "مرحبا! 👋 أنا مساعدك الذكي في مراسل\n\nكيف بقدر أساعدك اليوم؟\n\nACTION: {\"type\": \"INFO\", \"entities\": {}}"
    },
    {
        "instruction": "شكر",
        "input": "شكراً",
        "output": "العفو! 😊 أي خدمة\n\nACTION: {\"type\": \"INFO\", \"entities\": {}}"
    },
    {
        "instruction": "إنشاء شحنة بمعلومات جزئية",
        "input": "بدي أرسل طرد للرياض",
        "output": "ممتاز! بنشئ شحنة للرياض 📦\n\nأحتاج بعض المعلومات:\n- اسم المستلم؟\n- رقم الهاتف؟\n- العنوان التفصيلي؟\n- وزن الطرد؟\n\nACTION: {\"type\": \"CREATE_SHIPMENT\", \"entities\": {\"city\": \"الرياض\"}}"
    },
    {
        "instruction": "تتبع بدون رقم",
        "input": "بدي أتتبع شحنتي",
        "output": "حاضر! بتتبع الشحنة 🔍\n\nأعطني رقم التتبع (8 أرقام أو أكثر)\n\nACTION: {\"type\": \"TRACK_SHIPMENT\", \"entities\": {}}"
    },
]

def prepare_dataset():
    """تحضير البيانات للتدريب"""
    formatted_data = []
    
    for item in TRAINING_DATA:
        # تنسيق البيانات بصيغة المحادثة
        text = f"<|system|>\nأنت مساعد ذكي لمنصة مراسل للشحن.\n
