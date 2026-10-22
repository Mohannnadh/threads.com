const crypto = require('crypto');
const mongoose = require('mongoose');
const Order = require('./order.model');
const Product = require('../product/product.model');
const User = require('../user/user.model');
const razorpay = require('../../config/razorpay');

// Create a new order.
const createOrder = async (userId, orderData) => {
  const { items, shippingAddress, paymentMethod } = orderData;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID');
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Your order must contain at least one product');
  }

  if (!['COD', 'ONLINE'].includes(paymentMethod)) {
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

  try {
    // Validate products and use database prices.
    for (const [productId, quantity] of quantities) {
      const product = await Product.findById(productId);

      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }

      if (product.stock < quantity) {
        throw new Error(
          `Insufficient stock for ${product.name}. Available: ${product.stock}`
        );
      }

      const requestedLines = items.filter(
        (item) => String(item.product) === productId
      );

      for (const item of requestedLines) {
        const lineTotal = product.price * item.quantity;

        if (!Number.isFinite(lineTotal)) {
          throw new Error('Invalid order amount');
        }

        subtotal += lineTotal;

        orderItems.push({
          product: product._id,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          size: item.size || null,
          color: item.color || null,
          image: product.images?.[0] || null,
        });
      }
    }

    if (paymentMethod !== 'COD') {
      throw new Error(
        'Online payment orders are not enabled yet. Please use COD until payment verification is implemented.'
      );
    }

    // Reserve stock atomically.
    for (const [productId, quantity] of quantities) {
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: productId,
          stock: { $gte: quantity },
        },
        {
          $inc: { stock: -quantity },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedProduct) {
        throw new Error(
          'Stock changed while placing your order. Please try again.'
        );
      }

      reserved.push({ productId, quantity });
    }

    const shippingFee = 0;
    const totalAmount = subtotal + shippingFee;

    const order = await Order.create({
      user: userId,
      items: orderItems,
      shippingAddress,
      subtotal,
      shippingFee,
      totalAmount,
      paymentMethod: 'COD',
      paymentStatus: 'PENDING',
      orderStatus: 'PLACED',
    });

    return order;
  } catch (error) {
    // Restore reserved stock if order creation fails.
    for (const item of reserved.reverse()) {
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { stock: item.quantity } }
      ).catch((rollbackError) => {
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
  const { items, shippingAddress } = orderData;

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

  try {
    // Calculate prices from MongoDB, never from the browser.
    for (const [productId, quantity] of quantities) {
      const product = await Product.findById(productId);

      if (!product) {
        throw new Error('Product not found');
      }

      if (product.stock < quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      for (const item of items.filter(
        (entry) => String(entry.product) === productId
      )) {
        const lineTotal = product.price * item.quantity;

        if (!Number.isFinite(lineTotal)) {
          throw new Error('Invalid order amount');
        }

        subtotal += lineTotal;

        orderItems.push({
          product: product._id,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          size: item.size || null,
          color: item.color || null,
          image: product.images?.[0] || null,
        });
      }
    }

    const shippingFee = 0;
    const totalAmount = subtotal + shippingFee;
    const amountInPaise = Math.round(totalAmount * 100);

    if (
      !Number.isSafeInteger(amountInPaise) ||
      amountInPaise <= 0
    ) {
      throw new Error('Invalid order amount');
    }

    // Reserve stock atomically.
    for (const [productId, quantity] of quantities) {
      const updated = await Product.findOneAndUpdate(
        {
          _id: productId,
          stock: { $gte: quantity },
        },
        { $inc: { stock: -quantity } },
        { new: true, runValidators: true }
      );

      if (!updated) {
        throw new Error(
          'Stock changed while placing your order. Please try again.'
        );
      }

      reserved.push({ productId, quantity });
    }

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
    // Restore stock reserved by this attempt.
    for (const item of reserved.reverse()) {
      try {
        const result = await Product.updateOne(
          { _id: item.productId },
          { $inc: { stock: item.quantity } }
        );

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

};
// Get orders belonging to the logged-in customer.
const getMyOrders = async (userId) => {
  return Order.find({ user: userId }).sort({ createdAt: -1 });
};


// Get all orders for admin order management.
const getAllOrders = async () => {
  return Order.find()
    .populate('user', 'name email')
    .sort({ createdAt: -1 });
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
  // Prevent cancellation of an already-paid online order.
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

  // Only one request can successfully claim this status transition.
  const updatedOrder = await Order.findOneAndUpdate(
    {
      _id: orderId,
      orderStatus: previousStatus,
    },
    {
      $set: { orderStatus },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedOrder) {
    throw new Error(
      'Order status changed by another request. Please refresh and try again.'
    );
  }

  if (orderStatus === 'CANCELLED') {
    // Combine duplicate product entries before restoring stock.
    const quantities = new Map();

    for (const item of order.items) {
      const productId = String(item.product);

      quantities.set(
        productId,
        (quantities.get(productId) || 0) + item.quantity
      );
    }

    const restored = [];

    try {
      for (const [productId, quantity] of quantities) {
        const result = await Product.updateOne(
          { _id: productId },
          { $inc: { stock: quantity } }
        );

        if (result.matchedCount !== 1) {
          throw new Error(
            `Product not found while restoring stock: ${productId}`
          );
        }

        restored.push({ productId, quantity });
      }
    } catch (error) {
      // Undo any stock restoration already completed.
      let stockRollbackFailed = false;

      for (const item of restored.reverse()) {
        try {
          const result = await Product.updateOne(
            {
              _id: item.productId,
              stock: { $gte: item.quantity },
            },
            { $inc: { stock: -item.quantity } }
          );

          if (result.modifiedCount !== 1) {
            stockRollbackFailed = true;
          }
        } catch (rollbackError) {
          stockRollbackFailed = true;

          console.error(
            'CRITICAL: Stock rollback failed:',
            item.productId,
            rollbackError.message
          );
        }
      }

      if (!stockRollbackFailed) {
        try {
          const rollback = await Order.updateOne(
            {
              _id: orderId,
              orderStatus: 'CANCELLED',
            },
            {
              $set: { orderStatus: previousStatus },
            }
          );

          if (rollback.modifiedCount !== 1) {
            console.error(
              'CRITICAL: Order status rollback failed:',
              orderId
            );
          }
        } catch (rollbackError) {
          console.error(
            'CRITICAL: Order status rollback failed:',
            orderId,
            rollbackError.message
          );
        }
      } else {
        console.error(
          'CRITICAL: Manual inventory verification required for order:',
          orderId
        );
      }

      throw error;
    }
  }

  return updatedOrder;
};

module.exports = {
  createOrder,
  createOnlinePaymentOrder,
  verifyRazorpayPayment,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
};