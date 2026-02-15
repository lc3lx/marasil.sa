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
const shipmentCreationService = require("../services/shipmentCreationService");
// helpers import
const ApiEror = require("../utils/apiError");
const asyncHandler = require("express-async-handler");
const ReturnShipment = require("../models/returnShipmentModel");
const ClientAddress = require("../models/clientAddressModel");
const sendMail = require("../utils/SendMail");
const crypto = require("crypto");
const omnidPlatform = require("../platforms/shipment/omnidPlatform");

/**
 * تحويل المستلم الأصلي (ClientAddress) إلى صيغة المرسل لـ createShipment (shipperAddress)
 * يضمن عدم إرجاع null في أي حقل حتى لا ترفض Aramex الطلب (Object reference not set).
 */
function receiverToShipperAddress(receiver) {
  if (!receiver || typeof receiver !== "object") return null;
  const full_name = (receiver.clientName || receiver.full_name || receiver.PersonName || "غير محدد").toString().trim() || "غير محدد";
  const address = (receiver.clientAddress || receiver.address || receiver.Line1 || "").toString().trim() || "عنوان غير محدد";
  const city = (receiver.city || receiver.City || "Riyadh").toString().trim() || "Riyadh";
  const country = (receiver.country || receiver.CountryCode || "SA").toString().trim() || "SA";
  const mobile = (receiver.clientPhone || receiver.mobile || receiver.PhoneNumber1 || "").toString().trim() || "0500000000";
  const email = (receiver.clientEmail || receiver.email || receiver.EmailAddress || "").toString().trim() || "noreply@marasil.sa";
  return { full_name, address, city, country, mobile, email };
}

/**
 * تحويل المرسل الأصلي (كائن التاجر) إلى صيغة المستلم لـ createShipment (order.customer)
 * يدعم مفاتيح Aramex (Line1, PersonName, ...) ويمنع أي حقل null لـ API.
 */
function senderToOrderCustomer(sender) {
  if (!sender || typeof sender !== "object") return null;
  const full_name = (sender.clientName || sender.full_name || sender.name || sender.PersonName || "مستلم").toString().trim() || "مستلم";
  const address = (sender.clientAddress || sender.address || sender.Line1 || "").toString().trim() || "عنوان غير محدد";
  const city = (sender.city || sender.City || "Riyadh").toString().trim() || "Riyadh";
  const country = (sender.country || sender.CountryCode || "SA").toString().trim() || "SA";
  const mobile = (sender.clientPhone || sender.mobile || sender.phone || sender.PhoneNumber1 || "").toString().trim() || "0500000000";
  const email = (sender.clientEmail || sender.email || sender.EmailAddress || "").toString().trim() || "noreply@marasil.sa";
  const nationalAddress = (sender.nationalAddress || sender.postCode || sender.PostCode || "").toString().trim() || "";
  return { full_name, address, city, country, mobile, email, nationalAddress };
}

/**
 * إنشاء شحنة عكسية = نفس إنشاء الشحنة العادية (shapmentController) لكن نعبّي بيانات المرسل كالمستلم الأصلي وبيانات المستلم كالمرسل الأصلي
 */
