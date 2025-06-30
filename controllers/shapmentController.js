//module import
const mongoose = require("mongoose");
const Shapment = require("../models/shipmentModel");
const Order = require("../models/Order");
const shappingCompany = require("../models/shipping_company");
const Wallet = require("../models/walletModel");
const customer = require("../models/customerModel");
const Transaction = require("../models/transactionModel");
//platforms import
const smsaExxpress = require("../platforms/shipment/smsaExpressPlatform");
const redbox = require("../platforms/shipment/redboxPlatform");
const aramex = require("../platforms/shipment/aramexPlatform");
const omin = require("../platforms/shipment/omnidPlatform");
//servers import
const { shipmentnorm } = require("../services/shipmentAccount");
const smsaServers = require("../services/smsaService");
const redboxServers = require("../services/redboxSeervice");
const ominServers = require("../services/omnicServices");
const aramxServers = require("../services/AramexService");
// helpers import
const ApiEror = require("../utils/apiError");
const asyncHandler = require("express-async-handler");

/*
MATHOD : POST
THIS MOTHOD FOR CREATE SHIPMENT 

*/
module.exports.createShapment = asyncHandler(async (req, res, next) => {
  try {
    const { company, order, shipperAddress, weight, Parcels, shapmentingType } =
      req.body;

    // 1. التحقق من البيانات المطلوبة
    if (
      !company ||
      !order ||
      !shipperAddress ||
      !shapmentingType ||
      !weight ||
      !Parcels
    ) {
      return next(
        new ApiEror(
          "جميع البيانات مطلوبة: company, order, shipperAddress, shapmentingType, weight, Parcels",
          400
        )
      );
    }

    // 2. جلب بيانات شركة الشحن والتحقق من صلاحيتها
    const shippingCompany = await shappingCompany.findOne({ company });
    if (!shippingCompany) {
      return next(new ApiEror(`شركة الشحن ${company} غير موجودة`, 404));
    }

    if (shippingCompany.status !== "Enabled") {
      return next(new ApiEror(`شركة الشحن ${company} غير مفعلة حالياً`, 400));
    }

    // 3. ا
    // لتحقق من نوع الشحن المطلوب

    const shippingType = shippingCompany.shippingTypes.find(
      (t) => t.type === shapmentingType
    );

    if (shippingType.type === null) {
      console.log(shippingType.type);
      return next(
        new ApiEror(
          `نوع الشحن ${shapmentingType.type} غير متوفر مع ${company}`,
          400
        )
      );
    }

    // 4. التحقق من قيود الوزن والطرود
    if (weight > shippingType.maxWeight) {
      return next(
        new ApiEror(
          `الوزن يتجاوز الحد الأقصى المسموح به (${shippingType.maxWeight} كجم)`,
          400
        )
      );
    }
    if (Parcels > shippingType.maxBoxes) {
      return next(
        new ApiEror(
          `عدد الطرود يتجاوز الحد الأقصى المسموح به (${shippingType.maxBoxes})`,
          400
        )
      );
    }

    // 5. حساب تكلفة الشحن
    const orderWithWeight = {
      ...order,
      weight: weight,
      paymentMethod: order.payment_method,
    };
    const pricing = shipmentnorm(shippingType, orderWithWeight);

    // البحث عن محفظة العميل
    const wallet = await Wallet.findOne({ customerId: req.customer._id });

    // التحقق من وجود المحفظة
    if (!wallet) {
      return next(new ApiEror("المحفظة غير موجودة", 404));
    }

    // التحقق من كفاية الرصيد
    if (wallet.balance < pricing.total) {
      return next(
        new ApiEror(
          `رصيدك الحالي (${wallet.balance} ريال) لا يكفي لإنشاء الشحنة. الرصيد المطلوب: ${pricing.total} ريال`,
          402
        )
      );
    }

    // 6. إنشاء الشحنة حسب الشركة
    let trackingInfo;
    let shipmentData;

    switch (company) {
      case "smsa":
        console.log(req.body);
        shipmentData = smsaServers.Shapmentdata(
          order,
          shipperAddress,
          weight,
          Parcels,
          shippingCompany.code
        );
        trackingInfo = await smsaExxpress.createShipment(shipmentData);
        break;
      case "redbox":
        shipmentData = redboxServers.shipmentdata(
          order,
          shipperAddress,
          weight,
          Parcels
        );
        trackingInfo = await redbox.createShipment(shipmentData);

        // حفظ استجابة Redbox بالكامل
        if (trackingInfo && trackingInfo.success) {
          // تحديث الشحنة بمعلومات إضافية من Redbox
          await Shapment.findByIdAndUpdate(order._id, {
            $set: {
              redboxResponse: trackingInfo, // حفظ الرد الكامل
              trackingId: trackingInfo.tracking_number,
              shippingLabelUrl: trackingInfo.shipping_label_url,
              redboxShipmentId: trackingInfo.shipment_id,
            },
          });
        }
        break;
      case "aramex":
        shipmentData = aramxServers.shipmentData(
          order,
          shipperAddress,
          weight,
          Parcels
        );
        try {
          trackingInfo = await aramex.createShipment(shipmentData);
          if (!trackingInfo || !trackingInfo.trackingNumber) {
            throw new Error("فشل في الحصول على رقم التتبع");
          }
        } catch (error) {
          console.error("Aramex Error:", error);
          return next(
            new ApiEror(`فشل في إنشاء الشحنة: ${error.message}`, 500)
          );
        }
        break;
      case "omniclama":
        try {
          shipmentData = await ominServers.shipmentData(
            order,
            shipperAddress,
            weight,
            Parcels
          );
          trackingInfo = await omin.createShipment(shipmentData);
          if (!trackingInfo || !trackingInfo.trackingNumber) {
            throw new Error("فشل في الحصول على رقم التتبع");
          }
        } catch (error) {
          console.error("OmniDelivery Error:", error);
          return next(
            new ApiEror(`فشل في إنشاء الشحنة: ${error.message}`, 500)
          );
        }
        break;
    }
    console.log(trackingInfo);

    // 7. البحث عن عنوان المستلم أو إنشاؤه
    const ClientAddress = mongoose.model("ClientAddress");
    let address = await ClientAddress.findOne({
      clientEmail: order.customer.email,
      clientPhone: order.customer.mobile,
    });

    if (!address) {
      address = new ClientAddress({
        clientName: order.customer.full_name,
        clientPhone: order.customer.mobile,
        clientEmail: order.customer.email,
        clientAddress: order.customer.address,
        country: order.customer.country,
        city: order.customer.city,
        district: order.customer.district,
        customer: req.customer._id,
      });
      await address.save();
    }

    // 8. حفظ بيانات الشحنة مع جميع التفاصيل والأسعار
    // حفظ رد API المناسب حسب شركة الشحن
    const apiResponses = {
      smsa: company === "smsa" ? trackingInfo : null,
      aramex: company === "aramex" ? trackingInfo : null,
      redbox: company === "redbox" ? trackingInfo : null,
      omniclama: company === "omniclama" ? trackingInfo : null,
    };

    shipmentData = {
      receiverAddress: address._id, // استخدام معرف العنوان
      customerId: req.customer._id,
      ordervalue: order.total.amount,
      orderId: order._id,
      senderAddress: shipperAddress,
      boxNum: Parcels,
      weight: weight,
      dimension: req.body.dimension
        ? {
            high: req.body.dimension.high || 0,
            width: req.body.dimension.width || 0,
            length: req.body.dimension.length || 0,
          }
        : { high: 0, width: 0, length: 0 },
      orderDescription: order.description || "",
      paymentMathod: order.payment_method === "COD" ? "COD" : "Prepaid",
      shipmentstates: "READY_FOR_PICKUP",
      shapmentingType: shapmentingType,
      shapmentCompany: company,
      trackingId: trackingInfo.trackingNumber,
      storId: order.store_id,
      // حفظ ردود API
      smsaResponse: apiResponses.smsa,
      aramexResponse: apiResponses.aramex,
      redboxResponse: apiResponses.redbox,
      omniclamaResponse: apiResponses.omniclama,
      shapmentType: "straight",
      shapmentPrice: pricing.total,
      orderSou: order.platform,
      pricesetting: {
        priceaddedtax: shippingType.priceaddedtax || 0.15,
        basePrice: shippingType.basePrice || 0,
        profitPrice: shippingType.profitPrice || 0,
        profitRTOprice: shippingType.profitRTOprice || 0,
        baseAdditionalweigth: shippingType.baseAdditionalweigth || 0,
        profitAdditionalweigth: shippingType.profitAdditionalweigth || 0,
        baseCODfees: shippingType.baseCODfees || 0,
        profitCODfees: shippingType.profitCODfees || 0,
        insurancecost: shippingType.insurancecost || 0,
        byocPrice: shippingType.byocPrice || 0,
        basepickUpPrice: shippingType.basepickUpPrice || 0,
        profitpickUpPrice: shippingType.profitpickUpPrice || 0,
        baseRTOprice: shippingType.baseRTOprice || 0,
      },
    };

    const shipment = new Shapment(shipmentData);
    await shipment.save();

    console.log("تم حفظ الشحنة بنجاح:", shipment._id);

    // خصم تكلفة الشحنة من المحفظة بعد التأكد من حفظ الشحنة
    wallet.balance = parseFloat((wallet.balance - pricing.total).toFixed(2));
    await wallet.save();
    console.log(
      `تم خصم ${pricing.total} ريال من رصيد المحفظة. الرصيد الجديد: ${wallet.balance} ريال`
    );

    // تحديث حالة الطلب
    await Order.findByIdAndUpdate(order._id, { status: "shipped" });

    res.status(201).json({
      status: "success",
      data: {
        shipment,
        tracking: {
          number: trackingInfo.trackingNumber,
          url: `${shippingCompany.trackingURL}${trackingInfo.trackingNumber}`,
        },
      },
    });
  } catch (error) {
    return next(
      new ApiEror(error.message || "حدث خطأ أثناء إنشاء الشحنة", 500)
    );
  }
});

