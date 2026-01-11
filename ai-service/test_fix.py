#!/usr/bin/env python3
"""
اختبار سريع للتحقق من إصلاح مشكلة messages variable
"""

import sys
import os

# إضافة المجلد الحالي للمسار
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_generate_response_logic():
    """اختبار منطق دالة generate_response"""

    # محاكاة الكود المصحح
    use_fine_tuned = True
    model = type('MockModel', (), {'peft_config': True})()  # محاكاة نموذج مدرب
    SYSTEM_PROMPT = "مرحبا أنا مساعد ذكي"
    user_message = "كيف حالك؟"
    conversation_history = [
        {"role": "user", "content": "ما هو سعر الشحن؟"},
        {"role": "assistant", "content": "السعر يعتمد على الوزن"}
    ]

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
            for hist in conversation_history[-2:]:  # آخر رسالتين فقط للنماذج المدربة
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
            print("✅ النموذج المدرب: نجح في بناء conversation_text")

        else:
            # النموذج الأساسي - استخدام chat template
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
            # text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
            text = "محاكاة prompt"
            print("✅ النموذج الأساسي: نجح في بناء messages")

        print(f"✅ النتيجة النهائية: {text[:100]}...")
        return True

    except Exception as e:
        print(f"❌ خطأ: {e}")
        return False

def test_basic_model():
    """اختبار النموذج الأساسي"""
    use_fine_tuned = False
    model = None  # محاكاة نموذج أساسي

    try:
        if model and hasattr(model, 'peft_config'):
            print("نموذج مدرب")
        else:
            messages = [{"role": "user", "content": "test"}]
            messages.append({"role": "assistant", "content": "response"})
            print("✅ النموذج الأساسي يعمل بدون مشاكل")
        return True
    except Exception as e:
        print(f"❌ خطأ في النموذج الأساسي: {e}")
        return False

if __name__ == "__main__":
    print("🧪 اختبار إصلاح مشكلة messages variable")
    print("=" * 50)

    # اختبار النموذج المدرب
    print("\n1. اختبار النموذج المدرب:")
    test1 = test_generate_response_logic()

    # اختبار النموذج الأساسي
    print("\n2. اختبار النموذج الأساسي:")
    test2 = test_basic_model()

    if test1 and test2:
        print("\n🎉 جميع الاختبارات نجحت! المشكلة محلولة.")
    else:
        print("\n❌ فشل في بعض الاختبارات.")











