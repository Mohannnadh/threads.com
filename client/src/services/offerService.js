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

export const adminListOffers = (token, { status = '', search = '', page = 1, limit = 15 } = {}) => {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });

  if (status) query.set('status', status);
  if (search) query.set('search', search);

  return fetch(`${API_BASE_URL}/api/offers/admin?${query}`, {
    headers: authHeaders(token),
  }).then(json);
};

export const adminCreateOffer = (token, offer) =>
  fetch(`${API_BASE_URL}/api/offers`, {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify(offer),
  }).then(json);

export const adminUpdateOffer = (token, id, offer) =>
  fetch(`${API_BASE_URL}/api/offers/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token, true),
    body: JSON.stringify(offer),
  }).then(json);

export const adminSetOfferStatus = (token, id, isActive) =>
  fetch(`${API_BASE_URL}/api/offers/${id}/status`, {
    method: 'PATCH',
    headers: authHeaders(token, true),
    body: JSON.stringify({ isActive }),
  }).then(json);

export const adminDeleteOffer = (token, id) =>
  fetch(`${API_BASE_URL}/api/offers/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  }).then(json);
