#!/usr/bin/env python3
"""
اختبار بسيط للتحقق من syntax ملف fine_tune.py
"""

def test_syntax():
    """اختبار syntax الملف"""
    try:
        # محاولة import الملف
        import fine_tune
        print("✅ syntax صحيح - تم import الملف بنجاح")

        # التحقق من وجود الدوال الرئيسية
        if hasattr(fine_tune, 'train_model'):
            print("✅ دالة train_model موجودة")
        else:
            print("❌ دالة train_model مفقودة")

        if hasattr(fine_tune, 'prepare_dataset'):
            print("✅ دالة prepare_dataset موجودة")
        else:
            print("❌ دالة prepare_dataset مفقودة")

        if hasattr(fine_tune, 'setup_model_and_tokenizer'):
            print("✅ دالة setup_model_and_tokenizer موجودة")
        else:
            print("❌ دالة setup_model_and_tokenizer مفقودة")

        print("🎉 جميع الاختبارات نجحت!")

    except IndentationError as e:
        print(f"❌ خطأ indentation: {e}")
        return False
    except SyntaxError as e:
        print(f"❌ خطأ syntax: {e}")
        return False
    except ImportError as e:
        print(f"❌ خطأ import: {e}")
        return False
    except Exception as e:
        print(f"❌ خطأ غير متوقع: {e}")
        return False

    return True

if __name__ == "__main__":
    test_syntax()
















