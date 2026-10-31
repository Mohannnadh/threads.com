
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/auth.css';
import { API_BASE_URL } from '../config.js';

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/forgot-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: email.trim() }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Unable to process password reset request'
        );
      }

      navigate('/verify-otp', {
        state: { email: email.trim() },
      });
    } catch (error) {
      setError(error.message || 'Something went wrong. Please try again.');
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

          <h1>Forgot your password?</h1>

          <p className="auth-description">
            Enter your registered email address and we'll send you
            a verification code to reset your password.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="forgot-email">Email address</label>

            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={loading}
            />
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
            {loading ? 'SENDING CODE...' : 'SEND VERIFICATION CODE'}
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

export default ForgotPassword;
