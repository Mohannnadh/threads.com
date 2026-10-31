import { confirmDialog, notifyDialog } from '../components/Dialog.jsx';

import { useEffect, useState } from 'react';
import { stockFor, priceFor } from '../utils/stock.js';
import Pagination from '../components/Pagination.jsx';

// Products per page on the wishlist.
const WISH_PAGE_SIZE = 8;
import { useNavigate } from 'react-router-dom';

import { useWishlist } from '../context/WishlistContext.jsx';
import { useCart } from '../context/CartContext.jsx';

import { Icon } from '../components/Icon.jsx';
import '../styles/wishlist.css';

const Wishlist = () => {
  const navigate = useNavigate();

  const { wishlistItems, removeFromWishlist, clearWishlist, refreshWishlist } = useWishlist();

  // Asks first, then empties the wishlist.
  const handleClearAll = async () => {
    const confirmed = await confirmDialog({
      title: 'Clear wishlist?',
      message: `Remove all ${wishlistItems.length} items from your wishlist?`,
      confirmLabel: 'Clear all',
      danger: true,
    });

    if (confirmed) clearWishlist();
  };
  const { addToCart } = useCart();

  // Check the wishlist against the store each time the page opens.
  useEffect(() => {
    refreshWishlist();
  }, [refreshWishlist]);

  const [selectedSizes, setSelectedSizes] = useState({});
  const [selectedColors, setSelectedColors] = useState({});
  const [wishPage, setWishPage] = useState(1);

  // Get the product image.
  const getImage = (product) => {
    const image = Array.isArray(product.images)
      ? product.images[0]
      : product.images;

    if (typeof image === 'string' && image.trim()) {
      return image.trim();
    }

    return '';
  };

  // Handle image loading errors: hide the broken image, the grey box stays.
  const handleImageError = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.style.visibility = 'hidden';
  };

  // Add a product to the cart after selecting a size.
  // Colours and sizes this product comes in, from its colour and size list.
  const getColors = (product) => {
    if (!Array.isArray(product.variants) || product.variants.length === 0) return [];

    return [...new Set(product.variants.map((variant) => variant.color))];
  };

  const getSizes = (product) => {
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      const color = selectedColors[product._id] || '';

      return product.variants
        .filter((variant) => variant.color === color)
        .map((variant) => variant.size);
    }

    return Array.isArray(product.sizes) ? product.sizes : [];
  };

  const handleAddToCart = (product) => {
    const hasList = Array.isArray(product.variants) && product.variants.length > 0;
    const color = selectedColors[product._id] || '';
    const size = selectedSizes[product._id] || '';

    if (hasList && !color) {
      notifyDialog('Please select a color first.');
      return;
    }

    if (!size) {
      notifyDialog('Please select a size first.');
      return;
    }

    // Stock and price for the chosen colour and size.
    const stock = stockFor(product, color, size);

    if (stock <= 0) {
      notifyDialog('This size is out of stock.');
      return;
    }

    const purchasable = {
      ...product,
      stock,
      price: priceFor(product, color, size),
      finalPrice: priceFor(product, color, size),
    };

    const result = addToCart(purchasable, size, 1, color);
    notifyDialog(result.success ? 'Product added to cart.' : result.message);
  };

  // One page of the wishlist. The page is kept in range when items are removed.
  const wishPageCount = Math.max(1, Math.ceil(wishlistItems.length / WISH_PAGE_SIZE));
  const currentWishPage = Math.min(wishPage, wishPageCount);
  const pageItems = wishlistItems.slice(
    (currentWishPage - 1) * WISH_PAGE_SIZE,
    currentWishPage * WISH_PAGE_SIZE
  );

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

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <p style={{ margin: 0 }}>{wishlistItems.length} ITEMS</p>

        {wishlistItems.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            style={{
              padding: '10px 18px',
              border: '1px solid #111',
              background: '#fff',
              color: '#111',
              cursor: 'pointer',
              fontSize: '12px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Clear all
          </button>
        )}
      </div>

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
        <section className="wishlist-grid">
          {pageItems.map((product) => (
            <article
              key={product._id}
              style={{ minWidth: 0, width: '100%' }}
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
                <Icon name="x" size={14} /> Remove
              </button>

              <img
                src={getImage(product)}
                alt={product.name || 'Product'}
                onError={handleImageError}
                onClick={() => navigate(`/products/${product._id}`)}
                style={{
                  display: 'block',
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

              <p>₹{product.finalPrice ?? product.price}</p>

              {Number(product.stock) <= 0 ? (
                <p
                  style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginTop: '12px',
                  }}
                >
                  OUT OF STOCK. PRODUCT IS NOT AVAILABLE
                </p>
              ) : (
                <>
                  {getColors(product).length > 0 && (
                    <>
                      <label
                        htmlFor={`color-${product._id}`}
                        style={{ display: 'block', margin: '16px 0 8px', fontSize: '12px' }}
                      >
                        SELECT COLOR
                      </label>

                      <select
                        id={`color-${product._id}`}
                        value={selectedColors[product._id] || ''}
                        onChange={(event) => {
                          setSelectedColors((previous) => ({ ...previous, [product._id]: event.target.value }));
                          setSelectedSizes((previous) => ({ ...previous, [product._id]: '' }));
                        }}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '12px', marginBottom: '12px', border: '1px solid #ccc', background: '#fff', color: '#111' }}
                      >
                        <option value="">Choose a color</option>
                        {getColors(product).map((color) => (
                          <option key={color} value={color}>
                            {color}
                          </option>
                        ))}
                      </select>
                    </>
                  )}

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
                      boxSizing: 'border-box',
                      padding: '12px',
                      marginBottom: '12px',
                      border: '1px solid #ccc',
                      background: '#fff',
                      color: '#111',
                    }}
                  >
                    <option value="">Choose a size</option>

                    {getSizes(product).map((size) => {
                      const color = selectedColors[product._id] || '';
                      const soldOut = stockFor(product, color, size) <= 0;

                      return (
                        <option key={size} value={size} disabled={soldOut}>
                          {size}{soldOut ? ' (out of stock)' : ''}
                        </option>
                      );
                    })}
                  </select>

                  <button
                    type="button"
                    onClick={() => handleAddToCart(product)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
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

      {wishlistItems.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <Pagination
            pagination={{
              page: currentWishPage,
              totalPages: wishPageCount,
              total: wishlistItems.length,
              limit: WISH_PAGE_SIZE,
            }}
            onPageChange={(next) => setWishPage(next)}
            itemLabel="items"
          />
        </div>
      )}
    </main>
  );
};

export default Wishlist;
