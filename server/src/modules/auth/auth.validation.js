const validateRegisterInput = ({ name, email, password }) => {
  const errors = {};

  if (!name || !name.trim()) {
    errors.name = 'Name is required';
  }

  if (!email || !email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Please enter a valid email';
  }

  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  } else if (!/[A-Z]/.test(password)) {
    errors.password = 'Password must contain an uppercase letter';
  } else if (!/[a-z]/.test(password)) {
    errors.password = 'Password must contain a lowercase letter';
  } else if (!/[0-9]/.test(password)) {
    errors.password = 'Password must contain a number';
  } else if (!/[^A-Za-z0-9]/.test(password)) {
    errors.password = 'Password must contain a special character';
  }

  return errors;
};
const validatePassword = (password) => {
  if (!password) {
    return 'Password is required';
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must contain an uppercase letter';
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must contain a lowercase letter';
  }

  if (!/[0-9]/.test(password)) {
    return 'Password must contain a number';
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must contain a special character';
  }

  return null;
};

module.exports = {
  validateRegisterInput,
  validatePassword,
};