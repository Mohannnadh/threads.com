import { API_BASE_URL } from '../config.js';

const json = async (response) => {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed. Please try again.');
  }

  return data;
};

const authHeaders = (token, withBody = false) => ({
  ...(withBody ? { 'Content-Type': 'application/json' } : {}),
  Authorization: `Bearer ${token}`,
});

// Customer: check a code against the current cart. Returns { preview }.
export const previewCoupon = (token, code, items) =>
  fetch(`${API_BASE_URL}/api/coupons/preview`, {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify({ code, items }),
  }).then(json);

// ---------- Admin ----------

export const adminListCoupons = (token, { status = '', search = '', page = 1, limit = 15 } = {}) => {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });

  if (status) query.set('status', status);
  if (search) query.set('search', search);

  return fetch(`${API_BASE_URL}/api/coupons/admin?${query}`, {
    headers: authHeaders(token),
  }).then(json);
};

export const adminCreateCoupon = (token, coupon) =>
  fetch(`${API_BASE_URL}/api/coupons`, {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify(coupon),
  }).then(json);

export const adminUpdateCoupon = (token, id, coupon) =>
  fetch(`${API_BASE_URL}/api/coupons/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token, true),
    body: JSON.stringify(coupon),
  }).then(json);

export const adminSetCouponStatus = (token, id, isActive) =>
  fetch(`${API_BASE_URL}/api/coupons/${id}/status`, {
    method: 'PATCH',
    headers: authHeaders(token, true),
    body: JSON.stringify({ isActive }),
  }).then(json);

export const adminDeleteCoupon = (token, id) =>
  fetch(`${API_BASE_URL}/api/coupons/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  }).then(json);