/*
MAthod // GEt 
TRICKING THE SIPMENT USE THE TRACK NUMBER IN HEDERS 
*/

module.exports.trackingShipment = asyncHandler(async (req, res, next) => {
  try {
    const { company, trackingNumber } = req.body;

    // 1. التحقق من البيانات المطلوبة
    if (!company || !trackingNumber) {
      return next(
        new ApiEror("جميع البيانات مطلوبة: company, trackingNumber", 400)
      );
    }

    // 2. جلب بيانات شركة الشحن والتحقق من صلاحيتها
    const shippingCompany = await shappingCompany.findOne({ company });
    if (!shippingCompany) {
      return next(new ApiEror(`شركة الشحن ${company} غير موجودة`, 404));
    }
    if (shippingCompany.status !== "Enabled") {
      return next(new ApiEror(`شركة الشحن ${company} غير مفعلة حالياً`, 400));
    }

    // 3. تتبع الشحنة حسب الشركة
    let trackingResult;
    switch (company) {
      case "smsa":
        trackingResult = await smsaExxpress.trackShipment(trackingNumber);
        break;
      case "aramex":
        trackingResult = await aramex.trackShipment(trackingNumber);
        break;
      case "redbox":
        trackingResult = await redbox.trackShipment(trackingNumber);
        break;
      case "omniclama":
        trackingResult = await omin.trackShipment(trackingNumber);

      //    trackingResult = await omin.
      default:
        return next(new ApiEror(`شركة الشحن ${company} غير مدعومة`, 400));
    }

    // 4. إرجاع نتيجة التتبع
    res.status(200).json({
      status: "success",
      data: trackingResult,
    });
  } catch (error) {
    // 5. معالجة الأخطاء
    console.error(`خطأ في تتبع الشحنة: ${error.message}`);
    return next(new ApiEror(`فشل في تتبع الشحنة: ${error.message}`, 500));
  }
});
/*
MATHOD : POST
THIS MOTHOD FOR CANCEL SHIPMENT 

*/
// مساعد لمعالجة استرجاع المبلغ لمحفظة الزبون
const processRefundToWallet = async (customerId, amount, shipmentId) => {
  try {
    // 1. البحث عن محفظة الزبون
    let wallet = await Wallet.findOne({ customerId });

    // إذا لم تكن هناك محفظة، قم بإنشاء واحدة جديدة
    if (!wallet) {
      wallet = await Wallet.create({
        customerId,
        balance: 0,
        transactions: [],
      });
    }

    // 2. تحديث رصيد المحفظة
    wallet.balance += amount;

    // 3. تسجيل المعاملة
    const transaction = await Transaction.create({
      customerId,
      type: "credit",
      amount,
      description: `استرداد مبلغ الشحنة الملغاة ${shipmentId}`,
      status: "completed",
      method: "manual_addition", // استخدام قيمة مسموح بها من enum
      walletId: wallet._id,
    });

    // 4. إضافة المعاملة إلى قائمة معاملات المحفظة
    wallet.transactions.push(transaction._id);

    // 5. حفظ التغييرات
    await wallet.save();

    return { success: true, wallet, transaction };
  } catch (error) {
    console.error("Error processing refund to wallet:", error);
    return { success: false, error: error.message };
  }
};

