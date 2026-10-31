
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { lookupProducts } from '../services/productService.js';
import { stockFor, priceFor } from '../utils/stock.js';
import { colorPhotoFor } from '../utils/colorPhoto.js';

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      'useCart must be used inside CartProvider'
    );
  }

  return context;
};

// A cart line is one product in one size and one color.
const sameLine = (item, productId, size, color) =>
  item._id === productId &&
  item.size === size &&
  (item.color || '') === (color || '');

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const savedCart = localStorage.getItem('threads-cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      console.error('Could not load saved cart:', error);
      return [];
    }
  });

  // Save cart whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(
        'threads-cart',
        JSON.stringify(cartItems)
      );
    } catch (error) {
      console.error('Could not save cart:', error);
    }
  }, [cartItems]);

  // Add a product to the cart. A line is unique per product, size and color.
  const addToCart = (product, size, quantity = 1, color = '') => {
    if (!product?._id || !size) {
      return {
        success: false,
        message: 'Product or size is missing.',
      };
    }

    const colorOptions = Array.isArray(product.colors) ? product.colors : [];

    if (colorOptions.length > 0 && !color) {
      return {
        success: false,
        message: 'Choose a color on the product page first.',
      };
    }

    const stock = Number(product.stock);
    const amount = Number(quantity);
    const lineColor = color || '';

    if (
      !Number.isFinite(stock) ||
      stock <= 0 ||
      !Number.isInteger(amount) ||
      amount < 1
    ) {
      return {
        success: false,
        message: 'Invalid quantity or product is out of stock.',
      };
    }

    const existingItem = cartItems.find((item) =>
      sameLine(item, product._id, size, lineColor)
    );

    const currentQuantity = existingItem
      ? Number(existingItem.quantity) || 0
      : 0;

    if (currentQuantity + amount > stock) {
      const remainingStock = Math.max(0, stock - currentQuantity);

      return {
        success: false,
        message:
          remainingStock === 0
            ? 'You have already added the maximum available stock.'
            : `Only ${remainingStock} more item(s) can be added.`,
      };
    }

    setCartItems((currentItems) => {
      const itemExists = currentItems.some((item) =>
        sameLine(item, product._id, size, lineColor)
      );

      if (itemExists) {
        return currentItems.map((item) =>
          sameLine(item, product._id, size, lineColor)
            ? { ...item, quantity: Number(item.quantity) + amount }
            : item
        );
      }

      return [
        ...currentItems,
        {
          ...product,
          // Price the customer pays after any product offer.
          price: product.finalPrice ?? product.price,
          // Show the photo for the chosen colour first, in cart and checkout.
          images: colorPhotoFor(product, lineColor)
            ? [colorPhotoFor(product, lineColor), ...(product.images || [])]
            : product.images,
          size,
          color: lineColor,
          quantity: amount,
        },
      ];
    });

    return {
      success: true,
      message: 'Product added to cart successfully!',
    };
  };

  // Remove one cart line (product, size and color)
  const removeFromCart = (productId, size, color = '') => {
    setCartItems((currentItems) =>
      currentItems.filter(
        (item) => !sameLine(item, productId, size, color)
      )
    );
  };

  // Update the quantity of one cart line
  const updateQuantity = (productId, size, quantity, color = '') => {
    const amount = Number(quantity);

    setCartItems((currentItems) =>
      currentItems.map((item) => {
        if (sameLine(item, productId, size, color)) {
          const rawStock = Number(item.stock);

          const stock =
            Number.isFinite(rawStock) && rawStock > 0
              ? Math.floor(rawStock)
              : 0;

          if (stock === 0) {
            return { ...item, quantity: 0 };
          }

          return {
            ...item,
            quantity: Math.max(
              1,
              Math.min(
                stock,
                Number.isFinite(amount) ? Math.floor(amount) : 1
              )
            ),
          };
        }

        return item;
      })
    );
  };

  // Remove all products from the cart
  const clearCart = () => {
    setCartItems([]);
  };

  // Calculate the total number of items
  const cartCount = cartItems.reduce(
    (total, item) =>
      total + Number(item.quantity || 0),
    0
  );

  // Calculate the total price
  const cartTotal = cartItems.reduce(
    (total, item) =>
      total +
      Number(item.price || 0) *
      Number(item.quantity || 0),
    0
  );

  // Checks the cart against the store: removes deleted products, and updates
  // stock and prices. Runs on load, when lines change, and when refreshCart is called.
  const [refreshTick, setRefreshTick] = useState(0);
  const [syncMessage, setSyncMessage] = useState('');
  const cartProductIds = [...new Set(cartItems.map((item) => String(item._id)))].sort().join(',');

  useEffect(() => {
    if (cartItems.length === 0) return undefined;

    let active = true;
    const ids = [...new Set(cartItems.map((item) => String(item._id)))];

    lookupProducts(ids)
      .then((products) => {
        if (!active) return;

        const byId = new Map(products.map((product) => [String(product._id), product]));
        const removed = cartItems.filter((item) => !byId.has(String(item._id))).length;

        setCartItems((current) =>
          current
            .filter((item) => byId.has(String(item._id)))
            .map((item) => {
              const fresh = byId.get(String(item._id));

              return {
                ...item,
                name: fresh.name,
                images: fresh.images?.length ? fresh.images : item.images,
                price: priceFor(fresh, item.color, item.size),
                stock: stockFor(fresh, item.color, item.size),
              };
            })
        );

        if (removed > 0) {
          setSyncMessage(
            `${removed} item${removed === 1 ? ' was' : 's were'} removed from your cart because ${removed === 1 ? 'it is' : 'they are'} no longer available.`
          );
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [cartProductIds, refreshTick]);

  const refreshCart = useCallback(() => setRefreshTick((tick) => tick + 1), []);

  // Stay current while the page is open: re-check when the visitor comes back
  // to the tab, and every minute, so a product deleted or sold out by the admin shows.
  const hasCartItems = cartProductIds !== '';

  useEffect(() => {
    if (!hasCartItems) return undefined;

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
  }, [hasCartItems]);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartTotal,
        refreshCart,
        syncMessage,
        clearSyncMessage: () => setSyncMessage(''),
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
