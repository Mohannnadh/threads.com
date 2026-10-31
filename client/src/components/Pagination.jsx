import '../styles/pagination.css';

// Builds the page list with ellipses, e.g. 1 … 4 5 6 … 12.
const getPageItems = (current, total) => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const items = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) items.push('ellipsis-start');

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (end < total - 1) items.push('ellipsis-end');

  items.push(total);
  return items;
};

const Pagination = ({
  pagination,
  onPageChange,
  itemLabel = 'items',
  variant = 'default',
  disabled = false,
}) => {
  if (!pagination || pagination.total === 0) {
    return null;
  }

  const { page, totalPages, total, limit } = pagination;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <nav
      className={`pg pg-${variant}`}
      aria-label={`${itemLabel} pagination`}
    >
      <p className="pg-summary">
        Showing <strong>{from}–{to}</strong> of <strong>{total}</strong>{' '}
        {itemLabel}
      </p>

      {/* Always shown, so visitors see the page controls even with a single page. */}
      {totalPages >= 1 && (
        <div className="pg-controls">
          <button
            type="button"
            className="pg-btn pg-nav"
            onClick={() => onPageChange(page - 1)}
            disabled={disabled || page <= 1}
            aria-label="Previous page"
          >
            Previous
          </button>

          <ul className="pg-pages">
            {getPageItems(page, totalPages).map((item) =>
              typeof item === 'number' ? (
                <li key={item}>
                  <button
                    type="button"
                    className={`pg-btn pg-page ${item === page ? 'is-current' : ''}`}
                    onClick={() => onPageChange(item)}
                    disabled={disabled || item === page}
                    aria-current={item === page ? 'page' : undefined}
                    aria-label={`Page ${item}`}
                  >
                    {item}
                  </button>
                </li>
              ) : (
                <li key={item} className="pg-ellipsis" aria-hidden="true">
                  …
                </li>
              )
            )}
          </ul>

          <button
            type="button"
            className="pg-btn pg-nav"
            onClick={() => onPageChange(page + 1)}
            disabled={disabled || page >= totalPages}
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      )}
    </nav>
  );
};

export default Pagination;
