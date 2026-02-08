//module import
const mongoose = require("mongoose");
const sendmail = require("../utils/SendMail");
const moment = require("moment");
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
const shipmentCreationService = require("../services/shipmentCreationService");

const normalizeDimensionInput = (dimension = {}) => {
  const toNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const length =
    toNumber(
      dimension.length ?? dimension.Length ?? dimension.long ?? dimension.Long
    ) || 0;
  const width =
    toNumber(dimension.width ?? dimension.Width ?? dimension.Wide) || 0;
  const height =
    toNumber(
      dimension.height ?? dimension.Height ?? dimension.high ?? dimension.High
    ) || 0;

  if (!length && !width && !height) {
    return { length: 0, width: 0, height: 0 };
  }

  return { length, width, height };
};
/**?
 * Mathod // Post
 *thie Mothod for accounting shipmenting price
 *
 *
 *
 */
module.exports.acountingShipmentPrice = asyncHandler(async (req, res, next) => {
  try {
    const { company, order, shapmentingType, dimension, weight, Parcels } =
      req.body;
    if (!company || !order) {
      return next(new ApiEror("All data is required", 400));
    }
    const shippingCompany = await shappingCompany.findOne({ company });
    const shippingType = shippingCompany.shippingTypes.find(
      (t) => t.type === shapmentingType
    );
    if (!shippingType) {
      return next(
        new ApiEror(`Shipping type ${shapmentingType} is not found`, 400)
      );
    }

    // فحص الوزن والطرود قبل فحص الأبعاد
    if (weight > shippingType.denayWeight) {
      return next(
        new ApiEror(
          `الوزن يتجاوز الحد الأقصى المسموح به (${shippingType.denayWeight} كجم). الوزن المرسل: ${weight} كجم`,
          400
        )
      );
    }
    if (Parcels > shippingType.maxBoxes) {
      return next(
        new ApiEror(
          `عدد الطرود يتجاوز الحد الأقصى المسموح به (${shippingType.maxBoxes}). عدد الطرود المرسل: ${Parcels}`,
          400
        )
      );
    }

    const normalizedDimension = normalizeDimensionInput(dimension);
    const hasValidDimension =
      normalizedDimension.length > 0 &&
      normalizedDimension.width > 0 &&
      normalizedDimension.height > 0;

    // فحص الحد الأقصى لحجم الصندوق (50×50×40 سم)
    const MAX_DIMENSIONS = {
      length: 50,
      width: 50,
      height: 40,
    };

    if (hasValidDimension) {
      if (
        normalizedDimension.length > MAX_DIMENSIONS.length ||
        normalizedDimension.width > MAX_DIMENSIONS.width ||
        normalizedDimension.height > MAX_DIMENSIONS.height
      ) {
        return next(
          new ApiEror(
            `أبعاد الصندوق تجاوزت الحد الأقصى المسموح به (${MAX_DIMENSIONS.length}×${MAX_DIMENSIONS.width}×${MAX_DIMENSIONS.height} سم). الأبعاد المرسلة: ${normalizedDimension.length}×${normalizedDimension.width}×${normalizedDimension.height} سم`,
            400
          )
        );
      }
    }

    // إضافة dimension إلى order إذا كان موجوداً
    const orderWithDimension = {
      ...order,
      dimension: hasValidDimension ? normalizedDimension : null,
    };

    const pricing = shipmentnorm(shippingType, orderWithDimension, company);

    res.status(200).json({ data: pricing });
  } catch (error) {
    return next(new ApiEror(error.message, 500));
  }
});

