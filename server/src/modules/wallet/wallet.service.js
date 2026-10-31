const crypto = require('crypto');
const mongoose = require('mongoose');
const razorpay = require('../../config/razorpay');
const Wallet = require('./wallet.model');
const WalletTransaction = require('./walletTransaction.model');
const WalletTopUp = require('./walletTopUp.model');
const {
  parsePagination,
  buildPagination,
} = require('../../utils/pagination');

const MIN_TOPUP_RUPEES = 100;
const MAX_TOPUP_RUPEES = 50000;
const MAX_BALANCE_PAISE = 20000000; // ₹2,00,000

const isDuplicateKeyError = (error) => error?.code === 11000;

const assertPaise = (amount) => {
  if (!Number.isSafeInteger(amount) || amount < 1) {
    throw new Error('Invalid wallet amount');
  }
};

// Returns the customer's wallet, creating an empty one on first use.
const ensureWallet = async (userId) => {
  try {
    return await Wallet.findOneAndUpdate(
      { user: userId },
      { $setOnInsert: { balance: 0 } },
      { upsert: true, new: true }
    );
  } catch (error) {
    // Two requests created the wallet at the same moment; read the winner.
    if (isDuplicateKeyError(error)) {
      return Wallet.findOne({ user: userId });
    }
    throw error;
  }
};

// Adds money. Returns { wallet, duplicate } where duplicate means the same
// reference was already credited and nothing changed.
const credit = async ({ userId, amount, source, reference, description }) => {
  assertPaise(amount);
  await ensureWallet(userId);

  const wallet = await Wallet.findOneAndUpdate(
    { user: userId, balance: { $lte: MAX_BALANCE_PAISE - amount } },
    { $inc: { balance: amount } },
    { new: true }
  );

  if (!wallet) {
    throw new Error('This amount would take your wallet above the ₹2,00,000 limit');
  }

  try {
    await WalletTransaction.create({
      user: userId,
      type: 'CREDIT',
      source,
      reference,
      amount,
      balanceAfter: wallet.balance,
      description,
    });

    return { wallet, duplicate: false };
  } catch (error) {
    // Undo the balance change; the ledger entry already exists or failed.
    await Wallet.updateOne({ user: userId }, { $inc: { balance: -amount } });

    if (isDuplicateKeyError(error)) {
      return {
        wallet: await Wallet.findOne({ user: userId }),
        duplicate: true,
      };
    }

    throw error;
  }
};

// Takes money out. The balance check and the decrement happen in one
// atomic update, so a balance can never go negative.
const debit = async ({ userId, amount, source, reference, description }) => {
  assertPaise(amount);
  await ensureWallet(userId);

  const wallet = await Wallet.findOneAndUpdate(
    { user: userId, balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    { new: true }
  );

  if (!wallet) {
    throw new Error('Insufficient wallet balance');
  }

  try {
    await WalletTransaction.create({
      user: userId,
      type: 'DEBIT',
      source,
      reference,
      amount,
      balanceAfter: wallet.balance,
      description,
    });

    return { wallet };
  } catch (error) {
    await Wallet.updateOne({ user: userId }, { $inc: { balance: amount } });

    if (isDuplicateKeyError(error)) {
      throw new Error('This wallet payment has already been applied');
    }

    throw error;
  }
};

const getWallet = async (userId, query) => {
  const wallet = await ensureWallet(userId);
  const { page, limit, skip } = parsePagination(query, {
    defaultLimit: 10,
    maxLimit: 50,
  });

  const [transactions, total] = await Promise.all([
    WalletTransaction.find({ user: userId })
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .select('-user -__v'),
    WalletTransaction.countDocuments({ user: userId }),
  ]);

  return {
    balance: wallet.balance,
    transactions,
    pagination: buildPagination(total, { page, limit }),
  };
};

// Step 1 of adding money: create a Razorpay order for the chosen amount.
const createTopUpOrder = async (userId, rupees) => {
  const amountRupees = Number(rupees);

  if (
    !Number.isInteger(amountRupees) ||
    amountRupees < MIN_TOPUP_RUPEES ||
    amountRupees > MAX_TOPUP_RUPEES
  ) {
    throw new Error(
      `Enter a whole amount between ₹${MIN_TOPUP_RUPEES} and ₹${MAX_TOPUP_RUPEES}`
    );
  }

  const amount = amountRupees * 100;
  const wallet = await ensureWallet(userId);

  if (wallet.balance + amount > MAX_BALANCE_PAISE) {
    throw new Error(
      'This top-up would take your wallet above the ₹2,00,000 limit'
    );
  }

  const razorpayOrder = await razorpay.orders.create({
    amount,
    currency: 'INR',
    receipt: `wallet_${new mongoose.Types.ObjectId()}`,
  });

  await WalletTopUp.create({
    user: userId,
    razorpayOrderId: razorpayOrder.id,
    amount,
  });

  return {
    razorpayOrder: {
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
    },
    keyId: process.env.RAZORPAY_KEY_ID,
  };
};

// Step 2: after Razorpay succeeds, verify the signature and the payment
// amount, then credit the wallet exactly once.
const verifyTopUp = async (userId, paymentData) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = paymentData;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new Error('Missing payment verification details');
  }

  const topUp = await WalletTopUp.findOne({
    razorpayOrderId: razorpay_order_id,
    user: userId,
  });

  if (!topUp) {
    throw new Error('Top-up not found');
  }

  if (topUp.status === 'PAID') {
    const wallet = await ensureWallet(userId);
    return { balance: wallet.balance, duplicate: true };
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const signaturesMatch =
    Buffer.byteLength(expectedSignature) ===
      Buffer.byteLength(razorpay_signature) &&
    crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(razorpay_signature)
    );

  if (!signaturesMatch) {
    throw new Error('Invalid payment signature');
  }

  const payment = await razorpay.payments.fetch(razorpay_payment_id);

  if (payment.order_id !== razorpay_order_id) {
    throw new Error('Payment does not belong to this top-up');
  }

  if (payment.amount !== topUp.amount || payment.currency !== 'INR') {
    throw new Error('Payment amount does not match the top-up');
  }

  if (payment.status !== 'captured' || payment.captured !== true) {
    throw new Error('Payment has not been captured yet');
  }

  // Claim the top-up so a repeated callback cannot credit it again.
  const claimed = await WalletTopUp.findOneAndUpdate(
    { _id: topUp._id, status: 'PENDING' },
    { $set: { status: 'PAID', razorpayPaymentId: razorpay_payment_id } },
    { new: true }
  );

  if (!claimed) {
    const wallet = await ensureWallet(userId);
    return { balance: wallet.balance, duplicate: true };
  }

  try {
    const { wallet, duplicate } = await credit({
      userId,
      amount: topUp.amount,
      source: 'TOPUP',
      reference: razorpay_payment_id,
      description: 'Money added to wallet',
    });

    return { balance: wallet.balance, duplicate };
  } catch (error) {
    // Could not credit (for example, the wallet limit was reached). Release
    // the claim so the customer can retry or contact support.
    await WalletTopUp.updateOne(
      { _id: topUp._id },
      { $set: { status: 'PENDING', razorpayPaymentId: null } }
    );

    throw error;
  }
};

module.exports = {
  MIN_TOPUP_RUPEES,
  MAX_TOPUP_RUPEES,
  ensureWallet,
  credit,
  debit,
  getWallet,
  createTopUpOrder,
  verifyTopUp,
};
