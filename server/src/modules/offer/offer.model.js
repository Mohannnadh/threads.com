const mongoose = require('mongoose');

// A product discount that applies automatically. No code is needed.
const offerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    // Individual products this offer applies to.
    productIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
      default: [],
      index: true,
    },

    // Whole categories this offer applies to (lowercase, as products store them).
    categories: {
      type: [String],
      default: [],
      index: true,
    },

    // PERCENT: value is a percentage off. FIXED: value is rupees off each unit.
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

module.exports = mongoose.model('Offer', offerSchema);
