import { confirmDialog, notifyDialog } from '../components/Dialog.jsx';
import { useEffect, useRef, useState } from 'react';
import {
  getUserProfile,
  updateUserProfile,
  updateAvatar,
  removeAvatar,
} from '../services/userService.js';
import { changePassword } from '../services/authService.js';
import { resizeImageToDataUrl } from '../utils/resizeImage.js';
import AdminLayout, {
  Notice,
  ADMIN_DISPLAY_NAME,
  ADMIN_LOGO_EVENT,
} from '../components/AdminLayout.jsx';
import '../styles/admin.css';
import { sessionKeys } from '../utils/session.js';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Keeps the stored login details in step with what was just saved.
const syncStoredUser = (patch) => {
  const key = sessionKeys('admin').user;
  const stored = JSON.parse(localStorage.getItem(key) || '{}');

  localStorage.setItem(key, JSON.stringify({ ...stored, ...patch }));
};

const emptyPassword = { currentPassword: '', newPassword: '', confirmPassword: '' };

const AdminProfile = () => {
  const fileInputRef = useRef(null);

  const [logo, setLogo] = useState('');
  const [email, setEmail] = useState('');
  const [savedEmail, setSavedEmail] = useState('');
  const [password, setPassword] = useState(emptyPassword);

  const [loading, setLoading] = useState(true);
  const [logoBusy, setLogoBusy] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;

    getUserProfile()
      .then((response) => {
        if (!active) return;

        setLogo(response.user.avatar || '');
        setEmail(response.user.email || '');
        setSavedEmail(response.user.email || '');
      })
      .catch((err) => {
        if (active) setError(err.message || 'Could not load your profile.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const publishLogo = (value) => {
    setLogo(value);
    syncStoredUser({ avatar: value });
    window.dispatchEvent(new CustomEvent(ADMIN_LOGO_EVENT, { detail: value }));
  };

  const handleLogoFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    setError('');
    setNotice('');

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError('Please choose a JPG, PNG or WebP image.');
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setError('Please choose an image under 5 MB.');
      return;
    }

    setLogoBusy(true);

    try {
      const dataUrl = await resizeImageToDataUrl(file);
      const response = await updateAvatar(dataUrl);

      publishLogo(response.avatar);
      setNotice('Logo updated.');
    } catch (err) {
      setError(err.message || 'Could not update the logo.');
    } finally {
      setLogoBusy(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!(await confirmDialog({ message: 'Remove the logo? The "T" mark will show instead.', confirmLabel: 'Remove', danger: true }))) return;

    setLogoBusy(true);
    setError('');
    setNotice('');

    try {
      await removeAvatar();
      publishLogo('');
      setNotice('Logo removed.');
    } catch (err) {
      setError(err.message || 'Could not remove the logo.');
    } finally {
      setLogoBusy(false);
    }
  };

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    const cleaned = email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(cleaned)) {
      setError('Enter a valid email address.');
      return;
    }

    setSavingEmail(true);

    try {
      const response = await updateUserProfile({ email: cleaned });

      setEmail(response.user.email);
      setSavedEmail(response.user.email);
      syncStoredUser({ email: response.user.email });
      setNotice('Email updated. Use this email the next time you sign in.');
    } catch (err) {
      setError(err.message || 'Could not update the email.');
    } finally {
      setSavingEmail(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (password.newPassword !== password.confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }

    setSavingPassword(true);

    try {
      await changePassword(password);
      setPassword(emptyPassword);
      setNotice('Password changed.');
    } catch (err) {
      setError(err.message || 'Could not change the password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const emailChanged = email.trim().toLowerCase() !== savedEmail.toLowerCase();

  return (
    <AdminLayout title="My profile" subtitle={`${ADMIN_DISPLAY_NAME} · Store admin`}>
      {error && (
        <Notice tone="error" onClose={() => setError('')}>
          {error}
        </Notice>
      )}
      {notice && <Notice onClose={() => setNotice('')}>{notice}</Notice>}

      {loading ? (
        <p className="admin-empty">Loading your profile…</p>
      ) : (
        <>
          <section className="admin-panel" style={{ marginBottom: 20 }}>
            <h3 className="admin-panel-title">Logo</h3>
            <p className="admin-muted">
              Shown beside <strong>{ADMIN_DISPLAY_NAME}</strong> in the sidebar.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
              {logo ? (
                <img
                  src={logo}
                  alt="Admin logo"
                  style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: '50%', border: '1px solid var(--adm-line)' }}
                />
              ) : (
                <span
                  className="admin-brand-mark"
                  aria-label="Default logo"
                  style={{ width: 84, height: 84, fontSize: 32 }}
                >
                  T
                </span>
              )}

              <div className="admin-form-actions" style={{ marginTop: 0 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES.join(',')}
                  onChange={handleLogoFile}
                  hidden
                />
                <button
                  type="button"
                  className="admin-button admin-button-primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoBusy}
                >
                  {logoBusy ? 'Working…' : logo ? 'Change logo' : 'Upload logo'}
                </button>
                {logo && (
                  <button
                    type="button"
                    className="admin-button admin-button-danger"
                    onClick={handleRemoveLogo}
                    disabled={logoBusy}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="admin-panel" style={{ marginBottom: 20 }}>
            <h3 className="admin-panel-title">Email</h3>
            <p className="admin-muted">This is the email you sign in with.</p>

            <form onSubmit={handleEmailSubmit}>
              <label className="admin-field">
                <span>Email address</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </label>

              <div className="admin-form-actions">
                <button
                  type="submit"
                  className="admin-button admin-button-primary"
                  disabled={savingEmail || !emailChanged}
                >
                  {savingEmail ? 'Saving…' : 'Change email'}
                </button>
              </div>
            </form>
          </section>

          <section className="admin-panel">
            <h3 className="admin-panel-title">Password</h3>

            <form onSubmit={handlePasswordSubmit}>
              <div className="admin-form-grid">
                <label className="admin-field admin-field-full">
                  <span>Current password</span>
                  <input
                    type="password"
                    value={password.currentPassword}
                    onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })}
                    autoComplete="current-password"
                    required
                  />
                </label>

                <label className="admin-field">
                  <span>New password</span>
                  <input
                    type="password"
                    value={password.newPassword}
                    onChange={(event) => setPassword({ ...password, newPassword: event.target.value })}
                    autoComplete="new-password"
                    required
                  />
                </label>

                <label className="admin-field">
                  <span>Confirm new password</span>
                  <input
                    type="password"
                    value={password.confirmPassword}
                    onChange={(event) => setPassword({ ...password, confirmPassword: event.target.value })}
                    autoComplete="new-password"
                    required
                  />
                </label>
              </div>

              <div className="admin-form-actions">
                <button
                  type="submit"
                  className="admin-button admin-button-primary"
                  disabled={savingPassword}
                >
                  {savingPassword ? 'Updating…' : 'Change password'}
                </button>
              </div>
            </form>
          </section>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminProfile;
