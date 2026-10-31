# Threads.com: client

React 19 + Vite storefront. See the [root README](../README.md) for full setup.

```bash
npm install
npm run dev       # development server on http://localhost:5173
npm run build     # production build in dist/
npm run preview   # serve the production build locally
```

API base URL comes from `VITE_API_URL` (defaults to `http://localhost:5000`). Set it in `client/.env` before building for another environment.

Google sign-in requires `VITE_GOOGLE_CLIENT_ID` in the client environment and the matching `GOOGLE_CLIENT_ID` in the server environment. Configure the same OAuth 2.0 web client ID in both places and allow the client origin in Google Cloud's authorized JavaScript origins.

The Vite dev and preview servers set `Cross-Origin-Opener-Policy: same-origin-allow-popups` for Google popup sign-in. If the deployed web host applies a stricter COOP policy, configure the same header there.
