@echo off
chcp 65001 >nul
title إعادة تدريب نموذج مراسيل

echo.
echo ===========================================
echo    إعادة تدريب نموذج مراسيل 1.0
echo ===========================================
echo.

echo 🗑️ حذف النموذج القديم...
if exist marasil-ai-v1.0 rmdir /s /q marasil-ai-v1.0

echo.
echo 🎯 بدء التدريب...
python fine_tune.py

echo.
echo 🚀 تشغيل الخدمة...
python app.py

echo.
echo ✅ انتهى!
pause


