module.exports.cancelShipment = asyncHandler(async (req, res, next) => {
  try {
    const { company } = req.body;
    const { trackingNumber } = req.params;

    // 1. التحقق من البيانات المطلوبة
    if (!company || !trackingNumber) {
      return next(
        new ApiEror("جميع البيانات مطلوبة: company, trackingNumber", 400)
      );
    }

    // 2. جلب بيانات الشحنة والتحقق من حالتها
    const shipment = await Shapment.findOne({ trackingId: trackingNumber });

    if (!shipment) {
      return next(
        new ApiEror(`الشحنة برقم التتبع ${trackingNumber} غير موجودة`, 404)
      );
    }

    // 3. التحقق من أن حالة الشحنة تسمح بالإلغاء
    if (shipment.shipmentstates !== "READY_FOR_PICKUP") {
      return next(
        new ApiEror(
          "لا يمكن إلغاء الشحنة إلا إذا كانت في حالة انتظار الاستلام",
          400
        )
      );
    }

    // 4. جلب بيانات شركة الشحن والتحقق من صلاحيتها
    const shippingCompany = await shappingCompany.findOne({ company });
    if (!shippingCompany) {
      return next(new ApiEror(`شركة الشحن ${company} غير موجودة`, 404));
    }
    if (shippingCompany.status !== "Enabled") {
      return next(new ApiEror(`شركة الشحن ${company} غير مفعلة حالياً`, 400));
    }

    // 5. إلغاء الشحنة حسب الشركة
    let cancellationResult;
    try {
      // التحقق من أن حالة الشحنة تسمح بالإلغاء (READY_FOR_PICKUP)
      if (shipment.shipmentstates !== "READY_FOR_PICKUP") {
        return next(
          new ApiEror(
            "لا يمكن إلغاء الشحنة إلا إذا كانت في حالة انتظار الاستلام (READY_FOR_PICKUP)",
            400
          )
        );
      }

      // معالجة الإلغاء حسب شركة الشحن
      switch (company) {
        case "smsa":
        case "aramex":
          // SMSA و Aramex: نعاملهم بنفس الطريقة (إلغاء محلي فقط)
          cancellationResult = {
            success: true,
            message: `تم إلغاء الشحنة محلياً في النظام لشركة ${company}`,
            trackingNumber: trackingNumber,
            cancelledLocally: true,
          };
          break;

        case "redbox":
          // Redbox: نستخدم API الخاص بهم للإلغاء
          cancellationResult = await redbox.cancelShipment(trackingNumber);
          break;

        case "omniclama":
          // Omni: نستخدم API الخاص بهم للإلغاء
          cancellationResult = await omin.cancelShipment(trackingNumber);
          break;

        default:
          return next(new ApiEror(`شركة الشحن ${company} غير مدعومة`, 400));
      }
    } catch (error) {
      console.error(`فشل في إلغاء الشحنة من خلال ${company}:`, error);
      // حتى لو فشل الإلغاء من خلال API، نستمر في عملية الإلغاء المحلي
      cancellationResult = {
        success: true,
        message: `تم إلغاء الشحنة محلياً في النظام (فشل الاتصال بشركة الشحن: ${error.message})`,
        trackingNumber: trackingNumber,
        cancelledLocally: true,
      };
    }

    // 6. استرداد المبلغ إلى محفظة الزبون إذا كانت الدفع مسبقاً
    if (shipment.paymentMathod === "Prepaid" && shipment.shapmentPrice > 0) {
      const refundResult = await processRefundToWallet(
        shipment.customerId,
        shipment.shapmentPrice,
        shipment._id
      );

      if (!refundResult.success) {
        console.error("فشل في استرداد المبلغ للمحفظة:", refundResult.error);
        // نستمر في العملية رغم فشل الاسترداد، لكن نعلم المستخدم
      }
    }

    // 7. تحديث حالة الشحنة في قاعدة البيانات
    shipment.shipmentstates = "Canceled";
    await shipment.save();

    // 8. إرجاع نتيجة الإلغاء
    res.status(200).json({
      status: "success",
      message: "تم إلغاء الشحنة بنجاح واسترداد المبلغ إلى محفظة الزبون",
      data: {
        cancellation: cancellationResult,
        refunded:
          shipment.paymentMathod === "Prepaid" ? shipment.shapmentPrice : 0,
      },
    });
  } catch (error) {
    // 6. معالجة الأخطاء
    console.error(`خطأ في إلغاء الشحنة: ${error.message}`);
    return next(new ApiEror(`فشل في إلغاء الشحنة: ${error.message}`, 500));
  }
});

