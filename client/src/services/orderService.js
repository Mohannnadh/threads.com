
const API_URL = 'http://localhost:5000/api/orders';

// Place a new order
const createOrder = async (orderData, token) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(orderData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to place order');
  }

  return data.order;
};
// Create a Razorpay order on the backend
const createRazorpayOrder = async (orderData, token) => {
  const response = await fetch(`${API_URL}/create-razorpay-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(orderData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to create Razorpay order');
  }

  return data;
};
// Verify a Razorpay payment on the backend
const verifyRazorpayPayment = async (paymentData, token) => {
  const response = await fetch(
    `${API_URL}/verify-razorpay-payment`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(paymentData),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || 'Failed to verify Razorpay payment'
    );
  }

  return data;
};

// Get orders belonging to the logged-in customer
const getMyOrders = async (token) => {
  const response = await fetch(`${API_URL}/my-orders`, {
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

export {
  createOrder,
  getMyOrders,
  createRazorpayOrder,
  verifyRazorpayPayment,
};
