
import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  createOrder,
  createRazorpayOrder,
  verifyRazorpayPayment,
} from '../services/orderService.js';
import { getUserProfile } from '../services/userService.js';
import { getWallet } from '../services/walletService.js';
import { previewCoupon } from '../services/couponService.js';
import { lookupProducts } from '../services/productService.js';
import { stockFor } from '../utils/stock.js';
import { formatPaise } from '../utils/razorpay.js';

const NEW_ADDRESS_ID = 'new';

// First usable image URL for a cart or Buy Now item.
const getItemImage = (item) =>
  item?.images?.find(
    (image) =>
      typeof image === 'string' &&
      /^https?:\/\/\S+$/i.test(image.trim())
  )?.trim() || '';


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
  const {
    cartItems: savedCartItems,
    cartTotal: savedCartTotal,
    clearCart: clearSavedCart,
    refreshCart,
  } = useCart();

  // Check the cart's stock as soon as checkout opens, so a sold-out item is shown.
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // "Buy now" from a product page checks out that one item and leaves the
  // saved cart untouched. Otherwise the whole cart is checked out.
  const buyNow = location.state?.buyNow || null;
  const cartItems = buyNow ? [buyNow] : savedCartItems;
  const cartTotal = buyNow
    ? Number(buyNow.price) * Number(buyNow.quantity)
    : savedCartTotal;
  const clearCart = () => {
    if (!buyNow) clearSavedCart();
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');

  // Coupon: `appliedCoupon` is the server's preview. The server checks the
  // code again when the order is placed.
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState('');

  const discount = appliedCoupon ? appliedCoupon.discount : 0;
  const payableTotal = Math.max(0, Math.round((Number(cartTotal) - discount) * 100) / 100);

  const handleApplyCoupon = async (event) => {
    event.preventDefault();
    setCouponError('');

    if (!token) {
      navigate('/login');
      return;
    }

    setCouponBusy(true);

    try {
      const data = await previewCoupon(
        token,
        couponInput,
        cartItems.map((item) => ({
          product: item._id,
          quantity: item.quantity,
          color: item.color || undefined,
          size: item.size,
        }))
      );

      setAppliedCoupon({ ...data.preview, discount: Number(data.preview.discount) });
      setCouponInput('');
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err.message);
    } finally {
      setCouponBusy(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };
  const [walletBalance, setWalletBalance] = useState(null);

  useEffect(() => {
    if (!token) return undefined;

    let active = true;

    getWallet(token, 1, 1)
      .then((data) => {
        if (active) setWalletBalance(data.balance);
      })
      .catch(() => {
        if (active) setWalletBalance(0);
      });

    return () => {
      active = false;
    };
  }, [token]);

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


  const [savedAddresses, setSavedAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(Boolean(token));
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  // Load saved addresses and pre-select the default one.
  useEffect(() => {
    let cancelled = false;

    const loadAddresses = async () => {
      try {
        const response = await getUserProfile();
        const list = response.user?.addresses || [];

        if (cancelled) return;

        setSavedAddresses(list);

        const preferred = list.find((address) => address.isDefault) || list[0];
        setSelectedAddressId(preferred ? preferred._id : NEW_ADDRESS_ID);
      } catch {
        // If addresses can't be loaded, fall back to the typed form.
        if (!cancelled) setSelectedAddressId(NEW_ADDRESS_ID);
      } finally {
        if (!cancelled) setAddressesLoading(false);
      }
    };

    if (token) {
      loadAddresses();
    }

    return () => {
      cancelled = true;
    };
  }, [token]);

  const selectedSavedAddress = savedAddresses.find(
    (address) => address._id === selectedAddressId
  );

  const hasShippingAddress =
    Boolean(selectedSavedAddress) || selectedAddressId === NEW_ADDRESS_ID;

  // Only the shipping fields go to the order API.
  const shippingAddress = selectedSavedAddress
    ? {
        name: selectedSavedAddress.name,
        phone: selectedSavedAddress.phone,
        addressLine: selectedSavedAddress.addressLine,
        city: selectedSavedAddress.city,
        state: selectedSavedAddress.state,
        postalCode: selectedSavedAddress.postalCode,
        country: selectedSavedAddress.country,
      }
    : form;

  // Checks every line against the store's current stock. Returns a message, or '' when all are available.
  const checkStockNow = async () => {
    const lines = buyNow ? [buyNow] : cartItems;

    if (lines.length === 0) return '';

    let products;

    try {
      products = await lookupProducts([...new Set(lines.map((line) => String(line._id)))]);
    } catch {
      // If the check itself fails, the server still checks stock when the order is placed.
      return '';
    }

    const byId = new Map(products.map((product) => [String(product._id), product]));

    for (const line of lines) {
      const fresh = byId.get(String(line._id));
      const label = `${line.name}${line.color ? ` (${line.color}${line.size ? ` / ${line.size}` : ''})` : ''}`;

      if (!fresh) return `${line.name} is no longer available. Please remove it from your cart.`;

      const stock = stockFor(fresh, line.color, line.size);

      if (stock <= 0) return `${label} is out of stock and not available. Please remove it to continue.`;
      if (stock < line.quantity) return `Only ${stock} left of ${label}. Please lower the quantity.`;
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const stockProblem = await checkStockNow();

    if (stockProblem) {
      setError(stockProblem);
      return;
    }

    if (!token) {
      navigate('/login');
      return;
    }

    if (cartItems.length === 0) {
      setError('Your cart is empty.');
      return;
    }

    if (!hasShippingAddress) {
      setError('Please choose a delivery address.');
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

      // COD and wallet orders are placed directly, without Razorpay.
      if (paymentMethod === 'COD' || paymentMethod === 'WALLET') {
        const order = await createOrder(
          {
            items,
            shippingAddress,
            paymentMethod,
            couponCode: appliedCoupon?.code || undefined,
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
          shippingAddress,
          couponCode: appliedCoupon?.code || undefined,
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
          name: shippingAddress.name,
          contact: shippingAddress.phone,
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
        <h1>{buyNow ? 'Nothing to buy' : 'Your cart is empty'}</h1>
        <Link to="/products">Continue shopping</Link>
      </main>
    );
  }
  const hasUnavailableItems = cartItems.some((item) => {
    const stock = Number(item.stock);
    const quantity = Number(item.quantity);

    return (
      !Number.isFinite(stock) ||
      stock <= 0 ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > stock
    );
  });

  const stockWarning = hasUnavailableItems
    ? 'Some items are unavailable or exceed available stock. Please return to your cart and update them.'
    : '';
  const displayError = error || stockWarning;

  // Wallet pays the whole order, so the balance must cover the total.
  const walletCovers =
    walletBalance !== null &&
    walletBalance >= Math.round(payableTotal * 100);

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

      {displayError && (
        <p role="alert" style={{ color: '#b00020' }}>
          {displayError}
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

          {addressesLoading && (
            <p style={{ color: '#777', fontSize: 14 }}>
              Loading your saved addresses…
            </p>
          )}

          {!addressesLoading && savedAddresses.length > 0 && (
            <div
              role="radiogroup"
              aria-label="Saved addresses"
              style={{ display: 'grid', gap: 12, marginBottom: 22 }}
            >
              {savedAddresses.map((address) => {
                const checked = selectedAddressId === address._id;

                return (
                  <label
                    key={address._id}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      padding: 16,
                      border: checked ? '1px solid #111' : '1px solid #ddd',
                      boxShadow: checked ? 'inset 0 0 0 1px #111' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="savedAddress"
                      value={address._id}
                      checked={checked}
                      onChange={() => setSelectedAddressId(address._id)}
                      style={{ marginTop: 4 }}
                    />

                    <span style={{ fontSize: 14, lineHeight: 1.6 }}>
                      <strong>{address.name}</strong>
                      <span style={{ color: '#777' }}> · {address.label}</span>
                      {address.isDefault && (
                        <span
                          style={{
                            marginLeft: 8,
                            padding: '2px 8px',
                            background: '#111',
                            color: '#fff',
                            fontSize: 11,
                            letterSpacing: '0.06em',
                          }}
                        >
                          DEFAULT
                        </span>
                      )}
                      <br />
                      {address.addressLine}, {address.city}, {address.state}{' '}
                      {address.postalCode}, {address.country}
                      <br />
                      {address.phone}
                    </span>
                  </label>
                );
              })}

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 16,
                  border: '1px dashed #bbb',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="savedAddress"
                  value={NEW_ADDRESS_ID}
                  checked={selectedAddressId === NEW_ADDRESS_ID}
                  onChange={() => setSelectedAddressId(NEW_ADDRESS_ID)}
                />
                Use a different address
              </label>

              <Link
                to="/profile"
                style={{ fontSize: 13, color: '#555', textDecoration: 'underline' }}
              >
                Manage saved addresses
              </Link>
            </div>
          )}

          {!addressesLoading &&
            selectedAddressId === NEW_ADDRESS_ID &&
            [
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
              alignItems: 'flex-start',
              gap: 10,
              marginBottom: 14,
              cursor: walletCovers ? 'pointer' : 'not-allowed',
              opacity: walletCovers ? 1 : 0.6,
            }}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="WALLET"
              checked={paymentMethod === 'WALLET'}
              disabled={!walletCovers}
              onChange={(event) => setPaymentMethod(event.target.value)}
              style={{ marginTop: 4 }}
            />
            <span>
              Pay from wallet
              <small style={{ display: 'block', color: '#666' }}>
                {walletBalance === null
                  ? 'Checking your balance…'
                  : `${formatPaise(walletBalance)} available`}
                {walletBalance !== null && !walletCovers && (
                  <>
                    {' · '}
                    <Link to="/wallet">Add money</Link>
                  </>
                )}
              </small>
            </span>
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
            disabled={
              loading ||
              cartItems.length === 0 ||
              hasUnavailableItems ||
              !hasShippingAddress ||
              (paymentMethod === 'WALLET' && !walletCovers)
            }
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
              ? paymentMethod !== 'ONLINE'
                ? 'PLACING ORDER...'
                : 'PROCESSING PAYMENT...'
              : paymentMethod !== 'ONLINE'
                ? 'PLACE ORDER'
                : 'PAY NOW'}
          </button>
        </form>

        <aside style={{
          border: '1px solid #ddd',
          padding: 24,
        }}>
          <h2>Order summary</h2>

          {buyNow && (
            <p style={{ fontSize: 12, color: '#777', marginTop: 0 }}>
              Buying this item now. Your cart is not included.
            </p>
          )}

          {cartItems.map((item) => (
            <div
              key={`${item._id}-${item.size}-${item.color || ''}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', gap: 12, minWidth: 0 }}>
                {getItemImage(item) ? (
                  <img
                    src={getItemImage(item)}
                    alt={item.name || 'Product image'}
                    style={{
                      width: 64,
                      height: 80,
                      objectFit: 'cover',
                      flexShrink: 0,
                      border: '1px solid #eee',
                      background: '#f3f1ed',
                    }}
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    style={{
                      width: 64,
                      height: 80,
                      flexShrink: 0,
                      border: '1px solid #eee',
                      background: '#f3f1ed',
                    }}
                  />
                )}

                <span>
                  {item.name} × {item.quantity}
                  <br />
                  <small>
                    Size: {item.size}
                    {item.color ? ` · Color: ${item.color}` : ''}
                  </small>
                </span>
              </div>

              <span>
                ₹{(
                  Number(item.price) * Number(item.quantity)
                ).toLocaleString('en-IN')}
              </span>
            </div>
          ))}

          <hr />

          <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
            <input
              type="text"
              aria-label="Coupon code"
              placeholder="Coupon code"
              value={couponInput}
              onChange={(event) => setCouponInput(event.target.value)}
              disabled={Boolean(appliedCoupon) || couponBusy}
              style={{ flex: 1, minWidth: 0, padding: 10, textTransform: 'uppercase' }}
            />
            {appliedCoupon ? (
              <button type="button" onClick={removeCoupon} style={{ padding: '10px 14px', cursor: 'pointer' }}>
                Remove
              </button>
            ) : (
              <button
                type="submit"
                disabled={couponBusy || !couponInput.trim()}
                style={{ padding: '10px 14px', background: '#111', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                {couponBusy ? 'Checking…' : 'Apply'}
              </button>
            )}
          </form>

          {couponError && (
            <p role="alert" style={{ color: '#b00020', fontSize: 13, margin: '0 0 12px' }}>
              {couponError}
            </p>
          )}

          {appliedCoupon && (
            <p role="status" style={{ color: '#2e7d32', fontSize: 13, margin: '0 0 12px' }}>
              {appliedCoupon.code} applied: you save ₹{discount.toLocaleString('en-IN')}
            </p>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 600,
          }}>
            <span>Subtotal</span>
            <span>₹{cartTotal.toLocaleString('en-IN')}</span>
          </div>

          {appliedCoupon && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span>Discount ({appliedCoupon.code})</span>
              <span>− ₹{discount.toLocaleString('en-IN')}</span>
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 700,
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid #ddd',
          }}>
            <span>Total</span>
            <span>₹{payableTotal.toLocaleString('en-IN')}</span>
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