/*
M
*/

module.exports.printShipmentInvoice = asyncHandler(async (req, res, next) => {
  try {
    const { company, trackingNumber, items, options } = req.body;

    // 1. التحقق من البيانات المطلوبة
    if (
      !company ||
      !trackingNumber ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return next(
        new ApiEror(
          "جميع البيانات مطلوبة: company, trackingNumber, items[]",
          400
        )
      );
    }

    // 2. جلب بيانات شركة الشحن والتحقق من صلاحيتها
    const shippingCompany = await shappingCompany.findOne({ company });
    if (!shippingCompany) {
      return next(new ApiEror(`شركة الشحن ${company} غير موجودة`, 404));
    }
    if (shippingCompany.status !== "Enabled") {
      return next(new ApiEror(`شركة الشحن ${company} غير مفعلة حالياً`, 400));
    }

    // 3. طباعة الفاتورة حسب الشركة
    let invoiceResult;
    switch (company) {
      case "smsa":
        invoiceResult = await smsaExxpress.pushShipmentInvoice(
          trackingNumber,
          items,
          options
        );
        break;
      case "aramex":
        const aramexService = new Aramex();
        // TODO: Implement Aramex invoice printing when available
        return next(
          new ApiEror("طباعة الفواتير لـ Aramex غير متوفرة حالياً", 501)
        );
      case "redbox":
        // TODO: Implement RedBox invoice printing when available
        return next(
          new ApiEror("طباعة الفواتير لـ RedBox غير متوفرة حالياً", 501)
        );
      case "omnid":
        // TODO: Implement Omnid invoice printing when available
        return next(
          new ApiEror("طباعة الفواتير لـ Omnid غير متوفرة حالياً", 501)
        );
      default:
        return next(new ApiEror(`شركة الشحن ${company} غير مدعومة`, 400));
    }

    // 4. تحديث حالة الشحنة في قاعدة البيانات
    await Shapment.findOneAndUpdate(
      { trackingId: trackingNumber },
      { $set: { "details.invoice": invoiceResult } }
    );

    // 5. إرجاع نتيجة طباعة الفاتورة
    res.status(200).json({
      status: "success",
      message: "تم طباعة الفاتورة بنجاح",
      data: invoiceResult,
    });
  } catch (error) {
    // 6. معالجة الأخطاء
    console.error(`خطأ في طباعة الفاتورة: ${error.message}`);
    return next(new ApiEror(`فشل في طباعة الفاتورة: ${error.message}`, 500));
  }
});

