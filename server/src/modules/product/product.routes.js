
const express = require('express');

const {
  createProductController,
  getAllProductsController,
  getProductByIdController,
  updateProductController,
  deleteProductController,
} = require('./product.controller');

const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');

const router = express.Router();

// Public routes
router.get('/', getAllProductsController);
router.get('/:id', getProductByIdController);

// Admin-only routes
router.post(
  '/',
  authMiddleware,
  roleMiddleware('admin'),
  createProductController
);

router.put(
  '/:id',
  authMiddleware,
  roleMiddleware('admin'),
  updateProductController
);

router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware('admin'),
  deleteProductController
);

module.exports = router;