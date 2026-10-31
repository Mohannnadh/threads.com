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

// ---------- Reviews ----------

export const createReview = (token, review) =>
  fetch(`${API_BASE_URL}/api/reviews`, {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify(review),
  }).then(json);

export const getMyReviews = (token) =>
  fetch(`${API_BASE_URL}/api/reviews/mine`, {
    headers: authHeaders(token),
  }).then(json);

// ---------- Returns and exchanges ----------

export const requestReturn = (token, request) =>
  fetch(`${API_BASE_URL}/api/returns`, {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify(request),
  }).then(json);

export const getMyReturns = (token) =>
  fetch(`${API_BASE_URL}/api/returns/mine`, {
    headers: authHeaders(token),
  }).then(json);

// Customers can edit and delete their own reviews.
export const updateReview = (token, id, review) =>
  fetch(`${API_BASE_URL}/api/reviews/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token, true),
    body: JSON.stringify(review),
  }).then(json);

export const deleteReview = (token, id) =>
  fetch(`${API_BASE_URL}/api/reviews/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  }).then(json);

// ---------- Invoice ----------

// Opens the invoice in the given tab (or a new one), so it can be read or printed.
export const viewInvoice = async (token, orderId, tab) => {
  const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/invoice?view=1`, {
    headers: authHeaders(token),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Could not open the invoice.');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  if (tab && !tab.closed) {
    tab.location.href = url;
  } else {
    window.open(url, '_blank');
  }

  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

// ---------- Invoice download (kept for admin use) ----------

// Downloads the invoice file. The server sends it as an attachment.
export const downloadInvoice = async (token, orderId) => {
  const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/invoice`, {
    headers: authHeaders(token),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Could not download the invoice.');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `invoice-${String(orderId).slice(-6).toUpperCase()}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

// ---------- Admin ----------

export const getAdminReturns = (token, { status = 'ALL', page = 1, limit = 15 } = {}) =>
  fetch(
    `${API_BASE_URL}/api/returns/admin?status=${encodeURIComponent(status)}&page=${page}&limit=${limit}`,
    { headers: authHeaders(token) }
  ).then(json);

export const updateReturnStatus = (token, id, status, note) =>
  fetch(`${API_BASE_URL}/api/returns/admin/${id}/status`, {
    method: 'PATCH',
    headers: authHeaders(token, true),
    body: JSON.stringify(note === undefined ? { status } : { status, note }),
  }).then(json);

export const setOrderShipping = (token, orderId, shipping) =>
  fetch(`${API_BASE_URL}/api/orders/admin/${orderId}/shipping`, {
    method: 'PATCH',
    headers: authHeaders(token, true),
    body: JSON.stringify(shipping),
  }).then(json);

// ---------- Product page reviews ----------

// Public: one page of visible reviews plus the rating summary.
export const getProductReviews = (productId, { page = 1, limit = 5 } = {}) =>
  fetch(
    `${API_BASE_URL}/api/reviews/product/${productId}?page=${page}&limit=${limit}`
  ).then(json);

// Logged-in customer: can they review this product, and what have they written?
export const getMyProductReviewStatus = (token, productId) =>
  fetch(`${API_BASE_URL}/api/reviews/product/${productId}/mine`, {
    headers: authHeaders(token),
  }).then(json);

// ---------- Admin: review moderation ----------

export const getAdminReviews = (
  token,
  { status = 'ALL', rating = '', search = '', page = 1, limit = 15 } = {}
) => {
  const query = new URLSearchParams({ status, page: String(page), limit: String(limit) });

  if (rating) query.set('rating', String(rating));
  if (search) query.set('search', search);

  return fetch(`${API_BASE_URL}/api/reviews/admin?${query}`, {
    headers: authHeaders(token),
  }).then(json);
};

export const setReviewHidden = (token, id, isHidden) =>
  fetch(`${API_BASE_URL}/api/reviews/admin/${id}/visibility`, {
    method: 'PATCH',
    headers: authHeaders(token, true),
    body: JSON.stringify({ isHidden }),
  }).then(json);

export const adminDeleteReview = (token, id) =>
  fetch(`${API_BASE_URL}/api/reviews/admin/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  }).then(json);
