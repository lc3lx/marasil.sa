#!/bin/bash

echo "==========================================="
echo "   إعادة تدريب نموذج مراسيل 1.0"
echo "==========================================="
echo

echo "🗑️ حذف النموذج القديم..."
rm -rf marasil-ai-v1.0

echo
echo "🎯 بدء التدريب..."
python fine_tune.py

echo
echo "🚀 تشغيل الخدمة..."
python app.py

echo
echo "✅ انتهى!"







