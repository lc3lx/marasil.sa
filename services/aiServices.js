const mongoose = require("mongoose");
const Shapment = require("../models/shipmentModel");
const Order = require("../models/Order");
const ShippingCompany = require("../models/shipping_company");
const ClientAddress = require("../models/clientAddressModel");
const shipmentAccount = require("./shipmentAccount");
const Wallet = require("../models/walletModel");
const Customer = require("../models/customerModel");
const shipmentCreationService = require("./shipmentCreationService");

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
   * إنشاء شحنة من خلال AI - بنفس طريقة صفحة create-shipment (نفس الـ API والمنطق)
   */
  async createShipmentFromAI(shipmentData) {
    try {
      console.log("📦 [AI-Shipment] Creating shipment (same flow as create-shipment page):", shipmentData);

      const hasReceiverId = shipmentData.receiverId && mongoose.Types.ObjectId.isValid(shipmentData.receiverId);
      if (!shipmentData.company || !shipmentData.weight || !shipmentData.sender?.name) {
        return { success: false, message: "البيانات غير مكتملة لإنشاء الشحنة" };
      }
      if (!hasReceiverId && !shipmentData.receiver?.name) {
        return { success: false, message: "البيانات غير مكتملة: المستلم مطلوب" };
      }

      const companySlug = this.mapCompanySlug(shipmentData.company);
      const paymentMethod = (shipmentData.paymentMethod || "COD") === "CASH" || (shipmentData.paymentMethod || "").toString().toLowerCase() === "prepaid" ? "Prepaid" : "COD";
      const shapmentingType = paymentMethod === "Prepaid" ? "Dry" : "COD";

      let orderCustomer;
      if (hasReceiverId) {
        const rec = await ClientAddress.findOne({ _id: shipmentData.receiverId, customer: this.userId });
        if (!rec) return { success: false, message: "عنوان المستلم غير موجود أو لا يخص حسابك" };
        orderCustomer = {
          full_name: rec.clientName,
          mobile: rec.clientPhone,
          city: rec.city,
          country: rec.country || "sa",
          address: rec.clientAddress,
          email: rec.clientEmail || this.customer?.email,
          district: rec.district || "",
          nationalAddress: rec.nationalAddress || "",
        };
      } else {
        orderCustomer = {
          full_name: shipmentData.receiver.name,
          mobile: shipmentData.receiver.phone,
          city: shipmentData.receiver.city,
          country: shipmentData.receiver.country || "sa",
          address: shipmentData.receiver.address,
          email: shipmentData.receiver.email || this.customer?.email,
          district: shipmentData.receiver.district || "",
          nationalAddress: shipmentData.receiver.nationalAddress || "",
        };
      }

      const dim = shipmentData.dimensions || {};
      const body = {
        company: companySlug,
        shapmentingType,
        orderDescription: shipmentData.description || "شحنة",
        order: {
          paymentMethod,
          customer: orderCustomer,
          total: { amount: shipmentData.value || 0, currency: "SAR" },
          description: shipmentData.description || "شحنة",
          customerAddress: orderCustomer.address,
        },
        shipperAddress: {
          full_name: shipmentData.sender.name,
          mobile: shipmentData.sender.phone,
          city: shipmentData.sender.city,
          city_en: shipmentData.sender.city_en || "",
          country: shipmentData.sender.country || "sa",
          address: shipmentData.sender.address,
          nationalAddress: shipmentData.sender.nationalAddress || "",
        },
        weight: parseFloat(shipmentData.weight) || 1,
        Parcels: parseInt(shipmentData.boxes, 10) || 1,
        dimension: {
          high: dim.height || 0,
          width: dim.width || 0,
          length: dim.length || 0,
        },
        senderOfficeCode: shipmentData.senderOfficeCode,
        recipientOfficeCode: shipmentData.recipientOfficeCode,
      };

      const result = await shipmentCreationService.createShipment(this.userId, body);
      return {
        success: true,
        message: "تم إنشاء الشحنة بنجاح",
        trackingNumber: result.tracking?.number || result.shipment?.trackingId,
        shipmentId: result.shipment?._id,
        shipmentData: result.shipment,
      };
    } catch (error) {
      console.error("❌ [AI-Shipment] Create error:", error);
      return {
        success: false,
        message: error.message || "حدث خطأ في إنشاء الشحنة",
      };
    }
  }

  /**
   * عناوين المرسلين (من حساب العميل - customer.addresses)
   */
  async getSenderAddresses() {
    try {
      const customer = await Customer.findById(this.userId).select("addresses").lean();
      const list = (customer && customer.addresses) ? customer.addresses : [];
      return { success: true, data: list };
    } catch (e) {
      console.error("❌ [AI] getSenderAddresses error:", e);
      return { success: false, data: [], message: e.message };
    }
  }

  /**
   * عناوين المستلمين (ClientAddress للمستخدم)
   */
  async getClientAddresses() {
    try {
      const list = await ClientAddress.find({ customer: this.userId }).lean();
      return { success: true, data: list };
    } catch (e) {
      console.error("❌ [AI] getClientAddresses error:", e);
      return { success: false, data: [], message: e.message };
    }
  }

  /**
   * خدمة إلغاء الشحنة (تقبل _id أو رقم التتبع trackingId)
   */
  async cancelShipment(shipmentId) {
    try {
      console.log("🚫 [AI-Shipment] Cancelling shipment:", shipmentId);

      const isObjectId = mongoose.Types.ObjectId.isValid(shipmentId) && String(new mongoose.Types.ObjectId(shipmentId)) === shipmentId;

      const shipment = isObjectId
        ? await Shapment.findOne({ _id: shipmentId, customerId: this.userId })
        : await Shapment.findOne({ trackingId: String(shipmentId).trim(), customerId: this.userId });

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
