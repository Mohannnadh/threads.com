
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { Icon } from '../components/Icon.jsx';

const Cart = () => {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    cartTotal,
    refreshCart,
    syncMessage,
    clearSyncMessage,
  } = useCart();

  // Check the cart against the store each time the page opens.
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const hasUnavailableItems = cartItems.some((item) => {
    const stock = Number(item.stock);

    return (
      !Number.isFinite(stock) ||
      stock <= 0 ||
      !Number.isFinite(Number(item.quantity)) ||
      Number(item.quantity) < 1
    );
  });

  console.log('Cart page items:', cartItems);
  console.log(
    'Saved cart:',
    localStorage.getItem('threads-cart')
  );

  if (cartItems.length === 0) {
    return (
      <main
        style={{
          maxWidth: '1000px',
          margin: '0 auto',
          padding: '100px 24px',
          textAlign: 'center',
          color: '#111',
        }}
      >
        <p
          style={{
            fontSize: '10px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#777',
          }}
        >
          Your Collection
        </p>

        <h1 style={{ fontSize: '42px', fontWeight: '500' }}>
          YOUR CART IS EMPTY.
        </h1>

        <p style={{ color: '#666', lineHeight: '1.7' }}>
          Discover your next favourite T-shirt.
        </p>

        <Link
          to="/products"
          style={{
            display: 'inline-block',
            marginTop: '20px',
            padding: '16px 28px',
            backgroundColor: '#111',
            color: '#fff',
            textDecoration: 'none',
            fontSize: '11px',
            letterSpacing: '0.1em',
          }}
        >
          EXPLORE T-SHIRTS
        </Link>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '60px 24px 100px',
        color: '#111',
      }}
    >
      {cartItems.some((item) => item.stock <= 0 || item.quantity > item.stock) && (
        <div
          role="alert"
          style={{
            marginBottom: '20px',
            padding: '12px 16px',
            backgroundColor: '#fdecea',
            border: '1px solid #f1b0b7',
            color: '#b42318',
            fontSize: '13px',
          }}
        >
          Some products are not available. Remove them or lower the quantity to continue to checkout.
        </div>
      )}

      {syncMessage && (
        <div
          role="status"
          style={{
            marginBottom: '20px',
            padding: '12px 16px',
            backgroundColor: '#fff4e5',
            border: '1px solid #f0c27b',
            fontSize: '13px',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <span>{syncMessage}</span>
          <button
            type="button"
            onClick={clearSyncMessage}
            style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Dismiss
          </button>
        </div>
      )}
      <p
        style={{
          fontSize: '10px',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: '#777',
        }}
      >
        Your Collection
      </p>

      <h1
        style={{
          fontSize: 'clamp(36px, 5vw, 64px)',
          fontWeight: '500',
          letterSpacing: '-0.04em',
          margin: '12px 0',
        }}
      >
        YOUR CART
      </h1>

      <p style={{ color: '#666', marginBottom: '40px' }}>
        {cartItems.reduce(
          (total, item) => total + Math.max(0, Number(item.quantity) || 0),
          0
        )} items
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 320px)',
          gap: '40px',
          alignItems: 'start',
        }}
      >
        <section>
          {cartItems.map((item) => (
            <article
              key={`${item._id}-${item.size}-${item.color || ''}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px minmax(0, 1fr)',
                gap: '20px',
                padding: '24px 0',
                borderTop: '1px solid #ddd',
              }}
            >
              <img
                src={
                  item.images?.find(
                    (image) =>
                      typeof image === 'string' &&
                      image.trim() !== '' &&
                      /^https?:\/\/\S+$/i.test(image.trim())
                  ) || ''
                }
                alt={item.name || 'Product image'}
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
                style={{
                  width: '100%',
                  aspectRatio: '3 / 4',
                  objectFit: 'contain',
                  backgroundColor: '#f3f1ed',
                }}
              />

              <div>
                <h2
                  style={{
                    fontSize: '18px',
                    fontWeight: '500',
                    margin: '0 0 8px',
                  }}
                >
                  {item.name}
                </h2>

                <p style={{ fontSize: '13px', color: '#666' }}>
                  Size: {item.size}
                  {item.color ? ` · Color: ${item.color}` : ''}
                </p>

                {item.stock <= 0 ? (
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#b42318', margin: '4px 0 0' }}>
                    Out of stock. Product is not available.
                  </p>
                ) : item.quantity > item.stock ? (
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#b42318', margin: '4px 0 0' }}>
                    Only {item.stock} left. Lower the quantity to continue.
                  </p>
                ) : item.stock <= 3 ? (
                  <p style={{ fontSize: '12px', color: '#b26a00', margin: '4px 0 0' }}>
                    Only {item.stock} left
                  </p>
                ) : null}

                <p style={{ fontSize: '14px' }}>
                  ₹{item.price}
                </p>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    marginTop: '18px',
                  }}
                >
                  <button
                    type="button"
                    aria-label={`Decrease quantity of ${item.name}`}
                    disabled={item.quantity <= 1}
                    onClick={() =>
                      updateQuantity(
                        item._id,
                        item.size,
                        item.quantity - 1,
                        item.color || ''
                      )
                    }
                    style={{
                      width: '36px',
                      height: '36px',
                      border: '1px solid #111',
                      backgroundColor: '#fff',
                      cursor: item.quantity <= 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    −
                  </button>

                  <span>{item.quantity}</span>

                  <button
                    type="button"
                    aria-label={`Increase quantity of ${item.name}`}
                    disabled={item.quantity >= item.stock}
                    onClick={() =>
                      updateQuantity(
                        item._id,
                        item.size,
                        item.quantity + 1,
                        item.color || ''
                      )
                    }
                    style={{
                      width: '36px',
                      height: '36px',
                      border: '1px solid #111',
                      backgroundColor: '#fff',
                      cursor: item.quantity >= item.stock ? 'not-allowed' : 'pointer',
                    }}
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => removeFromCart(item._id, item.size, item.color || '')}
                  style={{
                    marginTop: '18px',
                    padding: 0,
                    border: 'none',
                    background: 'none',
                    color: '#666',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}

          <Link
            to="/products"
            style={{
              display: 'inline-block',
              marginTop: '20px',
              color: '#111',
              fontSize: '12px',
            }}
          >
            <Icon name="arrowLeft" size={14} /> Continue shopping
          </Link>
        </section>

        <aside
          style={{
            border: '1px solid #ddd',
            padding: '24px',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: '500', marginTop: 0 }}>
            ORDER SUMMARY
          </h2>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
              borderTop: '1px solid #ddd',
              paddingTop: '20px',
              marginTop: '20px',
              fontSize: '14px',
            }}
          >
            <span>Subtotal</span>
            <span>₹{cartTotal.toLocaleString('en-IN')}</span>
          </div>

          <p
            style={{
              fontSize: '12px',
              color: '#777',
              lineHeight: '1.6',
              marginTop: '18px',
            }}
          >
            Shipping and any applicable taxes will be calculated at checkout.
          </p>
          {hasUnavailableItems ? (
            <div>
              <button
                type="button"
                disabled
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: '24px',
                  padding: '16px',
                  border: 'none',
                  backgroundColor: '#999',
                  color: '#fff',
                  fontSize: '12px',
                  letterSpacing: '0.1em',
                  cursor: 'not-allowed',
                }}
              >
                CHECKOUT UNAVAILABLE
              </button>

              <p
                role="alert"
                style={{
                  marginTop: '12px',
                  fontSize: '12px',
                  lineHeight: '1.6',
                  color: '#b42318',
                }}
              >
                One or more items are unavailable. Remove them from your cart to continue.
              </p>
            </div>
          ) : (
            <Link
              to="/checkout"
              style={{
                display: 'block',
                marginTop: '24px',
                padding: '16px',
                backgroundColor: '#111',
                color: '#fff',
                textAlign: 'center',
                textDecoration: 'none',
                fontSize: '12px',
                letterSpacing: '0.1em',
              }}
            >
              PROCEED TO CHECKOUT
            </Link>
          )}
        </aside>
      </div>
    </main>
  );
};

export default Cart;
