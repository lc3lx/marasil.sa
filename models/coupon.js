const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      minlength: 3,
      maxlength: 50,
    },
    description: { type: String, trim: true, maxlength: 300 },

    discountType: {
      type: String,
      enum: ['percentage', 'fixed', 'wallet_credit'],
      required: true,
    },
    // percentage: 0-100, fixed/wallet_credit: currency amount (SAR)
    discountValue: { type: Number, required: true, min: 0 },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    isActive: { type: Boolean, default: true },

    // Optional assignment rules
    applicableUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }],
    applicableShippingCompanies: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'ShippingCompany' },
    ],

    usageLimit: { type: Number, default: 0, min: 0 }, // 0 = unlimited
    perUserLimit: { type: Number, default: 0, min: 0 }, // 0 = unlimited per user
    totalUsed: { type: Number, default: 0, min: 0 },

    // Track redemptions per user
    redemptions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
        usedAt: { type: Date, default: Date.now },
        metadata: { type: Object },
      },
    ],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }, // admin
  },
  { timestamps: true }
);

couponSchema.index({ code: 1 }, { unique: true });
couponSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('Coupon', couponSchema);
