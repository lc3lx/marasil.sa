/**
 * خدمة إنشاء الشحنة - نفس منطق صفحة create-shipment في الفرونت
 * يستخدمها: shapmentController (API) و aiServices (مساعد AI)
 */
const mongoose = require("mongoose");
const Shapment = require("../models/shipmentModel");
const Order = require("../models/Order");
const shappingCompany = require("../models/shipping_company");
const Wallet = require("../models/walletModel");
const Transaction = require("../models/transactionModel");
const smsaExxpress = require("../platforms/shipment/smsaExpressPlatform");
const redbox = require("../platforms/shipment/redboxPlatform");
const aramex = require("../platforms/shipment/aramexPlatform");
const omin = require("../platforms/shipment/omnidPlatform");
const { shipmentnorm } = require("./shipmentAccount");
const smsaServers = require("./smsaService");
const redboxServers = require("./redboxSeervice");
const ominServers = require("./omnicServices");
const aramxServers = require("./AramexService");
const ApiEror = require("../utils/apiError");

const normalizeDimensionInput = (dimension = {}) => {
  const toNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };
  const length = toNumber(dimension.length ?? dimension.Length ?? dimension.long ?? dimension.Long) || 0;
  const width = toNumber(dimension.width ?? dimension.Width ?? dimension.Wide) || 0;
  const height = toNumber(dimension.height ?? dimension.Height ?? dimension.high ?? dimension.High) || 0;
  if (!length && !width && !height) return { length: 0, width: 0, height: 0 };
  return { length, width, height };
};

/**
 * إنشاء شحنة بنفس منطق POST /shipment/createshipment (صفحة create-shipment)
 * @param {string} customerId - معرف العميل
 * @param {object} body - نفس جسم الطلب من الفرونت: company, order, shipperAddress, shapmentingType, weight, Parcels, dimension, orderDescription, senderOfficeCode?, recipientOfficeCode?
 * @returns {Promise<{ shipment, tracking, pickupRequest? }>}
 * @throws {ApiEror}
 */
