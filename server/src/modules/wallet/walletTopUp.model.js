const mongoose = require('mongoose');

// A Razorpay order created to add money to a wallet. Tracking it lets the
// server confirm the amount it charged, and prevents double crediting.
const walletTopUpSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },

    razorpayPaymentId: {
      type: String,
      default: null,
    },

    // Amount in paise.
    amount: {
      type: Number,
      required: true,
      min: 100,
    },

    status: {
      type: String,
      enum: ['PENDING', 'PAID'],
      default: 'PENDING',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WalletTopUp', walletTopUpSchema);
