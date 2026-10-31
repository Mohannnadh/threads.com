const mongoose = require('mongoose');

const historySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    at: { type: Date, required: true },
  },
  { _id: false }
);

// A customer's request to return or exchange one line of a delivered order.
const returnRequestSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Position of the line in the order's items array.
    itemIndex: {
      type: Number,
      required: true,
      min: 0,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },

    productName: { type: String, required: true },
    size: { type: String, default: null },
    color: { type: String, default: null },

    quantity: { type: Number, required: true, min: 1 },

    // Price per unit in rupees, copied from the order line.
    unitPrice: { type: Number, required: true, min: 0 },

    type: {
      type: String,
      enum: ['RETURN', 'EXCHANGE'],
      required: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    exchangeSize: { type: String, default: null },

    status: {
      type: String,
      enum: [
        'REQUESTED',
        'APPROVED',
        'REJECTED',
        'PICKED_UP',
        'REFUNDED',
        'COMPLETED',
      ],
      default: 'REQUESTED',
    },

    adminNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },

    // Paise refunded to the wallet when a return is completed.
    refundAmountPaise: { type: Number, default: 0 },

    history: {
      type: [historySchema],
      default: [],
    },
  },
  { timestamps: true }
);

// One request per order line. A rejected request also blocks a new one.
returnRequestSchema.index({ order: 1, itemIndex: 1 }, { unique: true });

module.exports = mongoose.model('ReturnRequest', returnRequestSchema);
