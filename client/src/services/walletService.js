import { API_BASE_URL } from '../config.js';

const API_URL = `${API_BASE_URL}/api/wallet`;

const request = async (url, options = {}) => {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Wallet request failed');
  }

  return data;
};

const authHeaders = (token, withBody = false) => ({
  ...(withBody ? { 'Content-Type': 'application/json' } : {}),
  Authorization: `Bearer ${token}`,
});

// Balance (in paise) and one page of transactions.
const getWallet = (token, page = 1, limit = 10) =>
  request(`${API_URL}?page=${page}&limit=${limit}`, {
    headers: authHeaders(token),
  });

// Start adding money. amount is in whole rupees.
const createTopUpOrder = (token, amount) =>
  request(`${API_URL}/topup/order`, {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify({ amount }),
  });

// Confirm a Razorpay payment and credit the wallet.
const verifyTopUp = (token, paymentData) =>
  request(`${API_URL}/topup/verify`, {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify(paymentData),
  });

export { getWallet, createTopUpOrder, verifyTopUp };
