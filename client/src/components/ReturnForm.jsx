import { useEffect, useState } from 'react';
import { requestReturn } from '../services/supportService.js';
import { getProductById } from '../services/productService.js';

const ReturnForm = ({ token, order, itemIndex, item, windowEnds, onSaved, onCancel }) => {
  const [type, setType] = useState('RETURN');
  const [sizes, setSizes] = useState([]);
  const [exchangeSize, setExchangeSize] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Load the sizes the product comes in, for exchanges.
  useEffect(() => {
    let active = true;

    getProductById(item.product)
      .then((data) => {
        if (!active) return;

        const available = (data.product?.sizes || []).filter(
          (size) => size !== item.size
        );

        setSizes(available);
        setExchangeSize(available[0] || '');
      })
      .catch(() => {
        if (active) setError('Could not load the available sizes.');
      });

    return () => {
      active = false;
    };
  }, [item.product, item.size]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (reason.trim().length < 5) {
      setError('Please describe the reason (at least 5 characters).');
      return;
    }

    setSaving(true);

    try {
      const result = await requestReturn(token, {
        orderId: order._id,
        itemIndex,
        type,
        reason,
        exchangeSize: type === 'EXCHANGE' ? exchangeSize : undefined,
      });

      onSaved(result.request);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const endText = windowEnds.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <form className="ord-form" onSubmit={handleSubmit}>
      <p className="ord-form-title">Return or exchange {item.name}</p>
      <p className="ord-note">Requests are open until {endText}.</p>

      <fieldset className="ord-choice">
        <legend className="ord-field-label">What would you like?</legend>

        <label>
          <input
            type="radio"
            name={`type-${order._id}-${itemIndex}`}
            value="RETURN"
            checked={type === 'RETURN'}
            onChange={() => setType('RETURN')}
          />
          Return for a refund to my wallet
        </label>

        <label>
          <input
            type="radio"
            name={`type-${order._id}-${itemIndex}`}
            value="EXCHANGE"
            checked={type === 'EXCHANGE'}
            onChange={() => setType('EXCHANGE')}
          />
          Exchange for another size
        </label>
      </fieldset>

      {type === 'EXCHANGE' && (
        <label className="ord-field">
          <span>New size</span>
          {sizes.length === 0 ? (
            <span className="ord-note">No other sizes are available.</span>
          ) : (
            <select
              value={exchangeSize}
              onChange={(event) => setExchangeSize(event.target.value)}
            >
              {sizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          )}
        </label>
      )}

      <label className="ord-field">
        <span>Reason</span>
        <textarea
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Tell us what went wrong"
        />
      </label>

      {error && <p className="ord-error" role="alert">{error}</p>}

      <div className="ord-form-actions">
        <button
          type="submit"
          className="ord-btn ord-btn-primary"
          disabled={saving || (type === 'EXCHANGE' && sizes.length === 0)}
        >
          {saving ? 'Sending…' : 'Send request'}
        </button>
        <button type="button" className="ord-btn" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
};

export default ReturnForm;
