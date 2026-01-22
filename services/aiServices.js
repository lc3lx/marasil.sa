const mongoose = require("mongoose");
const Shapment = require("../models/shipmentModel");
const Order = require("../models/Order");
const ShippingCompany = require("../models/shipping_company");
const ClientAddress = require("../models/clientAddressModel");
const shipmentAccount = require("./shipmentAccount");
const Wallet = require("../models/walletModel");
const Customer = require("../models/customerModel");

/**
 * Wrapper لجميع الخدمات المطلوبة للـ AI Assistant
 */
class AIServices {
  constructor(userId, customer) {
    this.userId = userId;
    this.customer = customer;
  }

  mapCompanySlug(companyName = "") {
    const normalized = companyName.toLowerCase();
    if (normalized.includes("سمسا") || normalized.includes("smsa")) return "smsa";
    if (normalized.includes("ارامكس") || normalized.includes("aramex"))
      return "aramex";
    if (normalized.includes("ريد بوكس") || normalized.includes("redbox"))
      return "redbox";
    if (normalized.includes("لاما") || normalized.includes("omni"))
      return "omniclama";
    return normalized;
  }

  /**
   * خدمة تتبع الشحنات
   */
  async trackShipment(trackingNumber) {
    try {
      console.log("🔍 [AI-Shipment] Tracking shipment:", trackingNumber);

      // البحث عن الشحنة برقم التتبع
      const shipment = await Shapment.findOne({
        trackingId: trackingNumber,
        customerId: this.userId
      });

      if (!shipment) {
        return {
          success: false,
          message: "لم يتم العثور على شحنة بهذا الرقم"
        };
      }

      // تنسيق البيانات للرد
      return {
        success: true,
        trackingNumber: shipment.trackingId,
        status: shipment.shipmentstates || "غير محدد",
        createdAt: shipment.createdAt,
        receiver: {
          name: shipment.receiverAddress?.clientName || "غير محدد",
          phone: shipment.receiverAddress?.clientPhone || "غير محدد"
        },
        details: {
          weight: shipment.weight,
          parcels: shipment.boxNum,
          company: shipment.shapmentCompany,
          totalPrice: shipment.totalprice
        }
      };
    } catch (error) {
      console.error("❌ [AI-Shipment] Tracking error:", error);
      return {
        success: false,
        message: "حدث خطأ في تتبع الشحنة"
      };
    }
  }

