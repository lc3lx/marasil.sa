const express = require("express");
const {
  getReturnPageBySlug,
  getReplacementPageBySlug,
} = require("../controllers/adminController");
const shipmentReturnController = require("../controllers/shipmentReturenController");
const Customer = require("../models/customerModel");

const router = express.Router();

/** استجابة الباكند { status, data } → { success, data } ليتوافق مع الفرونتند */
function wrapResJson(res) {
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    if (body && body.status === "success" && body.data !== undefined) {
      return originalJson({ success: true, data: body.data });
    }
    return originalJson(body);
  };
}

// GET /api/public/returns/shipments?token=:slug&phone=xxx (أو email أو awb)
router.get("/returns/shipments", (req, res, next) => {
  const token = (req.query.token || "").toString().trim();
  if (!token) {
    return res.status(400).json({
      success: false,
      message: "رمز التاجر مطلوب (token)",
    });
  }
  Customer.findOne({ returnPageSlug: token })
    .select("_id")
    .lean()
    .then((customer) => {
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "رابط التاجر غير صالح أو منتهي",
        });
      }
      wrapResJson(res);
      return shipmentReturnController.getShipmentsByReceiver(req, res, next);
    })
    .catch(next);
});

// GET /api/public/replacements/shipments?token=:slug&phone=xxx (أو email أو awb)
router.get("/replacements/shipments", (req, res, next) => {
  const token = (req.query.token || "").toString().trim();
  if (!token) {
    return res.status(400).json({
      success: false,
      message: "رمز التاجر مطلوب (token)",
    });
  }
  Customer.findOne({ replacementPageSlug: token })
    .select("_id")
    .lean()
    .then((customer) => {
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "رابط التاجر غير صالح أو منتهي",
        });
      }
      wrapResJson(res);
      return shipmentReturnController.getShipmentsByReceiver(req, res, next);
    })
    .catch(next);
});

// POST /api/public/returns/create-request — body: { token, shipmentId, type?, requestNote? }
router.post("/returns/create-request", (req, res, next) => {
  const { token, shipmentId, type, requestNote } = req.body || {};
  const tokenStr = (token ?? "").toString().trim();
  if (!tokenStr) {
    return res.status(400).json({
      success: false,
      message: "رمز التاجر مطلوب (token)",
    });
  }
  if (!shipmentId) {
    return res.status(400).json({
      success: false,
      message: "معرف الشحنة مطلوب",
    });
  }
  const typerequesst = type === "exchange" ? "exchange" : "return";
  Customer.findOne({ returnPageSlug: tokenStr })
    .select("_id")
    .lean()
    .then((customer) => {
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "رابط التاجر غير صالح أو منتهي",
        });
      }
      req.body = { shipmentId, typerequesst, requestNote: requestNote || "" };
      wrapResJson(res);
      return shipmentReturnController.createReturnRequest(req, res, next);
    })
    .catch(next);
});

// GET /api/public/returns/page-config?token=:slug
  const token = req.query.token;
  if (!token || typeof token !== "string" || !token.trim()) {
    return res.status(400).json({
      success: false,
      message: "رابط التاجر مطلوب (token)",
    });
  }
  req.params = { slug: token.trim() };
  wrapResJson(res);
  return getReturnPageBySlug(req, res, next);
});

// POST /api/public/replacements/create-request — body: { token, shipmentId, type?, requestNote? }
router.post("/replacements/create-request", (req, res, next) => {
  const { token, shipmentId, type, requestNote } = req.body || {};
  const tokenStr = (token ?? "").toString().trim();
  if (!tokenStr) {
    return res.status(400).json({
      success: false,
      message: "رمز التاجر مطلوب (token)",
    });
  }
  if (!shipmentId) {
    return res.status(400).json({
      success: false,
      message: "معرف الشحنة مطلوب",
    });
  }
  const typerequesst = type === "exchange" ? "exchange" : "return";
  Customer.findOne({ replacementPageSlug: tokenStr })
    .select("_id")
    .lean()
    .then((customer) => {
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "رابط التاجر غير صالح أو منتهي",
        });
      }
      req.body = { shipmentId, typerequesst, requestNote: requestNote || "" };
      wrapResJson(res);
      return shipmentReturnController.createReturnRequest(req, res, next);
    })
    .catch(next);
});

// GET /api/public/replacements/page-config?token=:slug
router.get("/replacements/page-config", (req, res, next) => {
  const token = req.query.token;
  if (!token || typeof token !== "string" || !token.trim()) {
    return res.status(400).json({
      success: false,
      message: "رابط التاجر مطلوب (token)",
    });
  }
  req.params = { slug: token.trim() };
  wrapResJson(res);
  return getReplacementPageBySlug(req, res, next);
});

module.exports = router;
