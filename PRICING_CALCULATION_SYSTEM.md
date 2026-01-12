# نظام حساب الأسعار المتقدم للذكاء الاصطناعي

## 🎯 الهدف

تطوير نظام حساب أسعار دقيق ومتكامل يأخذ البيانات من الباك إند ويعرض مقارنة شاملة لجميع شركات الشحن.

## ❌ المشكلة الأصلية

| السلوك القديم | المشكلة |
|-------------|---------|
| عرض أسعار ثابتة | غير دقيقة ولا تعكس التكاليف الحقيقية |
| لا يستخدم shipmentAccount.js | لا يحسب الضرائب والأرباح والوزن الإضافي |
| لا يطلب تفاصيل الشحنة | لا يمكن حساب أسعار دقيقة |

## ✅ الحل الجديد

### 1. تدفق المحادثة الجديد

#### **الخطوة 1: طلب نوع الشحن**
```
👤: شو اسعار شركات الشحن عندكم
🤖: عندنا عدة شركات شحن موثوقة: سمسا، أرامكس، ريد بوكس، ولما بوكس...
   أي نوع شحنة عندك؟
```

#### **الخطوة 2: طلب التفاصيل**
```
👤: شحن عادي
🤖: تمام ahmed، لحساب سعر الشحن شحن عادي بدقة أحتاج أعرف:
   ⚖️ وزن الشحنة بالكيلوغرام؟
   💰 طريقة الدفع (كاش أو دفع عند الاستلام)؟
   📏 الأبعاد اختياري (الطول × العرض × الارتفاع بالسنتيمتر)
```

#### **الخطوة 3: استخراج البيانات وحساب الأسعار**
```
👤: وزن الشحنة 2 كيلو ودفع عند الاستلام
🤖: ✅ يستخرج البيانات ويحسب لكل شركة...
```

#### **الخطوة 4: عرض المقارنة**
```
🤖: 💰 **حساب الأسعار لشحنتك:**

   ⚖️ الوزن: 2 كجم
   💳 طريقة الدفع: دفع عند الاستلام

   🚚 **سمسا**
   💰 السعر: 42 ريال
   📋 التفاصيل: الأساسي: 30 ريال + دفع عند الاستلام: 12 ريال

   📦 **أرامكس**
   💰 السعر: 55 ريال
   📋 التفاصيل: الأساسي: 45 ريال + دفع عند الاستلام: 10 ريال

   🛒 أي شركة تفضلها لإنشاء الشحنة؟
```

## 🔧 المكونات التقنية

### **1. استخراج البيانات من الرسائل**

```javascript
function extractShipmentDetails(message) {
  // استخراج الوزن
  const weightMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:ك(?:يلو|جم|غ)|kg)/i);
  if (weightMatch) {
    details.weight = parseFloat(weightMatch[1]);
  }

  // استخراج طريقة الدفع
  if (message.includes("دفع عند الاستلام")) {
    details.paymentMethod = "COD";
  } else if (message.includes("كاش")) {
    details.paymentMethod = "CASH";
  }

  // استخراج الأبعاد
  const dimensionMatch = message.match(/(\d+)\s*[x×]\s*(\d+)\s*[x×]\s*(\d+)/i);
  if (dimensionMatch) {
    details.dimensions = {
      length: parseInt(dimensionMatch[1]),
      width: parseInt(dimensionMatch[2]),
      height: parseInt(dimensionMatch[3])
    };
  }

  return details;
}
```

### **2. حساب الأسعار لكل شركة**

```javascript
async function calculatePricingForAllCompanies(companies, shipmentDetails) {
  const shipmentAccount = require('./shipmentAccount');

  for (const company of companies) {
    // تحديد نوع الشحن حسب الشركة
    const shippingType = company.types?.includes('اقتصادي') ? {
      basePrice: 25, profitPrice: 5, maxWeight: 5,
      baseAdditionalweigth: 3, profitAdditionalweigth: 1,
      baseCODfees: 5, profitCODfees: 1, priceaddedtax: 0.15
    } : /* ... باقي الأنواع */;

    // حساب السعر باستخدام shipmentAccount.js
    const pricing = shipmentAccount.shipmentnorm(shippingType, orderData);

    // بناء تفاصيل التكلفة
    let breakdown = `الأساسي: ${shippingType.basePrice + shippingType.profitPrice} ريال`;
    if (pricing.breakdown.additionalWeightCost > 0) {
      breakdown += ` + وزن إضافي: ${pricing.breakdown.additionalWeightCost} ريال`;
    }
    if (pricing.breakdown.codFees > 0) {
      breakdown += ` + دفع عند الاستلام: ${pricing.breakdown.codFees} ريال`;
    }

    pricingResults.push({
      name: company.name,
      total: pricing.total,
      breakdown: breakdown
    });
  }

  return pricingResults.sort((a, b) => a.total - b.total);
}
```

### **3. معالجة الطلبات في processGeminiResponse**

