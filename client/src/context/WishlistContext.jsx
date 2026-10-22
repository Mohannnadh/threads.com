
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

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
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};
