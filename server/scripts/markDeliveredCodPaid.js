// One-time fix: cash-on-delivery orders that were delivered before the
// status update started marking them PAID.
//
// Usage (from the server folder):
//   node scripts/markDeliveredCodPaid.js --dry-run   shows how many orders would change
//   node scripts/markDeliveredCodPaid.js             updates them

require('dotenv').config();

const mongoose = require('mongoose');
const Order = require('../src/modules/order/order.model');

const dryRun = process.argv.includes('--dry-run');

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not set in server/.env');
  }

  await mongoose.connect(process.env.MONGO_URI);

  const filter = {
    paymentMethod: 'COD',
    orderStatus: 'DELIVERED',
    paymentStatus: { $ne: 'PAID' },
  };

  const count = await Order.countDocuments(filter);

  if (dryRun) {
    console.log(`${count} delivered COD order(s) would be marked PAID. Run without --dry-run to apply.`);
  } else {
    const result = await Order.updateMany(filter, { $set: { paymentStatus: 'PAID' } });
    console.log(`Marked ${result.modifiedCount} delivered COD order(s) as PAID.`);
  }
};

run()
  .catch((error) => {
    console.error('Failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
