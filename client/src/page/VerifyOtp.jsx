
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/auth.css';

const VerifyOtp = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email || '';

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');

    if (!email) {
      setError('Email address is missing. Please request a new code.');
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        'http://localhost:5000/api/auth/verify-otp',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            otp,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'OTP verification failed');
      }

      navigate('/reset-password', {
        state: { email },
      });
    } catch (error) {
      setError(error.message || 'OTP verification failed. Please try again.');
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
          <p className="auth-eyebrow">SECURE YOUR ACCOUNT</p>

          <h1>Verify your email.</h1>

          <p className="auth-description">
            Enter the 6-digit verification code sent to your registered
            email address.
          </p>

          {email && (
            <p className="auth-description">
              Verification for <strong>{email}</strong>
            </p>
          )}
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="verify-otp">Verification code</label>

            <input
              id="verify-otp"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
              }
              placeholder="Enter 6-digit code"
              maxLength={6}
              pattern="[0-9]{6}"
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
            disabled={loading || !email}
          >
            {loading ? 'VERIFYING CODE...' : 'VERIFY CODE'}
          </button>
        </form>

        {!email && (
          <p className="auth-message auth-error" role="alert">
            Your email address is missing. Please request a new code.
          </p>
        )}

        <p className="auth-switch">
          Need another code?{' '}
          <Link to="/forgot-password" className="auth-text-link">
            Request verification
          </Link>
        </p>

        <p className="auth-footer">
          QUALITY IN EVERY DETAIL.
        </p>
      </section>
    </main>
  );
};

export default VerifyOtp;
