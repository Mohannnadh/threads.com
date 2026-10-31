
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { lookupProducts } from '../services/productService.js';
import { totalStock } from '../utils/stock.js';

const WishlistContext = createContext(null);

export const useWishlist = () => {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error(
      'useWishlist must be used inside WishlistProvider'
    );
  }

  return context;
};

export const WishlistProvider = ({ children }) => {
  const [wishlistItems, setWishlistItems] = useState(() => {
    try {
      const saved = localStorage.getItem('threads-wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Could not load wishlist:', error);
      return [];
    }
  });

  // Checks the wishlist against the store: removes deleted products and updates
  // the price and whether each product is in stock.
  const [refreshTick, setRefreshTick] = useState(0);
  const wishlistProductIds = wishlistItems.map((item) => String(item._id)).sort().join(',');

  useEffect(() => {
    if (wishlistItems.length === 0) return undefined;

    let active = true;
    const ids = wishlistItems.map((item) => String(item._id));

    lookupProducts(ids)
      .then((products) => {
        if (!active) return;

        const byId = new Map(products.map((product) => [String(product._id), product]));

        setWishlistItems((current) =>
          current
            .filter((item) => byId.has(String(item._id)))
            .map((item) => {
              const fresh = byId.get(String(item._id));
              const stock = totalStock(fresh);

              return {
                ...item,
                name: fresh.name,
                images: fresh.images?.length ? fresh.images : item.images,
                price: fresh.finalPrice ?? fresh.price,
                stock,
                available: stock > 0,
              };
            })
        );
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [wishlistProductIds, refreshTick]);

  const refreshWishlist = useCallback(() => setRefreshTick((tick) => tick + 1), []);

  // Stay current while the page is open: re-check when the visitor comes back
  // to the tab, and every minute.
  const hasWishlistItems = wishlistProductIds !== '';

  useEffect(() => {
    if (!hasWishlistItems) return undefined;

    const refresh = () => setRefreshTick((tick) => tick + 1);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(refresh, 60000);

    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [hasWishlistItems]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'threads-wishlist',
        JSON.stringify(wishlistItems)
      );
    } catch (error) {
      console.error('Could not save wishlist:', error);
    }
  }, [wishlistItems]);

  const isWishlisted = (productId) =>
    wishlistItems.some((item) => item._id === productId);

  const toggleWishlist = (product) => {
    if (!product?._id) return;

    setWishlistItems((items) =>
      items.some((item) => item._id === product._id)
        ? items.filter((item) => item._id !== product._id)
        : [...items, product]
    );
  };

  // Empties the wishlist.
  const clearWishlist = () => setWishlistItems([]);

  const removeFromWishlist = (productId) => {
    setWishlistItems((items) =>
      items.filter((item) => item._id !== productId)
    );
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        isWishlisted,
        toggleWishlist,
        removeFromWishlist,
        clearWishlist,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};
