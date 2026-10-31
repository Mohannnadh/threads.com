const mongoose = require('mongoose');

// One wallet per customer. Balance is stored in paise (1 rupee = 100 paise)
// as an integer, so money never suffers floating-point rounding.
const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    balance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Wallet balance must be a whole number of paise.',
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Wallet', walletSchema);
