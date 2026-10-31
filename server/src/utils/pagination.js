// Shared helpers for paginated list endpoints.

const MAX_SEARCH_LENGTH = 100;

// Reads ?page and ?limit from the query string, with safe defaults and caps.
const parsePagination = (query, { defaultLimit = 12, maxLimit = 50 } = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const requestedLimit = parseInt(query.limit, 10);
  const limit = Math.min(
    maxLimit,
    requestedLimit > 0 ? requestedLimit : defaultLimit
  );

  return { page, limit, skip: (page - 1) * limit };
};

// Builds the pagination block returned to the client.
const buildPagination = (total, { page, limit }) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    page,
    limit,
    total,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  };
};

// Trims and caps free-text search input before it is used in a query.
const cleanSearch = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, MAX_SEARCH_LENGTH);
};

// Escapes user input so it is matched literally inside a RegExp.
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = {
  parsePagination,
  buildPagination,
  cleanSearch,
  escapeRegex,
};