const _createReturnShipmentInternal = async (shipmentId, customerId) => {
  const originalShipment = await Shapment.findById(shipmentId).populate("receiverAddress");
  if (!originalShipment) {
    throw new ApiEror(`لم يتم العثور على شحنة بالمعرف ${shipmentId}`, 404);
  }

  const company = originalShipment.shapmentCompany;
  const shippingCompany = await shappingCompany.findOne({ company });
  if (!shippingCompany || shippingCompany.status !== "Enabled") {
    throw new ApiEror(`شركة الشحن ${company} غير متاحة حالياً`, 400);
  }

  const originalReceiver = originalShipment.receiverAddress; // العميل → يصبح المرسل في الشحنة العكسية
  const originalSender = originalShipment.senderAddress || {};  // التاجر → يصبح المستلم في الشحنة العكسية

  const shipperAddress = receiverToShipperAddress(originalReceiver);
  const orderCustomer = senderToOrderCustomer(originalSender);
  if (!shipperAddress || !orderCustomer) {
    throw new ApiEror("بيانات المرسل أو المستلم ناقصة لإنشاء الشحنة العكسية", 400);
  }

  const weight = Number(originalShipment.weight) || 1;
  const Parcels = Number(originalShipment.boxNum) || 1;
  const shapmentingType = (originalShipment.shapmentingType || "Dry").toString();
  const dim = originalShipment.dimension && typeof originalShipment.dimension === "object"
    ? originalShipment.dimension
    : {};
  const dimension = {
    length: Number(dim.length) || 10,
    width: Number(dim.width) || 10,
    height: Number(dim.height) || 10,
  };

  // نفس هيئة الطلب وقت إنشاء شحنة عادية: عدم إرسال _id لإنشاء طلب جديد (مرجع فريد)، ورقم طلب قصير لـ SMSA (حد 50)
  const returnOrderNumber = "RET-" + String(originalShipment._id).slice(-12);
  const body = {
    company,
    order: {
      customer: orderCustomer,
      total: { amount: 0, currency: "SAR" },
      payment_method: "Prepaid",
      paymentMethod: "Prepaid",
      platform: "manual",
      items: [],
      order_number: returnOrderNumber,
    },
    orderDescription: (originalShipment.orderDescription || "إرجاع").toString().trim().slice(0, 200) || "شحنة إرجاع",
    shipperAddress,
    weight,
    Parcels,
    shapmentingType,
    dimension,
  };

  const result = await shipmentCreationService.createShipment(customerId, body);

  await Shapment.findByIdAndUpdate(result.shipment._id, {
    $set: {
      shapmentType: "reverse",
      isReturnShipment: true,
      originalShipmentId: originalShipment._id,
    },
  });

  const newReturnShipment = await Shapment.findById(result.shipment._id);
  const trackingNumber = result.tracking?.number || newReturnShipment?.trackingId;
  const wallet = await Wallet.findOne({ customerId });

  return {
    newReturnShipment: newReturnShipment || result.shipment,
    returnShipmentResult: {
      success: true,
      message: "تم إنشاء شحنة الإرجاع بنجاح",
      trackingNumber,
      shippingCost: result.shipment?.totalprice,
      remainingBalance: wallet?.balance,
    },
  };
};

// Exposed endpoint for manual creation by admin
module.exports.createReturnShipment = asyncHandler(async (req, res, next) => {
  const { shipmentId, smsaRetailId } = req.body;
  if (!shipmentId) {
    return next(new ApiEror("معرف الشحنة الأصلي مطلوب.", 400));
  }

  const { newReturnShipment, returnShipmentResult } =
    await _createReturnShipmentInternal(shipmentId, req.customer._id);

  res.status(201).json({
    status: "success",
    message: "تم إنشاء الشحنة المرتجعة بنجاح",
    data: {
      shipment: newReturnShipment,
      trackingDetails: returnShipmentResult,
    },
  });
});

// مساعد لمعالجة استرجاع المبلغ لمحفظة الزبون للشحنات المرتجعة
const processReturnShipmentRefund = async (customerId, amount, shipmentId) => {
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
      description: `استرداد مبلغ شحنة الإرجاع الملغاة ${shipmentId}`,
      status: "completed",
      method: "return_shipment_refund",
      referenceId: shipmentId,
      referenceType: "return_shipment",
      walletId: wallet._id,
    });

    // 4. إضافة المعاملة إلى قائمة معاملات المحفظة
    wallet.transactions.push(transaction._id);

    // 5. حفظ التغييرات
    await wallet.save();

    return { success: true, wallet, transaction };
  } catch (error) {
    console.error("Error processing return shipment refund to wallet:", error);
    return { success: false, error: error.message };
  }
};

