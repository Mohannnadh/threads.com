
const express = require('express');

const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const { getDashboardStats } = require('./admin.controller');

const router = express.Router();

// Only authenticated admins can access dashboard statistics.
router.get(
  '/dashboard',
  authMiddleware,
  roleMiddleware('admin'),
  getDashboardStats
);

module.exports = router;