async function createShipment(customerId, body) {
  const {
    company,
    order: orderInput,
    orderDescription,
    shipperAddress,
    weight,
    Parcels,
    shapmentingType,
    dimension,
    senderOfficeCode,
    recipientOfficeCode,
  } = body;

  if (!company || !orderInput || !shipperAddress || !shapmentingType || !weight || !Parcels) {
    throw new ApiEror("جميع البيانات مطلوبة: company, order, shipperAddress, shapmentingType, weight, Parcels", 400);
  }

  let orderToUse = orderInput;
  let newOrder = null;

  const paymentMethod = orderInput.paymentMethod || orderInput.payment_method || "COD";

  if (!orderInput._id) {
    newOrder = new Order({
      customer: {
        full_name: orderInput.customer?.full_name,
        email: orderInput.customer?.email,
        mobile: orderInput.customer?.mobile,
        address: orderInput.customer?.address,
        country: orderInput.customer?.country || "sa",
        city: orderInput.customer?.city,
        nationalAddress: orderInput.customer?.nationalAddress || "",
      },
      total: {
        amount: orderInput.total?.amount || 0,
        currency: orderInput.total?.currency || "SAR",
      },
      payment_method: paymentMethod,
      platform: orderInput.platform || "manual",
      store_id: orderInput.store_id || null,
      status: { name: "pending" },
      items: orderInput.items || [],
      created_at: new Date(),
    });
    await newOrder.save();
    orderToUse = newOrder.toObject();
    orderToUse._id = newOrder._id;
  }

  const shippingCompany = await shappingCompany.findOne({ company });
  if (!shippingCompany) {
    throw new ApiEror(`شركة الشحن ${company} غير موجودة`, 404);
  }
  if (shippingCompany.status !== "Enabled") {
    throw new ApiEror(`شركة الشحن ${company} غير مفعلة حالياً`, 400);
  }

  const normalizedDimension = normalizeDimensionInput(dimension);
  const hasValidDimension =
    normalizedDimension.length > 0 &&
    normalizedDimension.width > 0 &&
    normalizedDimension.height > 0;

  const MAX_DIMENSIONS = { length: 50, width: 50, height: 40 };
  if (hasValidDimension) {
    if (
      normalizedDimension.length > MAX_DIMENSIONS.length ||
      normalizedDimension.width > MAX_DIMENSIONS.width ||
      normalizedDimension.height > MAX_DIMENSIONS.height
    ) {
      throw new ApiEror(
        `أبعاد الصندوق تجاوزت الحد الأقصى المسموح به (${MAX_DIMENSIONS.length}×${MAX_DIMENSIONS.width}×${MAX_DIMENSIONS.height} سم). الأبعاد المرسلة: ${normalizedDimension.length}×${normalizedDimension.width}×${normalizedDimension.height} سم`,
        400
      );
    }
  }

  if (company === "omniclama" || company === "redbox") {
    if (!hasValidDimension) {
      throw new ApiEror("الطول والعرض والارتفاع مطلوبة", 400);
    }
    if (!Array.isArray(shippingCompany.allowedBoxSizes) || !shippingCompany.allowedBoxSizes.length) {
      throw new ApiEror("لم يتم ضبط أبعاد الصندوق المسموح به لشركة الشحن", 400);
    }
    const allowed = shippingCompany.allowedBoxSizes[0];
    const reqVolume =
      Number(normalizedDimension.length) * Number(normalizedDimension.width) * Number(normalizedDimension.height);
    const allowedVolume = Number(allowed.length) * Number(allowed.width) * Number(allowed.height);
    if (reqVolume > allowedVolume) {
      throw new ApiEror("الحجم يتجاوز الحد الأقصى المسموح به", 400);
    }
  }

  const shippingType = shippingCompany.shippingTypes.find((t) => t.type === shapmentingType);
  if (!shippingType) {
    throw new ApiEror(`نوع الشحن ${shapmentingType} غير متوفر مع ${company}`, 400);
  }

  if (weight > shippingType.denayWeight) {
    throw new ApiEror(`الوزن يتجاوز الحد الأقصى المسموح به (${shippingType.denayWeight} كجم)`, 400);
  }
  if (Parcels > shippingType.maxBoxes) {
    throw new ApiEror(`عدد الطرود يتجاوز الحد الأقصى المسموح به (${shippingType.maxBoxes})`, 400);
  }

  const dimensionPayload = hasValidDimension ? normalizedDimension : null;
  const orderWithWeight = {
    ...orderToUse,
    weight,
    paymentMethod: orderToUse.payment_method || paymentMethod,
    dimension: dimensionPayload,
  };
  const pricing = shipmentnorm(shippingType, orderWithWeight, company);
  orderToUse.dimension = dimensionPayload;

  const wallet = await Wallet.findOne({ customerId });
  if (!wallet) {
    throw new ApiEror("المحفظة غير موجودة", 404);
  }
  if (wallet.balance < pricing.total) {
    throw new ApiEror(
      `رصيدك الحالي (${wallet.balance} ريال) لا يكفي لإنشاء الشحنة. الرصيد المطلوب: ${pricing.total} ريال`,
      402
    );
  }

  let trackingInfo;
  let shipmentData;

  switch (company) {
    case "smsa":
      shipmentData = smsaServers.Shapmentdata(
        orderToUse,
        shipperAddress,
        weight,
        Parcels,
        orderDescription,
        shippingCompany.code,
        senderOfficeCode,
        recipientOfficeCode,
        dimensionPayload
      );
      const useOfficesKey = !!(senderOfficeCode || recipientOfficeCode);
      trackingInfo = await smsaExxpress.createShipment(shipmentData, useOfficesKey);
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
      if (trackingInfo && trackingInfo.success) {
        await Shapment.findByIdAndUpdate(orderInput._id, {
          $set: {
            redboxResponse: trackingInfo,
            trackingId: trackingInfo.tracking_number,
            shippingLabelUrl: trackingInfo.shipping_label_url,
            redboxShipmentId: trackingInfo.shipment_id,
          },
        }).catch(() => {});
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
        const pickupResult = await aramxServers.createPickupRequest(shipperAddress, {
          trackingNumber: trackingInfo.trackingNumber,
          numberOfPieces: Parcels || 6,
          weight,
          dimension: dimensionPayload || normalizedDimension || {},
          paymentType: "3",
        });
        trackingInfo.pickupRequest = pickupResult.success
          ? { pickupId: pickupResult.pickupId, scheduledDate: pickupResult.scheduledDate, message: pickupResult.message, success: true }
          : { success: false, error: pickupResult.error, message: pickupResult.message };
      } catch (err) {
        throw new ApiEror(`فشل في إنشاء الشحنة: ${err.message}`, 500);
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
        if (trackingInfo && trackingInfo.order_uid) {
          trackingInfo.trackingNumber = trackingInfo.order_uid;
        }
        if (!trackingInfo || !trackingInfo.trackingNumber) {
          throw new Error("فشل في الحصول على رقم التتبع");
        }
      } catch (err) {
        throw new ApiEror(`فشل في إنشاء الشحنة: ${err.message}`, 500);
      }
      break;
    default:
      throw new ApiEror(`شركة الشحن ${company} غير مدعومة`, 400);
  }

  const ClientAddress = mongoose.model("ClientAddress");
  const orderCustomer = (orderToUse && orderToUse.customer) || (orderInput && orderInput.customer) || {};
  const normalizedPhone = String(orderCustomer.mobile || "").trim();
  const normalizedAddress = String(orderCustomer.address || "").trim();
  const normalizedCity = String(orderCustomer.city || "").trim();
  const normalizedNationalAddress = String(orderCustomer.nationalAddress || "").trim();
  const addressQuery = {
    clientPhone: normalizedPhone,
    clientAddress: normalizedAddress,
    city: normalizedCity,
    customer: customerId,
  };
  if (normalizedNationalAddress) addressQuery.nationalAddress = normalizedNationalAddress;

  let address = await ClientAddress.findOne(addressQuery);
  if (!address) {
    address = await ClientAddress.create({
      clientName: orderCustomer.full_name,
      clientPhone: normalizedPhone,
      clientEmail: orderCustomer.email,
      clientAddress: normalizedAddress,
      country: orderCustomer.country || "sa",
      city: normalizedCity,
      nationalAddress: normalizedNationalAddress || undefined,
      customer: customerId,
    });
  }

  const apiResponses = {
    smsa: company === "smsa" ? trackingInfo : null,
    aramex: company === "aramex" ? trackingInfo : null,
    redbox: company === "redbox" ? trackingInfo : null,
    omniclama: company === "omniclama" ? trackingInfo : null,
  };

  const finalShipmentData = {
    receiverAddress: address._id,
    customerId,
    ordervalue: orderToUse.total?.amount || 0,
    orderId: orderToUse._id,
    senderAddress: shipperAddress,
    boxNum: Parcels,
    dimension: dimensionPayload || normalizedDimension || null,
    paymentMathod: (orderToUse.payment_method || paymentMethod) === "COD" ? "COD" : "Prepaid",
    shipmentstates: "READY_FOR_PICKUP",
    shapmentingType,
    shapmentCompany: company,
    trackingId: trackingInfo.trackingNumber,
    orderSou: orderInput.platform || "manual",
    storId: orderInput.store_id || null,
    weight,
    Parcels,
    smsaResponse: apiResponses.smsa || null,
    aramexResponse: apiResponses.aramex || null,
    redboxResponse: apiResponses.redbox || null,
    omniclamaResponse: apiResponses.omniclama || null,
    ...(trackingInfo.pickupRequest && {
      pickupRequest: {
        pickupId: trackingInfo.pickupRequest.pickupId,
        scheduledDate: trackingInfo.pickupRequest.scheduledDate,
        success: trackingInfo.pickupRequest.success,
        ...(trackingInfo.pickupRequest.error && { error: trackingInfo.pickupRequest.error }),
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

  const shipment = new Shapment(finalShipmentData);
  await shipment.save();

  wallet.balance = parseFloat((wallet.balance - pricing.total).toFixed(2));
  await wallet.save();

  await Transaction.create({
    customerId,
    type: "debit",
    amount: pricing.total,
    description: `دفع مقابل شحنة - رقم التتبع: ${trackingInfo.trackingNumber}`,
    status: "completed",
    method: "shipment_payment",
    referenceId: shipment._id.toString(),
    referenceType: "shipment",
    walletId: wallet._id,
  });

  if (orderInput._id) {
    await Order.findByIdAndUpdate(orderInput._id, { status: "shipped" }).catch(() => {});
  }

  return {
    shipment,
    tracking: {
      number: trackingInfo.trackingNumber,
      url: `${shippingCompany.trackingURL || ""}${trackingInfo.trackingNumber}`,
    },
    ...(trackingInfo.pickupRequest && {
      pickupRequest: {
        success: trackingInfo.pickupRequest.success,
        pickupId: trackingInfo.pickupRequest.pickupId,
        scheduledDate: trackingInfo.pickupRequest.scheduledDate,
        message: trackingInfo.pickupRequest.message,
        ...(trackingInfo.pickupRequest.error && { error: trackingInfo.pickupRequest.error }),
      },
    }),
  };
}

module.exports = {
  createShipment,
  normalizeDimensionInput,
};
