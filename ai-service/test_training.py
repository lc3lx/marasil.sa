#!/usr/bin/env python3
"""
اختبار بسيط للتأكد من أن التدريب يعمل
"""

import sys
import os

# إضافة المسار
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fine_tune import prepare_dataset, setup_model_and_tokenizer

def test_data_preparation():
    """اختبار تحضير البيانات"""
    print("🧪 اختبار تحضير البيانات...")

    try:
        # إعداد tokenizer أولاً
        model, tokenizer = setup_model_and_tokenizer()
        print("✅ تم تحميل النموذج والtokenizer")

        # تحضير البيانات مع tokenization
        dataset = prepare_dataset(tokenizer)
        print(f"✅ تم تحضير البيانات: {len(dataset)} عينة")

        # فحص البيانات
        sample = dataset[0]
        print(f"🔍 عينة البيانات تحتوي على الأعمدة: {list(sample.keys())}")

        # التأكد من وجود input_ids
        if 'input_ids' in sample:
            print("✅ البيانات تحتوي على input_ids")
        else:
            print("❌ البيانات لا تحتوي على input_ids")

        print("🎉 اختبار تحضير البيانات نجح!")

    except Exception as e:
        print(f"❌ خطأ في اختبار البيانات: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_data_preparation()

