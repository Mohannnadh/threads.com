const express = require('express');

const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const {
  requestReturnController,
  myReturnsController,
  adminListReturnsController,
  adminUpdateReturnController,
} = require('./returns.controller');

const router = express.Router();

// Customer
router.post('/', authMiddleware, requestReturnController);
router.get('/mine', authMiddleware, myReturnsController);

// Admin
router.get(
  '/admin',
  authMiddleware,
  roleMiddleware('admin'),
  adminListReturnsController
);
router.patch(
  '/admin/:id/status',
  authMiddleware,
  roleMiddleware('admin'),
  adminUpdateReturnController
);

module.exports = router;
