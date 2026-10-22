
const API_URL = 'http://localhost:5000/api/admin';
const ORDERS_API_URL = 'http://localhost:5000/api/orders';

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

// Get all customer orders (admin only)
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
  updateOrderStatus,
};
