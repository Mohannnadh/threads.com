
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { getProductById } from '../services/productService';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import ProductReviews from '../components/ProductReviews.jsx';
import { Icon } from '../components/Icon.jsx';
import { offerBadge, offerSaving } from '../utils/offer.js';
import { colorPhotoFor } from '../utils/colorPhoto.js';

// Every usable photo URL, in the order the admin saved them.
const getImages = (product) =>
  Array.isArray(product?.images)
    ? product.images
        .filter((image) => typeof image === 'string' && /^https?:\/\/\S+$/i.test(image.trim()))
        .map((image) => image.trim())
    : [];

const getImage = (product) => {
  if (!Array.isArray(product?.images)) return '';

  return (
    product.images.find(
      (image) =>
        typeof image === 'string' &&
        /^https?:\/\/\S+$/i.test(image.trim())
    )?.trim() || ''
  );
};

// Dot colours for common colour names. Other names show without a dot.
const COLOR_SWATCH = {
  black: '#111111',
  white: '#ffffff',
  grey: '#9e9e9e',
  gray: '#9e9e9e',
  red: '#c62828',
  blue: '#1565c0',
  navy: '#1b2a4a',
  green: '#2e7d32',
  yellow: '#f9a825',
  pink: '#f48fb1',
  brown: '#6d4c41',
  beige: '#d7c4a3',
  orange: '#ef6c00',
  purple: '#6a1b9a',
  cream: '#f5f0dc',
};

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();

  const [product, setProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [imageError, setImageError] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [zoom, setZoom] = useState({ active: false, x: 50, y: 50 });

  useEffect(() => {
    let isMounted = true;

    const loadProduct = async () => {
      setLoading(true);
      setError('');
      setProduct(null);
      setSelectedSize('');
      setSelectedColor('');
      setQuantity(1);
      setMessage('');
      setImageError(false);

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
          setActiveImage(0);
          setImageError(false);
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
        if (isMounted) setLoading(false);
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

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const hasVariantList = variants.length > 0;

  // Colours come from the colour and size list when the product has one.
  const colors = hasVariantList
    ? [...new Set(variants.map((variant) => variant.color))]
    : Array.isArray(product?.colors) ? product.colors.filter(Boolean) : [];

  // Sizes for the chosen colour, each with its own price and stock.
  const sizeOptions = hasVariantList
    ? variants
        .filter((variant) => variant.color === selectedColor)
        .map((variant) => ({
          size: variant.size,
          stock: Number(variant.stock) || 0,
          price: Number(variant.price),
          finalPrice: Number(variant.finalPrice ?? variant.price),
          offer: variant.offer || null,
        }))
    : (Array.isArray(product?.sizes) ? product.sizes : []).map((size) => ({
        size,
        stock: Number(product?.stock) || 0,
        price: Number(product?.price),
        finalPrice: Number(product?.finalPrice ?? product?.price),
        offer: product?.offer || null,
      }));

  const sizes = sizeOptions.map((option) => option.size);

  // The size the customer has chosen (product with a colour and size list only).
  const selectedVariant = hasVariantList
    ? sizeOptions.find((option) => option.size === selectedSize) || null
    : null;

  // Price and stock to use for the cart and Buy now.
  const purchasable = selectedVariant
    ? { ...product, stock: selectedVariant.stock, price: selectedVariant.price, finalPrice: selectedVariant.finalPrice, offer: selectedVariant.offer }
    : product;

  // What the price block shows: the chosen size, or the product's lowest price.
  const priceSource = selectedVariant || product;

  const rawStock = Number(product?.stock);
  const stock = hasVariantList
    ? selectedVariant ? selectedVariant.stock : 0
    : Number.isFinite(rawStock) && rawStock > 0 ? Math.floor(rawStock) : 0;

  // A size that is sold out cannot be bought.
  const outOfStock = hasVariantList ? Boolean(selectedVariant) && stock <= 0 : stock <= 0;
  const unitChosen = !hasVariantList || Boolean(selectedVariant);
  const addBlocked = !unitChosen || outOfStock || sizeOptions.length === 0;
  const availableQuantity = stock;
  // Shop photos, plus any colour photos that are not already in the list.
  const photos = (() => {
    const list = getImages(product);

    for (const entry of Array.isArray(product?.colorImages) ? product.colorImages : []) {
      const url = typeof entry?.image === 'string' ? entry.image.trim() : '';

      if (url && /^https?:\/\/\S+$/i.test(url) && !list.includes(url)) {
        list.push(url);
      }
    }

    return list;
  })();
  const imageUrl = photos[activeImage] || getImage(product);

  const handleSizeSelect = (size) => {
    setSelectedSize(size);
    setMessage('');
  };

  // Picking a colour shows its photo, when the admin has set one for it.
  const handleColorSelect = (color) => {
    // A size belongs to one colour, so changing colour clears the size.
    if (hasVariantList && color !== selectedColor) setSelectedSize('');
    setSelectedColor(color);
    setMessage('');

    const match = (product?.colorImages || []).find(
      (entry) =>
        entry?.color &&
        entry.color.trim().toLowerCase() === color.trim().toLowerCase()
    );

    const index = match ? photos.indexOf(String(match.image || '').trim()) : -1;

    if (index >= 0) {
      setActiveImage(index);
      setImageError(false);
    }
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

    if (colors.length > 0 && !selectedColor) {
      setMessage('Please select a color first.');
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
      const result = addToCart(purchasable, selectedSize, quantity, selectedColor);

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

  // Checks the selections the same way for "Add to cart" and "Buy now".
  // Returns an error message, or '' when everything is valid.
  const getSelectionError = () => {
    if (!product) return 'Product details are unavailable.';
    if (!selectedSize) return 'Please select a size first.';
    if (colors.length > 0 && !selectedColor) return 'Please select a color first.';
    if (outOfStock) return 'This product is currently out of stock.';

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > availableQuantity
    ) {
      return `Only ${availableQuantity} item(s) are available in stock.`;
    }

    return '';
  };

  // Buy now: check out just this item, without touching the saved cart.
  const handleBuyNow = () => {
    setMessage('');

    const problem = getSelectionError();

    if (problem) {
      setMessage(problem);
      return;
    }

    if (!isAuthenticated) {
      setMessage('Please log in to continue with your purchase.');
      navigate('/login');
      return;
    }

    navigate('/checkout', {
      state: {
        buyNow: {
          _id: product._id,
          name: product.name,
          price: purchasable.finalPrice ?? purchasable.price,
          stock: purchasable.stock,
          images: colorPhotoFor(product, selectedColor)
            ? [colorPhotoFor(product, selectedColor), ...(product.images || [])]
            : product.images,
          size: selectedSize,
          color: selectedColor || '',
          quantity,
        },
      },
    });
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
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#fff',
        color: '#111',
      }}
    >
      <main
        className="product-detail-main"
        style={{
          width: '100%',
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '32px 24px 64px',
          boxSizing: 'border-box',
        }}
      >
        <nav
          className="product-detail-breadcrumb"
          aria-label="Breadcrumb"
          style={{ marginBottom: '32px', fontSize: '13px' }}
        >
          <Link
            to="/products"
            style={{ color: '#666', textDecoration: 'none' }}
          >
            All Products
          </Link>

          <span style={{ margin: '0 10px' }}>/</span>

          <span style={{ color: '#111' }}>{product.name}</span>
        </nav>

        <section
          className="product-detail-grid"
          style={{
            display: 'grid',
            gridTemplateColumns:
              'minmax(0, 1.1fr) minmax(0, 0.9fr)',
            gap: 'clamp(24px, 5vw, 64px)',
            alignItems: 'start',
          }}
        >
          {/* Product image and photo thumbnails */}
          <div style={{ minWidth: 0 }}>
          <div
            className="product-detail-image"
            onMouseMove={(event) => {
              const box = event.currentTarget.getBoundingClientRect();

              setZoom({
                active: true,
                x: ((event.clientX - box.left) / box.width) * 100,
                y: ((event.clientY - box.top) / box.height) * 100,
              });
            }}
            onMouseLeave={() => setZoom((current) => ({ ...current, active: false }))}
            style={{
              width: '100%',
              maxWidth: '620px',
              aspectRatio: '4 / 5',
              minWidth: 0,
              margin: '0 auto',
              overflow: 'hidden',
              boxSizing: 'border-box',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#f3f1ed',
            }}
          >
            {imageUrl && !imageError ? (
              <img
                src={imageUrl}
                alt={product.name || 'Product image'}
                onError={() => setImageError(true)}
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  objectPosition: 'center',
                  cursor: zoom.active ? 'zoom-in' : 'default',
                  transform: zoom.active ? 'scale(1.2)' : 'scale(1)',
                  transformOrigin: `${zoom.x}% ${zoom.y}%`,
                  transition: 'transform 0.25s ease-out',
                }}
              />
            ) : (
              <p
                role="status"
                style={{
                  padding: '20px',
                  color: '#777',
                  textAlign: 'center',
                  fontSize: '14px',
                }}
              >
                No product image available.
              </p>
            )}
          </div>

          {photos.length > 1 && (
            <div
              role="tablist"
              aria-label="Product photos"
              style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '12px' }}
            >
              {photos.map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  role="tab"
                  aria-selected={index === activeImage}
                  aria-label={`Photo ${index + 1} of ${photos.length}`}
                  onClick={() => {
                    setActiveImage(index);
                    setImageError(false);
                  }}
                  style={{
                    width: '56px',
                    height: '70px',
                    padding: 0,
                    cursor: 'pointer',
                    overflow: 'hidden',
                    background: '#f3f1ed',
                    border: index === activeImage ? '2px solid #111' : '1px solid #ddd',
                  }}
                >
                  <img
                    src={src}
                    alt=""
                    style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </button>
              ))}
            </div>
          )}
          </div>

          {/* Product information */}
          <div
            className="product-detail-info"
            style={{ minWidth: 0, width: '100%' }}
          >
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
                overflowWrap: 'anywhere',
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
              {priceSource.offer && Number(priceSource.finalPrice) < Number(priceSource.price) && (
                <span style={{ textDecoration: 'line-through', color: '#999', fontWeight: 400, marginRight: 10, fontSize: 16 }}>
                  ₹{Number(priceSource.price).toLocaleString('en-IN')}
                </span>
              )}
              ₹{Number((priceSource.finalPrice ?? priceSource.price) || 0).toLocaleString('en-IN')}
              {priceSource.offer && offerSaving(priceSource.price, priceSource.finalPrice) > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 10, fontWeight: 400 }}>
                  <span
                    style={{
                      background: '#111',
                      color: '#fff',
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                    }}
                  >
                    {offerBadge(priceSource.offer)}
                  </span>
                  <span style={{ fontSize: 13, color: '#2e7d32' }}>
                    You save ₹{offerSaving(priceSource.price, priceSource.finalPrice).toLocaleString('en-IN')}
                  </span>
                  <span style={{ fontSize: 12, color: '#777' }}>{priceSource.offer.title}</span>
                </span>
              )}
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

            <p
              style={{
                fontSize: '12px',
                color: '#666',
                marginBottom: '28px',
              }}
            >
              Gender: {product.gender || 'Unisex'}
            </p>

            <div
              style={{
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
                SELECT SIZE
              </p>

              {sizeOptions.length > 0 ? (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {sizeOptions.map((option) => {
                    const soldOut = option.stock <= 0;
                    const selected = selectedSize === option.size;

                    return (
                      <button
                        key={option.size}
                        type="button"
                        aria-pressed={selected}
                        disabled={soldOut}
                        title={soldOut ? 'Out of stock' : `${option.stock} left`}
                        onClick={() => handleSizeSelect(option.size)}
                        style={{
                          minWidth: '56px',
                          height: '44px',
                          padding: '0 10px',
                          border: soldOut ? '1px dashed #bbb' : '1px solid #111',
                          backgroundColor: selected ? '#111' : '#fff',
                          color: soldOut ? '#aaa' : selected ? '#fff' : '#111',
                          textDecoration: soldOut ? 'line-through' : 'none',
                          cursor: soldOut ? 'not-allowed' : 'pointer',
                          opacity: soldOut ? 0.6 : 1,
                        }}
                      >
                        {option.size}
                        {!soldOut && option.stock <= 5 && (
                          <span style={{ display: 'block', fontSize: '9px', color: '#b26a00' }}>
                            {option.stock} left
                          </span>
                        )}
                        {soldOut && (
                          <span style={{ display: 'block', fontSize: '9px', textDecoration: 'none', color: '#999' }}>
                            Out of stock
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: '#777' }}>
                  {hasVariantList && colors.length > 0 && !selectedColor
                    ? 'Choose a colour to see its sizes.'
                    : 'No sizes are available for this product.'}
                </p>
              )}
            </div>

            {colors.length > 0 && (
              <div
                style={{
                  borderTop: '1px solid #ddd',
                  paddingTop: '22px',
                  marginTop: '22px',
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
                  SELECT COLOR
                </p>

                <div
                  role="group"
                  aria-label="Colors"
                  style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}
                >
                  {colors.map((color) => {
                    const selected = selectedColor === color;
                    const swatch = COLOR_SWATCH[color.trim().toLowerCase()];

                    return (
                      <button
                        key={color}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => handleColorSelect(color)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          height: '44px',
                          padding: '0 16px',
                          border: '1px solid #111',
                          backgroundColor: selected ? '#111' : '#fff',
                          color: selected ? '#fff' : '#111',
                          cursor: 'pointer',
                          fontSize: '13px',
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            border: '1px solid #999',
                            backgroundColor: swatch || 'transparent',
                          }}
                        />
                        {color}
                      </button>
                    );
                  })}
                </div>

                {selectedColor && (
                  <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#666' }}>
                    Selected: {selectedColor}
                  </p>
                )}
              </div>
            )}

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
                    cursor:
                      quantity <= 1 || outOfStock
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  −
                </button>

                <span
                  aria-live="polite"
                  style={{
                    minWidth: '36px',
                    textAlign: 'center',
                    fontSize: '13px',
                  }}
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

              <p
                style={{
                  fontSize: '12px',
                  color: '#777',
                  marginTop: '10px',
                }}
              >
                {outOfStock
                  ? 'Currently out of stock'
                  : `${availableQuantity} available`}
              </p>
            </div>

            <button
              type="button"
              disabled={addBlocked}
              onClick={handleAddToCart}
              style={{
                width: '100%',
                minHeight: '52px',
                marginTop: '24px',
                padding: '14px 20px',
                boxSizing: 'border-box',
                border: '1px solid #111',
                backgroundColor:
                  addBlocked ? '#999' : '#111',
                color: '#fff',
                fontSize: '11px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor:
                  addBlocked
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {outOfStock ? 'OUT OF STOCK' : 'ADD TO CART'}
            </button>

            {!addBlocked && (
              <button
                type="button"
                onClick={handleBuyNow}
                style={{
                  width: '100%',
                  minHeight: '52px',
                  marginTop: '12px',
                  padding: '14px 20px',
                  boxSizing: 'border-box',
                  border: '1px solid #111',
                  backgroundColor: '#fff',
                  color: '#111',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                BUY NOW
              </button>
            )}

            <button
              type="button"
              onClick={handleWishlist}
              style={{
                width: '100%',
                minHeight: '52px',
                marginTop: '12px',
                padding: '14px 20px',
                boxSizing: 'border-box',
                border: '1px solid #111',
                backgroundColor: '#fff',
                color: '#111',
                fontSize: '11px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {wishlisted
                ? <><Icon name="heart" filled /> REMOVE FROM WISHLIST</>
                : <><Icon name="heart" /> ADD TO WISHLIST</>}
            </button>

            {message && (
              <p
                role="status"
                aria-live="polite"
                style={{
                  marginTop: '16px',
                  fontSize: '12px',
                  color: '#333',
                }}
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

      <ProductReviews productId={product._id} productName={product.name} />

      {/* Responsive layout */}
      <style>{`
        @media (max-width: 768px) {
          .product-detail-grid {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 28px !important;
          }

          .product-detail-image {
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ProductDetails;
