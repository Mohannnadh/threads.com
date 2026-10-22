
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    size: {
      type: String,
      default: null,
    },
    color: {
      type: String,
      default: null,
    },
    image: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: 'An order must contain at least one item.',
      },
    },

    shippingAddress: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      addressLine: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      postalCode: { type: String, required: true, trim: true },
      country: { type: String, required: true, trim: true },
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    shippingFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: ['COD', 'ONLINE'],
      required: true,
    },

    // Razorpay payment details
    razorpayOrderId: {
      type: String,
      default: null,
    },

    razorpayPaymentId: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    inventoryReleased: {
      type: Boolean,
      default: false,
    },

    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED'],
      default: 'PENDING',
    },

    orderStatus: {
      type: String,
      enum: [
        'PLACED',
        'CONFIRMED',
        'PROCESSING',
        'SHIPPED',
        'DELIVERED',
        'CANCELLED',
      ],
      default: 'PLACED',
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
