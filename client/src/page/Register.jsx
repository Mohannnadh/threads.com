
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/auth.css';
import { API_BASE_URL } from '../config.js';
import { Icon } from '../components/Icon.jsx';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';
import { loginWithGoogle } from '../services/authService.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getSessionToken } from '../utils/session.js';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

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
      const registrationData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      };

      const response = await fetch(
        `${API_BASE_URL}/api/auth/register`,
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
    } catch {
      setError('Unable to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential, googleError) => {
    if (googleError) {
      setError(googleError.message);
      return;
    }

    if (!credential) {
      setError('Google sign-in did not return a credential. Please try again.');
      return;
    }

    setMessage('');
    setError('');
    setLoading(true);

    try {
      const data = await loginWithGoogle(credential);

      if (!data?.token) {
        throw new Error('Authentication token was not received.');
      }

      login(data.token, data.user);

      if (getSessionToken() !== data.token) {
        throw new Error('Unable to save your login session.');
      }

      navigate('/home', { replace: true });
    } catch (error) {
      setError(error.message || 'Google sign-in failed. Please try again.');
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
                {showPassword ? <Icon name="eyeOff" /> : <Icon name="eye" />}
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
                {showConfirmPassword ? <Icon name="eyeOff" /> : <Icon name="eye" />}
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
                  ? <><Icon name="check" size={14} /> Passwords match</>
                  : <><Icon name="x" size={14} /> Passwords do not match</>}
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

        <div className="auth-divider" aria-hidden="true">
          <span>OR CONTINUE WITH</span>
        </div>
        <GoogleSignInButton
          onCredential={handleGoogleCredential}
          disabled={loading}
        />

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