/*
METHOD: GET
GET ALL SHIPMENTS FOR A SPECIFIC CUSTOMER
*/
module.exports.getCustomerShipments = asyncHandler(async (req, res, next) => {
  try {
    const customerId = req.customer._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const shipments = await Shapment.find({ customerId })
      .populate("customerId", "firstName lastName email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Shapment.countDocuments({ customerId });

    res.status(200).json({
      status: "success",
      results: shipments.length,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
      data: shipments,
    });
  } catch (error) {
    return next(new ApiEror(`فشل في جلب الشحنات: ${error.message}`, 500));
  }
});

/*
METHOD: GET
GET SINGLE SHIPMENT BY ID
*/
module.exports.getShipment = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const customerId = req.customer._id;

    const shipment = await Shapment.findOne({ _id: id, customerId }).populate(
      "customerId",
      "firstName lastName email phone"
    );

    if (!shipment) {
      return next(new ApiEror("الشحنة غير موجودة", 404));
    }

    res.status(200).json({
      status: "success",
      data: shipment,
    });
  } catch (error) {
    return next(new ApiEror(`فشل في جلب الشحنة: ${error.message}`, 500));
  }
});

/*
METHOD: GET (ADMIN ONLY)
GET ALL SHIPMENTS FOR ALL CUSTOMERS
*/
module.exports.getAllShipments = asyncHandler(async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};

    if (req.query.status) {
      filter.shipmentStatus = req.query.status;
    }

    if (req.query.shipper) {
      filter.shipper = req.query.shipper;
    }

    if (req.query.paymentMethod) {
      filter.paymentMethod = req.query.paymentMethod;
    }

    if (req.query.startDate && req.query.endDate) {
      filter.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    }

    const shipments = await Shapment.find(filter)
      .populate(
        "customerId",
        "firstName lastName email phone company_name_ar company_name_en"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Shapment.countDocuments(filter);

    res.status(200).json({
      status: "success",
      results: shipments.length,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
      data: shipments,
    });
  } catch (error) {
    return next(new ApiEror(`فشل في جلب الشحنات: ${error.message}`, 500));
  }
});

