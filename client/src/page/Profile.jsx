
import { useEffect, useState } from 'react';
import {
  getUserProfile,
  updateUserProfile,
} from '../services/userService.js';
import { changePassword } from '../services/authService.js';
import '../App.css';

const Profile = () => {
  // Profile state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Change Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Load the logged-in user's profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setError('');

        const response = await getUserProfile();
        const user = response.user;

        setFormData({
          name: user.name || '',
          email: user.email || '',
        });
      } catch (err) {
        setError(err.message || 'Unable to load profile.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  // Handle profile form changes
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  // Save profile changes
  const handleSubmit = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await updateUserProfile({
        name: formData.name.trim(),
        email: formData.email.trim(),
      });

      const updatedUser = response.user;

      setFormData({
        name: updatedUser.name || '',
        email: updatedUser.email || '',
      });

      // Keep localStorage user details synchronized
      const storedUser = JSON.parse(
        localStorage.getItem('user') || '{}'
      );

      localStorage.setItem(
        'user',
        JSON.stringify({
          ...storedUser,
          ...updatedUser,
        })
      );

      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err.message || 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  // Handle password input changes
  const handlePasswordChange = (event) => {
    const { name, value } = event.target;

    setPasswordData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  // Submit Change Password form
  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    setPasswordError('');
    setPasswordSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordError(
        'Your new password must be different from your current password.'
      );
      return;
    }

    setPasswordSaving(true);

    try {
      const response = await changePassword(passwordData);

      setPasswordSuccess(
        response.message || 'Password changed successfully.'
      );

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      setPasswordError(
        err.message || 'Unable to change password.'
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return <p>Loading profile...</p>;
  }

  return (
    <main className="profile-page">
      <section className="profile-card">
        <h1>My Profile</h1>
        <p>View and update your account details.</p>

        {error && (
          <p role="alert" className="profile-error">
            {error}
          </p>
        )}

        {success && (
          <p role="status" className="profile-success">
            {success}
          </p>
        )}

        {/* Edit Profile Form */}
        <form onSubmit={handleSubmit}>
          <div className="profile-field">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="profile-field">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        {/* Change Password Form */}
        <div className="change-password-section">
          <h2>Change Password</h2>
          <p>Update your password to keep your account secure.</p>

          {passwordError && (
            <p role="alert" className="profile-error">
              {passwordError}
            </p>
          )}

          {passwordSuccess && (
            <p role="status" className="profile-success">
              {passwordSuccess}
            </p>
          )}

          <form onSubmit={handlePasswordSubmit}>
            <div className="profile-field">
              <label htmlFor="currentPassword">
                Current Password
              </label>
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

            <div className="profile-field">
              <label htmlFor="newPassword">
                New Password
              </label>
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

            <div className="profile-field">
              <label htmlFor="confirmPassword">
                Confirm New Password
              </label>
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

            <button type="submit" disabled={passwordSaving}>
              {passwordSaving
                ? 'Changing Password...'
                : 'Change Password'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
};

export default Profile;
