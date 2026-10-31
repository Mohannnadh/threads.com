import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getUserProfile } from '../services/userService.js';
import { Icon } from './Icon.jsx';
import { STATUS_TONE, statusLabel } from '../utils/adminFormat.js';
import '../styles/admin.css';

const NAV_ITEMS = [
  { to: '/admin', label: 'Overview', icon: 'dashboard', end: true },
  { to: '/admin/orders', label: 'Orders', icon: 'bag' },
  { to: '/admin/products', label: 'Products', icon: 'package' },
  { to: '/admin/categories', label: 'Categories', icon: 'package' },
  { to: '/admin/returns', label: 'Returns', icon: 'refresh' },
  { to: '/admin/reviews', label: 'Reviews', icon: 'star' },
  { to: '/admin/coupons', label: 'Coupons', icon: 'bag' },
  { to: '/admin/sales', label: 'Sales report', icon: 'eye' },
  { to: '/admin/customers', label: 'Customers', icon: 'user' },
  { to: '/admin/offers', label: 'Offers', icon: 'star' },
];

export const StatusPill = ({ status, tone }) => (
  <span
    className={`admin-pill admin-pill-${
      tone || STATUS_TONE[status] || 'neutral'
    }`}
  >
    {statusLabel(status)}
  </span>
);

export const Notice = ({ tone = 'success', onClose, children }) => (
  <div
    className={`admin-notice admin-notice-${tone}`}
    role={tone === 'error' ? 'alert' : 'status'}
  >
    <Icon name={tone === 'error' ? 'x' : 'check'} size={16} />
    <div className="admin-notice-text">{children}</div>
    {onClose && (
      <button
        type="button"
        className="admin-icon-button"
        onClick={onClose}
        aria-label="Dismiss message"
      >
        <Icon name="x" size={14} />
      </button>
    )}
  </div>
);

// The admin display name is fixed. It does not change with the account name.
export const ADMIN_DISPLAY_NAME = 'ThreadsAdmin';

// Fired by the profile page after the logo changes, so the sidebar updates at once.
export const ADMIN_LOGO_EVENT = 'threads-admin-logo';

const AdminLayout = ({ title, subtitle, actions, children }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [logo, setLogo] = useState('');

  useEffect(() => {
    let active = true;

    getUserProfile()
      .then((response) => {
        if (active) setLogo(response.user?.avatar || '');
      })
      .catch(() => {});

    const onLogoChange = (event) => setLogo(event.detail || '');
    window.addEventListener(ADMIN_LOGO_EVENT, onLogoChange);

    return () => {
      active = false;
      window.removeEventListener(ADMIN_LOGO_EVENT, onLogoChange);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark" aria-hidden="true">
            T
          </span>
          <span className="admin-brand-text">
            Threads<span>.com</span>
          </span>
        </div>

        <nav className="admin-nav" aria-label="Admin sections">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="admin-nav-link"
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <NavLink
            to="/admin/profile"
            className="admin-user"
            title="Open my profile"
            style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit', minWidth: 0 }}
          >
            {logo ? (
              <img
                src={logo}
                alt=""
                style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: '50%', flexShrink: 0, border: '1px solid var(--adm-line)' }}
              />
            ) : (
              <span
                className="admin-brand-mark"
                aria-hidden="true"
                style={{ width: 36, height: 36, flexShrink: 0 }}
              >
                T
              </span>
            )}

            <div style={{ display: 'grid', minWidth: 0 }}>
              <strong>{ADMIN_DISPLAY_NAME}</strong>
              <span>Store admin</span>
            </div>
          </NavLink>

          <button
            type="button"
            className="admin-icon-button"
            onClick={handleLogout}
            aria-label="Log out"
            title="Log out"
          >
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-page-header">
          <div>
            <h1 className="admin-title">{title}</h1>
            {subtitle && <p className="admin-subtitle">{subtitle}</p>}
          </div>

          {actions && <div className="admin-page-actions">{actions}</div>}
        </header>

        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
