const axios = require("axios");

async function testCreateShipment() {
  // تحديد البيئة (sandbox أو production)
  const environment = "sandbox"; // يمكنك تغييرها إلى "production" عند الحاجة

  // تحديد المسار الأساسي والـ API Key بناءً على البيئة
  const baseURL =
    environment === "production"
      ? "https://ecomapis.smsaexpress.com"
      : "https://ecomapis-sandbox.azurewebsites.net";

  const apiKey =
    environment === "production"
      ? "43e1e7b2eb6f4999a4a91a7c1383285d"
      : "b60dbb7bc50a4331a3411c820c08dffc";

  try {
    // بيانات الشحنة
    const shipmentData = {
      ConsigneeAddress: {
        ContactName: "SMSA Express JED",
        ContactPhoneNumber: "966000000",
        ContactPhoneNumber2: "96600000", // اختياري
        Coordinates: "21.589886,39.1662759",
        Country: "SA",
        District: "Ar Rawhdah",
        PostalCode: "",
        City: "Jeddah",
        AddressLine1: "سمسا حي الروضة",
        AddressLine2: "Ar Rawdah, Jeddah 23434",
        ConsigneeID: "", // رقم الهوية السعودية أو الإقامة (اختياري)
      },
      ShipperAddress: {
        ContactName: "Shipper company name",
        ContactPhoneNumber: "96600000000",
        Coordinates: "24.6864257,46.6995142",
        Country: "SA",
        District: "Sulimanyah",
        PostalCode: "63529",
        City: "Riyadh",
        AddressLine1: "SMSA Express HQ",
        AddressLine2: "Dababh St",
      },
      OrderNumber: "FirstOrder001",
      DeclaredValue: 10,
      CODAmount: 10,
      Parcels: 1, // عدد الطرود (عدد صحيح)
      ShipDate: "2021-01-01T10:40:53",
      ShipmentCurrency: "SAR",
      SMSARetailID: "0",
      WaybillType: "PDF", // يمكن أن يكون "PDF" أو "ZPL"
      Weight: 3,
      WeightUnit: "KG", // يمكن أن يكون "KG" أو "LB"
      ContentDescription: "Shipment contents description",
      VatPaid: true,
      DutyPaid: false,
      ServiceCode: "EDDL",
    };

    console.log("جاري إنشاء الشحنة...");

    // إرسال الطلب لإنشاء شحنة جديدة
    const response = await axios.post(
      `${baseURL}/api/shipment/b2c/new`,
      shipmentData,
      {
        headers: {
          ApiKey: apiKey.toUpperCase(), // إضافة مفتاح API
          "Content-Type": "application/json",
          Host: "ecomapis-sandbox.azurewebsites.net",
        },
        validateStatus: function (status) {
          return status < 500; // قبول أي حالة أقل من 500
        },
      }
    );

    // معالجة الردود المختلفة
    if (response.status === 401) {
      throw new Error("غير مصرح: تأكد من صحة API Key");
    }

    if (response.status === 400) {
      const errorDetails = response.data.errors
        ? Object.entries(response.data.errors)
            .map(([field, errors]) => `${field}: ${errors.join(", ")}`)
            .join("\n")
        : JSON.stringify(response.data);
      throw new Error(`خطأ في البيانات:\n${errorDetails}`);
    }

    console.log("تم إنشاء الشحنة بنجاح:", response.data);

    // إذا تم إرجاع رقم الشحنة (AWB)، يمكن الاستعلام عن حالة الشحنة
    if (response.data.waybills && response.data.waybills.length > 0) {
      const awb = response.data.waybills[0].awb;
      console.log("\nرقم الشحنة (AWB):", awb);

      // يمكنك هنا استدعاء دالة لتتبع الشحنة باستخدام رقم AWB
      // const status = await trackShipment(awb);
      // console.log("حالة الشحنة:", status);
    }
  } catch (error) {
    console.error("حدث خطأ:", error.message);
    if (error.response) {
      console.error("تفاصيل الخطأ:", error.response.data);
    }
  }
}