  /**
   * خدمة إنشاء شحنة من خلال AI
   */
  async createShipmentFromAI(shipmentData) {
    try {
      console.log("📦 [AI-Shipment] Creating shipment from AI:", shipmentData);

      // التحقق من البيانات المطلوبة
      if (
        !shipmentData.company ||
        !shipmentData.weight ||
        !shipmentData.receiver?.name ||
        !shipmentData.sender?.name
      ) {
        return {
          success: false,
          message: "البيانات غير مكتملة لإنشاء الشحنة"
        };
      }

      const companyRecord = await ShippingCompany.findOne({
        company: shipmentData.company
      });

      if (!companyRecord) {
        return {
          success: false,
          message: "شركة الشحن غير موجودة في النظام"
        };
      }

      const shippingTypes = companyRecord.shippingTypes || [];
      const selectedType = shipmentData.shipmentType
        ? shippingTypes.find(
            (type) => type.type === shipmentData.shipmentType
          )
        : shippingTypes[0];

      if (!selectedType) {
        return {
          success: false,
          message: "نوع الشحن غير متوفر لهذه الشركة"
        };
      }

      const paymentMethod = shipmentData.paymentMethod || "COD";
      const weight = parseFloat(shipmentData.weight) || 1;
      const boxes = parseInt(shipmentData.boxes, 10) || 1;
      const dimension = shipmentData.dimensions || {
        length: 0,
        width: 0,
        height: 0
      };

      const pricing = shipmentAccount.shipmentnorm(selectedType, {
        weight,
        paymentMethod,
        dimension
      });

      const receiverAddress = await ClientAddress.create({
        customer: this.userId,
        clientName: shipmentData.receiver.name,
        clientAddress: shipmentData.receiver.address,
        clientPhone: shipmentData.receiver.phone,
        clientEmail: shipmentData.receiver.email || this.customer?.email,
        country: shipmentData.receiver.country || "sa",
        city: shipmentData.receiver.city,
        district: shipmentData.receiver.district,
        nationalAddress: shipmentData.receiver.nationalAddress
      });

      await ClientAddress.create({
        customer: this.userId,
        clientName: shipmentData.sender.name,
        clientAddress: shipmentData.sender.address,
        clientPhone: shipmentData.sender.phone,
        clientEmail: shipmentData.sender.email || this.customer?.email,
        country: shipmentData.sender.country || "sa",
        city: shipmentData.sender.city,
        district: shipmentData.sender.district,
        nationalAddress: shipmentData.sender.nationalAddress
      });

      const order = await Order.create({
        customer: {
          full_name: shipmentData.receiver.name,
          mobile: shipmentData.receiver.phone,
          city: shipmentData.receiver.city,
          country: shipmentData.receiver.country || "sa",
          address: shipmentData.receiver.address,
          email: shipmentData.receiver.email || this.customer?.email
        },
        total: {
          amount: shipmentData.value || 0,
          currency: "SAR"
        },
        payment_method: paymentMethod,
        platform: "Marasil",
        number_of_boxes: boxes,
        weight: weight,
        box_dimensions: {
          length: dimension.length || 0,
          width: dimension.width || 0,
          height: dimension.height || 0
        },
        product_description: shipmentData.description,
        product_value: shipmentData.value || 0,
        clientAddress: receiverAddress._id,
        Customer: this.userId
      });

      const trackingNumber = `MRSL${Date.now().toString().slice(-6)}`;
      const shipment = await Shapment.create({
        receiverAddress: receiverAddress._id,
        senderAddress: {
          clientName: shipmentData.sender.name,
          clientAddress: shipmentData.sender.address,
          clientPhone: shipmentData.sender.phone,
          city: shipmentData.sender.city,
          country: shipmentData.sender.country || "sa"
        },
        weight,
        customerId: this.userId,
        orderId: order._id,
        boxNum: boxes,
        dimension: {
          length: dimension.length || 0,
          width: dimension.width || 0,
          height: dimension.height || 0
        },
        paymentMathod: paymentMethod,
        shipmentstates: "READY_FOR_PICKUP",
        shapmentingType: "Dry",
        shapmentCompany: this.mapCompanySlug(companyRecord.company),
        trackingId: trackingNumber,
        trackingURL: companyRecord.trackingURL,
        totalprice: pricing.total,
        shapmentPrice: {
          priceaddedtax: selectedType.priceaddedtax,
          basePrice: selectedType.basePrice,
          profitPrice: selectedType.profitPrice,
          profitRTOprice: selectedType.profitRTOprice,
          baseAdditionalweigth: selectedType.baseAdditionalweigth,
          profitAdditionalweigth: selectedType.profitAdditionalweigth,
          baseCODfees: selectedType.baseCODfees,
          profitCODfees: selectedType.profitCODfees,
          insurancecost: selectedType.insurancecost,
          baseRTOprice: selectedType.baseRTOprice
        }
      });

      return {
        success: true,
        message: "تم إنشاء الشحنة بنجاح",
        trackingNumber: shipment.trackingId,
        shipmentId: shipment._id,
        pricing: pricing,
        shipmentData: shipment
      };

    } catch (error) {
      console.error("❌ [AI-Shipment] Create error:", error);
      return {
        success: false,
        message: "حدث خطأ في إنشاء الشحنة"
      };
    }
  }

  /**
   * خدمة إلغاء الشحنة
   */
  async cancelShipment(shipmentId) {
    try {
      console.log("🚫 [AI-Shipment] Cancelling shipment:", shipmentId);

      // البحث عن الشحنة
      const shipment = await Shapment.findOne({
        _id: shipmentId,
        customerId: this.userId
      });

      if (!shipment) {
        return {
          success: false,
          message: "لم يتم العثور على الشحنة"
        };
      }

      // التحقق من إمكانية الإلغاء
      if (shipment.shipmentstates !== "READY_FOR_PICKUP") {
        return {
          success: false,
          message: "لا يمكن إلغاء الشحنة في هذه الحالة"
        };
      }

      // تحديث حالة الشحنة
      shipment.shipmentstates = "Canceled";
      await shipment.save();

      return {
        success: true,
        message: "تم إلغاء الشحنة بنجاح"
      };

    } catch (error) {
      console.error("❌ [AI-Shipment] Cancel error:", error);
      return {
        success: false,
        message: "حدث خطأ في إلغاء الشحنة"
      };
    }
  }

