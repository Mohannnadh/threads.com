
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useWishlist } from '../context/WishlistContext.jsx';
import { useCart } from '../context/CartContext.jsx';

import blackTshirt from '../assets/products/essential-black-tee.png';

const Wishlist = () => {
  const navigate = useNavigate();

  const { wishlistItems, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  const [selectedSizes, setSelectedSizes] = useState({});

  // Use the actual image saved with the product.
  const getImage = (product) => {
    const image = Array.isArray(product.images)
      ? product.images[0]
      : product.images;

    if (typeof image === 'string' && image.trim()) {
      return image.trim();
    }

    return blackTshirt;
  };

  // Handle image loading errors.
  const handleImageError = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = blackTshirt;
  };

  // Add a product to the cart after selecting a size.
  const handleAddToCart = (product) => {
    if (Number(product.stock) <= 0) {
      window.alert('This product is out of stock.');
      return;
    }

    const size = selectedSizes[product._id];

    if (!size) {
      window.alert('Please select a size first.');
      return;
    }

    addToCart(product, size, 1);
    window.alert('Product added to cart.');
  };

  // Get available sizes for the product.
  const getSizes = (product) => {
    if (Array.isArray(product.sizes) && product.sizes.length > 0) {
      return product.sizes;
    }

    return ['S', 'M', 'L', 'XL', 'XXL'];
  };

  return (
    <main
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '48px 24px',
        color: '#111',
      }}
    >
      <p
        style={{
          fontSize: '11px',
          letterSpacing: '0.15em',
        }}
      >
        YOUR COLLECTION
      </p>

      <h1
        style={{
          fontSize: 'clamp(32px, 5vw, 52px)',
          marginBottom: '12px',
        }}
      >
        WISHLIST
      </h1>

      <p
        style={{
          color: '#666',
          marginBottom: '32px',
        }}
      >
        Save the pieces you love and return to them later.
      </p>

      <p style={{ marginBottom: '24px' }}>
        {wishlistItems.length} ITEMS
      </p>

      {wishlistItems.length === 0 ? (
        <section
          style={{
            textAlign: 'center',
            padding: '64px 16px',
            borderTop: '1px solid #ddd',
          }}
        >
          <h2>NOTHING SAVED YET.</h2>

          <p
            style={{
              color: '#666',
              margin: '16px 0 24px',
            }}
          >
            Save your favorite T-shirts to find them here.
          </p>

          <button
            type="button"
            onClick={() => navigate('/products')}
            style={{
              padding: '14px 24px',
              background: '#111',
              color: '#fff',
              border: 0,
              cursor: 'pointer',
            }}
          >
            EXPLORE T-SHIRTS
          </button>
        </section>
      ) : (
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '32px 16px',
          }}
        >
          {wishlistItems.map((product) => (
            <article
              key={product._id}
              style={{ minWidth: 0 }}
            >
              <button
                type="button"
                onClick={() => removeFromWishlist(product._id)}
                aria-label={`Remove ${product.name} from wishlist`}
                style={{
                  display: 'block',
                  marginLeft: 'auto',
                  marginBottom: '8px',
                  border: '1px solid #ddd',
                  background: '#fff',
                  padding: '8px 12px',
                  cursor: 'pointer',
                }}
              >
                ♥ Remove
              </button>

              <img
                src={getImage(product)}
                alt={product.name || 'Product'}
                onError={handleImageError}
                onClick={() => navigate(`/products/${product._id}`)}
                style={{
                  width: '100%',
                  aspectRatio: '3 / 4',
                  objectFit: 'contain',
                  background: '#f3f1ed',
                  cursor: 'pointer',
                }}
              />

              <p
                style={{
                  fontSize: '10px',
                  color: '#777',
                  textTransform: 'uppercase',
                  marginTop: '14px',
                }}
              >
                {product.category}
              </p>

              <h2 style={{ fontSize: '15px' }}>
                {product.name}
              </h2>

              <p>₹{product.price}</p>

              {Number(product.stock) <= 0 ? (
                <p
                  style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginTop: '12px',
                  }}
                >
                  OUT OF STOCK
                </p>
              ) : (
                <>
                  <label
                    htmlFor={`size-${product._id}`}
                    style={{
                      display: 'block',
                      margin: '16px 0 8px',
                      fontSize: '12px',
                    }}
                  >
                    SELECT SIZE
                  </label>

                  <select
                    id={`size-${product._id}`}
                    value={selectedSizes[product._id] || ''}
                    onChange={(event) =>
                      setSelectedSizes((previous) => ({
                        ...previous,
                        [product._id]: event.target.value,
                      }))
                    }
                    style={{
                      width: '100%',
                      padding: '12px',
                      marginBottom: '12px',
                      border: '1px solid #ccc',
                      background: '#fff',
                      color: '#111',
                    }}
                  >
                    <option value="">Choose a size</option>

                    {getSizes(product).map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => handleAddToCart(product)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #111',
                      background: '#111',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    ADD TO CART
                  </button>
                </>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  );
};

export default Wishlist;