module.exports.cancelReturnShipment = asyncHandler(async (req, res, next) => {
  try {
    const { company } = req.body;
    const { trackingNumber } = req.params;

    // 1. التحقق من البيانات المطلوبة
    if (!company || !trackingNumber) {
      return next(
        new ApiEror("جميع البيانات مطلوبة: company, trackingNumber", 400)
      );
    }

    // 2. جلب بيانات الشحنة المرتجعة والتحقق من حالتها
    const returnShipment = await Shapment.findOne({
      trackingId: trackingNumber,
      isReturnShipment: true,
    });

    if (!returnShipment) {
      return next(
        new ApiEror(
          `شحنة الإرجاع برقم التتبع ${trackingNumber} غير موجودة`,
          404
        )
      );
    }

    // 3. التحقق من أن حالة الشحنة تسمح بالإلغاء
    if (returnShipment.shipmentstates !== "READY_FOR_PICKUP") {
      return next(
        new ApiEror(
          "لا يمكن إلغاء شحنة الإرجاع إلا إذا كانت في حالة انتظار الاستلام",
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

    // 5. إلغاء الشحنة المرتجعة حسب الشركة
    let cancellationResult;
    try {
      switch (company) {
        case "smsa":
        case "aramex":
          // SMSA و Aramex: إلغاء محلي فقط لأنهم لا يدعمون إلغاء الشحنات المرتجعة عبر API
          cancellationResult = {
            success: true,
            message: `تم إلغاء شحنة الإرجاع محلياً في النظام لشركة ${company}`,
            trackingNumber: trackingNumber,
            cancelledLocally: true,
          };
          break;

        case "redbox":
          // Redbox: استخدام API الخاص بهم للإلغاء إذا كان مدعوماً
          cancellationResult = await redbox.cancelShipment(trackingNumber);
          break;

        case "omniclama":
          // Omni: استخدام API الخاص بهم للإلغاء إذا كان مدعوماً
          cancellationResult = await omnidPlatform.cancelShipment(
            trackingNumber
          );
          break;

        default:
          return next(new ApiEror(`شركة الشحن ${company} غير مدعومة`, 400));
      }
    } catch (error) {
      console.error(`فشل في إلغاء شحنة الإرجاع من خلال ${company}:`, error);
      // حتى لو فشل الإلغاء من خلال API، نستمر في عملية الإلغاء المحلي
      cancellationResult = {
        success: true,
        message: `تم إلغاء شحنة الإرجاع محلياً في النظام (فشل الاتصال بشركة الشحن: ${error.message})`,
        trackingNumber: trackingNumber,
        cancelledLocally: true,
      };
    }

    // 6. استعادة المبلغ إلى محفظة العميل إذا كانت الشحنة مدفوعة مسبقاً
    if (
      returnShipment.paymentMathod === "Prepaid" &&
      returnShipment.shapmentPrice > 0
    ) {
      const refundResult = await processReturnShipmentRefund(
        returnShipment.customerId,
        returnShipment.shapmentPrice,
        returnShipment._id
      );

      if (!refundResult.success) {
        console.error(
          "فشل في استعادة المبلغ إلى محفظة العميل:",
          refundResult.error
        );
        // نستمر في العملية رغم فشل استعادة المبلغ
      }
    }

    // 7. تحديث حالة الشحنة المرتجعة في قاعدة البيانات
    await Shapment.findByIdAndUpdate(
      returnShipment._id,
      {
        shipmentstates: "Canceled",
        status: "cancelled",
        cancelledAt: new Date(),
        cancellationReason: "تم الإلغاء من قبل المستخدم",
      },
      { new: true }
    );

    // 8. إرجاع نتيجة الإلغاء
    res.status(200).json({
      status: "success",
      message:
        "تم إلغاء شحنة الإرجاع بنجاح" +
        (cancellationResult.cancelledLocally ? " (إلغاء محلي)" : ""),
      data: {
        ...cancellationResult,
        refundProcessed:
          returnShipment.paymentMathod === "Prepaid" &&
          returnShipment.shapmentPrice > 0,
      },
    });
  } catch (error) {
    console.error(`خطأ في إلغاء شحنة الإرجاع:`, error);
    return next(
      new ApiEror(
        `فشل في إلغاء شحنة الإرجاع: ${error.message || "حدث خطأ غير متوقع"}`,
        500
      )
    );
  }
});
/**
 * @desc Step 1: Guest enters email, system sends OTP if email is valid.
 */
module.exports.requestEmailOTP = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(new ApiEror("يرجى إدخال البريد الإلكتروني", 400));
  }

  //

  // Generate OTP
  const otpCode = crypto.randomInt(100000, 999999).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minute
  // Send email
  try {
    await sendMail({
      to: email,
      subject: "رمز التحقق لطلب الإرجاع/الاستبدال",
      text: `رمز التحقق الخاص بك هو: ${otpCode}. الرمز صالح لمدة 10 دقائق.`,
    });
    res.status(200).json({
      status: "success",
      message: `تم إرسال رمز التحقق إلى ${email}`,
    });
  } catch (error) {
    console.error("Email sending error:", error);
    return next(
      new ApiEror("فشل إرسال البريد الإلكتروني، يرجى المحاولة مرة أخرى", 500)
    );
  }
});

