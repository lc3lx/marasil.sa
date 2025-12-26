"""
سكريبت تدريب تلقائي من ملفات المحادثة conversations_log.jsonl
- يستخرج الحوارات من سجل الذكاء
- يحولها لصيغة تدريب   fine-tune
- يشغّل fine_tune.py تلقائياً (على نفس النموذج أو نموذج أصغر)
"""
import json
import os
import subprocess
from datetime import datetime

# مسار مجلد الخدمة والمسارات الرئيسية
BASE_DIR = os.path.dirname(__file__)
LOG_PATH = os.path.join(BASE_DIR, "conversations_log.jsonl")
TRAIN_DATA_PATH = os.path.join(BASE_DIR, "training_data_from_logs.json")

# (اختياري) تدرب على نسخة أصغر دائماً
BASE_MODEL = os.environ.get("BASE_MODEL", "Qwen/Qwen2.5-1.5B-Instruct")


def extract_pairs(log_file_path, min_resp_len=16):
    """استخرج أزواج [user, assistant, api_call]"""
    pairs = []
    with open(log_file_path, encoding="utf-8") as f:
        for line in f:
            try:
                record = json.loads(line)
                user = record.get("user", "").strip()
                assistant = record.get("assistant", "").strip()
                api_call = record.get("api_call")
                # فقط الحوارات التي فيها نجاح api_call أو جواب فعلي
                if user and assistant and api_call and len(assistant) >= min_resp_len:
                    pairs.append({
                        "instruction": "محادثة مواطن مع مساعد مراسيل",
                        "input": user,
                        "output": assistant
                    })
            except Exception as e:
                continue
    return pairs

def main():
    print("\n🚀 استخراج بيانات التدريب الآلية...")
    if not os.path.exists(LOG_PATH):
        print(f"❌ ملف المحادثات غير موجود: {LOG_PATH}")
        return
    pairs = extract_pairs(LOG_PATH)
    print(f"📊 تم جمع {len(pairs)} حوار لتدريب الذكاء.")
    if not pairs:
        print("❌ لا توجد بيانات كافية للتدريب.")
        return

    # حفظ بصيغة JSON لتكون جاهزة لـ fine-tune
    with open(TRAIN_DATA_PATH, "w", encoding="utf-8") as out:
        json.dump(pairs, out, indent=2, ensure_ascii=False)
    print(f"✅ ملف التدريب: {TRAIN_DATA_PATH}\n")

    # تشغيل سكريبت التدريب على الداتا الجديدة
    print("💡 بدء تدريب النموذج تلقائياً...")
    train_py = os.path.join(BASE_DIR, "fine_tune.py")
    args = ["python3", train_py]
    # يمكنك تمرير اسم ملف الداتا الجديد لو كنت تدعم ذلك في fine_tune.py
    # args += ["--train_data", TRAIN_DATA_PATH]
    proc = subprocess.run(args)
    print("✅ تم إعادة تدريب النموذج الأخير. يمكنك الآن التحديث للجديد!")

if __name__ == "__main__":
    main()

