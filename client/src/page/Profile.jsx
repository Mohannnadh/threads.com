import { useEffect, useRef, useState } from 'react';
import {
  getUserProfile,
  updateUserProfile,
  updateAvatar,
  removeAvatar,
} from '../services/userService.js';
import { changePassword } from '../services/authService.js';
import AddressBook from '../components/AddressBook.jsx';
import { Icon } from '../components/Icon.jsx';
import { resizeImageToDataUrl } from '../utils/resizeImage.js';
import '../App.css';
import '../styles/profile.css';

const TABS = [
  { id: 'personal', label: 'Personal details' },
  { id: 'addresses', label: 'Addresses' },
  { id: 'security', label: 'Security' },
];

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const emptyProfile = {
  firstName: '',
  lastName: '',
  gender: '',
  dateOfBirth: '',
  email: '',
};

// Builds the editable form values from the server's user object.
// Supports older accounts that only have a single full-name field.
const toProfileForm = (user) => {
  const nameParts = (user.name || '').trim().split(/\s+/);

  return {
    firstName: user.firstName || nameParts[0] || '',
    lastName: user.lastName || nameParts.slice(1).join(' '),
    gender: user.gender || '',
    dateOfBirth: user.dateOfBirth
      ? new Date(user.dateOfBirth).toISOString().slice(0, 10)
      : '',
    email: user.email || '',
  };
};

// The parts of the account that aren't part of the personal-details form.
const toAccountState = (user) => ({
  avatar: user.avatar || '',
  addresses: user.addresses || [],
  createdAt: user.createdAt || null,
});

const getInitials = (form) => {
  const first = form.firstName.trim()[0] || '';
  const last = form.lastName.trim()[0] || '';
  return (first + last).toUpperCase() || '?';
};

const formatMemberSince = (dateValue) => {
  if (!dateValue) return '';

  return new Date(dateValue).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
};

// Keeps the cached user (used elsewhere in the app) in sync with the server.
const syncStoredUser = (patch) => {
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  localStorage.setItem('user', JSON.stringify({ ...storedUser, ...patch }));
};

const emptyPasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const Profile = () => {
  const [activeTab, setActiveTab] = useState('personal');

  const [formData, setFormData] = useState(emptyProfile);
  const [account, setAccount] = useState({
    avatar: '',
    addresses: [],
    createdAt: null,
  });

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileInputRef = useRef(null);

  const [passwordData, setPasswordData] = useState(emptyPasswordForm);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Re-fetches the profile (used when the user cancels an edit).
  const refreshProfile = async () => {
    try {
      const response = await getUserProfile();
      setFormData(toProfileForm(response.user));
      setAccount(toAccountState(response.user));
    } catch (err) {
      setError(err.message || 'Unable to load profile.');
    }
  };

  useEffect(() => {
    let cancelled = false;

    getUserProfile()
      .then((response) => {
        if (cancelled) return;
        setFormData(toProfileForm(response.user));
        setAccount(toAccountState(response.user));
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Unable to load profile.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await updateUserProfile({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth || null,
        email: formData.email.trim(),
      });

      setFormData(toProfileForm(response.user));
      syncStoredUser(response.user);

      setEditing(false);
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err.message || 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setError('');
    setSuccess('');
    setEditing(false);
    refreshProfile();
  };

  const handleAvatarFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    setError('');
    setSuccess('');

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError('Please choose a JPG, PNG or WebP image.');
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setError('Please choose an image smaller than 5 MB.');
      return;
    }

    setAvatarBusy(true);

    try {
      const avatar = await resizeImageToDataUrl(file);
      const response = await updateAvatar(avatar);

      setAccount((previous) => ({ ...previous, avatar: response.avatar }));
      syncStoredUser({ avatar: response.avatar });
      setSuccess('Profile photo updated.');
    } catch (err) {
      setError(err.message || 'Unable to update profile photo.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarBusy(true);
    setError('');
    setSuccess('');

    try {
      await removeAvatar();
      setAccount((previous) => ({ ...previous, avatar: '' }));
      syncStoredUser({ avatar: '' });
      setSuccess('Profile photo removed.');
    } catch (err) {
      setError(err.message || 'Unable to remove profile photo.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleAddressesChange = (addresses) => {
    setAccount((previous) => ({ ...previous, addresses }));
    syncStoredUser({ addresses });
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordData((previous) => ({ ...previous, [name]: value }));
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordError('Your new password must be different from your current password.');
      return;
    }

    setPasswordSaving(true);

    try {
      const response = await changePassword(passwordData);
      setPasswordSuccess(response.message || 'Password changed successfully.');
      setPasswordData(emptyPasswordForm);
    } catch (err) {
      setPasswordError(err.message || 'Unable to change password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="pf-page">
        <div className="pf-skeleton" aria-busy="true">
          Loading your profile…
        </div>
      </main>
    );
  }

  const fullName = `${formData.firstName} ${formData.lastName}`.trim();
  const memberSince = formatMemberSince(account.createdAt);

  return (
    <main className="pf-page">
      <p className="pf-eyebrow">THREADS.COM / MY ACCOUNT</p>

      <section className="pf-hero">
        <div className="pf-avatar-wrap">
          {account.avatar ? (
            <img className="pf-avatar" src={account.avatar} alt="Your profile photo" />
          ) : (
            <div className="pf-avatar pf-avatar-initials" aria-hidden="true">
              {getInitials(formData)}
            </div>
          )}

          <button
            type="button"
            className="pf-avatar-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarBusy}
            aria-label={account.avatar ? 'Change profile photo' : 'Add profile photo'}
            title={account.avatar ? 'Change photo' : 'Add photo'}
          >
            <Icon name="camera" size={16} />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarFile}
            hidden
          />
        </div>

        <div className="pf-hero-info">
          <h1>{fullName || 'Your account'}</h1>
          <p className="pf-hero-email">
            <Icon name="mail" size={14} /> {formData.email}
          </p>

          <div className="pf-hero-meta">
            {memberSince && <span>Member since {memberSince}</span>}
            <span>
              {account.addresses.length} saved address
              {account.addresses.length === 1 ? '' : 'es'}
            </span>
          </div>

          <div className="pf-hero-actions">
            <button
              type="button"
              className="pf-btn pf-btn-secondary pf-btn-sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarBusy}
            >
              {avatarBusy ? 'Uploading…' : account.avatar ? 'Change photo' : 'Add profile photo'}
            </button>

            {account.avatar && (
              <button
                type="button"
                className="pf-btn pf-btn-ghost pf-btn-sm"
                onClick={handleRemoveAvatar}
                disabled={avatarBusy}
              >
                Remove photo
              </button>
            )}
          </div>
        </div>
      </section>

      {error && (
        <p role="alert" className="pf-msg pf-msg-error pf-banner">
          {error}
        </p>
      )}

      {success && (
        <p role="status" className="pf-msg pf-msg-success pf-banner">
          {success}
        </p>
      )}

      <nav className="pf-tabs" role="tablist" aria-label="Profile sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            className="pf-tab"
            onClick={() => {
              setActiveTab(tab.id);
              setError('');
              setSuccess('');
            }}
          >
            {tab.label}
            {tab.id === 'addresses' && account.addresses.length > 0 && (
              <span className="pf-tab-count">{account.addresses.length}</span>
            )}
          </button>
        ))}
      </nav>

      {activeTab === 'personal' && (
        <section
          className="pf-panel"
          role="tabpanel"
          id="panel-personal"
          aria-labelledby="tab-personal"
        >
          <div className="pf-panel-head">
            <div>
              <h2>Personal details</h2>
              <p>Used for your orders and account communication.</p>
            </div>

            {!editing && (
              <button
                type="button"
                className="pf-btn pf-btn-secondary"
                onClick={() => {
                  setError('');
                  setSuccess('');
                  setEditing(true);
                }}
              >
                <Icon name="pencil" size={15} /> Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="pf-grid">
              <div className="pf-field">
                <label htmlFor="firstName">First name</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={!editing}
                  autoComplete="given-name"
                  required
                />
              </div>

              <div className="pf-field">
                <label htmlFor="lastName">Last name</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={!editing}
                  autoComplete="family-name"
                  required
                />
              </div>

              <div className="pf-field">
                <label htmlFor="gender">Gender</label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  disabled={!editing}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="pf-field">
                <label htmlFor="dateOfBirth">Date of birth</label>
                <input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  max={new Date().toISOString().slice(0, 10)}
                  disabled={!editing}
                />
              </div>

              <div className="pf-field pf-span-2">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!editing}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {editing && (
              <div className="pf-actions">
                <button
                  type="button"
                  className="pf-btn pf-btn-ghost"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="pf-btn pf-btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            )}
          </form>
        </section>
      )}

      {activeTab === 'addresses' && (
        <section
          className="pf-panel"
          role="tabpanel"
          id="panel-addresses"
          aria-labelledby="tab-addresses"
        >
          <AddressBook
            addresses={account.addresses}
            onChange={handleAddressesChange}
          />
        </section>
      )}

      {activeTab === 'security' && (
        <section
          className="pf-panel"
          role="tabpanel"
          id="panel-security"
          aria-labelledby="tab-security"
        >
          <div className="pf-panel-head">
            <div>
              <h2>Change password</h2>
              <p>Use a strong password you don't use anywhere else.</p>
            </div>
            <span className="pf-security-icon" aria-hidden="true">
              <Icon name="lock" size={20} />
            </span>
          </div>

          {passwordError && (
            <p role="alert" className="pf-msg pf-msg-error">
              {passwordError}
            </p>
          )}

          {passwordSuccess && (
            <p role="status" className="pf-msg pf-msg-success">
              {passwordSuccess}
            </p>
          )}

          <form onSubmit={handlePasswordSubmit} className="pf-password-form">
            <div className="pf-field">
              <label htmlFor="currentPassword">Current password</label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                autoComplete="current-password"
                required
              />
            </div>

            <div className="pf-grid">
              <div className="pf-field">
                <label htmlFor="newPassword">New password</label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="pf-field">
                <label htmlFor="confirmPassword">Confirm new password</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <div className="pf-actions">
              <button
                type="submit"
                className="pf-btn pf-btn-primary"
                disabled={passwordSaving}
              >
                {passwordSaving ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  );
};

export default Profile;
