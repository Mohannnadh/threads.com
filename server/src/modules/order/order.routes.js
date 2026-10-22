
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


module.exports = router;
