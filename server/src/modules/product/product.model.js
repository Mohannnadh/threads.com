const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    gender: {
      type: String,
      enum: ['men', 'women', 'unisex'],
      required: true,
    },

    images: {
      type: [String],
      default: [],
    },

    sizes: {
      type: [String],
      default: [],
    },

    colors: {
      type: [String],
      default: [],
    },

    // Stock and price for each colour and size: [{ color, size, price, stock }].
    variants: {
      type: [
        {
          _id: false,
          color: { type: String, trim: true },
          size: { type: String, trim: true },
          price: { type: Number, min: 0 },
          stock: { type: Number, min: 0, default: 0 },
        },
      ],
      default: [],
    },

    // Optional photo to show when a colour is picked: [{ color, image }].
    colorImages: {
      type: [
        {
          _id: false,
          color: { type: String, trim: true },
          image: { type: String, trim: true },
        },
      ],
      default: [],
    },

    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // Kept in step with the product's reviews.
    ratingAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model('Product', productSchema);

module.exports = Product;