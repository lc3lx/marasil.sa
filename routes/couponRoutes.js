const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const {
  getCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  applyCoupon,
} = require('../controllers/couponController');

// User endpoints (authenticated)
router.post('/validate', auth.Protect, validateCoupon);
router.post('/apply', auth.Protect, applyCoupon);

// Admin-only endpoints
router.use(auth.Protect);
router.use(auth.allowedTo('admin'));

router.route('/')
  .get(getCoupons)
  .post(createCoupon);

router.route('/:id')
  .get(getCoupon)
  .put(updateCoupon)
  .delete(deleteCoupon);

module.exports = router;
