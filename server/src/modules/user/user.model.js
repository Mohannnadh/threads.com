const mongoose = require('mongoose');

// A saved shipping address. Field names match the checkout shipping form
// so a saved address can be sent to the order API as-is.
const addressSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      enum: ['Home', 'Work', 'Other'],
      default: 'Home',
    },

    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    addressLine: { type: String, required: true, trim: true, maxlength: 200 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    state: { type: String, required: true, trim: true, maxlength: 80 },
    postalCode: { type: String, required: true, trim: true, maxlength: 10 },
    country: { type: String, required: true, trim: true, maxlength: 80 },

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    firstName: {
      type: String,
      trim: true,
      default: '',
    },

    lastName: {
      type: String,
      trim: true,
      default: '',
    },

    gender: {
      type: String,
      enum: ['male', 'female', 'other', ''],
      default: '',
    },

    dateOfBirth: {
      type: Date,
      default: null,
    },

    // Profile photo stored as a small data URL (resized on the client).
    avatar: {
      type: String,
      default: '',
    },

    addresses: {
      type: [addressSchema],
      default: [],
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
      // Google sign-in accounts have no password.
      required: function requiredPassword() {
        return !this.googleId;
      },
    },

    // Google account id, for accounts that sign in with Google.
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    role: {
      type: String,
      trim: true,
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

    // Wrong OTP guesses for the current code. Locks the code after a few tries.
    otpAttempts: {
      type: Number,
      default: 0,
    },

    // Blocked customers cannot sign in, and their existing sessions stop working.
    isBlocked: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
