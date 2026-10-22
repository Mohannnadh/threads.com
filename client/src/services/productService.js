
const API_URL = 'http://localhost:5000/api/products';

const handleResponse = async (response) => {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
};

// Get all products
const getProducts = async () => {
  const response = await fetch(API_URL);
  return handleResponse(response);
};

// Get one product
const getProductById = async (id) => {
  const response = await fetch(`${API_URL}/${id}`);
  return handleResponse(response);
};

// Shared helper for protected admin requests
const adminRequest = async (url, method, product, token) => {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    ...(product ? { body: JSON.stringify(product) } : {}),
  });

  return handleResponse(response);
};

// Create product
const createProduct = (product, token) =>
  adminRequest(API_URL, 'POST', product, token);

// Update product
const updateProduct = (id, product, token) =>
  adminRequest(`${API_URL}/${id}`, 'PUT', product, token);

// Delete product
const deleteProduct = (id, token) =>
  adminRequest(`${API_URL}/${id}`, 'DELETE', null, token);

export {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