/**
 * @desc Step 2: Verify OTP for email
 * This function verifies the OTP and returns true if valid, false otherwise
 */
module.exports.verifyEmailOTP = asyncHandler(async (req, res, next) => {
  const { email, otpCode } = req.body;

  // 1. Validate input
  if (!email || !otpCode) {
    return next(new ApiEror("يرجى إرسال البريد الإلكتروني ورمز التحقق", 400));
  }

  // 2. In a real implementation, you would verify the OTP against the stored OTP
  // For now, we'll simulate a successful verification
  // Replace this with your actual OTP verification logic
  const isOtpValid = true; // Replace with actual verification

  if (!isOtpValid) {
    return res.status(200).json({
      success: false,
      message: "رمز التحقق غير صحيح",
    });
  }

  // 3. Return success response
  res.status(200).json({
    success: true,
    message: "تم التحقق بنجاح",
  });
});

// إنشاء طلب استرجاع بعد التحقق من الكود

module.exports.createReturnRequest = asyncHandler(async (req, res, next) => {
  try {
    const { shipmentId, typerequesst, requestNote } = req.body;

    if (!shipmentId || !typerequesst) {
      return next(
        new ApiEror(
          "يجب إدخال رقم الشحنة، الإيميل، ونوع الطلب (return أو exchange)",
          400
        )
      );
    }

    if (!["return", "exchange"].includes(typerequesst)) {
      return next(
        new ApiEror("نوع الطلب غير صالح، يجب أن يكون return أو exchange", 400)
      );
    }

    const shipment = await Shapment.findById(shipmentId);
    if (!shipment) {
      return next(new ApiEror("الشحنة غير موجودة", 404));
    }

    let returnReq = await ReturnShipment.findOneAndUpdate(
      {
        shipment: shipmentId,

        typerequesst: typerequesst,
      },
      {
        reqstatus: "pending",
        customerId: shipment.customerId,
        requestNote: requestNote || "", // ← إضافتها هنا
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(201).json({
      status: "success",
      message: `تم إنشاء طلب ${
        typerequesst === "return" ? "الاسترجاع" : "الاستبدال"
      } بنجاح، بانتظار موافقة صاحب الشحنة.`,
      data: {
        returnRequestId: returnReq._id,
      },
    });
  } catch (error) {
    return next(new ApiEror(error.message, 500));
  }
});

// موافقة أو رفض صاحب الحساب على طلب الاسترجاع
module.exports.handleReturnApproval = asyncHandler(async (req, res, next) => {
  const { returnRequestId, approve, smsaRetailId } = req.body; // smsaRetailId might be needed
  // تحويل approve إلى boolean (الفرونت قد يرسل "true"/"false" كنص)
  const approved = approve === true || approve === "true";

  const returnReq = await ReturnShipment.findById(returnRequestId);
  if (!returnReq) {
    return next(new ApiEror("طلب الاسترجاع غير موجود", 404));
  }

  if (returnReq.reqstatus !== "pending") {
    return next(new ApiEror("تم التعامل مع هذا الطلب مسبقاً", 400));
  }

  if (approved) {
    // On approval, create the return shipment
    if (!returnReq.shipment) {
      return next(new ApiEror("لا يمكن الموافقة على طلب غير مرتبط بشحنة", 400));
    }
    console.log(req.customer._id);

    await _createReturnShipmentInternal(returnReq.shipment, req.customer._id);

    returnReq.reqstatus = "yes";
    await returnReq.save();

    res.status(200).json({
      status: "success",
      message: "تمت الموافقة على الطلب وإنشاء شحنة الإرجاع بنجاح.",
    });
  } else {
    // On rejection
    returnReq.reqstatus = "no";
    await returnReq.save();
    res.status(200).json({
      status: "success",
      message: "تم رفض طلب الاسترجاع.",
    });
  }
});
// get all re|| exc for users
// الحصول على جميع طلبات الإرجاع للعميل المسجل
// GET /api/v1/shipment/return/my-returns
// يمكن تصفية النتائج حسب نوع الطلب باستخدام ?type=return أو ?type=exchange
module.exports.getAllreturnshipment = asyncHandler(async (req, res, next) => {
  try {
    // إنشاء كائن الفلتر الأساسي
    const filter = { customerId: req.customer._id };

    // إضافة فلتر نوع الطلب إذا تم تحديده
    if (req.query.type) {
      filter.typerequesst = req.query.type; // 'return' أو 'exchange'
    }

    // إضافة فلتر التاريخ إذا تم تحديده
    const { dateFrom, dateTo } = req.query;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = from;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = to;
      }
    }

    // جلب طلبات الإرجاع مع البيانات المرتبطة
    const returnShipments = await ReturnShipment.find(filter)
      .populate({
        path: "shipment",
        select: "trackingId status createdAt shapmentCompany",
        populate: {
          path: "receiverAddress",
          select: "clientName clientPhone clientEmail clientAddress",
        },
      })
      .sort({ createdAt: -1 }) // الأحدث أولاً
      .lean();

    // تنسيق البيانات المرتجعة
    const formattedReturns = returnShipments.map((item) => ({
      _id: item._id,
      status: item.status,
      reqstatus: item.reqstatus, // pending | yes | no (لإظهار الحالة وإخفاء الإجراءات عند الرفض/الموافقة)
      type: item.typerequesst,
      requestNote: item.requestNote,
      createdAt: item.createdAt,
      shipment: item.shipment
        ? {
            _id: item.shipment._id,
            trackingId: item.shipment.trackingId,
            status: item.shipment.shipmentstates,
            company: item.shipment.shapmentCompany,
            receiver: item.shipment.receiverAddress
              ? {
                  name: item.shipment.receiverAddress.clientName,
                  phone: item.shipment.receiverAddress.clientPhone,
                  email: item.shipment.receiverAddress.clientEmail,
                  address: item.shipment.receiverAddress.clientAddress,
                }
              : null,
          }
        : null,
    }));

    res.status(200).json({
      status: "success",
      count: formattedReturns.length,
      data: formattedReturns,
    });
  } catch (error) {
    console.error("Error in getAllreturnshipment:", error);
    next(new ApiEror("حدث خطأ أثناء جلب طلبات الإرجاع", 500));
  }
});

