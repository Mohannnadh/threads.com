const mongoose = require('mongoose');

// Ledger of every wallet movement. The unique index stops the same payment,
// order or refund from being applied twice, even if a request is retried.
const walletTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ['CREDIT', 'DEBIT'],
      required: true,
    },

    // Why the money moved.
    source: {
      type: String,
      enum: ['TOPUP', 'ORDER_PAYMENT', 'REFUND'],
      required: true,
    },

    // Razorpay payment id for top-ups, order id for order payments and refunds.
    reference: {
      type: String,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Amount must be a whole number of paise.',
      },
    },

    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },

    description: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

walletTransactionSchema.index(
  { type: 1, source: 1, reference: 1 },
  { unique: true }
);

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
