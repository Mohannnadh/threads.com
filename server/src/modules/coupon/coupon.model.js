const mongoose = require('mongoose');

// A store-wide discount code managed by admins.
const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 30,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },

    // PERCENT: value is a percentage. FIXED: value is rupees off.
    type: {
      type: String,
      enum: ['PERCENT', 'FIXED'],
      required: true,
    },

    value: {
      type: Number,
      required: true,
      min: 0,
    },

    // Caps the discount on percentage coupons. null means no cap.
    maxDiscount: {
      type: Number,
      default: null,
      min: 0,
    },

    // Smallest product subtotal (rupees) the coupon applies to.
    minSubtotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    // How many times each customer account can use this coupon. null means unlimited.
    usageLimit: {
      type: Number,
      default: null,
      min: 1,
    },

    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    startsAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);
