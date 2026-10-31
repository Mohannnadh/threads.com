// Admin and customer sign-ins are saved separately, so signing in on one side
// never replaces the other. Pages under /admin use the admin session.
const KEYS = {
  customer: { token: 'token', user: 'user' },
  admin: { token: 'adminToken', user: 'adminUser' },
};

export const sessionScope = (pathname = window.location.pathname) =>
  pathname.startsWith('/admin') ? 'admin' : 'customer';

export const sessionKeys = (scope = sessionScope()) => KEYS[scope];

// The token for the side of the site the visitor is currently on.
export const getSessionToken = () => localStorage.getItem(sessionKeys().token);
