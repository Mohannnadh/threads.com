// Base URL of the Threads.com API.
// Set VITE_API_URL in client/.env (for example, https://api.example.com)
// for deployed builds. Falls back to the local dev server.
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/+$/, '');

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
