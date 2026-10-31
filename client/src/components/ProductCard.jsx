
import { useState } from 'react';
import { offerBadge, offerSaving } from '../utils/offer.js';
import { totalStock, lowStockSizes } from '../utils/stock.js';
import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext.jsx';
import { Icon } from './Icon.jsx';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [imageError, setImageError] = useState(false);
  const [hovered, setHovered] = useState(false);

  const wishlisted = isWishlisted(product._id);

  const imageUrl = product.images?.find(
    (image) => typeof image === 'string' && image.trim() !== ''
  );

  const handleWishlist = (event) => {
    event.stopPropagation();
    toggleWishlist(product);
  };

  const handleOpenProduct = () => {
    navigate(`/products/${product._id}`);
  };

  return (
    <article
      style={{
        minWidth: 0,
        position: 'relative',
        cursor: 'pointer',
        color: '#111',
      }}
    >
      <div
        onClick={handleOpenProduct}
        role="link"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleOpenProduct();
          }
        }}
        aria-label={`View ${product.name}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          background: '#f3f1ed',
          aspectRatio: '3 / 4',
          overflow: 'hidden',
        }}
      >
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            onError={() => setImageError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transform: hovered ? 'scale(1.06)' : 'scale(1)',
              transition: 'transform 0.4s ease-out',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#777',
              fontSize: '13px',
            }}
          >
            No product image
          </div>
        )}

        <button
          type="button"
          onClick={handleWishlist}
          aria-label={
            wishlisted ? 'Remove from wishlist' : 'Add to wishlist'
          }
          aria-pressed={wishlisted}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '38px',
            height: '38px',
            border: 'none',
            borderRadius: '50%',
            background: '#fff',
            color: wishlisted ? '#c62828' : '#111',
            fontSize: '22px',
            cursor: 'pointer',
          }}
        >
          <Icon name="heart" filled={wishlisted} />
        </button>
      </div>

      <div style={{ padding: '12px 0' }}>
        <p
          style={{
            margin: '0 0 6px',
            fontSize: '11px',
            color: '#777',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {product.category} · {product.gender}
        </p>

        <h3
          onClick={handleOpenProduct}
          style={{
            margin: '0 0 8px',
            fontSize: '15px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {product.name}
        </h3>

        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
          {product.offer && Number(product.finalPrice) < Number(product.price) && (
            <span style={{ textDecoration: 'line-through', color: '#999', fontWeight: 400, marginRight: 8 }}>
              ₹{Number(product.price).toLocaleString('en-IN')}
            </span>
          )}
          ₹{Number(product.finalPrice ?? product.price).toLocaleString('en-IN')}
        </p>

        {product.offer && offerSaving(product.price, product.finalPrice) > 0 && (
          <p style={{ margin: '4px 0 0', fontSize: '12px', fontWeight: 600, color: '#2e7d32' }}>
            {offerBadge(product.offer)}
          </p>
        )}

        {totalStock(product) <= 0 ? (
          <p
            style={{
              margin: '8px 0 0',
              color: '#b42318',
              fontSize: '12px',
            }}
          >
            Out of stock
          </p>
        ) : lowStockSizes(product).length > 0 ? (
          <p style={{ margin: '8px 0 0', color: '#b26a00', fontSize: '12px' }}>
            Low stock: {lowStockSizes(product).length} size{lowStockSizes(product).length === 1 ? '' : 's'} almost sold out
          </p>
        ) : null}
      </div>
    </article>
  );
};

export default ProductCard;
