const crypto = require('crypto');
const mongoose = require('mongoose');
const Order = require('./order.model');
const Product = require('../product/product.model');
const User = require('../user/user.model');
const razorpay = require('../../config/razorpay');
const { escapeRegex } = require('../../utils/pagination');
const wallet = require('../wallet/wallet.service');
const {
  resolveCoupon,
  claimCouponUse,
  releaseCouponUse,
} = require('../coupon/coupon.service');
const { effectivePrice } = require('../offer/offer.service');
const {
  hasVariants,
  findVariant,
  availableFor,
  reserveStock,
  restoreStock,
} = require('../product/stock.service');

const money = (value) => Math.round(Number(value) * 100) / 100;

// Takes stock for every line of an order, one colour and size at a time. Lines
// that were taken are added to `reserved`, so a failure can put them back.
const reserveLines = async (items, reserved) => {
  const lines = new Map();

  for (const item of items) {
    const key = `${String(item.product)}|${item.color || ''}|${item.size || ''}`;
    const line = lines.get(key) || {
      productId: String(item.product),
      color: item.color || null,
      size: item.size || null,
      quantity: 0,
    };

    line.quantity += item.quantity;
    lines.set(key, line);
  }

  for (const line of lines.values()) {
    const taken = await reserveStock(line);

    if (!taken) {
      throw new Error('Stock changed while placing your order. Please try again.');
    }

    reserved.push(line);
  }
};

// The photo the admin set for a colour, or null when there is none.
const colorImageFor = (product, color) => {
  const wanted = String(color || '').trim().toLowerCase();

  if (!wanted) return null;

  const entry = (product.colorImages || []).find(
    (item) => item?.color && String(item.color).trim().toLowerCase() === wanted
  );

  return entry?.image || null;
};

