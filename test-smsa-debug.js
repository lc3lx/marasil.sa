// اختبار debug لـ SMSA webhook
const axios = require("axios");

const BASE_URL = "https://www.marasil.site/api";

async function testSMSADebug() {
  console.log("🔍 بدء اختبار debug لـ SMSA webhook...\n");

  try {
    // 1. اختبار test endpoint
    console.log("1️⃣ اختبار test endpoint...");
    try {
      const testResponse = await axios.post(
        `${BASE_URL}/shipment/webhook-smsa/test`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "SMSA-Webhook/1.0",
          },
          timeout: 10000,
        }
      );
      console.log("✅ test endpoint يعمل:", testResponse.data);
    } catch (error) {
      console.log(
        "❌ test endpoint فشل:",
        error.response?.data || error.message
      );
    }

    // 2. اختبار validate endpoint
    console.log("\n2️⃣ اختبار validate endpoint...");
    try {
      const validateResponse = await axios.post(
        `${BASE_URL}/shipment/webhook-smsa/validate`,
        {
          AWB: "TEST123456789",
          Reference: "REF1234567890",
        },
        {
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "SMSA-Webhook/1.0",
          },
          timeout: 10000,
        }
      );
      console.log("✅ validate endpoint يعمل:", validateResponse.data);
    } catch (error) {
      console.log(
        "❌ validate endpoint فشل:",
        error.response?.data || error.message
      );
    }

    // 3. اختبار webhook مع بيانات بسيطة
    console.log("\n3️⃣ اختبار webhook مع بيانات بسيطة...");
    try {
      const webhookResponse = await axios.post(
        `${BASE_URL}/shipment/webhook-smsa`,
        [
          {
            AWB: "TEST123456789",
            Reference: "REF1234567890",
            Pieces: 1,
            CODAmount: 0.0,
            ContentDesc: "Test shipment",
            RecipientName: "Test User",
            OriginCity: "Jeddah",
            OriginCountry: "SA",
            DesinationCity: "Riyadh",
            DesinationCountry: "SA",
            Scans: [
              {
                ReferenceID: 10611,
                City: "Riyadh",
                ScanType: "OD",
                ScanDescription: "Out for Delivery",
                ScanDateTime: new Date().toISOString(),
                ScanTimeZone: "+03:00",
              },
            ],
          },
        ],
        {
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "SMSA-Webhook/1.0",
          },
          timeout: 15000,
        }
      );
      console.log("✅ webhook يعمل:", webhookResponse.data);
    } catch (error) {
      console.log("❌ webhook فشل:", error.response?.data || error.message);
    }

    console.log("\n🎯 انتهى اختبار debug!");
  } catch (error) {
    console.error("💥 خطأ في اختبار debug:", error.message);
  }
}

// تشغيل الاختبار
testSMSADebug();
