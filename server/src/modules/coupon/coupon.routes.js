const express = require('express');

const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const {
  previewCouponController,
  adminListCouponsController,
  adminCreateCouponController,
  adminUpdateCouponController,
  adminSetCouponStatusController,
  adminDeleteCouponController,
} = require('./coupon.controller');

const router = express.Router();
const adminOnly = [authMiddleware, roleMiddleware('admin')];

// Customer
router.post('/preview', authMiddleware, previewCouponController);

// Admin
router.get('/admin', ...adminOnly, adminListCouponsController);
router.post('/', ...adminOnly, adminCreateCouponController);
router.patch('/:id', ...adminOnly, adminUpdateCouponController);
router.patch('/:id/status', ...adminOnly, adminSetCouponStatusController);
router.delete('/:id', ...adminOnly, adminDeleteCouponController);

module.exports = router;
