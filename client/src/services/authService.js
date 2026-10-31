
import { API_BASE_URL } from '../config.js';
import { getSessionToken } from '../utils/session.js';

const API_URL = `${API_BASE_URL}/api/auth`;

const loginUser = async (email, password) => {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Login failed');
  }

  return data;
};

const loginWithGoogle = async (credential) => {
  const response = await fetch(`${API_URL}/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ credential }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Google sign-in failed');
  }

  return data;
};

// Change the logged-in user's password
const changePassword = async ({
  currentPassword,
  newPassword,
  confirmPassword,
}) => {
  const token = getSessionToken();

  if (!token) {
    throw new Error('Please log in to change your password.');
  }

  const response = await fetch(`${API_URL}/change-password`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      currentPassword,
      newPassword,
      confirmPassword,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to change password');
  }

  return data;
};

// Admin sign-in: same credentials, but the server only issues a token
// for accounts with the admin role.
const loginAdmin = async (email, password) => {
  const response = await fetch(`${API_URL}/admin/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Admin sign-in failed');
  }

  return data;
};

export { loginUser, loginWithGoogle, loginAdmin, changePassword };