/*
METHOD: GET (ADMIN ONLY)
GET SINGLE SHIPMENT BY ID (ADMIN VERSION)
*/
module.exports.getShipmentAdmin = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;

    const shipment = await Shapment.findById(id).populate(
      "customerId",
      "firstName lastName email phone company_name_ar company_name_en"
    );

    if (!shipment) {
      return next(new ApiEror("الشحنة غير موجودة", 404));
    }

    res.status(200).json({
      status: "success",
      data: shipment,
    });
  } catch (error) {
    return next(new ApiEror(`فشل في جلب الشحنة: ${error.message}`, 500));
  }
});

/*
METHOD: PUT (ADMIN ONLY)
UPDATE SHIPMENT BY ADMIN
*/
module.exports.updateShipment = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData._id;
    delete updateData.customerId;
    delete updateData.trackingId;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const shipment = await Shapment.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("customerId", "firstName lastName email phone");

    if (!shipment) {
      return next(new ApiEror("الشحنة غير موجودة", 404));
    }

    res.status(200).json({
      status: "success",
      message: "تم تحديث الشحنة بنجاح",
      data: shipment,
    });
  } catch (error) {
    return next(new ApiEror(`فشل في تحديث الشحنة: ${error.message}`, 500));
  }
});

/*
METHOD: DELETE (ADMIN ONLY)
DELETE SHIPMENT BY ADMIN
*/
module.exports.deleteShipment = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;

    const shipment = await Shapment.findByIdAndDelete(id);

    if (!shipment) {
      return next(new ApiEror("الشحنة غير موجودة", 404));
    }

    res.status(200).json({
      status: "success",
      message: "تم حذف الشحنة بنجاح",
    });
  } catch (error) {
    return next(new ApiEror(`فشل في حذف الشحنة: ${error.message}`, 500));
  }
});

