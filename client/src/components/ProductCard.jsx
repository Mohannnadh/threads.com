
import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext.jsx';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { isWishlisted, toggleWishlist } = useWishlist();

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
        onKeyDown={(event) => {
          if (event.key === 'Enter') handleOpenProduct();
        }}
        role="link"
        tabIndex={0}
        aria-label={`View ${product.name}`}
        style={{
          position: 'relative',
          background: '#f3f1ed',
          aspectRatio: '3 / 4',
          overflow: 'hidden',
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
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
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
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
          {wishlisted ? '♥' : '♡'}
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
          ₹{Number(product.price).toLocaleString('en-IN')}
        </p>

        {Number(product.stock) <= 0 && (
          <p style={{ margin: '8px 0 0', color: '#b42318', fontSize: '12px' }}>
            Out of stock
          </p>
        )}
      </div>
    </article>
  );
};

export default ProductCard;
