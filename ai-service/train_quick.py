#!/usr/bin/env python3
"""
سكريبت تدريب سريع للذكاء الاصطناعي - مراسيل 1.0
يدرب النموذج بسرعة للاختبار والتطوير
"""

import os
import sys
import torch
from transformers import TrainingArguments
import json

# إضافة مجلد ai-service إلى path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fine_tune import prepare_dataset, setup_model_and_tokenizer, train_model, test_model

def quick_train():
    """تدريب سريع للاختبار"""
    print("🚀 تدريب سريع - مراسيل 1.0")
    print("=" * 40)

    # التحقق من GPU
    if not torch.cuda.is_available():
        print("⚠️ لا يوجد GPU متاح. التدريب سيكون بطيئاً جداً.")
        confirm = input("هل تريد المتابعة؟ (y/n): ")
        if confirm.lower() != 'y':
            return

    try:
        # تحضير البيانات
        print("📊 تحضير البيانات...")
        dataset = prepare_dataset()

        # إعداد النموذج
        print("🤖 إعداد النموذج...")
        model, tokenizer = setup_model_and_tokenizer()

        # تدريب سريع (epoch واحد فقط)
        print("🎯 بدء التدريب السريع...")

        # إعدادات تدريب سريعة
        from transformers import Trainer, DataCollatorForLanguageModeling

        training_args = TrainingArguments(
            output_dir="./marasil-ai-v1.0-quick",
            num_train_epochs=1,  # epoch واحد فقط
            per_device_train_batch_size=1,  # batch size صغير
            gradient_accumulation_steps=8,  # accumulation لتوفير الذاكرة
            learning_rate=5e-4,  # learning rate أعلى للتدريب السريع
            fp16=True,
            logging_steps=5,
            save_steps=50,
            save_total_limit=1,
            dataloader_num_workers=0,
            report_to=[],  # لا نريد logging خارجي
        )

        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=dataset,
            data_collator=DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False),
        )

        # تدريب قصير
        trainer.train()

        # حفظ النموذج
        trainer.save_model()
        tokenizer.save_pretrained("./marasil-ai-v1.0-quick")

        print("✅ انتهى التدريب السريع!")
        print("📁 النموذج محفوظ في: ./marasil-ai-v1.0-quick")

        # اختبار سريع
        print("\n🧪 اختبار سريع:")
        test_inputs = ["مرحبا", "ما هي مراسيل؟"]
        for test_input in test_inputs:
            inputs = tokenizer(f"<|im_start|>user\n{test_input}<|im_end|>\n<|im_start|>assistant\n", return_tensors="pt").to(model.device)
            with torch.no_grad():
                outputs = model.generate(**inputs, max_new_tokens=50, do_sample=True, temperature=0.7)
            response = tokenizer.decode(outputs[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True)
            print(f"❓ {test_input}")
            print(f"🤖 {response[:100]}...")
            print("-" * 30)

        print("\n💡 للتدريب الكامل: python fine_tune.py")

    except Exception as e:
        print(f"❌ خطأ في التدريب: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    quick_train()
