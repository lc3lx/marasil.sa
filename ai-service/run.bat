@echo off
chcp 65001 >nul
title مراسيل AI Service v1.0

echo.
echo ========================================
echo    مراسيل 1.0 - ذكاء اصطناعي متخصص
echo ========================================
echo.

REM تثبيت المتطلبات إذا لم تكن مثبتة
if not exist "requirements_installed.txt" (
    echo 📦 تثبيت المتطلبات...
    pip install -r requirements.txt
    echo installed > requirements_installed.txt
    echo ✅ تم تثبيت المتطلبات
    echo.
)

REM تشغيل الخدمة
echo 🚀 تشغيل خدمة الذكاء الاصطناعي...
echo 🌐 http://localhost:5000
echo.
echo 💡 للتدريب: python train_quick.py
echo 💡 للتدريب الكامل: python fine_tune.py
echo.
echo 🛑 للإيقاف اضغط Ctrl+C
echo.

python app.py

pause



