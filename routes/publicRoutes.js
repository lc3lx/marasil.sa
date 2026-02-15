const express = require("express");
const {
  getReturnPageBySlug,
  getReplacementPageBySlug,
} = require("../controllers/adminController");

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

// GET /api/public/returns/page-config?token=:slug
router.get("/returns/page-config", (req, res, next) => {
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
