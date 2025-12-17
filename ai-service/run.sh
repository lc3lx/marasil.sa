#!/bin/bash

echo "========================================"
echo "   مراسيل 1.0 - ذكاء اصطناعي متخصص"
echo "========================================"
echo

# تثبيت المتطلبات إذا لم تكن مثبتة
if [ ! -f "requirements_installed.txt" ]; then
    echo "📦 تثبيت المتطلبات..."
    pip install -r requirements.txt
    touch requirements_installed.txt
    echo "✅ تم تثبيت المتطلبات"
    echo
fi

# تشغيل الخدمة
echo "🚀 تشغيل خدمة الذكاء الاصطناعي..."
echo "🌐 http://localhost:5000"
echo
echo "💡 للتدريب السريع: python train_quick.py"
echo "💡 للتدريب الكامل: python fine_tune.py"
echo
echo "🛑 للإيقاف اضغط Ctrl+C"
echo

python app.py