const ORDER_STATUSES = [
  'PLACED',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

// Create a new order.
const createOrder = async (userId, orderData) => {
  const { items, shippingAddress, paymentMethod, couponCode } = orderData;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID');
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Your order must contain at least one product');
  }

  if (!['COD', 'ONLINE', 'WALLET'].includes(paymentMethod)) {
    throw new Error('Invalid payment method');
  }

  const requiredAddressFields = [
    'name',
    'phone',
    'addressLine',
    'city',
    'state',
    'postalCode',
    'country',
  ];

  if (
    !shippingAddress ||
    requiredAddressFields.some(
      (field) =>
        typeof shippingAddress[field] !== 'string' ||
        !shippingAddress[field].trim()
    )
  ) {
    throw new Error('Please provide a complete shipping address');
  }

  const userExists = await User.exists({ _id: userId });

  if (!userExists) {
    throw new Error('User not found');
  }

  // Validate items and combine quantities for duplicate products.
  const quantities = new Map();

  for (const item of items) {
    if (
      !item ||
      !mongoose.Types.ObjectId.isValid(item.product) ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1
    ) {
      throw new Error('Invalid product or quantity');
    }

    const productId = String(item.product);

    quantities.set(
      productId,
      (quantities.get(productId) || 0) + item.quantity
    );
  }

  const orderItems = [];
  let subtotal = 0;
  const reserved = [];
  let walletDebited = false;
  let discount = 0;
  let appliedCoupon = null;
  let couponClaimed = false;

  try {
    // Validate products and use database prices.
    for (const [productId, quantity] of quantities) {
      const product = await Product.findById(productId);

      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }

      // Each colour and size has its own stock.
      const wanted = new Map();

      for (const line of items.filter((item) => String(item.product) === productId)) {
        const key = `${line.color || ''}|${line.size || ''}`;

        wanted.set(key, {
          color: line.color,
          size: line.size,
          quantity: (wanted.get(key)?.quantity || 0) + line.quantity,
        });
      }

      for (const line of wanted.values()) {
        if (hasVariants(product) && !findVariant(product, line.color, line.size)) {
          throw new Error(
            `${product.name} is not available in ${line.color || 'that colour'}${line.size ? ` / ${line.size}` : ''}`
          );
        }

        const available = availableFor(product, line.color, line.size);

        if (available < line.quantity) {
          throw new Error(
            `Only ${available} left for ${product.name}${line.color ? ` (${line.color}${line.size ? ` / ${line.size}` : ''})` : ''}`
          );
        }
      }

      const requestedLines = items.filter(
        (item) => String(item.product) === productId
      );

      for (const item of requestedLines) {
        // Price after any product offer, from the database.
        const unitPrice = (await effectivePrice(product, item.color, item.size)).finalPrice;
        const lineTotal = unitPrice * item.quantity;

        if (!Number.isFinite(lineTotal)) {
          throw new Error('Invalid order amount');
        }

        subtotal += lineTotal;

        orderItems.push({
          product: product._id,
          name: product.name,
          price: unitPrice,
          quantity: item.quantity,
          size: item.size || null,
          color: item.color || null,
          image: colorImageFor(product, item.color) || product.images?.[0] || null,
        });
      }
    }

    if (paymentMethod === 'ONLINE') {
      throw new Error(
        'Online payment orders are not enabled yet. Please use COD until payment verification is implemented.'
      );
    }

     await reserveLines(items, reserved);
   
    


    const shippingFee = 0;

    // Coupon: checked and claimed on the server, using database prices.
    if (couponCode) {
      const result = await resolveCoupon(couponCode, subtotal, userId);

      appliedCoupon = result.coupon;
      discount = result.discount;

      await claimCouponUse(appliedCoupon);
      couponClaimed = true;
    }

    const totalAmount = money(subtotal - discount + shippingFee);
    const isWalletPayment = paymentMethod === 'WALLET';
    const amountPaise = Math.round(totalAmount * 100);

    // Generate the id up front so the wallet debit can reference it.
    const orderId = new mongoose.Types.ObjectId();

    if (isWalletPayment) {
      if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
        throw new Error('Invalid order amount');
      }

      await wallet.debit({
        userId,
        amount: amountPaise,
        source: 'ORDER_PAYMENT',
        reference: String(orderId),
        description: 'Payment for order',
      });

      walletDebited = true;
    }

    try {
      const order = await Order.create({
        _id: orderId,
        user: userId,
        items: orderItems,
        shippingAddress,
        subtotal,
        shippingFee,
        totalAmount,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        discountAmount: discount,
        paymentMethod: isWalletPayment ? 'WALLET' : 'COD',
        paymentStatus: isWalletPayment ? 'PAID' : 'PENDING',
        orderStatus: 'PLACED',
      });

      return order;
    } catch (orderError) {
      // The order was not saved, so give the wallet money back.
      if (walletDebited) {
        await wallet
          .credit({
            userId,
            amount: amountPaise,
            source: 'REFUND',
            reference: String(orderId),
            description: 'Refund for order that could not be placed',
          })
          .catch((refundError) => {
            console.error(
              'CRITICAL: Wallet refund failed for unsaved order:',
              String(orderId),
              refundError.message
            );
          });
      }

      throw orderError;
    }
  } catch (error) {
    if (couponClaimed) {
      await releaseCouponUse(appliedCoupon.code);
    }

    // Restore reserved stock if order creation fails.
    for (const item of reserved.reverse()) {
      await restoreStock(item).catch((rollbackError) => {
        console.error(
          'CRITICAL: Stock rollback failed:',
          item.productId,
          rollbackError.message
        );
      });
    }

    throw error;
  }
};

