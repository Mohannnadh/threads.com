
import { API_BASE_URL } from '../config.js';

const API_URL = `${API_BASE_URL}/api/products`;

const handleResponse = async (response) => {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
};

// Build a query string, skipping empty or default values.
const toQuery = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      query.set(key, String(value));
    }
  });

  const text = query.toString();
  return text ? `?${text}` : '';
};

// Get one page of products.
// params: { page, limit, search, gender, category, sort }
const getProducts = async (params = {}) => {
  const response = await fetch(`${API_URL}${toQuery(params)}`);
  return handleResponse(response);
};

// Distinct category names for the category filter.
const getProductCategories = async () => {
  const response = await fetch(`${API_URL}/categories`);
  const data = await handleResponse(response);
  return data.categories || [];
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

// Category tiles: name, product count and a picture.
const getCategorySummary = async () => {
  const response = await fetch(`${API_URL}/categories/summary`);
  const data = await handleResponse(response);
  return data.categories || [];
};

// Admin: upload product images. Returns the public URLs.
const uploadProductImages = async (files, token) => {
  const body = new FormData();
  files.forEach((file) => body.append('images', file));

  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Image upload failed');
  }

  return data.urls || [];
};

// Admin: rename a category. Returns the new name and how many products moved.
const renameCategory = async (name, newName, token) => {
  const response = await fetch(`${API_URL}/categories/${encodeURIComponent(name)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name: newName }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Could not rename the category');
  }

  return data.category;
};

// Admin: show or hide a category in the shop.
const setCategoryStatus = async (name, isActive, token) => {
  const response = await fetch(
    `${API_URL}/categories/${encodeURIComponent(name)}/status`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isActive }),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Could not change the category');
  }

  return data;
};

// Admin: create a category that can be chosen before any product uses it.
const createCategory = async (name, token) => {
  const response = await fetch(`${API_URL}/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Could not add the category');
  }

  return data;
};

// Admin: move every product from one category to another.
const moveCategoryProducts = async (from, to, token) => {
  const response = await fetch(`${API_URL}/categories/move`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ from, to }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Could not move products');
  }

  return data;
};

export {
  renameCategory,
  setCategoryStatus,
  createCategory,
  moveCategoryProducts,
  getCategorySummary,
  uploadProductImages,
  getProducts,
  getProductCategories,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};

// Current details for products in a cart or wishlist. Deleted products are left out.
export const lookupProducts = async (ids) => {
  const response = await fetch(`${API_URL}/lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Could not check your products');
  }

  return data.products || [];
};
