
require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline/promises');
const { stdin, stdout } = require('process');

const LOCAL_URI = 'mongodb://127.0.0.1:27017/threads';
const ATLAS_URI = process.env.MONGO_URI;

async function migrateUser() {
  let localConnection;
  let atlasConnection;

  const rl = readline.createInterface({ input: stdin, output: stdout });

  try {
    const email = (await rl.question('Enter the account email to migrate: '))
      .trim()
      .toLowerCase();

    if (!email) throw new Error('Email cannot be empty.');

    if (!ATLAS_URI || !ATLAS_URI.startsWith('mongodb+srv://')) {
      throw new Error(
        'Atlas URI not found. Check MONGO_URI in server/.env.'
      );
    }

    localConnection = await mongoose
      .createConnection(LOCAL_URI)
      .asPromise();

    atlasConnection = await mongoose
      .createConnection(ATLAS_URI)
      .asPromise();

    const localUsers = localConnection.db.collection('users');
    const atlasUsers = atlasConnection.db.collection('users');

    const user = await localUsers.findOne({ email });

    if (!user) {
      throw new Error('Account not found in the local database.');
    }

    const existingByEmail = await atlasUsers.findOne({ email });

    if (existingByEmail) {
      throw new Error(
        'This email already exists in Atlas. No changes were made.'
      );
    }

    const existingById = await atlasUsers.findOne({ _id: user._id });

    if (existingById) {
      throw new Error(
        'This user ID already exists in Atlas. No changes were made.'
      );
    }

    await atlasUsers.insertOne(user);

    console.log('User migrated successfully.');
    console.log('Email:', user.email);
    console.log('User ID:', user._id.toString());
    console.log('Role:', user.role);
    console.log('Atlas user count:', await atlasUsers.countDocuments());
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    if (localConnection) await localConnection.close();
    if (atlasConnection) await atlasConnection.close();
  }
}

migrateUser();