async function testReturnShipment() {
  const apiKey = "b60dbb7bc50a4331a3411c820c08dffc"; // API Key must be in uppercase
  const baseURL = "https://ecomapis-sandbox.azurewebsites.net";
  data = {
    PickupAddress: {
      ContactName: "SMSA Express JED",
      ContactPhoneNumber: "966000000",
      Coordinates: "21.589886,39.1662759",
      Country: "SA",
      District: "Ar Rawhdah",
      PostalCode: "",
      City: "Jeddah",
      AddressLine1: "سمسا حي الروضة",
      AddressLine2: "Ar Rawdah, Jeddah 23434",
    },
    ReturnToAddress: {
      ContactName: "Shipper company name",
      ContactPhoneNumber: "96600000000",
      Coordinates: "24.6864257,46.6995142",
      Country: "SA",
      District: "Sulimanyah",
      PostalCode: "63529",
      City: "Riyadh",
      AddressLine1: "SMSA Express HQ",
      AddressLine2: "Dababh St",
    },
    OrderNumber: "FirstPUPorder01",
    DeclaredValue: 10,
    Parcels: 1,
    ShipDate: "2021-01-01T10:40:53",
    ShipmentCurrency: "SAR",
    SMSARetailID: "1",
    WaybillType: "PDF",
    Weight: 3,
    WeightUnit: "KG",
    ContentDescription: "Shipment contents description",
    ServiceCode: "EDCR",
  };
  try {
    const response = await axios.post(`${baseURL}/api/c2b/new`, data, {
      headers: {
        apikey: apiKey, // حسب التوثيق
        "Content-Type": "application/json",
      },

      validateStatus: function (status) {
        return status < 500; // Resolve only if the status code is less than 500
      },
    });
    console.log(apiKey.toUpperCase());
    // 5. معالجة الردود المختلفة
    if (response.status === 401) {
      throw new Error("غير مصرح: تأكد من صحة API Key");
    }

    if (response.status === 400) {
      const errorDetails = response.data.errors
        ? Object.entries(response.data.errors)
            .map(([field, errors]) => `${field}: ${errors.join(", ")}`)
            .join("\n")
        : JSON.stringify(response.data);
      throw new Error(`خطأ في البيانات:\n${errorDetails}`);
    }

    console.log("تم إنشاء الشحنة بنجاح:", response.data);

    if (response.data.awb) {
      console.log("\nجاري الاستعلام عن حالة الشحنة...");
      // You would need to implement the tracking function
      // const status = await trackShipment(response.data.awb);
      // console.log("حالة الشحنة:", status);
    }
  } catch (error) {
    console.error("حدث خطأ:", error.message);
    if (error.response) {
      console.error("تفاصيل الخطأ:", error.response.data);
    }
  }
}
async function testQueryB2c() {
  const apiKey = "b60dbb7bc50a4331a3411c820c08dffc"; // API Key must be in uppercase
  const baseURL = "https://ecomapis-sandbox.azurewebsites.net";
  var res = await axios.get(`${baseURL}/api/shipment/b2c/query/231219424570`, {
    headers: {
      apikey: apiKey, // حسب التوثيق
      "Content-Type": "application/json",
    },

    validateStatus: function (status) {
      return status < 500; // Resolve only if the status code is less than 500
    },
  });
  console.log(res.data);
}
async function createSMSAShipment() {
  const apiKey = "43e1e7b2eb6f4999a4a91a7c1383285d"; // 🔑 بدّلها بمفتاح API الصحيح

  const payload = {
    passkey: "string",
    refno: "REF123456",
    sentDate: "2025-04-15",
    idNo: "1234567890",
    cName: "اسم العميل",
    cntry: "SA",
    cCity: "Riyadh",
    cZip: "12345",
    cPOBox: "123456",
    cMobile: "966500000000",
    cTel1: "0110000000",
    cTel2: "",
    cAddr1: "الرياض، شارع الملك",
    cAddr2: "",
    shipType: "DLV", // نوع الشحنة
    PCs: "1",
    cEmail: "test@example.com",
    carrValue: "100",
    carrCurr: "SAR",
    codAmt: "0",
    weight: "2",
    itemDesc: "منتج إلكتروني",
    custVal: "100",
    custCurr: "SAR",
    insrAmt: "0",
    insrCurr: "SAR",
    sName: "اسم المرسل",
    sContact: "شخص المرسل",
    sAddr1: "عنوان المرسل",
    sAddr2: "",
    sCity: "Riyadh",
    sPhone: "966500000000",
    sCntry: "SA",
    prefDelvDate: "",
    gpsPoints: "24.7136,46.6753",
  };

  try {
    const response = await axios.post(
      `https://track.smsaexpress.com/SecomRestWebApi/api/addship?api_key=${apiKey}`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    console.log("📦 رد السيرفر:", response.data);
  } catch (error) {
    console.error("❌ حدث خطأ أثناء إنشاء الشحنة:");
    if (error.response) {
      console.error("الكود:", error.response.status);
      console.error("الرد:", error.response.data);
    } else {
      console.error(error.message);
    }
  }
}
// testCreateShipment();

// testReturnShipment();
//testQueryB2c();
createSMSAShipment();
