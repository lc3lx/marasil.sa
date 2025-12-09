const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Shapment = require("../models/shipmentModel");
const Transaction = require("../models/transactionModel");
const ShippingCompany = require("../models/shipping_company");

function getDateRange(period, dateFrom, dateTo) {
  const now = new Date();
  let start = null;
  let end = null;
  switch ((period || "month").toLowerCase()) {
    case "day":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = now;
      break;
    case "week":
      start = new Date(now);
      start.setDate(now.getDate() - 7);
      end = now;
      break;
    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      end = now;
      break;
    case "custom":
      if (dateFrom) start = new Date(dateFrom);
      if (dateTo) end = new Date(dateTo);
      break;
    case "month":
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = now;
      break;
  }
  const range = {};
  if (start) range.$gte = start;
  if (end) range.$lte = end;
  return range;
}

function formatSenderAddress(sender = {}) {
  const parts = [sender.full_name, sender.mobile, sender.city, sender.address, sender.country]
    .filter(Boolean)
    .map(String);
  return parts.join(" - ");
}

function formatReceiverAddress(receiver = {}) {
  const parts = [
    receiver.clientName,
    receiver.clientPhone,
    receiver.clientAddress,
    receiver.city,
  ]
    .filter(Boolean)
    .map(String);
  return parts.join(" - ");
}

function round2(n) {
  const v = Number(n) || 0;
  return Math.round(v * 100) / 100;
}

