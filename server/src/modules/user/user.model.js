const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
    },
    otp: {
  type: String,
  default: null,
},

otpExpiresAt: {
  type: Date,
  default: null,
},

otpVerified: {
  type: Boolean,
  default: false,
},
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;