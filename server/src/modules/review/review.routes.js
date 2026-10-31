const express = require('express');

const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const {
  createReviewController,
  myReviewsController,
  productReviewsController,
  myProductReviewStatusController,
  updateReviewController,
  deleteReviewController,
  adminListReviewsController,
  adminSetReviewHiddenController,
  adminDeleteReviewController,
} = require('./review.controller');

const router = express.Router();

// Admin moderation
router.get('/admin', authMiddleware, roleMiddleware('admin'), adminListReviewsController);
router.patch(
  '/admin/:id/visibility',
  authMiddleware,
  roleMiddleware('admin'),
  adminSetReviewHiddenController
);
router.delete('/admin/:id', authMiddleware, roleMiddleware('admin'), adminDeleteReviewController);

// Customer
router.post('/', authMiddleware, createReviewController);
router.get('/mine', authMiddleware, myReviewsController);
router.patch('/:id', authMiddleware, updateReviewController);
router.delete('/:id', authMiddleware, deleteReviewController);

// Product page: what this customer can do (review / edit) for the product.
router.get('/product/:productId/mine', authMiddleware, myProductReviewStatusController);

// Public: reviews shown on a product page.
router.get('/product/:productId', productReviewsController);

module.exports = router;