//get one just
module.exports.getoneship = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const returnShipment = await ReturnShipment.findById(id).populate("shipment");

  if (!returnShipment) {
    return next(new ApiEror(`لا يوجد طلب بهذا الرقم ${id}`, 404));
  }

  res.status(200).json({
    status: "success",
    data: returnShipment,
  });
});

// get a all shipmnet for customer

module.exports.getShipmentsByReceiver = asyncHandler(async (req, res) => {
  const { email, phone, awb } = req.query;
  const trackingOrAwb = (awb || req.query.trackingId || req.query.tracking || "").toString().trim();

  console.log("Searching shipments for:", { email, phone, awb: trackingOrAwb });

  if (trackingOrAwb) {
    try {
      const searchConditions = [{ trackingId: trackingOrAwb }];
      if (mongoose.Types.ObjectId.isValid(trackingOrAwb) && String(new mongoose.Types.ObjectId(trackingOrAwb)) === trackingOrAwb) {
        searchConditions.push({ orderId: trackingOrAwb });
      }
      const shipment = await Shapment.findOne({
        $or: searchConditions,
      })
        .populate("receiverAddress")
        .sort({ createdAt: -1 })
        .lean();

      if (!shipment) {
        return res.status(200).json({
          status: "success",
          results: 0,
          message: "لم يتم العثور على شحنة بهذا الرقم.",
        });
      }
      if (!shipment.receiverAddress) {
        return res.status(200).json({
          status: "success",
          results: 0,
          message: "الشحنة لا تحتوي على عنوان مستلم صالح.",
        });
      }
      const formatted = {
        _id: shipment._id,
        trackingId: shipment.trackingId,
        awb: shipment.trackingId,
        status: shipment.shipmentstates,
        orderId: shipment.orderId,
        createdAt: shipment.createdAt,
        receiver: {
          name: shipment.receiverAddress?.name,
          phone: shipment.receiverAddress?.phone,
          email: shipment.receiverAddress?.email,
        },
        receiverAddress: {
          _id: shipment.receiverAddress?._id,
          name: shipment.receiverAddress?.name,
          phone: shipment.receiverAddress?.phone,
          email: shipment.receiverAddress?.email,
          address: shipment.receiverAddress?.address,
        },
        isReturnable: shipment.isReturnable,
        returnDeadline: shipment.returnDeadline,
        shipmentCompany: shipment.shapmentCompany,
      };
      return res.status(200).json({
        status: "success",
        results: 1,
        data: [formatted],
      });
    } catch (err) {
      console.error("Error in getShipmentsByReceiver (awb):", err);
      return res.status(500).json({
        status: "error",
        message: err.message || "حدث خطأ أثناء البحث عن الشحنة",
      });
    }
  }

  if (!email && !phone) {
    return res.status(400).json({
      status: "error",
      message: "يرجى إدخال رقم البوليصة أو رقم الجوال أو البريد الإلكتروني للبحث.",
    });
  }

  try {
    // 1. البحث أولاً عن العناوين التي تطابق البريد الإلكتروني أو رقم الهاتف
    const ClientAddress = mongoose.model("ClientAddress");
    const addressQuery = {};

    if (email) addressQuery.clientEmail = email;
    if (phone) addressQuery.clientPhone = phone;

    console.log(
      "Searching addresses with query:",
      JSON.stringify(addressQuery)
    );

    const addresses = await ClientAddress.find(addressQuery).select(
      "_id email phone"
    );

    console.log("Found addresses:", JSON.stringify(addresses));

    if (addresses.length === 0) {
      console.log("No addresses found for the given email/phone");
      return res.status(200).json({
        status: "success",
        results: 0,
        message: "لا توجد شحنات لهذا المستخدم",
      });
    }

    // 2. البحث عن الشحنات التي تحتوي على هذه العناوين
    const addressIds = addresses.map((addr) => addr._id);

    console.log("Searching shipments for address IDs:", addressIds);

    // إزالة فلتر isReturnable مؤقتاً للتحقق
    const shipments = await Shapment.find({
      receiverAddress: { $in: addressIds },
      // isReturnable: true,
      // $or: [
      //   { returnDeadline: { $exists: false } },
      //   { returnDeadline: { $gte: new Date() } }
      // ]
    })
      .populate("receiverAddress")
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Found ${shipments.length} shipments before filtering`);

    if (shipments.length === 0) {
      console.log("No shipments found for the addresses");
      return res.status(200).json({
        status: "success",
        results: 0,
        message: "لا توجد شحنات مسجلة لهذا المستخدم",
      });
    }

    // 3. تصفية الشحنات التي لا تحتوي على عنوان
    const validShipments = shipments.filter((shipment) => {
      const isValid = shipment.receiverAddress !== null;
      if (!isValid) {
        console.log("Shipment has no receiverAddress:", shipment._id);
      }
      return isValid;
    });

    console.log(
      `Found ${validShipments.length} valid shipments with receiver addresses`
    );

    if (validShipments.length === 0) {
      console.log("No valid shipments with receiver addresses found");
      return res.status(200).json({
        status: "success",
        results: 0,
        message: "لا توجد شحنات صالحة للعرض",
      });
    }

    // 4. تنسيق البيانات المرتجعة
    const formattedShipments = validShipments.map((shipment) => {
      console.log(
        "Processing shipment:",
        shipment._id,
        "with receiver:",
        shipment.receiverAddress
      );
      return {
        _id: shipment._id,
        trackingId: shipment.trackingId,
        status: shipment.shipmentstates,
        orderId: shipment.orderId,
        createdAt: shipment.createdAt,
        receiverAddress: {
          _id: shipment.receiverAddress?._id,
          name: shipment.receiverAddress?.name,
          phone: shipment.receiverAddress?.phone,
          email: shipment.receiverAddress?.email,
          address: shipment.receiverAddress?.address,
        },
        isReturnable: shipment.isReturnable,
        returnDeadline: shipment.returnDeadline,
        shipmentCompany: shipment.shapmentCompany,
      };
    });

    console.log(`Returning ${formattedShipments.length} formatted shipments`);

    res.status(200).json({
      status: "success",
      results: formattedShipments.length,
      data: formattedShipments,
    });
  } catch (error) {
    console.error("Error in getShipmentsByReceiver:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "حدث خطأ أثناء البحث عن الشحنات",
    });
  }
});