/*
  POST - إنشاء شحنة (نفس منطق صفحة create-shipment - يستخدم shipmentCreationService)
*/
module.exports.createShapment = asyncHandler(async (req, res, next) => {
  try {
    const result = await shipmentCreationService.createShipment(req.customer._id, req.body);
    res.status(201).json({
      status: "success",
      data: {
        shipment: result.shipment,
        tracking: result.tracking,
        ...(result.pickupRequest && { pickupRequest: result.pickupRequest }),
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return next(
      new ApiEror(error.message || "حدث خطأ أثناء إنشاء الشحنة", statusCode)
    );
  }
});

/*
    if (!shippingCompany) {
      return next(new ApiEror(`شركة الشحن ${company} غير موجودة`, 404));
    }

    if (shippingCompany.status !== "Enabled") {
      return next(new ApiEror(`شركة الشحن ${company} غير مفعلة حالياً`, 400));
    }
    const normalizedDimension = normalizeDimensionInput(dimension);
    const hasValidDimension =
      normalizedDimension.length > 0 &&
      normalizedDimension.width > 0 &&
      normalizedDimension.height > 0;

    // فحص الحد الأقصى لحجم الصندوق (50×50×40 سم)
    const MAX_DIMENSIONS = {
      length: 50,
      width: 50,
      height: 40,
    };

    if (hasValidDimension) {
      if (
        normalizedDimension.length > MAX_DIMENSIONS.length ||
        normalizedDimension.width > MAX_DIMENSIONS.width ||
        normalizedDimension.height > MAX_DIMENSIONS.height
      ) {
        return next(
          new ApiEror(
            `أبعاد الصندوق تجاوزت الحد الأقصى المسموح به (${MAX_DIMENSIONS.length}×${MAX_DIMENSIONS.width}×${MAX_DIMENSIONS.height} سم). الأبعاد المرسلة: ${normalizedDimension.length}×${normalizedDimension.width}×${normalizedDimension.height} سم`,
            400
          )
        );
      }
    }

    if (company === "omniclama" || company === "redbox") {
      if (!hasValidDimension) {
        return next(new ApiEror("الطول والعرض والارتفاع مطلوبة", 400));
        // أوقف التنفيذ بعد الخطأ
      }
      if (!Array.isArray(shippingCompany.allowedBoxSizes)) {
        return next(
          new ApiEror("لم يتم ضبط أبعاد الصندوق المسموح به لشركة الشحن", 400)
        );
        // أوقف التنفيذ بعد الخطأ
      }
      const allowed = shippingCompany.allowedBoxSizes[0];
      console.log(allowed);
      const reqDim = normalizedDimension;
      console.log(reqDim);
      const reqVolume =
        Number(reqDim.length) * Number(reqDim.width) * Number(reqDim.height);
      const allowedVolume =
        Number(allowed.length) * Number(allowed.width) * Number(allowed.height);

      if (reqVolume > allowedVolume) {
        return next(new ApiEror("الحجم يتجاوز الحد الأقصى المسموح به", 400));
        // أوقف التنفيذ بعد الخطأ
      }
    }

    // 3. ا
    // لتحقق من نوع الشحن المطلوب
    console.log(shippingCompany.shippingTypes);
    const shippingType = shippingCompany.shippingTypes.find(
      (t) => t.type === shapmentingType
    );

    if (!shippingType) {
      return next(
        new ApiEror(`نوع الشحن ${shapmentingType} غير متوفر مع ${company}`, 400)
      );
    }
    console.log(shippingType);
    // 4. التحقق من قيود الوزن والطرود
    if (weight > shippingType.denayWeight) {
      return next(
        new ApiEror(
          `الوزن يتجاوز الحد الأقصى المسموح به (${shippingType.denayWeight} كجم)`,
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
    const dimensionPayload = hasValidDimension ? normalizedDimension : null;

    const orderWithWeight = {
      ...order,
      weight: weight,
      paymentMethod: order.payment_method,
      dimension: dimensionPayload, // إضافة الأبعاد لحساب الوزن البعدي
    };
    const pricing = shipmentnorm(shippingType, orderWithWeight, company);
    orderToUse.dimension = dimensionPayload;

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
          orderToUse,
          shipperAddress,
          weight,
          Parcels,
          orderDescription,
          shippingCompany.code,
          req.body.senderOfficeCode,
          req.body.recipientOfficeCode,
          dimensionPayload
        );
        // استخدام المفتاح الثاني إذا كانت الشحنة تستخدم المكاتب
        const useOfficesKey = !!(
          req.body.senderOfficeCode || req.body.recipientOfficeCode
        );
        trackingInfo = await smsaExxpress.createShipment(
          shipmentData,
          useOfficesKey
        );
        break;
      case "redbox":
        shipmentData = redboxServers.shipmentdata(
          orderToUse,
          shipperAddress,
          weight,
          Parcels,
          orderDescription
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
          orderToUse,
          shipperAddress,
          weight,
          Parcels,
          orderDescription,
          dimensionPayload || normalizedDimension
        );
        try {
          trackingInfo = await aramex.createShipment(shipmentData);
          if (!trackingInfo || !trackingInfo.trackingNumber) {
            throw new Error("فشل في الحصول على رقم التتبع");
          }

          // إنشاء طلب الاستلام تلقائياً بعد إنشاء الشحنة
          console.log("🚛 [Controller] إنشاء طلب استلام لأرامكس...");
          const pickupResult = await aramxServers.createPickupRequest(
            shipperAddress,
            { trackingNumber: trackingInfo.trackingNumber }
          );

          if (pickupResult.success) {
            console.log("✅ [Controller] تم إنشاء طلب الاستلام بنجاح");
            // إضافة معلومات طلب الاستلام للرد
            trackingInfo.pickupRequest = {
              pickupId: pickupResult.pickupId,
              scheduledDate: pickupResult.scheduledDate,
              message: pickupResult.message,
              success: true,
            };
          } else {
            console.warn(
              "⚠️ [Controller] فشل في إنشاء طلب الاستلام:",
              pickupResult.error
            );
            // إضافة معلومات فشل طلب الاستلام للرد
            trackingInfo.pickupRequest = {
              success: false,
              error: pickupResult.error,
              message: pickupResult.message,
            };
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
            orderToUse,
            shipperAddress,
            weight,
            Parcels,
            orderDescription,
            dimensionPayload || normalizedDimension
          );
          trackingInfo = await omin.createShipment(shipmentData);
          // استخدام order_uid كرقم تتبع إذا كان متوفراً
          if (trackingInfo && trackingInfo.order_uid) {
            trackingInfo.trackingNumber = trackingInfo.order_uid;
          }
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

    // 7. البحث عن عنوان المستلم أو إنشاؤه (منع إعادة استخدام عنوان ثابت بين الشحنات)
    const ClientAddress = mongoose.model("ClientAddress");

    const orderCustomer =
      (orderToUse && orderToUse.customer) || (order && order.customer) || {};

    const normalizedPhone = String(orderCustomer.mobile || "").trim();
    const normalizedAddress = String(orderCustomer.address || "").trim();
    const normalizedCity = String(orderCustomer.city || "").trim();
    const normalizedNationalAddress = String(orderCustomer.nationalAddress || "").trim();

    const addressQuery = {
      clientPhone: normalizedPhone,
      clientAddress: normalizedAddress,
      city: normalizedCity,
      customer: req.customer._id,
    };
    if (normalizedNationalAddress) addressQuery.nationalAddress = normalizedNationalAddress;

    let address = await ClientAddress.findOne(addressQuery);
    if (!address) {
      address = await ClientAddress.create({
        clientName: orderCustomer.full_name,
        clientPhone: normalizedPhone,
        clientEmail: orderCustomer.email,
        clientAddress: normalizedAddress,
        country: orderCustomer.country,
        city: normalizedCity,
        nationalAddress: normalizedNationalAddress || undefined,
        customer: req.customer._id,
      });
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
      ordervalue: orderToUse.total.amount,
      orderId: orderToUse._id,
      senderAddress: shipperAddress,
      boxNum: Parcels,
      dimension: dimensionPayload || normalizedDimension || null,
      paymentMathod: order.payment_method === "COD" ? "COD" : "Prepaid",
      shipmentstates: "READY_FOR_PICKUP",
      shapmentingType: shapmentingType,
      shapmentCompany: company,
      trackingId: trackingInfo.trackingNumber,
      orderSou: order.platform,
      storId: order.store_id,
      // حفظ ردود API
      weight: weight,
      Parcels: Parcels,
      smsaResponse: apiResponses.smsa || null,
      aramexResponse: apiResponses.aramex || null,
      redboxResponse: apiResponses.redbox || null,
      omniclamaResponse: apiResponses.omniclama || null,
      // حفظ معلومات طلب الاستلام إذا كان موجوداً
      ...(trackingInfo.pickupRequest && {
        pickupRequest: {
          pickupId: trackingInfo.pickupRequest.pickupId,
          scheduledDate: trackingInfo.pickupRequest.scheduledDate,
          success: trackingInfo.pickupRequest.success,
          ...(trackingInfo.pickupRequest.error && {
            error: trackingInfo.pickupRequest.error,
          }),
        },
      }),
      shapmentType: "straight",
      totalprice: pricing.total,
      shapmentPrice: {
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

    // إنشاء معاملة خصم للشحنة
    const transaction = await Transaction.create({
      customerId: req.customer._id,
      type: "debit",
      amount: pricing.total,
      description: `دفع مقابل شحنة - رقم التتبع: ${trackingInfo.trackingNumber}`,
      status: "completed",
      method: "shipment_payment",
      referenceId: shipment._id.toString(),
      referenceType: "shipment",
      walletId: wallet._id,
    });

    // إضافة المعاملة إلى سجل المعاملات في المحفظة
    wallet.transactions.push(transaction._id);
    await wallet.save();

    // تحديث حالة الطلب إذا كان موجوداً
    if (order._id) {
      await Order.findByIdAndUpdate(order._id, { status: "shipped" });
    }

    res.status(201).json({
      status: "success",
      data: {
        shipment,
        tracking: {
          number: trackingInfo.trackingNumber,
          url: `${shippingCompany.trackingURL}${trackingInfo.trackingNumber}`,
        },
        // إضافة معلومات طلب الاستلام إذا كان موجوداً
        ...(trackingInfo.pickupRequest && {
          pickupRequest: {
            success: trackingInfo.pickupRequest.success,
            pickupId: trackingInfo.pickupRequest.pickupId,
            scheduledDate: trackingInfo.pickupRequest.scheduledDate,
            message: trackingInfo.pickupRequest.message,
            ...(trackingInfo.pickupRequest.error && {
              error: trackingInfo.pickupRequest.error,
            }),
          },
        }),
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
    const { trackingNumber } = req.body;

    // 1. التحقق من وجود رقم التتبع
    if (!trackingNumber) {
      return next(new ApiEror("رقم التتبع مطلوب", 400));
    }

    // 2. البحث عن الشحنة باستخدام رقم التتبع
    const shipment = await Shapment.findOne({ trackingId: trackingNumber });

    if (!shipment) {
      return next(new ApiEror("لم يتم العثور على شحنة بهذا الرقم", 404));
    }

    // 3. جلب شركة الشحن من بيانات الشحنة
    const company = shipment.shapmentCompany;
    if (!company) {
      return next(new ApiEror("تعذر تحديد شركة الشحن", 400));
    }

    // 4. التحقق من صلاحية شركة الشحن
    const shippingCompany = await shappingCompany.findOne({ company });
    if (!shippingCompany) {
      return next(
        new ApiEror(`شركة الشحن ${company} غير مسجلة في النظام`, 404)
      );
    }
    if (shippingCompany.status !== "Enabled") {
      return next(new ApiEror(`شركة الشحن ${company} غير مفعلة حالياً`, 400));
    }

    // 3. تتبع الشحنة حسب الشركة
    let trackingResult;
    try {
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
          break;
        case "bawadi":
          // Basic Bawadi tracking implementation
          // Note: This is a placeholder and should be replaced with actual Bawadi API integration
          trackingResult = {
            trackingNumber,
            status: "In Transit",
            lastUpdate: new Date().toISOString(),
            estimatedDelivery: null,
            events: [
              {
                date: new Date().toISOString(),
                status: "Shipment information received",
                location: "",
                details: "Shipment information has been received by Bawadi",
              },
            ],
          };
          break;
        default:
          return next(new ApiEror(`شركة الشحن ${company} غير مدعومة`, 400));
      }
    } catch (error) {
      console.error(`فشل تتبع الشحنة مع ${company}:`, error);
      return next(
        new ApiEror(`فشل في تتبع الشحنة مع ${company}: ${error.message}`, 500)
      );
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
const processRefundToWallet = async (
  customerId,
  amount,
  shipmentId,
  trackingNumber
) => {
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

    // 3. تسجيل المعاملة مع رقم الشحنة
    const transaction = await Transaction.create({
      customerId,
      type: "credit",
      amount,
      description: `استرداد مبلغ الشحنة الملغاة - رقم الشحنة: ${trackingNumber} - معرف الشحنة: ${shipmentId}`,
      status: "completed",
      method: "shipment_cancel_refund",
      referenceId: shipmentId,
      referenceType: "shipment",
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

    // 6. استرداد المبلغ إلى محفظة الزبون (سواء كانت الدفع مسبقاً أو عند التسليم)
    const refundAmount = shipment.totalprice || 0;
    if (refundAmount > 0) {
      const refundResult = await processRefundToWallet(
        shipment.customerId,
        refundAmount,
        shipment._id,
        trackingNumber
      );

      if (!refundResult.success) {
        console.error("فشل في استرداد المبلغ للمحفظة:", refundResult.error);
        // نستمر في العملية رغم فشل الاسترداد، لكن نعلم المستخدم
      }
    }

    // 7. تحديث حالة الشحنة إلى "ملغاة" بدلاً من حذفها
    shipment.shipmentstates = "Canceled";
    await shipment.save();

    // إرسال بريد إلكتروني عند إلغاء شحنة أرامكس أو سمسا
   
    // 8. إرجاع نتيجة الإلغاء
    res.status(200).json({
      status: "success",
      message: "تم إلغاء الشحنة بنجاح واسترداد المبلغ إلى محفظة الزبون",
      data: {
        cancellation: cancellationResult,
        shipment: {
          id: shipment._id,
          trackingNumber: trackingNumber,
          status: "Canceled",
        },
        refunded: refundAmount,
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

    // 3. طباعة الفاتورة حسب الشركة
    let invoiceResult;
    switch (company) {
      case "smsa":
        invoiceResult = await smsaExxpress.pushShipmentInvoice(trackingNumber);
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
      case "omniclama":
        try {
          // التأكد من الحصول على token قبل طلب البوليصة
          // printLabels يستدعي ensureAuth() داخلياً للحصول على token تلقائياً
          console.log("📦 [Controller] طلب طباعة بوليصة OmniLama:", {
            trackingNumber,
            company,
          });

          invoiceResult = await omin.printLabels(trackingNumber);

          console.log("📄 [Controller] نتيجة طباعة البوليصة من OmniLama:", {
            trackingNumber,
            result: JSON.stringify(invoiceResult, null, 2),
            resultType: typeof invoiceResult,
            hasData: !!invoiceResult?.data,
            hasLabel: !!invoiceResult?.label,
            hasUrl: !!invoiceResult?.url,
            hasFile: !!invoiceResult?.file,
          });
        } catch (error) {
          console.error("❌ [Controller] OmniLama Print Invoice Error:", {
            trackingNumber,
            error: error.message,
            stack: error.stack,
            response: error.response?.data,
            status: error.response?.status,
          });
          return next(
            new ApiEror(
              `فشل في طلب البوليصة من OmniLama: ${error.message}`,
              500
            )
          );
        }
        break;
      default:
        return next(new ApiEror(`شركة الشحن ${company} غير مدعومة`, 400));
    }

    // 4. تحديث حالة الشحنة في قاعدة البيانات وفقًا للشركة وحفظ مكان مناسب للواجهة
    if (company === "smsa") {
      // SMSA عادة ترجع base64
      await Shapment.findOneAndUpdate(
        { trackingId: trackingNumber },
        { $set: { "smsaResponse.label": invoiceResult } },
        { new: true }
      );
    } else if (company === "omniclama") {
      // محاولة استخراج رابط/ملف البوليصة من الاستجابة
      const extractLabel = (payload) => {
        console.log("🔍 [Controller] استخراج البوليصة من الاستجابة:", {
          payloadType: typeof payload,
          payloadKeys: payload ? Object.keys(payload) : null,
          payloadPreview: payload
            ? JSON.stringify(payload).substring(0, 500)
            : null,
        });

        if (!payload) return null;

        // إذا كانت string، حاول parseها كـ JSON
        let parsedPayload = payload;
        if (typeof payload === "string") {
          try {
            parsedPayload = JSON.parse(payload);
          } catch (e) {
            // إذا فشل parsing، ارجعها كـ string
            return payload;
          }
        }

        // استخراج label_link من print_results (شكل OmniLama الجديد)
        if (
          parsedPayload?.data?.print_results &&
          Array.isArray(parsedPayload.data.print_results) &&
          parsedPayload.data.print_results.length > 0
        ) {
          const firstResult = parsedPayload.data.print_results[0];
          if (firstResult?.label_link) {
            console.log(
              "✅ [Controller] تم العثور على label_link:",
              firstResult.label_link
            );
            return firstResult.label_link;
          }
        }

        // استخراج من data.print_results مباشرة
        if (
          parsedPayload?.print_results &&
          Array.isArray(parsedPayload.print_results) &&
          parsedPayload.print_results.length > 0
        ) {
          const firstResult = parsedPayload.print_results[0];
          if (firstResult?.label_link) {
            console.log(
              "✅ [Controller] تم العثور على label_link (مباشر):",
              firstResult.label_link
            );
            return firstResult.label_link;
          }
        }

        // طرق أخرى للاستخراج (للتوافق مع الأشكال القديمة)
        if (typeof parsedPayload?.data === "string") return parsedPayload.data;
        if (typeof parsedPayload?.data?.label === "string")
          return parsedPayload.data.label;
        if (typeof parsedPayload?.data?.url === "string")
          return parsedPayload.data.url;
        if (typeof parsedPayload?.data?.file === "string")
          return parsedPayload.data.file;
        if (typeof parsedPayload?.data?.label_link === "string")
          return parsedPayload.data.label_link;
        if (typeof parsedPayload?.label === "string")
          return parsedPayload.label;
        if (typeof parsedPayload?.url === "string") return parsedPayload.url;
        if (typeof parsedPayload?.file === "string") return parsedPayload.file;
        if (typeof parsedPayload?.label_link === "string")
          return parsedPayload.label_link;

        return null;
      };
      const label = extractLabel(invoiceResult);
      console.log("🏷️ [Controller] البوليصة المستخرجة:", {
        trackingNumber,
        hasLabel: !!label,
        labelType: typeof label,
        labelLength: label ? label.length : 0,
        labelPreview: label
          ? typeof label === "string"
            ? label.substring(0, 200)
            : JSON.stringify(label).substring(0, 200)
          : null,
      });

      if (!label) {
        console.log("⚠️ [Controller] البوليصة غير جاهزة بعد:", {
          trackingNumber,
          invoiceResult: JSON.stringify(invoiceResult, null, 2),
        });
        return res.status(202).json({
          status: "pending",
          message:
            "بوليصة Omniclama غير جاهزة بعد. سيتم إعادة المحاولة لاحقًا.",
        });
      }

      await Shapment.findOneAndUpdate(
        { trackingId: trackingNumber },
        { $set: { "omniclamaResponse.label": label } },
        { new: true }
      );

      console.log("💾 [Controller] تم حفظ البوليصة في قاعدة البيانات:", {
        trackingNumber,
        labelSaved: true,
      });
    }

    // 5. إرجاع نتيجة طباعة الفاتورة
    res.status(200).json({
      status: "success",
      message: "تم جلب البوليصة بنجاح",
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
Query params: page, itemsPerPage|limit, search, dateFrom, dateTo, status, source, carrier
search: يطابق رقم التتبع، رقم الشحنة، اسم العميل/الوجهة، رقم الجوال
*/
module.exports.getCustomerShipments = asyncHandler(async (req, res, next) => {
  try {
    const customerId = req.customer._id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit =
      parseInt(req.query.limit, 10) ||
      parseInt(req.query.itemsPerPage, 10) ||
      10;
    const skip = (page - 1) * limit;
    const search = (req.query.search || "").trim();
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;
    const status = req.query.status;
    const source = req.query.source;
    const carrier = req.query.carrier;

    const filter = { customerId };

    // البحث: رقم التتبع، رقم الشحنة، اسم العميل/الوجهة، الجوال
    if (search) {
      const searchConditions = [
        { trackingId: { $regex: search, $options: "i" } },
        { "senderAddress.full_name": { $regex: search, $options: "i" } },
        { "senderAddress.city": { $regex: search, $options: "i" } },
        { "senderAddress.country": { $regex: search, $options: "i" } },
        { "senderAddress.address": { $regex: search, $options: "i" } },
        { "senderAddress.mobile": { $regex: search, $options: "i" } },
      ];
      if (mongoose.Types.ObjectId.isValid(search) && String(new mongoose.Types.ObjectId(search)) === search) {
        searchConditions.push({ _id: new mongoose.Types.ObjectId(search) });
      }
      filter.$and = [{ $or: searchConditions }];
    }

    // فلترة حسب التاريخ
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // فلترة حسب الحالة
    if (status && status !== "all") {
      const statusLower = status.toLowerCase();
      if (statusLower === "active") {
        filter.shipmentstates = { $in: ["IN_TRANSIT", "READY_FOR_PICKUP"] };
      } else {
        const statusMap = {
          delivered: "Delivered",
          transit: "IN_TRANSIT",
          processing: "READY_FOR_PICKUP",
          ready: "READY_FOR_PICKUP",
          cancel: "Canceled",
          canceled: "Canceled",
        };
        const dbStatus = statusMap[statusLower] || status;
        filter.shipmentstates = dbStatus;
      }
    }

    if (source && source !== "all") {
      filter.orderSou = source;
    }
    if (carrier && carrier !== "all") {
      filter.shapmentCompany = carrier;
    }

    const shipments = await Shapment.find(filter)
      .populate("customerId", "firstName lastName email phone")
      .populate("receiverAddress")
      .populate("orderId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Shapment.countDocuments(filter);

    res.status(200).json({
      status: "success",
      results: shipments.length,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit) || 1,
        totalItems: total,
        itemsPerPage: limit,
      },
      data: shipments,
    });
  } catch (error) {
    console.error("Error fetching customer shipments:", error);
    res.status(500).json({
      status: "error",
      message: "حدث خطأ أثناء جلب الشحنات",
      error: error.message,
    });
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

    // البحث عن الشحنة باستخدام _id أو trackingNumber أو trackingId
    const shipment = await Shapment.findOne({
      $or: [
        { _id: id, customerId },
        { trackingNumber: id, customerId },
        { trackingId: id, customerId },
      ],
    })
      .populate("customerId", "firstName lastName email phone")
      .populate("receiverAddress")
      .populate("orderId");

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
// @desc    Get shipment statistics for the logged-in customer
// @route   GET /api/shipments/statistics
// @access  Private
module.exports.getShipmentStatistics = asyncHandler(async (req, res, next) => {
  try {
    // Get customer ID from the authenticated request
    const customerId = req.customer._id;

    // Get today's start and end
    const todayStart = moment().startOf("day");
    const todayEnd = moment().endOf("day");

    // Get yesterday's start and end for growth calculation
    const yesterdayStart = moment().subtract(1, "days").startOf("day");
    const yesterdayEnd = moment().subtract(1, "days").endOf("day");

    // Base query for customer's shipments
    const customerQuery = { customerId };

    // Get total shipments for the customer
    const totalShipments = await Shapment.countDocuments(customerQuery);

    // Get today's shipments for the customer
    const todaysShipments = await Shapment.countDocuments({
      ...customerQuery,
      createdAt: {
        $gte: todayStart.toDate(),
        $lte: todayEnd.toDate(),
      },
    });

    // Get received shipments (Delivered) for the customer
    const receivedShipments = await Shapment.countDocuments({
      ...customerQuery,
      shipmentstates: "Delivered",
    });

    // Get canceled shipments for the customer
    const canceledShipments = await Shapment.countDocuments({
      ...customerQuery,
      shipmentstates: "Canceled",
    });

    // Calculate growth rate for the customer
    const yesterdayShipments = await Shapment.countDocuments({
      ...customerQuery,
      createdAt: {
        $gte: yesterdayStart.toDate(),
        $lte: yesterdayEnd.toDate(),
      },
    });

    const growthRate =
      yesterdayShipments > 0
        ? ((todaysShipments - yesterdayShipments) / yesterdayShipments) * 100
        : todaysShipments > 0
        ? 100
        : 0;

    res.status(200).json({
      success: true,
      data: {
        totalShipments,
        todaysShipments,
        receivedShipments,
        canceledShipments,
        growthRate: parseFloat(growthRate.toFixed(2)),
      },
    });
  } catch (error) {
    return next(
      new ApiEror(error.message || "حدث خطأ أثناء جلب إحصائيات الشحنات", 500)
    );
  }
});

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
// Unified webhook for shipment status updates
module.exports.webhookUpdateShipmentStatus = asyncHandler(
  async (req, res, next) => {
    try {
      const { trackingNumber, newStatus, company } = req.body;
      if (!trackingNumber || !newStatus || !company) {
        return res.status(400).json({
          error: "trackingNumber, newStatus, and company are required",
        });
      }
      // Find shipment by trackingId and company
      const shipment = await Shapment.findOne({
        trackingId: trackingNumber,
        shapmentCompany: company,
      });
      if (!shipment) {
        return res.status(404).json({ error: "Shipment not found" });
      }
      shipment.shipmentstates = newStatus;
      await shipment.save();
      // --- Send notification on status update ---
      try {
        const Notification = require("../models/notificationModel");
        await Notification.create({
          customerId: shipment.customerId,
          type: "order",
          message: `تم تحديث حالة الشحنة رقم ${shipment._id} إلى: ${newStatus}`,
        });
      } catch (e) {
        console.error("Notification error:", e.message);
      }
      res
        .status(200)
        .json({ success: true, message: "Shipment status updated", shipment });
    } catch (error) {
      return next(
        new ApiEror(error.message || "خطأ في تحديث حالة الشحنة", 500)
      );
    }
  }
);

module.exports.getShipmentsStats = asyncHandler(async (req, res, next) => {
  try {
    const customerId = req.customer._id;

    const statsPipeline = [
      { $match: { customerId } },
      {
        $addFields: {
          statusUpper: {
            $toUpper: {
              $ifNull: ["$shipmentstates", ""],
            },
          },
          totalValueCalc: {
            $ifNull: [
              "$totalprice",
              {
                $add: [
                  { $ifNull: ["$shapmentPrice.basePrice", 0] },
                  { $ifNull: ["$shapmentPrice.profitPrice", 0] },
                  { $ifNull: ["$shapmentPrice.basepickUpPrice", 0] },
                  { $ifNull: ["$shapmentPrice.profitpickUpPrice", 0] },
                  { $ifNull: ["$shapmentPrice.baseCODfees", 0] },
                  { $ifNull: ["$shapmentPrice.profitCODfees", 0] },
                  { $ifNull: ["$shapmentPrice.baseAdditionalweigth", 0] },
                  { $ifNull: ["$shapmentPrice.profitAdditionalweigth", 0] },
                  { $ifNull: ["$shapmentPrice.baseRTOprice", 0] },
                  { $ifNull: ["$shapmentPrice.profitRTOprice", 0] },
                  { $ifNull: ["$shapmentPrice.byocPrice", 0] },
                ],
              },
            ],
          },
          shippingCostCalc: {
            $add: [
              { $ifNull: ["$shapmentPrice.basePrice", 0] },
              { $ifNull: ["$shapmentPrice.basepickUpPrice", 0] },
              { $ifNull: ["$shapmentPrice.baseRTOprice", 0] },
              { $ifNull: ["$shapmentPrice.baseAdditionalweigth", 0] },
              { $ifNull: ["$shapmentPrice.baseCODfees", 0] },
              { $ifNull: ["$shapmentPrice.byocPrice", 0] },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalShipments: { $sum: 1 },
          totalValue: { $sum: "$totalValueCalc" },
          totalShippingCost: { $sum: "$shippingCostCalc" },
          pendingShipments: {
            $sum: {
              $cond: [
                {
                  $in: ["$statusUpper", ["READY_FOR_PICKUP", "PENDING"]],
                },
                1,
                0,
              ],
            },
          },
          deliveredShipments: {
            $sum: {
              $cond: [{ $eq: ["$statusUpper", "DELIVERED"] }, 1, 0],
            },
          },
          inTransitShipments: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$statusUpper",
                    [
                      "IN_TRANSIT",
                      "IN TRANSIT",
                      "OUT_FOR_DELIVERY",
                      "OUT FOR DELIVERY",
                    ],
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ];

    const [stats] = await Shapment.aggregate(statsPipeline);

    const shipperStats = await Shapment.aggregate([
      { $match: { customerId } },
      {
        $group: {
          _id: { $ifNull: ["$shapmentCompany", "غير محدد"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const result = {
      totalShipments: stats?.totalShipments || 0,
      totalValue: stats?.totalValue || 0,
      totalShippingCost: stats?.totalShippingCost || 0,
      pendingShipments: stats?.pendingShipments || 0,
      deliveredShipments: stats?.deliveredShipments || 0,
      inTransitShipments: stats?.inTransitShipments || 0,
      shipperBreakdown: shipperStats.map((entry) => ({
        _id: entry._id,
        count: entry.count,
      })),
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

/**
 * الحصول على قائمة مكاتب SMSA
 * METHOD: GET
 * PATH: /shipment/smsa-offices
 */
module.exports.getSMSAOffices = asyncHandler(async (req, res, next) => {
  try {
    const offices = await smsaExxpress.getSMSAOffices();
    res.status(200).json({
      status: "success",
      data: offices,
    });
  } catch (error) {
    return next(
      new ApiEror(`فشل في جلب قائمة مكاتب SMSA: ${error.message}`, 500)
    );
  }
});
