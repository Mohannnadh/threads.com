const mongoose = require('mongoose');
const ReturnRequest = require('./returnRequest.model');
const Order = require('../order/order.model');
const { reserveStock, restoreStock } = require('../product/stock.service');
const Product = require('../product/product.model');
const wallet = require('../wallet/wallet.service');
const {
  parsePagination,
  buildPagination,
} = require('../../utils/pagination');

const RETURN_WINDOW_DAYS = 7;

// Admin moves a request through these steps. RECEIVED is an action, not a
// stored status: it resolves to REFUNDED (returns) or COMPLETED (exchanges).
const NEXT_ALLOWED = {
  REQUESTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['PICKED_UP'],
  PICKED_UP: ['RECEIVED'],
};

const isValidId = (value) => mongoose.Types.ObjectId.isValid(value);

const requestReturn = async (userId, data) => {
  const { orderId, itemIndex, type, reason, exchangeSize } = data;

  if (!isValidId(orderId)) {
    throw new Error('Invalid order ID');
  }

  if (!['RETURN', 'EXCHANGE'].includes(type)) {
    throw new Error('Choose either a return or an exchange');
  }

  const cleanReason = typeof reason === 'string' ? reason.trim() : '';

  if (cleanReason.length < 5) {
    throw new Error('Please describe the reason (at least 5 characters)');
  }

  const index = Number(itemIndex);
  const order = await Order.findOne({ _id: orderId, user: userId });

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.orderStatus !== 'DELIVERED' || !order.deliveredAt) {
    throw new Error('Returns and exchanges are available after delivery');
  }

  const windowEnds =
    order.deliveredAt.getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  if (Date.now() > windowEnds) {
    throw new Error(
      `The ${RETURN_WINDOW_DAYS}-day return window for this order has closed`
    );
  }

  const line = Number.isInteger(index) ? order.items[index] : null;

  if (!line) {
    throw new Error('Item not found on this order');
  }

  let cleanExchangeSize = null;

  if (type === 'EXCHANGE') {
    cleanExchangeSize =
      typeof exchangeSize === 'string' ? exchangeSize.trim() : '';

    if (!cleanExchangeSize) {
      throw new Error('Choose the size you would like instead');
    }

    if (cleanExchangeSize === line.size) {
      throw new Error('Choose a size different from the one you ordered');
    }

    const product = await Product.findById(line.product).select('sizes');

    if (!product) {
      throw new Error('This product is no longer available');
    }

    if (!product.sizes.includes(cleanExchangeSize)) {
      throw new Error('That size is not offered for this product');
    }
  }

  try {
    return await ReturnRequest.create({
      order: order._id,
      user: userId,
      itemIndex: index,
      product: line.product,
      productName: line.name,
      size: line.size,
      color: line.color,
      quantity: line.quantity,
      unitPrice: line.price,
      type,
      reason: cleanReason,
      exchangeSize: cleanExchangeSize,
      history: [{ status: 'REQUESTED', at: new Date() }],
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new Error('A return or exchange was already requested for this item');
    }

    throw error;
  }
};

const listMyReturns = async (userId) =>
  ReturnRequest.find({ user: userId })
    .sort({ createdAt: -1 })
    .select('-user -__v')
    .lean();

const listReturns = async (query) => {
  const filter = {};

  if (query.status && query.status !== 'ALL') {
    filter.status = query.status;
  }

  const { page, limit, skip } = parsePagination(query, {
    defaultLimit: 15,
    maxLimit: 50,
  });

  const [requests, total] = await Promise.all([
    ReturnRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email')
      .lean(),
    ReturnRequest.countDocuments(filter),
  ]);

  return {
    requests,
    pagination: buildPagination(total, { page, limit }),
  };
};

const updateReturnStatus = async (id, nextStatus, note) => {
  if (!isValidId(id)) {
    throw new Error('Invalid request ID');
  }

  const request = await ReturnRequest.findById(id);

  if (!request) {
    throw new Error('Return request not found');
  }

  if (!(NEXT_ALLOWED[request.status] || []).includes(nextStatus)) {
    throw new Error(
      `Cannot change this request from ${request.status} to ${nextStatus}`
    );
  }

  const target =
    nextStatus === 'RECEIVED'
      ? request.type === 'RETURN'
        ? 'REFUNDED'
        : 'COMPLETED'
      : nextStatus;

  // Refund the full price of the returned item (after any product offer).
  // Coupon discounts on the order are not taken off the refund.
  const refundPaise =
    target === 'REFUNDED'
      ? Math.round(request.unitPrice * request.quantity * 100)
      : 0;

  // Exchanges reserve one unit of stock for the replacement when approved.
  if (target === 'APPROVED' && request.type === 'EXCHANGE') {
    const reserved = await reserveStock({
      productId: request.product,
      color: request.color,
      size: request.exchangeSize || request.size,
      quantity: 1,
    });

    if (!reserved) {
      throw new Error('The replacement product is out of stock');
    }
  }

  // Claim the status change first so a repeated click cannot run twice.
  const claimed = await ReturnRequest.findOneAndUpdate(
    { _id: id, status: request.status },
    {
      $set: {
        status: target,
        refundAmountPaise: refundPaise,
        ...(note !== undefined ? { adminNote: String(note).trim().slice(0, 500) } : {}),
      },
      $push: { history: { status: target, at: new Date() } },
    },
    { new: true }
  );

  if (!claimed) {
    if (target === 'APPROVED' && request.type === 'EXCHANGE') {
      await restoreStock({
        productId: request.product,
        color: request.color,
        size: request.exchangeSize || request.size,
        quantity: 1,
      });
    }

    throw new Error('This request was updated by someone else. Refresh and try again.');
  }

  // Returned units go back into stock once they are received.
  if (target === 'REFUNDED' || target === 'COMPLETED') {
    await restoreStock({
      productId: request.product,
      color: request.color,
      size: request.size,
      quantity: request.quantity,
    });
  }

  if (target === 'REFUNDED') {
    try {
      await wallet.credit({
        userId: request.user,
        amount: refundPaise,
        source: 'REFUND',
        reference: `return_${request._id}`,
        description: `Refund for returned ${request.productName}`,
      });
    } catch (error) {
      console.error('Refund failed for return request:', String(request._id), error.message);

      // Undo this step so the request is still open and can be marked received
      // again. The wallet credit is keyed to this request, so a retry cannot pay twice.
      await ReturnRequest.updateOne(
        { _id: id, status: target },
        { $set: { status: request.status, refundAmountPaise: 0 } }
      );

      await reserveStock({
        productId: request.product,
        color: request.color,
        size: request.size,
        quantity: request.quantity,
      });

      throw new Error(`The refund was not credited (${error.message}). Please try again.`);
    }
  }

  return claimed;
};

module.exports = {
  RETURN_WINDOW_DAYS,
  requestReturn,
  listMyReturns,
  listReturns,
  updateReturnStatus,
};
