# أرامكس CreatePickup — ERR33 "Failed to save the pickup"

## سبب ظهور ERR33

الخطأ **ERR33: Failed to save the pickup** يحدث عندما لا يقبل نظام أرامكس حفظ طلب الاستلام بسبب **عدم تطابق بيانات الـ Pickup مع الشحنة المُنشأة** أو حقول غير متوافقة مع الدليل. الأسباب الأكثر شيوعاً:

1. **عدم تطابق `NumberOfPieces`**  
   الشحنة تم إنشاؤها بعدد قطع معيّن (مثلاً 6) بينما في طلب الاستلام أرسلت `NumberOfPieces: 1`. أرامكس يتحقق من التطابق ويرفض الحفظ عند الاختلاف.

2. **نوع الدفع `Payment`**  
   الشحنة استخدمت `PaymentType: "3"` (طرف ثالث). في الـ Pickup يجب أن يكون `Payment` في كل عنصر من `PickupItems` مطابقاً (مثلاً `"3"`) وليس `"P"` فقط.

3. **وحدة الحجم `ShipmentVolume.Unit`**  
   حسب دليل أرامكس (Volume Structure) الوحدة المتوقعة للحجم هي **CBM** (متر مكعب). استخدام `Unit: "Cm3"` مع `Value: 0.001` قد يُفسَّر بشكل خاطئ أو يرفض. القيمة الصحيحة للحجم: بالـ CBM، مثلاً `0.001` لصندوق 10×10×10 سم.

4. **الحقول النصية الفارغة في العنوان**  
   بعض التكاملات تتوقع الحقول `Line2`, `Line3`, `PostCode`, `StateOrProvinceCode` أن تكون موجودة كسلسلة فارغة `""` وليس مسافات `" "` أو غياب الحقل.

5. **ربط الاستلام بالشحنة**  
   الربط يتم عبر `Transaction.Reference1` (رقم الشحنة AWB). لا حاجة لحقل منفصل مثل ShipmentID داخل `PickupItems` في الطلب الحالي؛ المهم أن تكون بيانات الـ Pickup (القطع، الوزن، النوع، الدفع) مطابقة للشحنة.

---

## Payload مصحح 100% متوافق مع CreatePickup

```json
{
  "ClientInfo": {
    "UserName": "info@marasil.sa",
    "Password": "...",
    "Version": "v1.0",
    "AccountNumber": "72469040",
    "AccountPin": "589944",
    "AccountEntity": "JED",
    "AccountCountryCode": "SA"
  },
  "Transaction": {
    "Reference1": "50732755010",
    "Reference2": "",
    "Reference3": "",
    "Reference4": "",
    "Reference5": ""
  },
  "Pickup": {
    "PickupAddress": {
      "Line1": "حي البحر",
      "Line2": "",
      "Line3": "",
      "City": "الرياض",
      "StateOrProvinceCode": "",
      "PostCode": "",
      "CountryCode": "SA"
    },
    "PickupLocation": "حي البحر",
    "PickupContact": {
      "PersonName": "بليا",
      "CompanyName": "بليا",
      "PhoneNumber1": "0939176488",
      "PhoneNumber2": "0939176488",
      "CellPhone": "0939176488",
      "EmailAddress": "test@example.com",
      "Type": "Business"
    },
    "PickupDate": "/Date(1771146000000)/",
    "ReadyTime": "/Date(1771146000000)/",
    "LastPickupTime": "/Date(1771174800000)/",
    "ClosingTime": "/Date(1771174800000)/",
    "Vehicle": "Van",
    "Status": "Ready",
    "Reference1": "50732755010",
    "Comments": "استلام شحنة رقم: 50732755010",
    "PickupItems": [
      {
        "ProductGroup": "DOM",
        "ProductType": "CDS",
        "Payment": "3",
        "NumberOfPieces": 6,
        "NumberOfShipments": 1,
        "PackageType": "Box",
        "ShipmentWeight": { "Value": 1, "Unit": "KG" },
        "ShipmentVolume": { "Value": 0.001, "Unit": "CBM" },
        "CashAmount": { "CurrencyCode": "SAR", "Value": 0 },
        "ExtraCharges": { "CurrencyCode": "SAR", "Value": 0 },
        "ShipmentDimensions": {
          "Length": 10,
          "Width": 10,
          "Height": 10,
          "Unit": "CM"
        },
        "Comments": "استلام شحنة رقم: 50732755010"
      }
    ]
  }
}
```

### التغييرات الرئيسية عن الـ payload السابق

| الحقل | قبل | بعد | السبب |
|-------|-----|-----|--------|
| `PickupAddress.Line2` | غير موجود أو مسافة | `""` | متطلبات الدليل وحقول فارغة كسلسلة |
| `PickupAddress.Line3` | غير موجود أو مسافة | `""` | نفس السبب |
| `PickupAddress.StateOrProvinceCode` | غير موجود أو مسافة | `""` | نفس السبب |
| `PickupAddress.PostCode` | غير موجود أو مسافة | `""` | نفس السبب |
| `PickupItems[0].Payment` | `"P"` | `"3"` | مطابقة الشحنة (طرف ثالث) |
| `PickupItems[0].NumberOfPieces` | `1` | `6` | مطابقة عدد قطع الشحنة الفعلي |
| `PickupItems[0].ShipmentVolume.Unit` | `"Cm3"` | `"CBM"` | الدليل يستخدم CBM (متر مكعب) |
| `PickupItems[0].ShipmentVolume.Value` | `0.001` | `0.001` | 10×10×10 سم = 0.001 m³ |
| `CashAmount` / `ExtraCharges` | قد تكون ناقصة | موجودة وقيمة 0 | اكتمال هيكل الـ Pickup Item |

---

## PickupDate / ReadyTime / ClosingTime

- الصيغة: `/Date(عدد_الميل_ثانية_من_Unix_epoch)/`  
  مثال: `/Date(1771146000000)/`
- **ReadyTime** ≤ **LastPickupTime** ≤ **ClosingTime**
- يجب أن تكون التواريخ في المستقبل (نفس اليوم أو لاحق) ضمن النافذة التي يقبلها حسابك عند أرامكس.

---

## ربط الـ Pickup بالشحنة

- **Transaction.Reference1** و **Pickup.Reference1**: يُفضل أن يكونا رقم الشحنة (AWB) نفسه لربط طلب الاستلام بالشحنة.
- لا يُطلب في الدليل الحالي تمرير `ShipmentID` أو AWB داخل كل عنصر من `PickupItems`؛ الربط يتم عبر الـ Reference واتساق البيانات (عدد القطع، النوع، الدفع).

بعد تطبيق هذه التصحيحات في الكود (تمرير عدد القطع، الوزن، الأبعاد، نوع الدفع من الشحنة واستخدام CBM و Payment "3") يفترض أن يختفي ERR33 ويتم حفظ طلب الاستلام بنجاح.
