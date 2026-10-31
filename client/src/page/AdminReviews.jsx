import { confirmDialog, notifyDialog } from '../components/Dialog.jsx';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getAdminReviews,
  setReviewHidden,
  adminDeleteReview,
} from '../services/supportService.js';
import Pagination from '../components/Pagination.jsx';
import useDebouncedValue from '../hooks/useDebouncedValue.js';
import AdminLayout, { Notice } from '../components/AdminLayout.jsx';
import '../styles/admin.css';

const PAGE_SIZE = 15;

const STATUS_TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'VISIBLE', label: 'Visible' },
  { key: 'HIDDEN', label: 'Hidden' },
];

const formatDay = (value) =>
  new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const AdminReviews = () => {
  const { token } = useAuth();

  const [status, setStatus] = useState('ALL');
  const [rating, setRating] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const [reviews, setReviews] = useState([]);
  const [counts, setCounts] = useState({ ALL: 0, VISIBLE: 0, HIDDEN: 0 });
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Reset to page 1 whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [status, rating, debouncedSearch]);

  useEffect(() => {
    if (!token) return undefined;

    let active = true;

    getAdminReviews(token, {
      status,
      rating,
      search: debouncedSearch,
      page,
      limit: PAGE_SIZE,
    })
      .then((data) => {
        if (!active) return;

        setReviews(data.reviews);
        setCounts(data.counts);
        setPagination(data.pagination);
        setError('');
      })
      .catch((err) => {
        if (active) setError(err.message || 'Could not load reviews.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, status, rating, debouncedSearch, page, refreshKey]);

  const refresh = () => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  };

  const toggleVisibility = async (review) => {
    setBusyId(review._id);
    setError('');
    setNotice('');

    try {
      const data = await setReviewHidden(token, review._id, !review.isHidden);
      setNotice(data.message);
      refresh();
    } catch (err) {
      setError(err.message || 'Could not update this review.');
    } finally {
      setBusyId('');
    }
  };

  const removeReview = async (review) => {
    if (!(await confirmDialog({ message: 'Permanently delete this review? This cannot be undone.', confirmLabel: 'Delete', danger: true }))) return;

    setBusyId(review._id);
    setError('');
    setNotice('');

    try {
      await adminDeleteReview(token, review._id);
      setNotice('Review deleted.');
      refresh();
    } catch (err) {
      setError(err.message || 'Could not delete this review.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <AdminLayout
      title="Reviews"
      subtitle={`${counts.ALL} review${counts.ALL === 1 ? '' : 's'} · ${counts.HIDDEN} hidden`}
    >
      {error && (
        <Notice tone="error" onClose={() => setError('')}>
          {error}
        </Notice>
      )}
      {notice && <Notice onClose={() => setNotice('')}>{notice}</Notice>}

      <section className="admin-panel">
        <div className="admin-toolbar">
          <div className="admin-tabs" role="tablist">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={status === tab.key}
                className={`admin-tab${status === tab.key ? ' is-active' : ''}`}
                onClick={() => {
                  setLoading(true);
                  setStatus(tab.key);
                }}
              >
                {tab.label}
                <span className="admin-tab-count">{counts[tab.key] || 0}</span>
              </button>
            ))}
          </div>

          <select
            aria-label="Filter by rating"
            value={rating}
            onChange={(event) => {
              setLoading(true);
              setRating(event.target.value);
            }}
          >
            <option value="">All ratings</option>
            {[5, 4, 3, 2, 1].map((star) => (
              <option key={star} value={star}>
                {star} star{star === 1 ? '' : 's'}
              </option>
            ))}
          </select>

          <input
            type="search"
            className="admin-search"
            placeholder="Search review, customer or product"
            aria-label="Search reviews"
            value={search}
            onChange={(event) => {
              setLoading(true);
              setSearch(event.target.value);
            }}
          />
        </div>

        {loading ? (
          <p className="admin-empty">Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <p className="admin-empty">
            {counts.ALL === 0
              ? 'No reviews have been posted yet.'
              : 'No reviews match these filters.'}
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Customer</th>
                  <th>Rating</th>
                  <th>Review</th>
                  <th>Posted</th>
                  <th>Visibility</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {reviews.map((review) => (
                  <tr key={review._id}>
                    <td>
                      <span className="admin-product-name">
                        {review.product?.name || 'Deleted product'}
                      </span>
                    </td>
                    <td>
                      {review.user?.name || 'Unknown'}
                      <br />
                      <small className="admin-muted">{review.user?.email}</small>
                    </td>
                    <td>{'★'.repeat(review.rating)}</td>
                    <td style={{ maxWidth: 320 }}>
                      {review.title && <strong>{review.title}</strong>}
                      {review.title && <br />}
                      <span className="admin-muted">
                        {review.comment || 'No written review'}
                      </span>
                    </td>
                    <td>{formatDay(review.createdAt)}</td>
                    <td>
                      <span
                        className={`admin-pill admin-pill-${review.isHidden ? 'danger' : 'success'}`}
                      >
                        {review.isHidden ? 'Hidden' : 'Visible'}
                      </span>
                    </td>
                    <td className="admin-row-actions">
                      <button
                        type="button"
                        className="admin-button"
                        disabled={busyId === review._id}
                        onClick={() => toggleVisibility(review)}
                      >
                        {review.isHidden ? 'Show' : 'Hide'}
                      </button>
                      <button
                        type="button"
                        className="admin-button admin-button-danger"
                        disabled={busyId === review._id}
                        onClick={() => removeReview(review)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && (
          <Pagination
            pagination={pagination}
            onPageChange={(next) => {
              setLoading(true);
              setPage(next);
            }}
            itemLabel="reviews"
            disabled={loading}
          />
        )}
      </section>
    </AdminLayout>
  );
};

export default AdminReviews;
