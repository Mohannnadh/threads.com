
require('dotenv').config();

const mongoose = require('mongoose');
const readline = require('node:readline');
const bcrypt = require('bcrypt');
const User = require('../src/modules/user/user.model');

const ask = (question) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
};

// Read a password without displaying its characters.
const askHidden = (question) => {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;

    if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
      reject(new Error('Run this script in the VS Code terminal.'));
      return;
    }

    let password = '';
    process.stdout.write(question);

    const onData = (key) => {
      const char = key.toString();

      if (char === '\u0003') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        reject(new Error('Setup cancelled.'));
        return;
      }

      if (char === '\r' || char === '\n') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(password);
        return;
      }

      if (char === '\u007f' || char === '\b') {
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
        return;
      }

      if (char >= ' ' && char !== '\u001b') {
        password += char;
        process.stdout.write('*');
      }
    };

    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
};

async function createAdmin() {
  try {
    if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
      throw new Error('MONGO_URI or JWT_SECRET is missing from .env.');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected.');

    // This is a one-time first-admin setup.
    const existingAdmin = await User.exists({ role: 'admin' });

    if (existingAdmin) {
      throw new Error(
        'An admin already exists. No changes were made.'
      );
    }

    const name = await ask('Admin name: ');
    const email = (await ask('Admin email: ')).toLowerCase();
    const password = await askHidden('Admin password: ');
    const confirmPassword = await askHidden('Confirm password: ');

    if (!name || !email || !password) {
      throw new Error('Name, email, and password are required.');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Enter a valid email address.');
    }

    if (password.length < 12 ||
        !/[a-z]/.test(password) ||
        !/[A-Z]/.test(password) ||
        !/[0-9]/.test(password) ||
        !/[^A-Za-z0-9]/.test(password)) {
      throw new Error(
        'Use at least 12 characters with uppercase, lowercase, a number, and a symbol.'
      );
    }

    if (password !== confirmPassword) {
      throw new Error('Passwords do not match.');
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new Error(
        'That email already belongs to an account. No changes were made.'
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
    });

    console.log('Admin account created successfully.');
    console.log(`Admin email: ${email}`);
    console.log('You can now log in using the admin credentials.');
  } catch (error) {
    console.error('Admin setup failed:', error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

createAdmin();