  /**
   * خدمة الحصول على رصيد المحفظة
   */
  async getBalance() {
    try {
      console.log("💰 [AI-Wallet] Getting balance for user:", this.userId);

      const wallet = await Wallet.findOne({ customerId: this.userId });

      return {
        success: true,
        balance: wallet ? wallet.balance : 0,
        currency: "SAR"
      };

    } catch (error) {
      console.error("❌ [AI-Wallet] Balance error:", error);
      return {
        success: false,
        balance: 0,
        message: "حدث خطأ في الحصول على الرصيد"
      };
    }
  }

  /**
   * خدمة الحصول على قائمة الشحنات
   */
  async getUserShipments(limit = 5) {
    try {
      console.log("📋 [AI-Shipment] Getting shipments for user:", this.userId);

      const shipments = await Shapment.find({ customerId: this.userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('trackingId shipmentstates createdAt totalprice shapmentCompany');

      return {
        success: true,
        shipments: shipments.map(ship => ({
          id: ship._id,
          trackingId: ship.trackingId,
          status: ship.shipmentstates,
          createdAt: ship.createdAt,
          totalPrice: ship.totalprice,
          company: ship.shapmentCompany
        }))
      };

    } catch (error) {
      console.error("❌ [AI-Shipment] List error:", error);
      return {
        success: false,
        shipments: [],
        message: "حدث خطأ في الحصول على قائمة الشحنات"
      };
    }
  }

  /**
   * خدمة المعلومات العامة (للأسئلة غير المباشرة المرتبطة ببيانات المستخدم)
   */
  async getCompanyInfo() {
    try {
      console.log("ℹ️ [AI-General] Getting company info");

      return {
        success: true,
        companyInfo: {
          name: "مراسيل",
          description: "منصة شحن إلكترونية متخصصة في خدمة التجار والشركات في المملكة العربية السعودية",
          services: [
            "إنشاء وتتبع الشحنات",
            "ربط المتاجر الإلكترونية",
            "إدارة المحفظة المالية",
            "إدارة المرتجعات والاستبدال",
            "تخصيص صفحات التتبع"
          ],
          vision: "تسهيل عمليات الشحن للتجار وتحسين تجربة العملاء",
          contact: {
            email: "support@marasil.sa",
            phone: "920000000"
          }
        }
      };

    } catch (error) {
      console.error("❌ [AI-General] Company info error:", error);
      return {
        success: false,
        message: "حدث خطأ في الحصول على معلومات الشركة"
      };
    }
  }

  /**
   * خدمة الحصول على شركات الشحن المتاحة
   */
  async getShippingCompanies() {
    try {
      console.log("🚚 [AI-General] Getting shipping companies");

      const companies = await ShippingCompany.find({ status: "Enabled" });
      return {
        success: true,
        companies: companies.map((company) => ({
          name: company.company,
          deliveryTime: company.deliveryTime || "2-3 أيام عمل",
          shippingTypes: company.shippingTypes || [],
          description: company.detailsAr || company.details || ""
        }))
      };

    } catch (error) {
      console.error("❌ [AI-General] Shipping companies error:", error);
      return {
        success: false,
        message: "حدث خطأ في الحصول على شركات الشحن"
      };
    }
  }

  /**
   * خدمة حساب الأسعار
   */
  async getPricingInfo(data) {
    try {
      console.log("💰 [AI-General] Calculating pricing for:", data);

      const { weight, distance } = data;
      let basePrice = 0;
      let totalPrice = 0;

      // حساب أساسي للأسعار (يمكن تحسينه لاحقاً)
      if (weight <= 1) {
        basePrice = 25;
      } else if (weight <= 5) {
        basePrice = 35;
      } else if (weight <= 10) {
        basePrice = 50;
      } else {
        basePrice = 50 + (weight - 10) * 5; // 5 ريال لكل كيلو إضافي
      }

      // إضافة رسوم المسافة إذا كانت بعيدة
      if (distance && (distance.includes("جدة") || distance.includes("الرياض"))) {
        totalPrice = basePrice;
      } else {
        totalPrice = basePrice + 10; // رسوم إضافية للمسافات البعيدة
      }

      return {
        success: true,
        pricing: {
          weight: weight,
          basePrice: basePrice,
          totalPrice: totalPrice,
          currency: "SAR",
          notes: "السعر التقريبي وقد يختلف حسب الشركة والمنطقة"
        },
        recommendation: weight <= 5 ? "ننصح بشركة سمسا اقتصادي" : "ننصح بشركة سمسا برو"
      };

    } catch (error) {
      console.error("❌ [AI-General] Pricing error:", error);
      return {
        success: false,
        message: "حدث خطأ في حساب الأسعار"
      };
    }
  }
}

module.exports = AIServices;