module.exports.getInvoices = asyncHandler(async (req, res) => {
  const { period = "month", dateFrom, dateTo, reportType = "all" } = req.query;

  // 1) Date filter
  const createdAt = getDateRange(period, dateFrom, dateTo);
  const findQuery = {};
  if (Object.keys(createdAt).length) findQuery.createdAt = createdAt;

  // 2) Preload shipping companies map for overweight calc
  const companies = await ShippingCompany.find().lean();
  const typeMaxMapByCompany = new Map();
  for (const c of companies) {
    const typeMap = {};
    for (const t of c.shippingTypes || []) {
      typeMap[String(t.type)] = Number(t.maxWeight) || 0;
    }
    typeMaxMapByCompany.set(String(c.company), typeMap);
  }

  // 3) Fetch shipments with needed refs
  const shipments = await Shapment.find(findQuery)
    .populate("customerId", "firstName lastName email")
    .populate("receiverAddress")
    .populate("orderId")
    .sort({ createdAt: -1 })
    .lean();

  // 4) Load related payment transactions to infer invoice status
  const ids = shipments.map((s) => String(s._id));
  const txs = await Transaction.find({
    referenceId: { $in: ids },
    method: "shipment_payment",
  })
    .select("referenceId status")
    .lean();
  const paidSet = new Set(
    txs.filter((t) => (t.status || "").toLowerCase() === "completed").map((t) => String(t.referenceId))
  );

  // 5) Build invoices DTO
  const invoices = shipments.map((s) => {
    const sp = s.shapmentPrice || {};
    const company = String(s.shapmentCompany || "");
    const shipType = String(s.shapmentingType || "");

    // overweight calculation
    const maxWeight = (typeMaxMapByCompany.get(company) || {})[shipType] || 0;
    const weight = Number(s.weight) || 0;
    const overweightKg = maxWeight > 0 ? Math.max(0, Math.ceil(weight - maxWeight)) : 0;

    const basePrice = Number(sp.basePrice) || 0;
    const profitPrice = Number(sp.profitPrice) || 0;
    const baseAdd = Number(sp.baseAdditionalweigth) || 0;
    const profitAdd = Number(sp.profitAdditionalweigth) || 0;
    const baseCOD = Number(sp.baseCODfees) || 0;
    const profitCOD = Number(sp.profitCODfees) || 0;
    const baseRTO = Number(sp.baseRTOprice) || 0;
    const profitRTO = Number(sp.profitRTOprice) || 0;
    const basePickup = Number(sp.basepickUpPrice) || 0;
    const profitPickup = Number(sp.profitpickUpPrice) || 0;
    const taxRate = sp.priceaddedtax;

    let payable = basePrice + overweightKg * baseAdd;
    let ourProfit = profitPrice + overweightKg * profitAdd;

    let codFees = 0;
    if ((s.paymentMathod || "").toUpperCase() === "COD") {
      payable += baseCOD;
      ourProfit += profitCOD;
      codFees = baseCOD + profitCOD;
    }

    let returnFees = 0;
    const isReturn = Boolean(s.isReturnShipment) || String(s.shapmentType).toLowerCase() === "reverse";
    if (isReturn) {
      payable += baseRTO;
      ourProfit += profitRTO;
      returnFees = baseRTO + profitRTO;
    }

    const pickupFees = basePickup + profitPickup;
    let subtotal = payable + ourProfit + pickupFees;

    // VAT amount (approximation)
    let vatAmount = 0;
    if (typeof taxRate === "number" && taxRate > 0) {
      vatAmount = taxRate < 1 ? subtotal * taxRate : taxRate;
    }

    const totalPrice = Number(s.totalprice) || round2(subtotal + vatAmount);

    const invoiceStatus = paidSet.has(String(s._id)) ? "paid" : "pending";
    const shipmentDate = s.createdAt ? new Date(s.createdAt) : new Date();
    const dueDate = new Date(shipmentDate);
    dueDate.setDate(dueDate.getDate() + 7);

    const customer = s.customerId || {};
    const customerName = [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "عميل";
    const customerEmail = customer.email || "";

    const senderAddress = formatSenderAddress(s.senderAddress || {});
    const receiverAddress = formatReceiverAddress(s.receiverAddress || s.orderId?.clientAddress || {});

    return {
      _id: String(s._id),
      invoiceNumber: `INV-${String(s._id).slice(-6).toUpperCase()}`,
      customerName,
      customerEmail,
      shipmentNumber: s.trackingId || String(s._id),
      shipmentType: s.shapmentingType || "",
      orderId: String(s.orderId?._id || s.orderId || ""),
      senderAddress,
      receiverAddress,
      orderSource: s.orderSou || s.orderId?.platform || "",
      shippingCompany: s.shapmentCompany || "",
      paymentMethod: s.paymentMathod || "",
      shipmentStatus: s.shipmentstates || "",
      trackingStatus: s.shipmentstates || "",
      shipmentDate: shipmentDate.toISOString(),
      lastUpdateDate: (s.updatedAt ? new Date(s.updatedAt) : shipmentDate).toISOString(),
      orderValue: Number(s.ordervalue) || 0,
      weight,
      basePolicyPrice: round2(basePrice),
      totalPrice: round2(totalPrice),
      additionalWeightCost: round2(overweightKg * (baseAdd + profitAdd)),
      codFees: round2(codFees),
      codPaymentStatus: (s.paymentMathod || "").toUpperCase() === "COD" ? "COD" : "Prepaid",
      pickupFees: round2(pickupFees),
      returnFees: round2(returnFees),
      fuelFees: 0,
      vatAmount: round2(vatAmount),
      insuranceCost: round2(sp.insurancecost || 0),
      payableToCarrier: round2(payable),
      profit: round2(ourProfit),
      status: invoiceStatus,
      createdAt: shipmentDate.toISOString(),
      dueDate: dueDate.toISOString(),
    };
  });

  // 6) Optional reportType filter
  let filtered = invoices;
  if (reportType && reportType !== "all") {
    const rt = String(reportType).toLowerCase();
    if (rt === "paid") filtered = invoices.filter((i) => i.status === "paid");
    else if (rt === "pending") filtered = invoices.filter((i) => i.status === "pending");
    else if (rt === "overdue") {
      const now = Date.now();
      filtered = invoices.filter((i) => i.status === "pending" && new Date(i.dueDate).getTime() < now);
    }
  }

  res.status(200).json({ success: true, invoices: filtered });
});
