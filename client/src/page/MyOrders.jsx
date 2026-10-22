
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getMyOrders } from '../services/orderService.js';

const MyOrders = () => {
  const { token } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError('');

        const data = await getMyOrders(token);
        setOrders(data);
      } catch (err) {
        setError(err.message || 'Failed to load your orders.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadOrders();
    } else {
      setError('Please log in to view your orders.');
      setLoading(false);
    }
  }, [token]);

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  if (loading) {
    return <main style={{ padding: 60 }}>Loading your orders...</main>;
  }

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '60px 24px 100px',
        color: '#111',
      }}
    >
      <p
        style={{
          fontSize: 11,
          letterSpacing: '0.15em',
          color: '#777',
        }}
      >
        YOUR ACCOUNT / ORDER HISTORY
      </p>

      <h1 style={{ fontSize: 42, fontWeight: 500 }}>
        MY ORDERS
      </h1>

      {error && (
        <p role="alert" style={{ color: '#b00020' }}>
          {error}
        </p>
      )}

      {!error && orders.length === 0 && (
        <section style={{ padding: '40px 0' }}>
          <h2>No orders yet.</h2>
          <p style={{ color: '#666' }}>
            Your orders will appear here after checkout.
          </p>
          <Link to="/products">Explore products</Link>
        </section>
      )}

      {orders.map((order) => (
        <article
          key={order._id}
          style={{
            border: '1px solid #ddd',
            padding: 24,
            marginTop: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <p style={{ color: '#777', fontSize: 12 }}>
                ORDER PLACED
              </p>
              <p>{formatDate(order.createdAt)}</p>
            </div>

            <div>
              <p style={{ color: '#777', fontSize: 12 }}>
                ORDER STATUS
              </p>
              <strong>{order.orderStatus}</strong>
            </div>

            <div>
              <p style={{ color: '#777', fontSize: 12 }}>
                TOTAL
              </p>
              <strong>
                ₹{Number(order.totalAmount).toLocaleString('en-IN')}
              </strong>
            </div>
          </div>

          <hr style={{ border: 0, borderTop: '1px solid #ddd' }} />

          <h3>Items</h3>

          {order.items.map((item, index) => (
            <div
              key={`${item.product}-${index}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                marginBottom: 12,
              }}
            >
              <span>
                {item.name} × {item.quantity}
                {item.size && ` · Size ${item.size}`}
              </span>

              <span>
                ₹{(
                  Number(item.price) * Number(item.quantity)
                ).toLocaleString('en-IN')}
              </span>
            </div>
          ))}

          <p style={{ color: '#666', fontSize: 13 }}>
            Payment: {order.paymentMethod} · {order.paymentStatus}
          </p>
        </article>
      ))}
    </main>
  );
};

export default MyOrders;
