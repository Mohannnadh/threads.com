
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { getProductById } from '../services/productService';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';

const getImage = (product) => {
  if (!Array.isArray(product?.images)) {
    return '';
  }

  return (
    product.images.find(
      (image) =>
        typeof image === 'string' &&
        /^https?:\/\/\S+$/i.test(image.trim())
    )?.trim() || ''
  );
};

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadProduct = async () => {
      setLoading(true);
      setError('');
      setProduct(null);
      setSelectedSize('');
      setQuantity(1);
      setMessage('');

      try {
        const response = await getProductById(id);

        const fetchedProduct =
          response?.product ??
          response?.data?.product ??
          response?.data ??
          response;

        if (!fetchedProduct?._id) {
          throw new Error('Product not found.');
        }

        if (isMounted) {
          setProduct(fetchedProduct);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              'Unable to load this product.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (id) {
      loadProduct();
    } else {
      setError('Product ID is missing.');
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  const sizes = Array.isArray(product?.sizes) ? product.sizes : [];
  const stock = Number(product?.stock) || 0;
  const outOfStock = stock <= 0;
  const availableQuantity = Math.max(0, Math.floor(stock));
  const imageUrl = getImage(product);

  const handleSizeSelect = (size) => {
    setSelectedSize(size);
    setMessage('');
  };

  const handleQuantityChange = (change) => {
    setQuantity((current) => {
      const next = current + change;

      return Math.min(availableQuantity, Math.max(1, next));
    });

    setMessage('');
  };

  const handleWishlist = () => {
    if (!product) return;

    const alreadyWishlisted = isWishlisted(product._id);

    toggleWishlist(product);

    setMessage(
      alreadyWishlisted
        ? 'REMOVED FROM WISHLIST'
        : 'ADDED TO WISHLIST'
    );
  };

  const handleAddToCart = () => {
    setMessage('');

    if (!product) {
      setMessage('Product details are unavailable.');
      return;
    }

    if (!selectedSize) {
      setMessage('Please select a size first.');
      return;
    }

    if (outOfStock) {
      setMessage('This product is currently out of stock.');
      return;
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > availableQuantity
    ) {
      setMessage(
        `Only ${availableQuantity} item(s) are available in stock.`
      );
      return;
    }

    try {
      const result = addToCart(product, selectedSize, quantity);

      if (result?.success) {
        setMessage(result.message);
      } else {
        setMessage(
          result?.message || 'Could not add the product to your cart.'
        );
      }
    } catch (err) {
      console.error('Add to cart failed:', err);
      setMessage('Unable to add this product. Please try again.');
    }
  };

  if (loading) {
    return (
      <p
        role="status"
        style={{ padding: '60px 24px', textAlign: 'center' }}
      >
        Loading product details...
      </p>
    );
  }

  if (error || !product) {
    return (
      <main
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '80px 24px',
          textAlign: 'center',
          color: '#111',
        }}
      >
        <h1>PRODUCT NOT FOUND</h1>

        <p style={{ color: '#666' }}>
          {error || 'This product could not be found.'}
        </p>

        <button
          type="button"
          onClick={() => navigate('/products')}
          style={{
            padding: '14px 22px',
            background: '#111',
            color: '#fff',
            border: '1px solid #111',
            cursor: 'pointer',
          }}
        >
          BACK TO PRODUCTS
        </button>
      </main>
    );
  }

  const wishlisted = isWishlisted(product._id);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fff', color: '#111' }}>
      <main className="product-detail-main">
        <nav className="product-detail-breadcrumb" aria-label="Breadcrumb">
          <Link
            to="/products"
            style={{ color: '#666', textDecoration: 'none' }}
          >
            All Products
          </Link>

          <span style={{ margin: '0 10px' }}>/</span>

          <span style={{ color: '#111' }}>{product.name}</span>
        </nav>

        <section className="product-detail-grid">
          <div className="product-detail-image">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={product.name || 'Product image'}
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <p>No product image available.</p>
            )}
          </div>

          <div className="product-detail-info">
            <p
              style={{
                margin: '0 0 14px',
                fontSize: '10px',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#777',
              }}
            >
              {product.category || 'T-SHIRT'}
            </p>

            <h1
              className="product-detail-title"
              style={{
                margin: '0 0 18px',
                lineHeight: 1.1,
                fontWeight: 500,
                letterSpacing: '-0.04em',
              }}
            >
              {product.name}
            </h1>

            <p
              style={{
                margin: '0 0 24px',
                fontSize: '22px',
                fontWeight: 500,
              }}
            >
              ₹{Number(product.price || 0).toLocaleString('en-IN')}
            </p>

            {product.description && (
              <p
                style={{
                  fontSize: '14px',
                  lineHeight: 1.8,
                  color: '#666',
                  marginBottom: '28px',
                }}
              >
                {product.description}
              </p>
            )}

            <p style={{ fontSize: '12px', color: '#666', marginBottom: '28px' }}>
              Gender: {product.gender || 'Unisex'}
            </p>

            <div style={{ borderTop: '1px solid #ddd', paddingTop: '22px' }}>
              <p
                style={{
                  margin: '0 0 14px',
                  fontSize: '11px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                SELECT SIZE
              </p>

              {sizes.length > 0 ? (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      aria-pressed={selectedSize === size}
                      onClick={() => handleSizeSelect(size)}
                      style={{
                        width: '48px',
                        height: '44px',
                        border: '1px solid #111',
                        backgroundColor: selectedSize === size ? '#111' : '#fff',
                        color: selectedSize === size ? '#fff' : '#111',
                        cursor: 'pointer',
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: '#777' }}>
                  No sizes are available for this product.
                </p>
              )}
            </div>

            <div
              style={{
                marginTop: '28px',
                borderTop: '1px solid #ddd',
                paddingTop: '22px',
              }}
            >
              <p
                style={{
                  margin: '0 0 14px',
                  fontSize: '11px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                QUANTITY
              </p>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  border: '1px solid #ddd',
                }}
              >
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1 || outOfStock}
                  onClick={() => handleQuantityChange(-1)}
                  style={{
                    width: '44px',
                    height: '42px',
                    border: 'none',
                    background: '#fff',
                    cursor: quantity <= 1 || outOfStock ? 'not-allowed' : 'pointer',
                  }}
                >
                  −
                </button>

                <span
                  aria-live="polite"
                  style={{ minWidth: '36px', textAlign: 'center', fontSize: '13px' }}
                >
                  {quantity}
                </span>

                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={outOfStock || quantity >= availableQuantity}
                  onClick={() => handleQuantityChange(1)}
                  style={{
                    width: '44px',
                    height: '42px',
                    border: 'none',
                    background: '#fff',
                    cursor:
                      outOfStock || quantity >= availableQuantity
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  +
                </button>
              </div>

              <p style={{ fontSize: '12px', color: '#777', marginTop: '10px' }}>
                {outOfStock ? 'Currently out of stock' : `${availableQuantity} available`}
              </p>
            </div>

            <button
              type="button"
              disabled={outOfStock || sizes.length === 0}
              onClick={handleAddToCart}
              style={{
                width: '100%',
                minHeight: '52px',
                marginTop: '24px',
                padding: '14px 20px',
                border: '1px solid #111',
                backgroundColor: outOfStock || sizes.length === 0 ? '#999' : '#111',
                color: '#fff',
                fontSize: '11px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: outOfStock || sizes.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {outOfStock ? 'OUT OF STOCK' : 'ADD TO CART'}
            </button>

            <button
              type="button"
              onClick={handleWishlist}
              style={{
                width: '100%',
                minHeight: '52px',
                marginTop: '12px',
                padding: '14px 20px',
                border: '1px solid #111',
                backgroundColor: '#fff',
                color: '#111',
                fontSize: '11px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {wishlisted ? '♥ REMOVE FROM WISHLIST' : '♡ ADD TO WISHLIST'}
            </button>

            {message && (
              <p
                role="status"
                aria-live="polite"
                style={{ marginTop: '16px', fontSize: '12px', color: '#333' }}
              >
                {message}
              </p>
            )}

            <button
              type="button"
              onClick={() => navigate('/cart')}
              style={{
                display: 'block',
                marginTop: '20px',
                padding: '0 0 4px',
                border: 'none',
                borderBottom: '1px solid #999',
                background: 'transparent',
                color: '#444',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              VIEW CART
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ProductDetails;
