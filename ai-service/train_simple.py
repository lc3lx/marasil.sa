#!/usr/bin/env python3
"""
تدريب بسيط جداً للذكاء الاصطناعي - مراسيل 1.0
نسخة مبسطة للاختبار السريع
"""

import os
import sys
import torch
from transformers import TrainingArguments
import json

# إضافة مجلد ai-service إلى path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fine_tune import prepare_dataset, setup_model_and_tokenizer

def simple_train():
    """تدريب بسيط جداً للاختبار"""
    print("🎯 تدريب بسيط - مراسيل 1.0")
    print("=" * 40)

    try:
        # إعداد النموذج
        print("🤖 إعداد النموذج...")
        model, tokenizer = setup_model_and_tokenizer()

        # تحضير بيانات قليلة للتدريب السريع
        print("📊 تحضير بيانات قليلة...")
        dataset = prepare_dataset(tokenizer)

        # خذ أول 5 عينات فقط للتدريب السريع
        small_dataset = dataset.select(range(min(5, len(dataset))))
        print(f"📊 سنستخدم {len(small_dataset)} عينة للتدريب السريع")

        # إعدادات تدريب بسيطة جداً
        from transformers import Trainer, DataCollatorForLanguageModeling

        training_args = TrainingArguments(
            output_dir="./marasil-ai-simple",
            num_train_epochs=1,  # epoch واحد فقط
            per_device_train_batch_size=1,
            learning_rate=1e-4,  # learning rate عالي للتدريب السريع
            logging_steps=1,  # logging كل خطوة
            save_steps=5,
            save_total_limit=1,
            remove_unused_columns=False,
            report_to=[],
        )

        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=small_dataset,
            data_collator=DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False),
        )

        print("🚀 بدء التدريب البسيط...")
        trainer.train()

        # حفظ النموذج
        trainer.save_model()
        tokenizer.save_pretrained("./marasil-ai-simple")

        print("✅ انتهى التدريب البسيط!")
        print("📁 النموذج محفوظ في: ./marasil-ai-simple")

        print("\n💡 لاستخدام النموذج: انسخ مجلد marasil-ai-simple إلى marasil-ai-v1.0")

    except Exception as e:
        print(f"❌ خطأ في التدريب البسيط: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    simple_train()














