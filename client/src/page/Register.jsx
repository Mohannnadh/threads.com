
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/auth.css';

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordsMatch =
    formData.confirmPassword.length > 0 &&
    formData.password === formData.confirmPassword;

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    setError('');
    setMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage('');
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...registrationData } = formData;

      const response = await fetch(
        'http://localhost:5000/api/auth/register',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(registrationData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setError(Object.values(data.errors).join(', '));
        } else {
          setError(data.message || 'Registration failed.');
        }
        return;
      }

      setMessage(data.message || 'Account created successfully.');

      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
      });

      navigate('/login');
    } catch (error) {
      setError('Unable to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Link to="/login" className="auth-brand">
          THREADS<span>.COM</span>
        </Link>

        <div className="auth-heading">
          <p className="auth-eyebrow">JOIN THREADS</p>
          <h1>Create your account.</h1>
          <p className="auth-description">
            Start building your everyday essentials collection.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="register-name">Full name</label>
            <input
              id="register-name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              autoComplete="name"
              required
              disabled={loading}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="register-email">Email address</label>
            <input
              id="register-email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={loading}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="register-password">Password</label>

            <div className="password-input-wrapper">
              <input
                id="register-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                autoComplete="new-password"
                required
                disabled={loading}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                disabled={loading}
              >
                {showPassword ?  '👁':'︶' }
              </button>
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="register-confirm-password">
              Confirm password
            </label>

            <div className="password-input-wrapper">
              <input
                id="register-confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                required
                disabled={loading}
                aria-invalid={
                  formData.confirmPassword.length > 0 && !passwordsMatch
                }
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowConfirmPassword((previous) => !previous)
                }
                aria-label={
                  showConfirmPassword
                    ? 'Hide confirm password'
                    : 'Show confirm password'
                }
                aria-pressed={showConfirmPassword}
                disabled={loading}
              >
                {showConfirmPassword ? '👁':'︶'}
              </button>
            </div>

            {formData.confirmPassword.length > 0 && (
              <p
                className={`password-match-message ${
                  passwordsMatch ? 'password-match-success' : 'password-match-error'
                }`}
                role="status"
              >
                {passwordsMatch
                  ? '✓ Passwords match'
                  : '✕ Passwords do not match'}
              </p>
            )}
          </div>

          {error && (
            <p className="auth-message auth-error" role="alert">
              {error}
            </p>
          )}

          {message && (
            <p className="auth-message" role="status">
              {message}
            </p>
          )}

          <button
            className="auth-primary-button"
            type="submit"
            disabled={loading}
          >
            {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <Link to="/login" className="auth-text-link">
            Sign in
          </Link>
        </p>

        <p className="auth-footer">QUALITY IN EVERY DETAIL.</p>
      </section>
    </main>
  );
};

export default Register;
