const {
  createProduct,
  getProductsPage,
  getProductCategories,
  getCategorySummary,
  moveCategoryProducts,
  createCategory,
  setCategoryStatus,
  renameCategory,
  getProductById,
  updateProduct,
  deleteProduct,
  lookupProducts,
} = require('./product.service');

const createProductController = async (req, res) => {
  try {
    const product = await createProduct(req.body);

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const { parsePagination, buildPagination, cleanSearch } = require('../../utils/pagination');

// Accepts a non-negative number; anything else means no limit.
const parsePrice = (value) => {
  if (value === undefined || value === '') return null;

  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

// GET /api/products?page=&limit=&search=&gender=&category=&sort=&minPrice=&maxPrice=
const getAllProductsController = async (req, res) => {
  try {
    const pagination = parsePagination(req.query, {
      defaultLimit: 12,
      maxLimit: 48,
    });

    const category = cleanSearch(req.query.category);

    const { products, total } = await getProductsPage({
      skip: pagination.skip,
      limit: pagination.limit,
      search: cleanSearch(req.query.search),
      gender: typeof req.query.gender === 'string' ? req.query.gender : '',
      category: category && category !== 'all' ? category : '',
      sort: typeof req.query.sort === 'string' ? req.query.sort : 'recent',
      minPrice: parsePrice(req.query.minPrice),
      maxPrice: parsePrice(req.query.maxPrice),
      featured: req.query.featured === 'true',
    });

    return res.status(200).json({
      success: true,
      products,
      pagination: buildPagination(total, pagination),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET /api/products/categories
const getCategoriesController = async (req, res) => {
  try {
    const categories = await getProductCategories();

    return res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getProductByIdController = async (req, res) => {
  try {
    const product = await getProductById(req.params.id);

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

const updateProductController = async (req, res) => {
  try {
    const product = await updateProduct(
      req.params.id,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteProductController = async (req, res) => {
  try {
    const product = await deleteProduct(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      product,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

const getCategorySummaryController = async (req, res) => {
  try {
    const categories = await getCategorySummary();

    return res.status(200).json({ success: true, categories });
  } catch (error) {
    console.error('Category summary error:', error);

    return res.status(500).json({ success: false, message: 'Failed to load categories' });
  }
};

// Admin: returns public URLs for the uploaded images.
const uploadProductImagesController = (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'Choose at least one image to upload' });
  }

  const base = `${req.protocol}://${req.get('host')}`;
  const urls = req.files.map((file) => `${base}/uploads/products/${file.filename}`);

  return res.status(201).json({ success: true, message: 'Images uploaded', urls });
};

// Admin: move a category's products to another category (the source category disappears).
const moveCategoryController = async (req, res) => {
  try {
    const moved = await moveCategoryProducts(req.body?.from, req.body?.to);

    return res.status(200).json({
      success: true,
      message: `Moved ${moved} product(s)`,
      moved,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// Admin: create a category.
const createCategoryController = async (req, res) => {
  try {
    const category = await createCategory(req.body?.name);

    return res.status(201).json({
      success: true,
      message: 'Category created',
      category: { name: category.name },
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// Admin: activate or deactivate a category.
const setCategoryStatusController = async (req, res) => {
  try {
    const category = await setCategoryStatus(req.params.name, req.body?.isActive);

    return res.status(200).json({
      success: true,
      message: category.isActive ? 'Category activated' : 'Category deactivated',
      category,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// Admin: rename a category.
const renameCategoryController = async (req, res) => {
  try {
    const category = await renameCategory(req.params.name, req.body?.name);

    return res.status(200).json({
      success: true,
      message: `Renamed. ${category.moved} product(s) updated`,
      category,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// Public: current details for the products in a visitor's cart or wishlist.
const lookupProductsController = async (req, res) => {
  try {
    const products = await lookupProducts(req.body?.ids);

    return res.status(200).json({ success: true, products });
  } catch (error) {
    console.error('Lookup products error:', error);

    return res.status(500).json({ success: false, message: 'Could not check your products' });
  }
};

module.exports = {
  lookupProductsController,
  renameCategoryController,
  setCategoryStatusController,
  createCategoryController,
  moveCategoryController,
  getCategorySummaryController,
  uploadProductImagesController,
  createProductController,
  getAllProductsController,
  getCategoriesController,
  getProductByIdController,
  updateProductController,
  deleteProductController,
};
