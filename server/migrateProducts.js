
require('dotenv').config();
const mongoose = require('mongoose');

const LOCAL_URI = 'mongodb://127.0.0.1:27017/threads';
const ATLAS_URI = process.env.MONGO_URI;

async function migrateProducts() {
  let localConnection;
  let atlasConnection;

  try {
    if (!ATLAS_URI || !ATLAS_URI.startsWith('mongodb+srv://')) {
      throw new Error(
        'MONGO_URI must contain your MongoDB Atlas connection string.'
      );
    }

    // Connect to local MongoDB and Atlas separately.
    localConnection = await mongoose
      .createConnection(LOCAL_URI)
      .asPromise();

    atlasConnection = await mongoose
      .createConnection(ATLAS_URI)
      .asPromise();

    const localProducts = localConnection.db.collection('products');
    const atlasProducts = atlasConnection.db.collection('products');

    const products = await localProducts.find({}).toArray();

    console.log(`Local products found: ${products.length}`);

    let inserted = 0;
    let skipped = 0;

    for (const product of products) {
      // First check by the original MongoDB ID.
      let existing = await atlasProducts.findOne({
        _id: product._id,
      });

      // Also avoid inserting a second copy with the same name.
      if (!existing) {
        existing = await atlasProducts.findOne({
          name: product.name,
        });
      }

      if (existing) {
        console.log(`Skipped existing product: ${product.name}`);
        skipped++;
        continue;
      }

      await atlasProducts.insertOne(product);

      console.log(`Migrated: ${product.name}`);
      inserted++;
    }

    console.log('\nMigration completed.');
    console.log(`Inserted: ${inserted}`);
    console.log(`Skipped: ${skipped}`);

    const finalCount = await atlasProducts.countDocuments();
    console.log(`Total products now in Atlas: ${finalCount}`);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    if (localConnection) await localConnection.close();
    if (atlasConnection) await atlasConnection.close();
  }
}

migrateProducts();

