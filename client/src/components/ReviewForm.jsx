import { useState } from 'react';
import { createReview, updateReview } from '../services/supportService.js';

// Creates a review, or edits one when `review` is given.
const ReviewForm = ({ token, orderId, productId, productName, review, onSaved, onCancel }) => {
  const [rating, setRating] = useState(review?.rating || 0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState(review?.title || '');
  const [comment, setComment] = useState(review?.comment || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (rating < 1) {
      setError('Tap a star to choose your rating.');
      return;
    }

    setSaving(true);

    try {
      const data = { rating, title, comment };

      const result = review
        ? await updateReview(token, review._id, data)
        : await createReview(token, { orderId, productId, ...data });

      onSaved(result.review);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const shown = hover || rating;

  return (
    <form className="ord-form" onSubmit={handleSubmit}>
      <p className="ord-form-title">
        {review ? `Edit your review of ${productName}` : `Review ${productName}`}
      </p>

      <div className="ord-stars" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={rating === star}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            className={`ord-star${star <= shown ? ' is-on' : ''}`}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
          >
            ★
          </button>
        ))}
      </div>

      <label className="ord-field">
        <span>Title (optional)</span>
        <input
          type="text"
          maxLength={120}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>

      <label className="ord-field">
        <span>Your review (optional)</span>
        <textarea
          rows={3}
          maxLength={2000}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </label>

      {error && <p className="ord-error" role="alert">{error}</p>}

      <div className="ord-form-actions">
        <button type="submit" className="ord-btn ord-btn-primary" disabled={saving}>
          {saving ? 'Saving…' : review ? 'Save changes' : 'Post review'}
        </button>
        <button type="button" className="ord-btn" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
};

export default ReviewForm;
