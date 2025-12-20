#!/bin/bash

echo "========================================"
echo "   مراسيل 1.0 - بدء سريع"
echo "========================================"
echo

echo "اختر ما تريد فعله:"
echo "[1] تشغيل الخدمة (مع النموذج المدرب إن وجد)"
echo "[2] تدريب سريع (دقائق)"
echo "[3] تدريب كامل (ساعات)"
echo "[4] اختبار التدريب"
echo "[5] تحديث المتطلبات"
echo

read -p "اختر رقم (1-5): " choice

case $choice in
    1)
        echo "🚀 تشغيل الخدمة..."
        python app.py
        ;;
    2)
        echo "🎯 تدريب سريع..."
        python train_quick.py
        ;;
    3)
        echo "🎯 تدريب كامل..."
        python fine_tune.py
        ;;
    4)
        echo "🎯 تدريب بسيط..."
        python train_simple.py
        ;;
    5)
        echo "🧪 اختبار التدريب..."
        python test_training.py
        ;;
    6)
        echo "📦 تحديث المتطلبات..."
        pip install -r requirements.txt --upgrade
        echo "✅ تم التحديث"
        ;;
    *)
        echo "❌ اختيار غير صحيح"
        exit 1
        ;;
esac

echo
echo "🎉 انتهى!"



