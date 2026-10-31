require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');
const expireOnlineOrders = require('./jobs/expireOnlineOrder');

const PORT = process.env.PORT || 5000;
const EXPIRY_INTERVAL_MS = 60 * 1000;

// Prevent overlapping runs if one pass takes longer than the interval.
let isExpiryRunning = false;

const runExpiryJob = async () => {
  if (isExpiryRunning) return;

  isExpiryRunning = true;

  try {
    await expireOnlineOrders();
  } finally {
    isExpiryRunning = false;
  }
};

const startServer = async () => {
  // connectDB exits the process if the database is unreachable.
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Release stock for unpaid online orders whose payment window has closed.
  runExpiryJob();
  setInterval(runExpiryJob, EXPIRY_INTERVAL_MS);
};

startServer();
