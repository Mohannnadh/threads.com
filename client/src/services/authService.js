
const API_URL = 'http://localhost:5000/api/auth';

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

// Change the logged-in user's password
const changePassword = async ({
  currentPassword,
  newPassword,
  confirmPassword,
}) => {
  const token = localStorage.getItem('token');

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

export { loginUser, changePassword };
