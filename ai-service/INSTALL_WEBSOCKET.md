# تثبيت WebSocket للذكاء الاصطناعي

## Backend (Python)

```bash
cd d:\work\last 1\mararsil-main\ai-service
pip install flask-socketio python-socketio
```

## Frontend (Next.js)

```bash
cd d:\work\last 1\Mrasil-master
npm install socket.io-client
```

## تشغيل Backend

```bash
cd d:\work\last 1\mararsil-main\ai-service
python app.py
```

سيعمل على:
- HTTP: http://localhost:5000
- WebSocket: ws://localhost:5000

## الفرق بين HTTP و WebSocket

### HTTP (القديم):
- طلب → انتظار → رد
- بطيء نسبياً
- يحتاج اتصال جديد لكل رسالة

### WebSocket (الجديد):
- اتصال دائم
- فوري (real-time)
- أسرع بكثير
- يدعم الإشعارات الفورية

## المميزات الجديدة:

✅ **سرعة فورية**: الرد يصل مباشرة بدون تأخير
✅ **اتصال دائم**: ما في حاجة لإعادة الاتصال
✅ **حالة المعالجة**: تعرف متى البوت يفكر
✅ **Fallback تلقائي**: إذا WebSocket ما اشتغل، يرجع لـ HTTP

## الاستخدام:

Frontend تلقائياً بيستخدم WebSocket إذا متوفر، وإلا بيرجع لـ HTTP.
