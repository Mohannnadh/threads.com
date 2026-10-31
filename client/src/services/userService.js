import { API_BASE_URL } from '../config.js';
import { getSessionToken } from '../utils/session.js';

const API_URL = `${API_BASE_URL}/api/users`;

// Shared request helper: attaches the token, parses JSON safely and
// throws an Error carrying the server's message on failure.
const request = async (path, { method = 'GET', body } = {}) => {
  const token = getSessionToken();

  const headers = { Authorization: `Bearer ${token}` };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'Something went wrong. Please try again.');
    error.status = response.status;
    throw error;
  }

  return data;
};

// Profile
const getUserProfile = () => request('/profile');

const updateUserProfile = (userData) =>
  request('/profile', { method: 'PATCH', body: userData });

// Saved addresses
const addAddress = (address) =>
  request('/addresses', { method: 'POST', body: address });

const updateAddress = (addressId, address) =>
  request(`/addresses/${addressId}`, { method: 'PATCH', body: address });

const setDefaultAddress = (addressId) =>
  request(`/addresses/${addressId}/default`, { method: 'PATCH' });

const deleteAddress = (addressId) =>
  request(`/addresses/${addressId}`, { method: 'DELETE' });

// Profile photo (data URL, already resized on the client)
const updateAvatar = (avatar) =>
  request('/avatar', { method: 'PATCH', body: { avatar } });

const removeAvatar = () => request('/avatar', { method: 'DELETE' });

export {
  getUserProfile,
  updateUserProfile,
  addAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
  updateAvatar,
  removeAvatar,
};
