const factory = require("./handlersFactory");
const Coupon = require("../models/couponModel");
const Wallet = require("../models/walletModel");
const Transaction = require("../models/transactionModel");
const ApiError = require("../utils/apiError");

// @desc    Get list of coupons
// @route   GET /api/v1/coupons
// @access  Private/Admin-Manager
exports.getCoupons = factory.getAll(Coupon);

// @desc    Get specific coupon by id
// @route   GET /api/v1/coupons/:id
// @access  Private/Admin-Manager
exports.getCoupon = factory.getOne(Coupon);

// @desc    Create coupon
// @route   POST  /api/v1/coupons
// @access  Private/Admin-Manager
exports.createCoupon = factory.createOne(Coupon);

// @desc    Update specific coupon
// @route   PUT /api/v1/coupons/:id
// @access  Private/Admin-Manager
exports.updateCoupon = factory.updateOne(Coupon);

// @desc    Delete specific coupon
// @route   DELETE /api/v1/coupons/:id
// @access  Private/Admin-Manager
exports.deleteCoupon = factory.deleteOne(Coupon);

// Helper: check coupon applicability
const isCouponApplicable = (coupon, userId, shippingCompanyIds = []) => {
  const now = new Date();
  if (!coupon.isActive) return { ok: false, reason: "القسيمة غير مفعلة" };
  if (coupon.startDate && now < new Date(coupon.startDate)) return { ok: false, reason: "القسيمة لم تبدأ بعد" };
  if (coupon.endDate && now > new Date(coupon.endDate)) return { ok: false, reason: "انتهت صلاحية القسيمة" };

  // Global usage limit
  if (coupon.usageLimit && coupon.usageLimit > 0 && coupon.totalUsed >= coupon.usageLimit) {
    return { ok: false, reason: "تم الوصول إلى الحد الأقصى لاستخدام القسيمة" };
  }

  // Per user usage limit
  if (coupon.perUserLimit && coupon.perUserLimit > 0) {
    const userUses = (coupon.redemptions || []).filter(r => String(r.user) === String(userId)).length;
    if (userUses >= coupon.perUserLimit) {
      return { ok: false, reason: "لقد استخدمت هذه القسيمة الحد المسموح به" };
    }
  }

  // Users restriction
  if (coupon.applicableUsers && coupon.applicableUsers.length > 0) {
    const allowed = coupon.applicableUsers.map(String).includes(String(userId));
    if (!allowed) return { ok: false, reason: "هذه القسيمة غير متاحة لهذا المستخدم" };
  }

  // Shipping companies restriction
  if (coupon.applicableShippingCompanies && coupon.applicableShippingCompanies.length > 0) {
    if (!Array.isArray(shippingCompanyIds) || shippingCompanyIds.length === 0) {
      return { ok: false, reason: "هذه القسيمة مرتبطة بشركات شحن محددة" };
    }
    const set = new Set(coupon.applicableShippingCompanies.map(String));
    const hasIntersection = shippingCompanyIds.some(id => set.has(String(id)));
    if (!hasIntersection) return { ok: false, reason: "شركة الشحن غير مشمولة في القسيمة" };
  }

  return { ok: true };
};

// @desc    Validate coupon for current user and optional shipping company
// @route   POST /api/coupons/validate
// @access  Private
exports.validateCoupon = async (req, res, next) => {
  try {
    const { code, shippingCompanyIds = [] } = req.body;
    const userId = req.customer?._id || req.body.userId;
    if (!code) return next(new ApiError("يرجى إدخال كود القسيمة", 400));
    if (!userId) return next(new ApiError("المستخدم غير معروف", 400));

    const coupon = await Coupon.findOne({ code: String(code).toUpperCase() });
    if (!coupon) return next(new ApiError("القسيمة غير موجودة", 404));

    const chk = isCouponApplicable(coupon, userId, shippingCompanyIds);
    if (!chk.ok) return next(new ApiError(chk.reason, 400));

    return res.json({
      success: true,
      data: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        startDate: coupon.startDate,
        endDate: coupon.endDate,
      },
    });
  } catch (err) {
    return next(new ApiError("فشل التحقق من القسيمة", 500));
  }
};

// @desc    Apply coupon to current user (records redemption and handles wallet credit)
// @route   POST /api/coupons/apply
// @access  Private
exports.applyCoupon = async (req, res, next) => {
  try {
    const { code, shippingCompanyIds = [] } = req.body;
    const userId = req.customer?._id || req.body.userId;
    if (!code) return next(new ApiError("يرجى إدخال كود القسيمة", 400));
    if (!userId) return next(new ApiError("المستخدم غير معروف", 400));

    const coupon = await Coupon.findOne({ code: String(code).toUpperCase() });
    if (!coupon) return next(new ApiError("القسيمة غير موجودة", 404));

    const chk = isCouponApplicable(coupon, userId, shippingCompanyIds);
    if (!chk.ok) return next(new ApiError(chk.reason, 400));

    // Record redemption
    coupon.redemptions.push({ user: userId, usedAt: new Date() });
    coupon.totalUsed = (coupon.totalUsed || 0) + 1;

    // Handle wallet credit
    let walletUpdate = null;
    let transaction = null;
    if (coupon.discountType === "wallet_credit") {
      let wallet = await Wallet.findOne({ customerId: userId });
      if (!wallet) wallet = new Wallet({ customerId: userId, balance: 0 });
      wallet.balance += Number(coupon.discountValue);
      await wallet.save();
      walletUpdate = wallet;

      // Create transaction according to current schema (credit/manual_addition)
      try {
        transaction = await Transaction.create({
          customerId: userId,
          walletId: String(wallet._id),
          type: "credit",
          amount: Number(coupon.discountValue),
          status: "completed",
          description: `إضافة رصيد عبر كوبون ${coupon.code}`,
          method: "manual_addition",
        });
      } catch (e) {
        // Ignore transaction errors to not block coupon application
      }
    }

    await coupon.save();

    return res.json({
      success: true,
      message: coupon.discountType === "wallet_credit" ? "تم تطبيق القسيمة وإضافة الرصيد للمحفظة" : "تم تطبيق القسيمة",
      data: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        wallet: walletUpdate ? { balance: walletUpdate.balance } : undefined,
        transactionId: transaction?._id,
      },
    });
  } catch (err) {
    return next(new ApiError("فشل تطبيق القسيمة", 500));
  }
};
