@echo off
chcp 65001 >nul
title مراسيل AI - بدء سريع

echo.
echo ========================================
echo   مراسيل 1.0 - بدء سريع
echo ========================================
echo.

REM اختيار المستخدم
echo اختر ما تريد فعله:
echo [1] تشغيل الخدمة (مع النموذج المدرب إن وجد)
echo [2] تدريب سريع (دقائق)
echo [3] تدريب كامل (ساعات)
echo [4] تدريب بسيط (دقائق)
echo [5] اختبار التدريب
echo [5] تحديث المتطلبات
echo.

set /p choice="اختر رقم (1-6): "

if "%choice%"=="1" goto run_service
if "%choice%"=="2" goto quick_train
if "%choice%"=="3" goto full_train
if "%choice%"=="4" goto simple_train
if "%choice%"=="5" goto test_train
if "%choice%"=="6" goto update_req

echo ❌ اختيار غير صحيح
pause
exit /b 1

:run_service
echo 🚀 تشغيل الخدمة...
python app.py
goto end

:quick_train
echo 🎯 تدريب سريع...
python train_quick.py
goto end

:full_train
echo 🎯 تدريب كامل...
python fine_tune.py
goto end

:simple_train
echo 🎯 تدريب بسيط...
python train_simple.py
goto end

:test_train
echo 🧪 اختبار التدريب...
python test_training.py
goto end

:update_req
echo 📦 تحديث المتطلبات...
pip install -r requirements.txt --upgrade
echo ✅ تم التحديث
goto end

:end
echo.
echo 🎉 انتهى!
pause



