// Removes every product, and the data that points at them: their reviews, and
// their entries in offers. Past orders keep their product name, price and photo.
//
// Usage (from the server folder):
//   node scripts/removeAllProducts.js            shows how many would be removed (changes nothing)
//   node scripts/removeAllProducts.js --confirm  removes them. This cannot be undone.

require('dotenv').config();

const mongoose = require('mongoose');
const Product = require('../src/modules/product/product.model');
const Review = require('../src/modules/review/review.model');
const Offer = require('../src/modules/offer/offer.model');

const confirmed = process.argv.includes('--confirm');

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not set in server/.env');
  }

  await mongoose.connect(process.env.MONGO_URI);

  const productCount = await Product.countDocuments();

  if (!confirmed) {
    console.log(`${productCount} product(s) would be removed. Run with --confirm to remove them.`);
    return;
  }

  const ids = await Product.find().distinct('_id');

  const reviews = await Review.deleteMany({ product: { $in: ids } });
  await Offer.updateMany({ productIds: { $in: ids } }, { $pull: { productIds: { $in: ids } } });
  const emptyOffers = await Offer.deleteMany({ productIds: { $size: 0 }, categories: { $size: 0 } });
  const products = await Product.deleteMany({});

  console.log(`Removed ${products.deletedCount} product(s).`);
  console.log(`Removed ${reviews.deletedCount} review(s).`);
  console.log(`Removed ${emptyOffers.deletedCount} offer(s) that had no products or categories left.`);
};

run()
  .catch((error) => {
    console.error('Failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
