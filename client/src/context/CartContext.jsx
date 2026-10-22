
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

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

  // Add a product to the cart
  const addToCart = (product, size, quantity = 1) => {
    if (!product?._id || !size) {
      return {
        success: false,
        message: 'Product or size is missing.',
      };
    }

    const stock = Number(product.stock);
    const amount = Number(quantity);

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

    const existingItem = cartItems.find(
      (item) =>
        item._id === product._id &&
        item.size === size
    );

    const currentQuantity = existingItem
      ? Number(existingItem.quantity) || 0
      : 0;

    if (currentQuantity + amount > stock) {
      const remainingStock = Math.max(
        0,
        stock - currentQuantity
      );

      return {
        success: false,
        message:
          remainingStock === 0
            ? 'You have already added the maximum available stock.'
            : `Only ${remainingStock} more item(s) can be added.`,
      };
    }

    setCartItems((currentItems) => {
      const itemExists = currentItems.some(
        (item) =>
          item._id === product._id &&
          item.size === size
      );

      if (itemExists) {
        return currentItems.map((item) =>
          item._id === product._id &&
          item.size === size
            ? {
                ...item,
                quantity:
                  Number(item.quantity) + amount,
              }
            : item
        );
      }

      return [
        ...currentItems,
        {
          ...product,
          size,
          quantity: amount,
        },
      ];
    });

    return {
      success: true,
      message: 'Product added to cart successfully!',
    };
  };

  // Remove a product and its selected size
  const removeFromCart = (productId, size) => {
    setCartItems((currentItems) =>
      currentItems.filter(
        (item) =>
          !(
            item._id === productId &&
            item.size === size
          )
      )
    );
  };

  // Update the quantity of a cart item
  const updateQuantity = (productId, size, quantity) => {
    const amount = Number(quantity);

    setCartItems((currentItems) =>
      currentItems.map((item) => {
        if (
          item._id === productId &&
          item.size === size
        ) {
          const stock = Number(item.stock) || 1;

          return {
            ...item,
            quantity: Math.max(
              1,
              Math.min(
                stock,
                Number.isFinite(amount)
                  ? Math.floor(amount)
                  : 1
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
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
