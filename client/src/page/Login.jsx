
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginUser, loginWithGoogle } from '../services/authService.js';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/auth.css';
import { Icon } from '../components/Icon.jsx';
import { getSessionToken } from '../utils/session.js';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const successMessage = location.state?.message || '';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await loginUser(email.trim(), password);

      if (!data?.token) {
        throw new Error('Authentication token was not received.');
      }

      login(data.token, data.user);

      if (getSessionToken() !== data.token) {
        throw new Error('Unable to save your login session.');
      }

      if (data.user?.role === 'admin') {
        navigate('/admin/products', { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
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
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.');
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
          <p className="auth-eyebrow">WELCOME BACK</p>
          <h1>Sign in to your account.</h1>
          <p className="auth-description">
            Your everyday essentials are waiting.
          </p>
        </div>

        {successMessage && (
          <p className="auth-message" role="status">
            {successMessage}
          </p>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={loading}
            />
          </div>

          <div className="auth-field">
            <div className="auth-label-row">
              <label htmlFor="login-password">Password</label>
              <Link to="/forgot-password" className="auth-text-link">
                Forgot password?
              </Link>
            </div>

            <div className="password-input-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                disabled={loading}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword((previous) => !previous)
                }
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                disabled={loading}
              >
                {showPassword ? <Icon name="eyeOff" /> : <Icon name="eye" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="auth-message auth-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="auth-primary-button"
            type="submit"
            disabled={loading}
          >
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
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
          New to Threads.com?{' '}
          <Link to="/register" className="auth-text-link">
            Create an account
          </Link>
        </p>

        <p className="auth-switch">
          Store staff?{' '}
          <Link to="/admin/login" className="auth-text-link">
            Admin sign in
          </Link>
        </p>

        <p className="auth-footer">
          QUALITY IN EVERY DETAIL.
        </p>
      </section>
    </main>
  );
};

export default Login;
