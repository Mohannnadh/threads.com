# Changes

## Profile page (client/src/page/Profile.jsx)
- Redesigned with a header card (profile photo, name, email, member since,
  saved address count) and three tabs: Personal details, Addresses, Security.
- Profile photo: upload JPG/PNG/WebP (max 5 MB). The image is cropped to a
  square and resized to 256px in the browser, then stored with the user.
  Photos can be changed or removed.

## Saved addresses
- Add, edit, remove and set-default for up to 10 addresses (My Profile > Addresses).
- Exactly one default address at all times. The first address is made default
  automatically; removing the default promotes the most recently added one.
- Field names match the checkout shipping form, so saved addresses can be sent
  to the order API unchanged.

## Checkout (client/src/page/Checkout.jsx)
- Shows saved addresses as selectable cards, with the default pre-selected.
- "Use a different address" shows the existing typed form.
- Orders still send the same shipping fields; the order API is unchanged.

## Backend (server/src/modules/user)
- user.model.js: new `addresses` array and `avatar` field.
- address.controller.js (new): address CRUD, set-default, avatar upload/remove.
- user.routes.js: new routes under /api/users:
  POST /addresses, PATCH /addresses/:id, PATCH /addresses/:id/default,
  DELETE /addresses/:id, PATCH /avatar, DELETE /avatar.

## Other
- client/src/App.css: removed a stray "." on its own line that made the CSS
  invalid and stopped `npm run build` from completing.

## Pagination

Lists now load one page at a time. Filtering, search and counts are done by
the server, so the browser no longer downloads the whole catalogue or order history.

### Server
- utils/pagination.js (new): shared helpers. Page and limit are validated and capped.
  Search text is trimmed, length-limited and regex-escaped.
- GET /api/products now takes page, limit (default 12, max 48), search, gender,
  category and sort. It returns { products, pagination }.
- GET /api/products/categories (new): distinct category names.
- GET /api/orders/my-orders now takes page and limit (default 10, max 50). It
  returns { orders, pagination }.
- GET /api/orders/admin now takes page, limit (default 15, max 50), status and
  search. Search covers order number, shipping name and phone, customer name and
  email. It returns { orders, counts, pagination }, where counts are per status
  across all orders.

### Client
- components/Pagination.jsx (new): page summary, previous/next, numbered pages
  with ellipses.
- hooks/useDebouncedValue.js (new): delays search requests until typing pauses.
- Shop (Products.jsx): search, gender, category, sort and page are kept in the URL,
  so filtered views can be shared or bookmarked.
- Admin products: server-side search and paging; stats come from the dashboard endpoint.
- Admin orders: server-side status tabs, search and paging; counts come from the server.
- My Orders: paged.
- The admin dashboard still reads the first page of orders (its six most recent).
