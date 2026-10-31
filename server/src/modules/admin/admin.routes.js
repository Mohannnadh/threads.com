
const express = require('express');

const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const {
  getDashboardStats,
  getSalesSeries,
  getTopProducts,
  getSalesReport,
  listCustomers,
  getCustomer,
  setCustomerBlocked,
  listProductsForAdmin,
} = require('./admin.controller');

const router = express.Router();

// Only authenticated admins can access dashboard statistics.
router.get(
  '/dashboard',
  authMiddleware,
  roleMiddleware('admin'),
  getDashboardStats
);

// Revenue and orders per day for the sales chart.
router.get('/sales', authMiddleware, roleMiddleware('admin'), getSalesSeries);

// Best-selling products for the overview.
router.get('/top-products', authMiddleware, roleMiddleware('admin'), getTopProducts);

// Products for the admin list, with search.
router.get('/products', authMiddleware, roleMiddleware('admin'), listProductsForAdmin);

// Sales report for a date range.
router.get('/sales-report', authMiddleware, roleMiddleware('admin'), getSalesReport);

// Customers and one customer's details.
router.get('/customers', authMiddleware, roleMiddleware('admin'), listCustomers);
router.get('/customers/:id', authMiddleware, roleMiddleware('admin'), getCustomer);
router.patch('/customers/:id/block', authMiddleware, roleMiddleware('admin'), setCustomerBlocked);

module.exports = router;

