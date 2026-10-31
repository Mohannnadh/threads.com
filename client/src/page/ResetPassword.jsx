 
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/auth.css';
import { API_BASE_URL } from '../config.js';

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');

    if (!email) {
      setError('Your email is missing. Please verify your OTP again.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Your password must contain at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Password reset failed');
      }

      navigate('/login', {
        state: { message: data.message || 'Password reset successfully.' },
      });
    } catch (error) {
      setError(error.message || 'Password reset failed. Please try again.');
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
          <p className="auth-eyebrow">ACCOUNT RECOVERY</p>

          <h1>Create a new password.</h1>

          <p className="auth-description">
            Choose a strong password to secure your Threads.com account.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="new-password">New password</label>

            <input
              id="new-password"
              name="newPassword"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Enter your new password"
              autoComplete="new-password"
              minLength={8}
              required
              disabled={loading}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="confirm-password">Confirm new password</label>

            <input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter your new password"
              autoComplete="new-password"
              minLength={8}
              required
              disabled={loading}
            />
          </div>

          {error && (
            <p className="auth-message auth-error" role="alert">
              {error}
            </p>
          )}

          {!email && (
            <p className="auth-message auth-error" role="alert">
              Your email address is missing. Please restart the password
              recovery process.
            </p>
          )}

          <button
            className="auth-primary-button"
            type="submit"
            disabled={loading || !email}
          >
            {loading ? 'RESETTING PASSWORD...' : 'RESET PASSWORD'}
          </button>
        </form>

        <p className="auth-switch">
          Remember your password?{' '}
          <Link to="/login" className="auth-text-link">
            Sign in
          </Link>
        </p>

        <p className="auth-footer">
          QUALITY IN EVERY DETAIL.
        </p>
      </section>
    </main>
  );
};

export default ResetPassword;