/*
METHOD: GET
SEARCH SHIPMENTS BY VARIOUS CRITERIA
*/
module.exports.searchShipments = asyncHandler(async (req, res, next) => {
  try {
    const { trackingNumber, phone, email, shipmentId, customerId } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = {};

    // Search by tracking number
    if (trackingNumber) {
      filter.trackingId = { $regex: trackingNumber, $options: "i" };
    }

    // Search by shipment ID
    if (shipmentId) {
      filter._id = shipmentId;
    }

    // Search by customer ID
    if (customerId) {
      filter.customerId = customerId;
    }

    // Search by customer phone or email
    if (phone || email) {
      const customerFilter = {};
      if (phone) customerFilter.phone = { $regex: phone, $options: "i" };
      if (email) customerFilter.email = { $regex: email, $options: "i" };

      const customers = await customer.find(customerFilter).select("_id");
      const customerIds = customers.map((c) => c._id);

      if (customerIds.length > 0) {
        filter.customerId = { $in: customerIds };
      } else {
        // If no customers found, return empty result
        return res.status(200).json({
          status: "success",
          results: 0,
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: limit,
          },
          data: [],
        });
      }
    }

    // If no search criteria provided, return error
    if (Object.keys(filter).length === 0) {
      return next(new ApiEror("يجب توفير معيار بحث واحد على الأقل", 400));
    }

    const shipments = await Shapment.find(filter)
      .populate(
        "customerId",
        "firstName lastName email phone company_name_ar company_name_en"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Shapment.countDocuments(filter);

    res.status(200).json({
      status: "success",
      results: shipments.length,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
      data: shipments,
    });
  } catch (error) {
    return next(new ApiEror(`فشل في البحث عن الشحنات: ${error.message}`, 500));
  }
});

/*
METHOD: GET
GET SHIPMENT STATISTICS FOR CUSTOMER
*/
module.exports.getShipmentsStats = asyncHandler(async (req, res, next) => {
  try {
    const customerId = req.customer._id;

    const stats = await Shapment.aggregate([
      { $match: { customerId: customerId } },
      {
        $group: {
          _id: null,
          totalShipments: { $sum: 1 },
          totalValue: { $sum: "$orderValue" },
          totalShippingCost: { $sum: "$shippingPrice" },
          pendingShipments: {
            $sum: {
              $cond: [{ $eq: ["$shipmentStatus", "READY_FOR_PICKUP"] }, 1, 0],
            },
          },
          deliveredShipments: {
            $sum: {
              $cond: [{ $eq: ["$shipmentStatus", "DELIVERED"] }, 1, 0],
            },
          },
          inTransitShipments: {
            $sum: {
              $cond: [
                {
                  $in: ["$shipmentStatus", ["IN_TRANSIT", "OUT_FOR_DELIVERY"]],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const shipperStats = await Shapment.aggregate([
      { $match: { customerId: customerId } },
      {
        $group: {
          _id: "$shipper",
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      totalShipments: stats[0]?.totalShipments || 0,
      totalValue: stats[0]?.totalValue || 0,
      totalShippingCost: stats[0]?.totalShippingCost || 0,
      pendingShipments: stats[0]?.pendingShipments || 0,
      deliveredShipments: stats[0]?.deliveredShipments || 0,
      inTransitShipments: stats[0]?.inTransitShipments || 0,
      shipperBreakdown: shipperStats,
    };

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    return next(
      new ApiEror(`فشل في جلب إحصائيات الشحنات: ${error.message}`, 500)
    );
  }
});
