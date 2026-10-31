const mongoose = require('mongoose');

// A customer's review of one product from one delivered order.
const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be a whole number from 1 to 5.',
      },
    },

    title: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },

    comment: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },

    // Admins can hide a review from the shop without deleting it.
    isHidden: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

// One review per product per order.
reviewSchema.index({ user: 1, order: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
