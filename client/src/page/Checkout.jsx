
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  createOrder,
  createRazorpayOrder,
  verifyRazorpayPayment,
} from '../services/orderService.js';


const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (existingScript) {
      existingScript.addEventListener(
        'load',
        () => resolve(true),
        { once: true }
      );

      existingScript.addEventListener(
        'error',
        () => resolve(false),
        { once: true }
      );

      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
};

const Checkout = () => {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    addressLine: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
  });

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };


  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!token) {
      navigate('/login');
      return;
    }

    if (cartItems.length === 0) {
      setError('Your cart is empty.');
      return;
    }

    const items = cartItems.map((item) => ({
      product: item._id,
      quantity: item.quantity,
      size: item.size,
      color: item.color || undefined,
    }));

    try {
      setLoading(true);

      // Keep the existing COD flow unchanged.
      if (paymentMethod === 'COD') {
        const order = await createOrder(
          {
            items,
            shippingAddress: form,
            paymentMethod: 'COD',
          },
          token
        );

        clearCart();
        navigate('/order-success', { state: { order } });
        return;
      }

      // Load Razorpay Checkout.
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || !window.Razorpay) {
        throw new Error(
          'Unable to load Razorpay Checkout. Please try again.'
        );
      }

      // Ask the backend to create an order using database prices.
      const result = await createRazorpayOrder(
        {
          items,
          shippingAddress: form,
        },
        token
      );

      const { order, razorpayOrder, keyId } = result;

      const options = {
        key: keyId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'THREADS.COM',
        description: 'Order payment',
        order_id: razorpayOrder.id,

        handler: async (response) => {
          try {
            setLoading(true);
            setError('');

            const verification = await verifyRazorpayPayment(
              {
                orderId: order._id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
              token
            );

            if (!verification.success) {
              throw new Error('Payment verification failed.');
            }

            clearCart();
            navigate('/order-success', {
              state: { order: verification.order },
            });
          } catch (verificationError) {
            setError(
              verificationError.message ||
              'Payment verification failed. Please check your orders before retrying.'
            );
          } finally {
            setLoading(false);
          }
        },

        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },

        prefill: {
          name: form.name,
          contact: form.phone,
        },

        theme: {
          color: '#111111',
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on('payment.failed', (response) => {
        setError(
          response.error?.description ||
          'Payment failed. Please try again.'
        );
        setLoading(false);
      });

      razorpay.open();
    } catch (err) {
      setError(err.message || 'Could not process your order.');
      setLoading(false);
    }
  };


  if (cartItems.length === 0) {
    return (
      <main style={{ maxWidth: 800, margin: '80px auto', padding: 24 }}>
        <h1>Your cart is empty</h1>
        <Link to="/products">Continue shopping</Link>
      </main>
    );
  }

  return (
    <main style={{
      maxWidth: 1100,
      margin: '0 auto',
      padding: '50px 24px 80px',
      color: '#111',
    }}>
      <p style={{
        fontSize: 11,
        letterSpacing: '0.15em',
        color: '#777',
      }}>
        THREADS.COM / CHECKOUT
      </p>

      <h1 style={{ fontWeight: 500, fontSize: 42 }}>
        CHECKOUT
      </h1>

      {error && (
        <p role="alert" style={{ color: '#b00020' }}>
          {error}
        </p>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 340px)',
        gap: 40,
        alignItems: 'start',
      }}>
        <form onSubmit={handleSubmit}>
          <h2>Shipping address</h2>

          {[
            ['name', 'Full name'],
            ['phone', 'Phone number'],
            ['addressLine', 'Address'],
            ['city', 'City'],
            ['state', 'State'],
            ['postalCode', 'Postal code'],
            ['country', 'Country'],
          ].map(([name, label]) => (
            <div key={name} style={{ marginBottom: 18 }}>
              <label
                htmlFor={name}
                style={{ display: 'block', marginBottom: 7 }}
              >
                {label}
              </label>

              <input
                id={name}
                name={name}
                value={form[name]}
                onChange={handleChange}
                required
                autoComplete="shipping"
                style={{
                  boxSizing: 'border-box',
                  width: '100%',
                  padding: 12,
                  border: '1px solid #ccc',
                }}
              />
            </div>
          ))}

          <h2>Payment method</h2>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 14,
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="COD"
              checked={paymentMethod === 'COD'}
              onChange={(event) => setPaymentMethod(event.target.value)}
            />
            Cash on Delivery (COD)
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 24,
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="ONLINE"
              checked={paymentMethod === 'ONLINE'}
              onChange={(event) => setPaymentMethod(event.target.value)}
            />
            Pay Online with Razorpay
          </label>

          <button
            type="submit"
            disabled={loading || cartItems.length === 0}
            style={{
              width: '100%',
              padding: 16,
              background: '#111',
              color: '#fff',
              border: 'none',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? paymentMethod === 'COD'
                ? 'PLACING ORDER...'
                : 'PROCESSING PAYMENT...'
              : paymentMethod === 'COD'
                ? 'PLACE ORDER'
                : 'PAY NOW'}
          </button>
        </form>

        <aside style={{
          border: '1px solid #ddd',
          padding: 24,
        }}>
          <h2>Order summary</h2>

          {cartItems.map((item) => (
            <div
              key={`${item._id}-${item.size}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 16,
              }}
            >
              <span>
                {item.name} × {item.quantity}
                <br />
                <small>Size: {item.size}</small>
              </span>

              <span>
                ₹{(
                  Number(item.price) * Number(item.quantity)
                ).toLocaleString('en-IN')}
              </span>
            </div>
          ))}

          <hr />

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 600,
          }}>
            <span>Subtotal</span>
            <span>₹{cartTotal.toLocaleString('en-IN')}</span>
          </div>

          <p style={{ fontSize: 12, color: '#777' }}>
            The final amount is calculated by the server.
          </p>
        </aside>
      </div>
    </main>
  );
};

export default Checkout;

