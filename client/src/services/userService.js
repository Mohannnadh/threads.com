const API_URL = 'http://localhost:5000/api/users';

// Get the logged-in user's profile
const getUserProfile = async () => {
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_URL}/profile`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch profile');
  }

  return data;
};

// Update the logged-in user's profile
const updateUserProfile = async (userData) => {
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_URL}/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to update profile');
  }

  return data;
};

export { getUserProfile, updateUserProfile };