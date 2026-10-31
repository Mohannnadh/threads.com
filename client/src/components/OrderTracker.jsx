import { Icon } from './Icon.jsx';

const STEPS = ['PLACED', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

const LABELS = {
  PLACED: 'Order placed',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Being packed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
};

const shortDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      })
    : '';

// Timestamp for each status: from history, falling back to the order date.
const timeFor = (order, status) => {
  const entry = (order.statusHistory || []).find((item) => item.status === status);

  if (entry) return entry.at;
  if (status === 'PLACED') return order.createdAt;
  if (status === 'DELIVERED') return order.deliveredAt;
  return null;
};

const OrderTracker = ({ order }) => {
  if (order.orderStatus === 'CANCELLED') {
    const cancelled = (order.statusHistory || []).find(
      (item) => item.status === 'CANCELLED'
    );

    return (
      <div className="ot-cancelled">
        <Icon name="x" size={16} />
        <span>
          Cancelled{cancelled ? ` on ${shortDate(cancelled.at)}` : ''}.
          {order.paymentStatus === 'REFUNDED'
            ? ' The amount has been refunded to your wallet.'
            : ''}
        </span>
      </div>
    );
  }

  const currentIndex = STEPS.indexOf(order.orderStatus);

  return (
    <div className="ot">
      <ol className="ot-steps" aria-label="Order progress">
        {STEPS.map((step, index) => {
          const done = index <= currentIndex;
          const current = index === currentIndex;

          return (
            <li
              key={step}
              className={`ot-step${done ? ' is-done' : ''}${current ? ' is-current' : ''}`}
              aria-current={current ? 'step' : undefined}
            >
              <span className="ot-dot" aria-hidden="true">
                {done && <Icon name="check" size={12} strokeWidth={3} />}
              </span>
              <span className="ot-label">{LABELS[step]}</span>
              <span className="ot-time">{done ? shortDate(timeFor(order, step)) : ''}</span>
            </li>
          );
        })}
      </ol>

      {order.shipping?.trackingNumber && (
        <p className="ot-shipping">
          {order.shipping.courier ? `${order.shipping.courier} · ` : ''}
          Tracking number <strong>{order.shipping.trackingNumber}</strong>
        </p>
      )}
    </div>
  );
};

export default OrderTracker;
