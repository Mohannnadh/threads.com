
import { Link, useLocation, Navigate } from 'react-router-dom';

const OrderSuccess = () => {
  const location = useLocation();
  const order = location.state?.order;

  // Prevent access without a successful order response.
  if (!order) {
    return <Navigate to="/orders" replace />;
  }

  return (
    <main
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '100px 24px',
        textAlign: 'center',
        color: '#111',
      }}
    >
      <p
        style={{
          fontSize: '11px',
          letterSpacing: '0.15em',
          color: '#777',
        }}
      >
        THREADS.COM / ORDER CONFIRMED
      </p>

      <h1 style={{ fontSize: '42px', fontWeight: 500 }}>
        THANK YOU FOR YOUR ORDER.
      </h1>

      <p style={{ color: '#666', lineHeight: 1.7 }}>
        Your order has been placed successfully. We'll prepare it for processing.
      </p>

      <p>
        Order ID: <strong>{order._id}</strong>
      </p>

      <p>
        Total: <strong>₹{Number(order.totalAmount).toLocaleString('en-IN')}</strong>
      </p>

      <p>Payment method: Cash on Delivery</p>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginTop: '30px',
        }}
      >
        <Link
          to="/orders"
          style={{
            padding: '14px 24px',
            background: '#111',
            color: '#fff',
            textDecoration: 'none',
          }}
        >
          VIEW MY ORDERS
        </Link>

        <Link
          to="/products"
          style={{
            padding: '14px 24px',
            border: '1px solid #111',
            color: '#111',
            textDecoration: 'none',
          }}
        >
          CONTINUE SHOPPING
        </Link>
      </div>
    </main>
  );
};

export default OrderSuccess;