const createOnlinePaymentOrder = async (userId, orderData) => {
  const { items, shippingAddress, couponCode } = orderData;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID');
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Your order must contain at least one product');
  }

  const requiredFields = [
    'name',
    'phone',
    'addressLine',
    'city',
    'state',
    'postalCode',
    'country',
  ];

  if (
    !shippingAddress ||
    requiredFields.some(
      (field) =>
        typeof shippingAddress[field] !== 'string' ||
        !shippingAddress[field].trim()
    )
  ) {
    throw new Error('Please provide a complete shipping address');
  }

  if (!(await User.exists({ _id: userId }))) {
    throw new Error('User not found');
  }

  const quantities = new Map();

  for (const item of items) {
    if (
      !item ||
      !mongoose.Types.ObjectId.isValid(item.product) ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1
    ) {
      throw new Error('Invalid product or quantity');
    }

    const id = String(item.product);
    const quantity = (quantities.get(id) || 0) + item.quantity;

    if (!Number.isSafeInteger(quantity)) {
      throw new Error('Invalid product quantity');
    }

    quantities.set(id, quantity);
  }

  const orderItems = [];
  const reserved = [];
  let subtotal = 0;
  let discount = 0;
  let appliedCoupon = null;
  let couponClaimed = false;

  try {
    // Calculate prices from MongoDB, never from the browser.
    for (const [productId, quantity] of quantities) {
      const product = await Product.findById(productId);

      if (!product) {
        throw new Error('Product not found');
      }

      // Each colour and size has its own stock.
      const wanted = new Map();

      for (const line of items.filter((item) => String(item.product) === productId)) {
        const key = `${line.color || ''}|${line.size || ''}`;

        wanted.set(key, {
          color: line.color,
          size: line.size,
          quantity: (wanted.get(key)?.quantity || 0) + line.quantity,
        });
      }

      for (const line of wanted.values()) {
        if (hasVariants(product) && !findVariant(product, line.color, line.size)) {
          throw new Error(
            `${product.name} is not available in ${line.color || 'that colour'}${line.size ? ` / ${line.size}` : ''}`
          );
        }

        const available = availableFor(product, line.color, line.size);

        if (available < line.quantity) {
          throw new Error(
            `Only ${available} left for ${product.name}${line.color ? ` (${line.color}${line.size ? ` / ${line.size}` : ''})` : ''}`
          );
        }
      }

      for (const item of items.filter(
        (entry) => String(entry.product) === productId
      )) {
        // Price after any product offer, from the database.
        const unitPrice = (await effectivePrice(product, item.color, item.size)).finalPrice;
        const lineTotal = unitPrice * item.quantity;

        if (!Number.isFinite(lineTotal)) {
          throw new Error('Invalid order amount');
        }

        subtotal += lineTotal;

        orderItems.push({
          product: product._id,
          name: product.name,
          price: unitPrice,
          quantity: item.quantity,
          size: item.size || null,
          color: item.color || null,
          image: colorImageFor(product, item.color) || product.images?.[0] || null,
        });
      }
    }

    const shippingFee = 0;

    if (couponCode) {
      const result = await resolveCoupon(couponCode, subtotal, userId);

      appliedCoupon = result.coupon;
      discount = result.discount;

      await claimCouponUse(appliedCoupon);
      couponClaimed = true;
    }

    const totalAmount = money(subtotal - discount + shippingFee);
    const amountInPaise = Math.round(totalAmount * 100);

    if (
      !Number.isSafeInteger(amountInPaise) ||
      amountInPaise <= 0
    ) {
      throw new Error('Invalid order amount');
    }

     await reserveLines(items, reserved);

    // Create Razorpay order with the server-calculated amount.
    const paymentOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_${new mongoose.Types.ObjectId()}`,
    });

    // Save a pending local order linked to Razorpay.
    const order = await Order.create({
      user: userId,
      items: orderItems,
      shippingAddress,
      subtotal,
      shippingFee,
      totalAmount,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      discountAmount: discount,
      paymentMethod: 'ONLINE',
      paymentStatus: 'PENDING',
      orderStatus: 'PLACED',
      razorpayOrderId: paymentOrder.id,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    return {
      order,
      razorpayOrder: {
        id: paymentOrder.id,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
      },
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  } catch (error) {
    if (couponClaimed) {
      await releaseCouponUse(appliedCoupon.code);
    }

    // Restore stock reserved by this attempt.
    for (const item of reserved.reverse()) {
      try {
        const restored = await restoreStock(item);
        const result = { modifiedCount: restored ? 1 : 0 };

        if (result.modifiedCount !== 1) {
          console.error(
            'CRITICAL: Verify stock manually for product:',
            item.productId
          );
        }
      } catch (rollbackError) {
        console.error(
          'CRITICAL: Stock rollback failed:',
          item.productId,
          rollbackError.message
        );
      }
    }

    throw error;
  }
};

// Verify Razorpay payment and mark the order as paid.

const verifyRazorpayPayment = async (userId, paymentData) => {
  const {
    orderId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = paymentData;

  if (
    !orderId ||
    !razorpay_order_id ||
    !razorpay_payment_id ||
    !razorpay_signature
  ) {
    throw new Error('Missing payment verification details');
  }

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new Error('Invalid order ID');
  }

  const order = await Order.findOne({
    _id: orderId,
    user: userId,
    paymentMethod: 'ONLINE',
  });

  if (!order) {
    throw new Error('Online order not found');
  }

  if (order.razorpayOrderId !== razorpay_order_id) {
    throw new Error('Payment order ID does not match');
  }

  if (order.paymentStatus === 'PAID') {
    if (order.razorpayPaymentId === razorpay_payment_id) {
      return order;
    }

    throw new Error('Order has already been paid');
  }

  if (order.paymentStatus !== 'PENDING') {
    throw new Error('Order is not awaiting payment');
  }

  if (order.orderStatus === 'CANCELLED') {
    throw new Error(
      'This order has been cancelled. Please contact support if your payment was successful.'
    );
  }

  if (order.expiresAt && order.expiresAt <= new Date()) {
    throw new Error(
      'This order has expired. Please contact support if your payment was successful.'
    );
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

  // Fetch payment details directly from Razorpay.
  const payment = await razorpay.payments.fetch(razorpay_payment_id);

  if (payment.order_id !== razorpay_order_id) {
    throw new Error('Payment does not belong to this Razorpay order');
  }

  const expectedAmount = Math.round(order.totalAmount * 100);

  if (payment.amount !== expectedAmount || payment.currency !== 'INR') {
    throw new Error('Payment amount or currency does not match the order');
  }

  if (payment.status !== 'captured' || payment.captured !== true) {
    throw new Error('Payment has not been captured yet');
  }

  // Update only if the order is still pending, active, and unexpired.
  const updatedOrder = await Order.findOneAndUpdate(
    {
      _id: order._id,
      user: userId,
      paymentMethod: 'ONLINE',
      paymentStatus: 'PENDING',
      razorpayOrderId: razorpay_order_id,
      orderStatus: { $ne: 'CANCELLED' },
      expiresAt: { $gt: new Date() },
    },
    {
      $set: {
        paymentStatus: 'PAID',
        razorpayPaymentId: razorpay_payment_id,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedOrder) {
    throw new Error(
      'The order expired or its status changed during verification. Please contact support if your payment was successful.'
    );
  }

  return updatedOrder;
};

// One page of orders belonging to the logged-in customer.
const getMyOrders = async (userId, { skip, limit }) => {
  const filter = { user: userId };

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  return { orders, total };
};


// One page of orders for admin management, with status and search filters.
// Also returns how many orders are in each status (ignoring the search).
const getAllOrders = async ({ skip, limit, status, search }) => {
  const filter = {};

  if (ORDER_STATUSES.includes(status)) {
    filter.orderStatus = status;
  }

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');

    // Order numbers are shown as #A1B2C3 (admin) or TC-A1B2C3 (invoice). Drop the
    // prefix so the part after it matches the end of the order ID.
    const orderIdPart = search.replace(/^(#|tc-?)/i, '').trim();

    const matchingUserIds = await User.find({
      $or: [{ name: pattern }, { email: pattern }],
    }).distinct('_id');

    filter.$or = [
      { 'shippingAddress.name': pattern },
      { 'shippingAddress.phone': pattern },
      { user: { $in: matchingUserIds } },
      {
        $expr: {
          $regexMatch: {
            input: { $toString: '$_id' },
            regex: escapeRegex(orderIdPart || search),
            options: 'i',
          },
        },
      },
    ];
  }

  const [orders, total, statusGroups] = await Promise.all([
    Order.find(filter)
      .populate('user', 'name email')
      // Current product images, for orders saved without one.
      .populate('items.product', 'images')
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
    Order.aggregate([
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
    ]),
  ]);

  const counts = { ALL: 0 };

  for (const status of ORDER_STATUSES) {
    counts[status] = 0;
  }

  for (const group of statusGroups) {
    counts[group._id] = group.count;
    counts.ALL += group.count;
  }

  return { orders, total, counts };
};

// Update an order status and restore stock when cancelled.
const updateOrderStatus = async (orderId, orderStatus) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new Error('Invalid order ID');
  }

  const allowedTransitions = {
    PLACED: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
  };

  if (
    typeof orderStatus !== 'string' ||
    !Object.prototype.hasOwnProperty.call(
      allowedTransitions,
      orderStatus
    )
  ) {
    throw new Error('Invalid order status');
  }

  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error('Order not found');
  }

  const previousStatus = order.orderStatus;

  if (
    order.paymentMethod === 'ONLINE' &&
    order.paymentStatus === 'PAID' &&
    orderStatus === 'CANCELLED'
  ) {
    throw new Error(
      'Paid online orders cannot be cancelled through this action'
    );
  }

  if (!allowedTransitions[previousStatus].includes(orderStatus)) {
    throw new Error(
      `Cannot change order status from ${previousStatus} to ${orderStatus}`
    );
  }

  // Non-cancellation transitions do not release inventory.
  if (orderStatus !== 'CANCELLED') {
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: orderId,
        orderStatus: previousStatus,
      },
      {
        $set: {
          orderStatus,
          ...(orderStatus === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
          // Cash on delivery is collected on delivery, so it counts as paid then.
          ...(orderStatus === 'DELIVERED' && order.paymentMethod === 'COD'
            ? { paymentStatus: 'PAID' }
            : {}),
        },
        $push: { statusHistory: { status: orderStatus, at: new Date() } },
      },
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      throw new Error(
        'Order status changed by another request. Please refresh and try again.'
      );
    }

    return updatedOrder;
  }

  // Wallet orders are paid up front, so cancelling one means a refund.
  const isWalletPaid =
    order.paymentMethod === 'WALLET' && order.paymentStatus === 'PAID';

  // Atomically claim cancellation and inventory release.
  const cancelledOrder = await Order.findOneAndUpdate(
    {
      _id: orderId,
      orderStatus: previousStatus,
      paymentStatus: isWalletPaid ? 'PAID' : { $ne: 'PAID' },
      inventoryReleased: false,
    },
    {
      $set: {
        orderStatus: 'CANCELLED',
        inventoryReleased: true,
        ...(isWalletPaid ? { paymentStatus: 'REFUNDED' } : {}),
      },
      $push: { statusHistory: { status: 'CANCELLED', at: new Date() } },
    },
    { new: true, runValidators: true }
  );

  if (!cancelledOrder) {
    throw new Error(
      'Order changed or its inventory was already released. Please refresh and check the order.'
    );
  }

  // The coupon use goes back to the pool when the order is cancelled.
  await releaseCouponUse(cancelledOrder.couponCode);

  // Restore stock for the cancellation that claimed the release, colour and size by colour and size.
  try {
    for (const item of cancelledOrder.items) {
      const restored = await restoreStock({
        productId: String(item.product),
        color: item.color,
        size: item.size,
        quantity: item.quantity,
      });

      if (!restored) {
        throw new Error(`Product not found while restoring stock: ${String(item.product)}`);
      }
    }
  } catch (error) {
    console.error(
      'CRITICAL: Inventory restoration failed for cancelled order:',
      orderId,
      error.message
    );

    throw new Error(
      'Order was cancelled, but inventory restoration needs recovery. Check server logs before retrying.'
    );
  }

  if (isWalletPaid) {
    try {
      await wallet.credit({
        userId: cancelledOrder.user,
        amount: Math.round(cancelledOrder.totalAmount * 100),
        source: 'REFUND',
        reference: String(cancelledOrder._id),
        description: 'Refund for cancelled order',
      });
    } catch (error) {
      console.error(
        'CRITICAL: Wallet refund failed for cancelled order:',
        String(orderId),
        error.message
      );

      throw new Error(
        'Order was cancelled, but the wallet refund needs recovery. Check server logs before retrying.'
      );
    }
  }

  return cancelledOrder;
};

// Fetches an order for its invoice. Customers can only open their own.
const getInvoiceOrder = async (orderId, userId, role) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new Error('Invalid order ID');
  }

  const order = await Order.findById(orderId);

  if (!order || (role !== 'admin' && String(order.user) !== String(userId))) {
    throw new Error('Order not found');
  }

  if (order.orderStatus === 'CANCELLED') {
    throw new Error('Invoices are not issued for cancelled orders');
  }

  return order;
};

// Admin: record courier and tracking number for a dispatched order.
const setShipping = async (orderId, { courier, trackingNumber }) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new Error('Invalid order ID');
  }

  const cleanCourier = typeof courier === 'string' ? courier.trim().slice(0, 60) : '';
  const cleanTracking =
    typeof trackingNumber === 'string' ? trackingNumber.trim().slice(0, 60) : '';

  if (!cleanTracking) {
    throw new Error('Enter a tracking number');
  }

  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error('Order not found');
  }

  if (!['PROCESSING', 'SHIPPED'].includes(order.orderStatus)) {
    throw new Error(
      'Shipping details can be added once the order is processing or shipped'
    );
  }

  order.shipping = {
    courier: cleanCourier,
    trackingNumber: cleanTracking,
    shippedAt: order.shipping?.shippedAt || new Date(),
  };

  await order.save();

  return order;
};

module.exports = {
  getInvoiceOrder,
  setShipping,
  createOrder,
  createOnlinePaymentOrder,
  verifyRazorpayPayment,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
};