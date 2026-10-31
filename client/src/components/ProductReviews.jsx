import { confirmDialog, notifyDialog } from './Dialog.jsx';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import {
  getProductReviews,
  getMyProductReviewStatus,
  deleteReview,
} from '../services/supportService.js';
import ReviewForm from './ReviewForm.jsx';
import '../styles/orders.css';
import '../styles/reviews.css';

const PAGE_SIZE = 5;

const Stars = ({ value }) => (
  <span className="rv-stars" role="img" aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((star) => (
      <span key={star} className={star <= Math.round(value) ? 'is-on' : ''}>
        ★
      </span>
    ))}
  </span>
);

const formatDay = (value) =>
  new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

// Reviews for one product: rating summary, the list, and (for customers who
// received the product) a form to write or edit their review.
const ProductReviews = ({ productId, productName, onRatingChange }) => {
  const { token, isAuthenticated } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ average: 0, count: 0, breakdown: {} });
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const [status, setStatus] = useState(null); // customer's review status
  const [formMode, setFormMode] = useState(null); // null | 'new' | review being edited
  const [flash, setFlash] = useState('');

  // First page of reviews. Runs again after any change.
  const loadReviews = useCallback(async () => {
    try {
      const data = await getProductReviews(productId, { page: 1, limit: PAGE_SIZE });

      setReviews(data.reviews);
      setSummary(data.summary);
      setPagination(data.pagination);
      setError('');
      onRatingChange?.(data.summary);
    } catch (err) {
      setError(err.message || 'Could not load reviews.');
    } finally {
      setLoading(false);
    }
  }, [productId, onRatingChange]);

  const loadStatus = useCallback(async () => {
    if (!token) {
      setStatus(null);
      return;
    }

    try {
      setStatus(await getMyProductReviewStatus(token, productId));
    } catch {
      setStatus(null);
    }
  }, [token, productId]);

  useEffect(() => {
    setLoading(true);
    setFormMode(null);
    setFlash('');
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleLoadMore = async () => {
    if (!pagination?.hasNext) return;

    setLoadingMore(true);

    try {
      const data = await getProductReviews(productId, {
        page: pagination.page + 1,
        limit: PAGE_SIZE,
      });

      setReviews((current) => [...current, ...data.reviews]);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message || 'Could not load more reviews.');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSaved = async () => {
    setFormMode(null);
    setFlash('Thanks! Your review has been saved.');
    await Promise.all([loadReviews(), loadStatus()]);
  };

  const handleDelete = async (review) => {
    if (!(await confirmDialog({ message: 'Delete your review?', confirmLabel: 'Delete', danger: true }))) return;

    try {
      await deleteReview(token, review._id);
      setFlash('Your review was deleted.');
      await Promise.all([loadReviews(), loadStatus()]);
    } catch (err) {
      setError(err.message || 'Could not delete your review.');
    }
  };

  const total = summary.count || 0;
  const myReviews = status?.myReviews || [];

  // The area under the rating summary where a customer writes a review.
  const renderWriteArea = () => {
    if (!isAuthenticated) {
      return (
        <div className="rv-write">
          <p>Bought this product? Log in to share your review.</p>
          <Link to="/login" className="rv-btn">
            Log in
          </Link>
        </div>
      );
    }

    if (!status) return null;

    if (status.reviewableOrderId) {
      return (
        <div className="rv-write">
          <p>Received this product? Tell other shoppers what you think.</p>
          {formMode !== 'new' && (
            <button
              type="button"
              className="rv-btn rv-btn-primary"
              onClick={() => {
                setFlash('');
                setFormMode('new');
              }}
            >
              Write a review
            </button>
          )}
        </div>
      );
    }

    if (!status.hasPurchased) {
      return (
        <div className="rv-write">
          <p>Only customers who have received this product can review it.</p>
        </div>
      );
    }

    return null;
  };

  return (
    <section className="rv-section" aria-labelledby="reviews-heading">
      <div className="rv-inner">
        <h2 id="reviews-heading" className="rv-title">
          Customer reviews
        </h2>

        <div className="rv-layout">
          <aside>
            {total > 0 ? (
              <>
                <div className="rv-average">{summary.average.toFixed(1)}</div>
                <Stars value={summary.average} />
                <p className="rv-count">
                  Based on {total} review{total === 1 ? '' : 's'}
                </p>

                {[5, 4, 3, 2, 1].map((star) => {
                  const count = summary.breakdown?.[star] || 0;

                  return (
                    <div className="rv-bar-row" key={star}>
                      <span>{star} ★</span>
                      <div className="rv-bar">
                        <span style={{ width: `${(count / total) * 100}%` }} />
                      </div>
                      <span>{count}</span>
                    </div>
                  );
                })}
              </>
            ) : (
              <p className="rv-count">No ratings yet.</p>
            )}

            {renderWriteArea()}
          </aside>

          <div>
            {flash && (
              <p className="rv-notice" role="status">
                {flash}
              </p>
            )}

            {error && (
              <p className="ord-error" role="alert">
                {error}
              </p>
            )}

            {formMode === 'new' && status?.reviewableOrderId && (
              <div className="rv-mine">
                <ReviewForm
                  token={token}
                  orderId={status.reviewableOrderId}
                  productId={productId}
                  productName={productName}
                  onSaved={handleSaved}
                  onCancel={() => setFormMode(null)}
                />
              </div>
            )}

            {myReviews.map((mine) => (
              <div className="rv-mine" key={mine._id}>
                {formMode && formMode !== 'new' && formMode._id === mine._id ? (
                  <ReviewForm
                    token={token}
                    productId={productId}
                    productName={productName}
                    review={mine}
                    onSaved={handleSaved}
                    onCancel={() => setFormMode(null)}
                  />
                ) : (
                  <>
                    <div className="rv-item-head">
                      <strong>Your review</strong>
                      <Stars value={mine.rating} />
                      {mine.isHidden && (
                        <span className="rv-meta">Hidden by the store</span>
                      )}
                    </div>
                    {mine.title && <p className="rv-item-title">{mine.title}</p>}
                    {mine.comment && <p className="rv-item-text">{mine.comment}</p>}
                    <div className="ord-form-actions" style={{ marginTop: 12 }}>
                      <button type="button" className="ord-btn" onClick={() => setFormMode(mine)}>
                        Edit
                      </button>
                      <button type="button" className="ord-btn" onClick={() => handleDelete(mine)}>
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {loading ? (
              <p className="rv-empty">Loading reviews…</p>
            ) : reviews.length === 0 ? (
              <p className="rv-empty">
                No reviews yet. Reviews from verified buyers will appear here.
              </p>
            ) : (
              <>
                {reviews.map((review) => (
                  <article className="rv-item" key={review._id}>
                    <div className="rv-item-head">
                      <Stars value={review.rating} />
                      <strong style={{ fontSize: 13 }}>{review.reviewer}</strong>
                      <span className="rv-meta">Verified buyer · {formatDay(review.createdAt)}</span>
                    </div>
                    {review.title && <p className="rv-item-title">{review.title}</p>}
                    {review.comment && <p className="rv-item-text">{review.comment}</p>}
                  </article>
                ))}

                {pagination?.hasNext && (
                  <div className="rv-more">
                    <button
                      type="button"
                      className="rv-btn"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                    >
                      {loadingMore ? 'Loading…' : 'Show more reviews'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductReviews;
