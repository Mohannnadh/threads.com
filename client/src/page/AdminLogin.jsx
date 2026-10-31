import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { loginAdmin } from '../services/authService.js';
import { Icon } from '../components/Icon.jsx';
import { Notice } from '../components/AdminLayout.jsx';
import '../styles/admin.css';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, role } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Already signed in as an admin: go straight to the dashboard.
  if (isAuthenticated && role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await loginAdmin(email.trim(), password);

      if (!data?.token) {
        throw new Error('Authentication token was not received.');
      }

      login(data.token, data.user);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-login">
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <div className="admin-login-brand">
          <span className="admin-brand-mark" aria-hidden="true">
            T
          </span>
          <span className="admin-brand-text">
            Threads<span>.com</span>
          </span>
        </div>

        <header className="admin-login-heading">
          <h1 id="admin-login-title">Admin sign in</h1>
          <p>
            For store staff. Use the email and password of an admin
            account.
          </p>
        </header>

        {error && (
          <Notice tone="error" onClose={() => setError('')}>
            {error}
          </Notice>
        )}

        <form className="admin-login-form" onSubmit={handleSubmit}>
          <label className="admin-field">
            <span>Work email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
              disabled={loading}
              autoFocus
            />
          </label>

          <label className="admin-field">
            <span>Password</span>
            <span className="admin-password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="admin-icon-button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                disabled={loading}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} />
              </button>
            </span>
          </label>

          <button
            type="submit"
            className="admin-button admin-button-primary admin-button-block admin-login-submit"
            disabled={loading}
          >
            {loading ? 'Checking your access…' : 'Sign in to admin'}
          </button>
        </form>

        <p className="admin-login-footer">
          Shopping instead?{' '}
          <Link to="/login">Go to the customer sign-in</Link>
        </p>
      </section>
    </main>
  );
};

export default AdminLogin;