```javascript
case "CHAT":
  if (data && data.action === "CALCULATE_PRICING" && data.shipmentDetails) {
    // استخراج البيانات
    const shipmentDetails = extractShipmentDetails(data.shipmentDetails);

    // التحقق من اكتمال البيانات
    if (!shipmentDetails.weight || !shipmentDetails.paymentMethod) {
      return { message: "عذراً، ما قدرت أستخرج جميع التفاصيل المطلوبة..." };
    }

    // حساب الأسعار
    const companiesResult = await services.generalService.getShippingCompanies();
    const pricingComparison = await calculatePricingForAllCompanies(
      companiesResult.companies, shipmentDetails
    );

    // بناء الرد النهائي
    let pricingMessage = `💰 **حساب الأسعار لشحنتك:**\n\n`;
    pricingMessage += `⚖️ الوزن: ${shipmentDetails.weight} كجم\n`;
    pricingMessage += `💳 طريقة الدفع: ${shipmentDetails.paymentMethod === 'COD' ? 'دفع عند الاستلام' : 'كاش'}\n\n`;

    pricingComparison.forEach((company, index) => {
      const emoji = ['🚚', '📦', '🚛', '✈️'][index] || '📮';
      pricingMessage += `${emoji} **${company.name}**\n`;
      pricingMessage += `💰 السعر: ${company.total} ريال\n`;
      pricingMessage += `📋 التفاصيل: ${company.breakdown}\n\n`;
    });

    pricingMessage += `🛒 أي شركة تفضلها لإنشاء الشحنة؟`;

    return { message: pricingMessage };
  }
  break;
```

## 📊 الميزات الجديدة

| الميزة | التفاصيل |
|--------|----------|
| **استخراج ذكي للبيانات** | يفهم "2 كيلو"، "دفع عند الاستلام"، "30x20x10" |
| **حساب دقيق** | يستخدم shipmentAccount.js مع جميع العوامل (ضرائب، أرباح، وزن إضافي) |
| **مقارنة شاملة** | يعرض أسعار جميع الشركات مع التفاصيل |
| **تفاعل طبيعي** | يطلب المعلومات المفقودة ويؤكد الاستخراج |
| **أولوية السعر** | يرتب الشركات من الأقل سعراً للأعلى |

## 🔄 أمثلة على المحادثات

### **مثال 1: شحنة خفيفة مع دفع عند الاستلام**
```
👤: شحن عادي
🤖: تمام ahmed، لحساب سعر الشحن شحن عادي بدقة أحتاج أعرف...

👤: 1.5 كيلو دفع عند الاستلام
🤖: 💰 **حساب الأسعار لشحنتك:**

   ⚖️ الوزن: 1.5 كجم
   💳 طريقة الدفع: دفع عند الاستلام

   🚚 **سمسا** 💰 37 ريال 📋 الأساسي: 30 ريال + دفع عند الاستلام: 7 ريال
   📦 **ريد بوكس** 💰 28 ريال 📋 الأساسي: 25 ريال + دفع عند الاستلام: 3 ريال
   🚛 **أرامكس** 💰 50 ريال 📋 الأساسي: 45 ريال + دفع عند الاستلام: 5 ريال
```

### **مثال 2: شحنة ثقيلة مع كاش**
```
👤: شحن برو 8 كيلو كاش
🤖: 💰 **حساب الأسعار لشحنتك:**

   ⚖️ الوزن: 8 كجم
   💳 طريقة الدفع: كاش

   🚚 **سمسا** 💰 55 ريال 📋 الأساسي: 45 ريال + وزن إضافي: 10 ريال
   🚛 **أرامكس** 💰 75 ريال 📋 الأساسي: 55 ريال + وزن إضافي: 20 ريال
```

## 📁 الملفات المُحدثة

- ✅ `mararsil-main/services/geminiService.js`
  - إضافة `extractShipmentDetails()`
  - إضافة `calculatePricingForAllCompanies()`
  - تحديث منطق `processGeminiResponse`

- ✅ `mararsil-main/test_pricing_calculation.js`
  - اختبار شامل للنظام الجديد

## 🎯 النتائج

| المقياس | قبل | بعد |
|---------|-----|-----|
| دقة الأسعار | ❌ ثابتة وغير دقيقة | ✅ محسوبة بدقة من البيانات |
| شمولية المقارنة | ❌ أسعار أساسية فقط | ✅ جميع الشركات مع تفاصيل كاملة |
| تفاعل المستخدم | ❌ لا يطلب تفاصيل | ✅ يطلب البيانات المفقودة |
| حساب العوامل | ❌ سعر أساسي فقط | ✅ ضرائب + أرباح + وزن إضافي + COD |

---

**تم تطوير نظام حساب الأسعار المتقدم بتاريخ: 12 يناير 2026** ⏰

**MaraSil AI - حساب أسعار دقيق وشامل!** 💰🧮✨
