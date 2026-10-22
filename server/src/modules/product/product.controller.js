const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
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

const getAllProductsController = async (req, res) => {
  try {
    const products = await getAllProducts();

    return res.status(200).json({
      success: true,
      products,
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

module.exports = {
  createProductController,
  getAllProductsController,
  getProductByIdController,
  updateProductController,
  deleteProductController,
};
