// aramex.test.js
const axios = require("axios");
const SMSAService = require("../services/smsaService"); // تأكد من المسار الصحيح للملف
jest.mock("axios");

describe("SMSAService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("trackShipment", () => {
    it("should throw error if awb is missing", async () => {
      await expect(SMSAService.trackShipment("")).rejects.toThrow(
        "رقم الشحنة غير موجود"
      );
    });

    it("should return tracking data on success", async () => {
      const awb = "TRACK123";
      const mockResponse = {
        status: 200,
        data: { status: "Delivered", details: "تم التسليم" },
      };
      axios.get.mockResolvedValueOnce(mockResponse);
      const result = await SMSAService.trackShipment(awb);
      expect(result).toEqual({
        success: true,
        tracking: { status: "Delivered", details: "تم التسليم" },
      });
      expect(axios.get).toHaveBeenCalledWith(
        `/api/shipment/track/${awb}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            apikey: SMSAService.apiKey.toUpperCase(),
            "Content-Type": "application/json",
            Host: "ecomapis-sandbox.azurewebsites.net",
          }),
          validateStatus: expect.any(Function),
        })
      );
    });

    it("should throw error if API response status is not 200", async () => {
      const awb = "TRACK123";
      const mockResponse = {
        status: 404,
        data: { message: "Not found" },
      };
      axios.get.mockResolvedValueOnce(mockResponse);
      await expect(SMSAService.trackShipment(awb)).rejects.toThrow(
        "خطأ في تتبع الشحنة: Not found"
      );
    });
  });

  describe("pushShipmentInvoice", () => {
    const awb = "INV123";
    const items = [
      {
        hsCode: "1234",
        quantityUnit: "PCS",
        reference: "Item1",
        description: "Test item 1",
        weight: 2,
        value: 100,
        quantity: 1,
      },
    ];

    it("should throw error when awb or items are missing", async () => {
      await expect(SMSAService.pushShipmentInvoice("", items)).rejects.toThrow(
        "رقم الشحنة وقائمة المنتجات مطلوبة"
      );
      await expect(SMSAService.pushShipmentInvoice(awb, [])).rejects.toThrow(
        "رقم الشحنة وقائمة المنتجات مطلوبة"
      );
    });

    it("should return success response on valid data", async () => {
      const mockResponse = {
        status: 200,
        data: "Invoice sent successfully",
      };
      axios.post.mockResolvedValueOnce(mockResponse);
      const result = await SMSAService.pushShipmentInvoice(awb, items, {
        invoiceDate: new Date("2025-04-15"),
      });
      expect(result).toEqual({
        success: true,
        message: "Invoice sent successfully",
      });
      expect(axios.post).toHaveBeenCalledWith(
        "/api/invoice",
        expect.objectContaining({
          AWB: awb,
          Currency: "SAR",
          WeightUnit: "KG",
          InvoiceDate: expect.any(String),
          Items: expect.any(Array),
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            apikey: SMSAService.apiKey.toUpperCase(),
            "Content-Type": "application/json",
            Host: "ecomapis-sandbox.azurewebsites.net",
          }),
          validateStatus: expect.any(Function),
        })
      );
    });

    it("should throw error if response status is not 200", async () => {
      const mockResponse = {
        status: 400,
        data: { message: "Invalid invoice data" },
      };
      axios.post.mockResolvedValueOnce(mockResponse);
      await expect(SMSAService.pushShipmentInvoice(awb, items)).rejects.toThrow(
        "خطأ في إرسال الفاتورة: Invalid invoice data"
      );
    });
  });

  describe("queryShipment", () => {
    it("should throw error if awb is missing", async () => {
      await expect(SMSAService.queryShipment("")).rejects.toThrow(
        "رقم الشحنة غير موجود"
      );
    });

    it("should return shipment details on valid response", async () => {
      const awb = "QUERY123";
      const mockResponse = {
        status: 200,
        data: {
          sawb: "TRACK_QUERY",
          createDate: "2025-04-15T12:00:00.000Z",
          shipmentParcelsCount: 3,
          waybills: [{ awb: "AWBQUERY", awbFile: "query.pdf" }],
        },
      };
      axios.get.mockResolvedValueOnce(mockResponse);
      const result = await SMSAService.queryShipment(awb);
      expect(result).toEqual({
        success: true,
        sawb: "TRACK_QUERY",
        createDate: "2025-04-15T12:00:00.000Z",
        shipmentParcelsCount: 3,
        waybills: [{ awb: "AWBQUERY", awbFile: "query.pdf" }],
      });
    });

    it("should throw error if API response status is not 200", async () => {
      const awb = "QUERY123";
      const mockResponse = {
        status: 400,
        data: { message: "Bad Request" },
      };
      axios.get.mockResolvedValueOnce(mockResponse);
      await expect(SMSAService.queryShipment(awb)).rejects.toThrow(
        "خطأ في الاستعلام عن الشحنة: Bad Request"
      );
    });
  });

  describe("createReturnShipment", () => {
    const validReturnData = {
      pickupAddress: {
        name: "المرسل",
        phone: "0551112222",
        country: "SA",
        city: "الرياض",
        addressLine1: "شارع الاختبار",
      },
      returnToAddress: {
        name: "المستلم",
        phone: "0553334444",
        country: "SA",
        city: "جدة",
        addressLine1: "شارع العودة",
      },
      orderId: "RET123",
      orderValue: "200.50",
      boxNum: "1",
      weight: "2.3",
      description: "عودة منتج",
    };

    it("should throw error if required addresses are missing", async () => {
      await expect(SMSAService.createReturnShipment({})).rejects.toThrow(
        "بيانات العنوان (PickupAddress و ReturnToAddress) مطلوبة لإنشاء الشحنة المرتجعة"
      );
    });

    it("should return return shipment data on success", async () => {
      const mockResponse = {
        status: 200,
        data: {
          sawb: "RET_TRACK123",
          waybills: [{ awb: "RET_AWB123", awbFile: "return.pdf" }],
          createDate: "2025-04-15T12:30:00.000Z",
        },
      };
      axios.post.mockResolvedValueOnce(mockResponse);
      const result = await SMSAService.createReturnShipment(validReturnData);
      expect(result).toEqual({
        success: true,
        trackingNumber: "RET_TRACK123",
        awb: "RET_AWB123",
        label: "return.pdf",
        createdDate: "2025-04-15T12:30:00.000Z",
      });
    });

    it("should throw error if response status is not 200", async () => {
      const mockResponse = {
        status: 400,
        data: { message: "Invalid return data" },
      };
      axios.post.mockResolvedValueOnce(mockResponse);
      await expect(
        SMSAService.createReturnShipment(validReturnData)
      ).rejects.toThrow("خطأ في إنشاء الشحنة المرتجعة: Invalid return data");
    });
  });

  describe("queryReturnShipment", () => {
    it("should throw error if awb is missing", async () => {
      await expect(SMSAService.queryReturnShipment("")).rejects.toThrow(
        "رقم الشحنة غير موجود"
      );
    });

    it("should return return shipment details on valid response", async () => {
      const awb = "RETQUERY123";
      const mockResponse = {
        status: 200,
        data: {
          sawb: "RET_TRACK_QUERY",
          createDate: "2025-04-15T13:00:00.000Z",
          shipmentParcelsCount: 1,
          waybills: [{ awb: "RET_AWB_QUERY", awbFile: "ret_query.pdf" }],
        },
      };
      axios.get.mockResolvedValueOnce(mockResponse);
      const result = await SMSAService.queryReturnShipment(awb);
      expect(result).toEqual({
        success: true,
        sawb: "RET_TRACK_QUERY",
        createDate: "2025-04-15T13:00:00.000Z",
        shipmentParcelsCount: 1,
        waybills: [{ awb: "RET_AWB_QUERY", awbFile: "ret_query.pdf" }],
      });
    });

    it("should throw error if API response status is not 200", async () => {
      const awb = "RETQUERY123";
      const mockResponse = {
        status: 500,
        data: { message: "Internal Server Error" },
      };
      axios.get.mockResolvedValueOnce(mockResponse);
      await expect(SMSAService.queryReturnShipment(awb)).rejects.toThrow(
        "خطأ في الاستعلام عن الشحنة المرتجعة: Internal Server Error"
      );
    });
  });

  describe("cancelReturnShipment", () => {
    it("should throw error if awb is missing", async () => {
      await expect(SMSAService.cancelReturnShipment("")).rejects.toThrow(
        "رقم الشحنة مطلوب لإلغاء الشحنة المرتجعة"
      );
    });

    it("should return success message on valid cancellation", async () => {
      const awb = "CANCELRET123";
      const mockResponse = {
        status: 200,
        data: "Return shipment canceled",
      };
      axios.post.mockResolvedValueOnce(mockResponse);
      const result = await SMSAService.cancelReturnShipment(awb);
      expect(result).toEqual({
        success: true,
        message: "Return shipment canceled",
      });
    });

    it("should throw error if API response status is not 200", async () => {
      const awb = "CANCELRET123";
      const mockResponse = {
        status: 400,
        data: { message: "Cannot cancel return shipment" },
      };
      axios.post.mockResolvedValueOnce(mockResponse);
      await expect(SMSAService.cancelReturnShipment(awb)).rejects.toThrow(
        "خطأ في إلغاء الشحنة المرتجعة: Cannot cancel return shipment"
      );
    });
  });

  describe("getCurrencyCountryLookup", () => {
    it("should return a list of currency and country data on success", async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            countryName: "السعودية",
            countryCode: "SA",
            currency: "ريال",
            currencyCode: "SAR",
          },
          {
            countryName: "الإمارات",
            countryCode: "AE",
            currency: "درهم",
            currencyCode: "AED",
          },
        ],
      };
      axios.get.mockResolvedValueOnce(mockResponse);
      const result = await SMSAService.getCurrencyCountryLookup();
      expect(result).toEqual([
        {
          countryName: "السعودية",
          countryCode: "SA",
          currency: "ريال",
          currencyCode: "SAR",
        },
        {
          countryName: "الإمارات",
          countryCode: "AE",
          currency: "درهم",
          currencyCode: "AED",
        },
      ]);
    });

    it("should throw error if API response status is not 200", async () => {
      const mockResponse = {
        status: 404,
        data: { message: "Not Found" },
      };
      axios.get.mockResolvedValueOnce(mockResponse);
      await expect(SMSAService.getCurrencyCountryLookup()).rejects.toThrow(
        "خطأ في الحصول على قائمة الدول والعملات: Not Found"
      );
    });
  });

  describe("trackBulkShipments", () => {
    it("should throw error if awbs is not a non-empty array", async () => {
      await expect(SMSAService.trackBulkShipments([])).rejects.toThrow(
        "قائمة أرقام الشحنات مطلوبة"
      );
    });

    it("should return an array of formatted shipment data on success", async () => {
      const awbs = ["BULK1", "BULK2"];
      const apiResponseData = [
        {
          AWB: "BULK1",
          Reference: "Ref1",
          Pieces: 1,
          CODAmount: 0,
          ContentDesc: "Desc1",
          RecipientName: "Recipient1",
          OriginCity: "City1",
          OriginCountry: "Country1",
          DestinationCity: "DestCity1",
          DestinationCountry: "DestCountry1",
          isDelivered: true,
          Scans: [
            {
              DateTime: "2025-04-15T14:00:00.000Z",
              Description: "Scan1",
              City: "ScanCity1",
              ReceivedBy: "Agent1",
            },
          ],
        },
        {
          AWB: "BULK2",
          Reference: "Ref2",
          Pieces: 2,
          CODAmount: 50,
          ContentDesc: "Desc2",
          RecipientName: "Recipient2",
          OriginCity: "City2",
          OriginCountry: "Country2",
          DestinationCity: "DestCity2",
          DestinationCountry: "DestCountry2",
          isDelivered: false,
          Scans: [],
        },
      ];
      const mockResponse = {
        status: 200,
        data: apiResponseData,
      };
      axios.post.mockResolvedValueOnce(mockResponse);
      const result = await SMSAService.trackBulkShipments(awbs);
      expect(result).toEqual([
        {
          awb: "BULK1",
          reference: "Ref1",
          pieces: 1,
          codAmount: 0,
          contentDescription: "Desc1",
          recipientName: "Recipient1",
          origin: { city: "City1", country: "Country1" },
          destination: { city: "DestCity1", country: "DestCountry1" },
          isDelivered: true,
          scans: [
            {
              dateTime: new Date("2025-04-15T14:00:00.000Z"),
              description: "Scan1",
              city: "ScanCity1",
              receivedBy: "Agent1",
            },
          ],
        },
        {
          awb: "BULK2",
          reference: "Ref2",
          pieces: 2,
          codAmount: 50,
          contentDescription: "Desc2",
          recipientName: "Recipient2",
          origin: { city: "City2", country: "Country2" },
          destination: { city: "DestCity2", country: "DestCountry2" },
          isDelivered: false,
          scans: [],
        },
      ]);
    });

    it("should throw error if API response status is not 200", async () => {
      const awbs = ["BULK1", "BULK2"];
      const mockResponse = {
        status: 400,
        data: { message: "Bulk track error" },
      };
      axios.post.mockResolvedValueOnce(mockResponse);
      await expect(SMSAService.trackBulkShipments(awbs)).rejects.toThrow(
        "خطأ في تتبع الشحنات: Bulk track error"
      );
    });
  });

  describe("getStatusLookup", () => {
    it("should return list of shipment statuses on success", async () => {
      const mockResponse = {
        status: 200,
        data: [
          { Code: "DEL", ScanDescEN: "Delivered", ScanDescAR: "تم التسليم" },
          { Code: "INT", ScanDescEN: "In Transit", ScanDescAR: "قيد التوصيل" },
        ],
      };
      axios.get.mockResolvedValueOnce(mockResponse);
      const result = await SMSAService.getStatusLookup();
      expect(result).toEqual([
        {
          code: "DEL",
          descriptionEn: "Delivered",
          descriptionAr: "تم التسليم",
        },
        {
          code: "INT",
          descriptionEn: "In Transit",
          descriptionAr: "قيد التوصيل",
        },
      ]);
    });

    it("should throw error if API response status is not 200", async () => {
      const mockResponse = {
        status: 404,
        data: { message: "Status lookup not found" },
      };
      axios.get.mockResolvedValueOnce(mockResponse);
      await expect(SMSAService.getStatusLookup()).rejects.toThrow(
        "خطأ في الحصول على حالات الشحنة: Status lookup not found"
      );
    });
  });

  describe("getServiceTypes", () => {
    it("should return list of service types on success", async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            serviceCode: "SERV1",
            serviceDescription: "Service One",
            serviceType: "Type1",
            destination: "Domestic",
          },
          {
            serviceCode: "SERV2",
            serviceDescription: "Service Two",
            serviceType: "Type2",
            destination: "International",
          },
        ],
      };
      axios.get.mockResolvedValueOnce(mockResponse);
      const result = await SMSAService.getServiceTypes();
      expect(result).toEqual([
        {
          code: "SERV1",
          description: "Service One",
          type: "Type1",
          destination: "Domestic",
        },
        {
          code: "SERV2",
          description: "Service Two",
          type: "Type2",
          destination: "International",
        },
      ]);
    });

    it("should throw error if API response status is not 200", async () => {
      const mockResponse = {
        status: 500,
        data: { message: "Service types error" },
      };
      axios.get.mockResolvedValueOnce(mockResponse);
      await expect(SMSAService.getServiceTypes()).rejects.toThrow(
        "خطأ في الحصول على أنواع الخدمات: Service types error"
      );
    });
  });

  describe("_formatShipmentData", () => {
    it("should correctly format the shipment data", () => {
      const shipment = {
        AWB: "FMT123",
        Reference: "REF123",
        Pieces: 3,
        CODAmount: 25,
        ContentDesc: "Test Description",
        RecipientName: "Test Recipient",
        OriginCity: "OriginCity",
        OriginCountry: "OriginCountry",
        DestinationCity: "DestCity",
        DestinationCountry: "DestCountry",
        isDelivered: true,
        Scans: [
          {
            DateTime: "2025-04-15T15:00:00.000Z",
            Description: "Scan description",
            City: "ScanCity",
            ReceivedBy: "AgentX",
          },
        ],
      };
      const formatted = SMSAService._formatShipmentData(shipment);
      expect(formatted).toEqual({
        awb: "FMT123",
        reference: "REF123",
        pieces: 3,
        codAmount: 25,
        contentDescription: "Test Description",
        recipientName: "Test Recipient",
        origin: {
          city: "OriginCity",
          country: "OriginCountry",
        },
        destination: {
          city: "DestCity",
          country: "DestCountry",
        },
        isDelivered: true,
        scans: [
          {
            dateTime: new Date("2025-04-15T15:00:00.000Z"),
            description: "Scan description",
            city: "ScanCity",
            receivedBy: "AgentX",
          },
        ],
      });
    });
  });
});
