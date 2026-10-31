
const express = require('express');

const {
  createProductController,
  getAllProductsController,
  getCategoriesController,
  getCategorySummaryController,
  uploadProductImagesController,
  moveCategoryController,
  createCategoryController,
  setCategoryStatusController,
  renameCategoryController,
  getProductByIdController,
  lookupProductsController,
  updateProductController,
  deleteProductController,
} = require('./product.controller');

const authMiddleware = require('../../middlewares/authMiddleware');
const { uploadProductImages } = require('../../middlewares/uploadImages');
const roleMiddleware = require('../../middlewares/roleMiddleware');

const router = express.Router();

// Public routes
router.get('/', getAllProductsController);
router.get('/categories', getCategoriesController);
router.get('/categories/summary', getCategorySummaryController);
router.post('/lookup', lookupProductsController);
router.get('/:id', getProductByIdController);

// Admin-only routes
router.patch(
  '/categories/:name',
  authMiddleware,
  roleMiddleware('admin'),
  renameCategoryController
);

router.patch(
  '/categories/:name/status',
  authMiddleware,
  roleMiddleware('admin'),
  setCategoryStatusController
);

router.post(
  '/categories',
  authMiddleware,
  roleMiddleware('admin'),
  createCategoryController
);

router.post(
  '/categories/move',
  authMiddleware,
  roleMiddleware('admin'),
  moveCategoryController
);

router.post(
  '/upload',
  authMiddleware,
  roleMiddleware('admin'),
  uploadProductImages,
  uploadProductImagesController
);

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