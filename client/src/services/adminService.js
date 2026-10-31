
import { API_BASE_URL } from '../config.js';

const API_URL = `${API_BASE_URL}/api/admin`;
const ORDERS_API_URL = `${API_BASE_URL}/api/orders`;

// Get admin dashboard statistics
const getDashboardStats = async (token) => {
  const response = await fetch(`${API_URL}/dashboard`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to load dashboard');
  }

  return data.stats;
};

// Products for the admin list: one page, with search by name, category, gender, colour or size.
export const getAdminProducts = async (token, { page = 1, limit = 10, search = '' } = {}) => {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });

  if (search) query.set('search', search);

  const response = await fetch(`${API_URL}/products?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Could not load products');
  }

  return data;
};

// Customers, one page at a time, with an optional search.
export const getCustomers = async (token, { search = '', page = 1, limit = 15 } = {}) => {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });

  if (search) query.set('search', search);

  const response = await fetch(`${API_URL}/customers?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Could not load customers');
  }

  return data;
};

// Blocks or unblocks a customer. A blocked customer cannot sign in or use an open session.
export const setCustomerBlocked = async (token, id, blocked) => {
  const response = await fetch(`${API_URL}/customers/${id}/block`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocked }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Could not update the customer');
  }

  return data;
};

// One customer's details, addresses and orders.
export const getCustomer = async (token, id) => {
  const response = await fetch(`${API_URL}/customers/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Could not load the customer');
  }

  return data;
};

// Sales report for a date range (YYYY-MM-DD, India time, inclusive).
export const getSalesReport = async (token, from, to) => {
  const query = new URLSearchParams({ from, to });
  const response = await fetch(`${API_URL}/sales-report?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Could not load the sales report');
  }

  return data;
};

// Top 5 products by units sold (cancelled orders excluded).
export const getTopProducts = async (token) => {
  const response = await fetch(`${API_URL}/top-products`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Failed to load top products');
  }

  return data.products || [];
};

// Revenue and orders per day for the last `days` days (7, 30, 90 or 365).
export const getSalesSeries = async (token, days = 30) => {
  const response = await fetch(`${API_URL}/sales?days=${days}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to load sales');
  }

  return data;
};

// One page of customer orders with filters (admin only).
// params: { page, limit, status, search }
// Returns { orders, counts, pagination }.
const getOrdersPage = async (token, params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'ALL') {
      query.set(key, String(value));
    }
  });

  const text = query.toString();

  const response = await fetch(
    `${ORDERS_API_URL}/admin${text ? `?${text}` : ''}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to load orders');
  }

  return {
    orders: data.orders,
    counts: data.counts,
    pagination: data.pagination,
  };
};

// Get all customer orders (admin only). Returns the first page only.
const getAllOrders = async (token) => {
  const response = await fetch(`${ORDERS_API_URL}/admin`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to load orders');
  }

  return data.orders;
};

// Update an order's status (admin only)
const updateOrderStatus = async (token, orderId, orderStatus) => {
  const response = await fetch(
    `${ORDERS_API_URL}/admin/${orderId}/status`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ orderStatus }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to update order status');
  }

  return data.order;
};

export {
  getDashboardStats,
  getAllOrders,
  getOrdersPage,
  updateOrderStatus,
};
