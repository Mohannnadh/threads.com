
const express = require('express');

const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');

const {
  createOrderController,
   createRazorpayOrderController,
  verifyRazorpayPaymentController,
  getMyOrdersController,
  getAllOrdersController,
  updateOrderStatusController,
  getInvoiceController,
  setShippingController,
} = require('./order.controller');

const router = express.Router();

// Customer: place an order
router.post('/', authMiddleware, createOrderController);

// Customer: create a Razorpay payment order
router.post(
  '/create-razorpay-order',
  authMiddleware,
  createRazorpayOrderController
);
router.post(
  '/verify-razorpay-payment',
  authMiddleware,
  verifyRazorpayPaymentController
);

// Customer: get their own orders
router.get('/my-orders', authMiddleware, getMyOrdersController);

// Customer or admin: download an order's invoice
router.get('/:id/invoice', authMiddleware, getInvoiceController);

// Admin: get all orders
router.get(
  '/admin',
  authMiddleware,
  roleMiddleware('admin'),
  getAllOrdersController
);

// Admin: update an order's status
router.patch(
  '/admin/:id/status',
  authMiddleware,
  roleMiddleware('admin'),
  updateOrderStatusController
);


// Admin: record courier and tracking number
router.patch(
  '/admin/:id/shipping',
  authMiddleware,
  roleMiddleware('admin'),
  setShippingController
);

module.exports = router;
