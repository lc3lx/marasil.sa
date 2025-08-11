const AramexService = require("../services/AramexService");
const aramex = new AramexService();

async function main() {
  try {
    const shipmentData = {
      reference1: "ORD12345",
      shipperAddress: {
        line1: "123 Street",
        city: "Dubai",
        countryCode: "AE",
      },
      shipperContactName: "John Doe",
      shipperPhone: "+971123456789",
      consigneeAddress: {
        line1: "456 Street",
        city: "Riyadh",
        countryCode: "SA",
      },
      consigneeContactName: "Jane Smith",
      consigneePhone: "+966987654321",
      actualWeight: 5.5,
      chargeableWeight: 5.5,
      length: 30,
      width: 20,
      height: 10,
      goodsDescription: "منتجات إلكترونية",
    };

    const result = await aramex.createShipment(shipmentData);
    console.log("Tracking Number:", result.trackingNumber);
    console.log("Label URL:", result.labelURL);

    const labelResult = await aramex.printLabel(result.trackingNumber);
    console.log("Label URL:", labelResult.labelURL);
  } catch (error) {
    console.error(error.message);
  }
}

main();
