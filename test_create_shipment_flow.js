const geminiService = require("./services/geminiService");

const mockServices = {
  generalService: {
    getShippingCompanies: async () => ({
      success: true,
      companies: [
        {
          name: "سمسا",
          shippingTypes: [
            {
              type: "اقتصادي",
              basePrice: 25,
              profitPrice: 5,
              maxWeight: 5,
              baseAdditionalweigth: 3,
              profitAdditionalweigth: 1,
              baseCODfees: 5,
              profitCODfees: 1,
              priceaddedtax: 0.15,
            },
          ],
        },
      ],
    }),
  },
  shipmentService: {
    createShipmentFromAI: async () => ({
      success: true,
      trackingNumber: "MRSL123456",
    }),
  },
};

const userId = "test-user";
const userInfo = { firstName: "أحمد" };

const messages = [
  { text: "بدي انشاء شحنة", start: true },
  { text: "شركة التاجر", start: false },
  { text: "0555555555", start: false },
  { text: "الرياض", start: false },
  { text: "حي النرجس شارع 12", start: false },
  { text: "المستلم محمد", start: false },
  { text: "0566666666", start: false },
  { text: "جدة", start: false },
  { text: "حي الروضة شارع 5", start: false },
  { text: "وزنها 5 كيلو", start: false },
  { text: "2", start: false },
  { text: "شحنة ملابس", start: false },
  { text: "150", start: false },
  { text: "سمسا", start: false },
  { text: "موافق", start: false },
];

async function run() {
  for (const step of messages) {
    const response = await geminiService.processGeminiResponse(
      {
        intent: "CHAT",
        data: {
          action: "CREATE_SHIPMENT_FLOW",
          rawMessage: step.text,
          start: step.start,
        },
      },
      mockServices,
      userId,
      userInfo
    );

    console.log("👤", step.text);
    console.log("🤖", response.message);
    console.log("-".repeat(60));
  }
}

run().catch(console.error);

