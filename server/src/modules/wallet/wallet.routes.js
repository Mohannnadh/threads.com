const express = require('express');

const authMiddleware = require('../../middlewares/authMiddleware');
const {
  getWalletController,
  createTopUpController,
  verifyTopUpController,
} = require('./wallet.controller');

const router = express.Router();

// Every wallet route belongs to the logged-in customer.
router.get('/', authMiddleware, getWalletController);
router.post('/topup/order', authMiddleware, createTopUpController);
router.post('/topup/verify', authMiddleware, verifyTopUpController);

module.exports = router;
