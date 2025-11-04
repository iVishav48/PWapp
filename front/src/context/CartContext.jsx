import React, { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  const addToCart = (product, quantity = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock) }
            : item
        );
      }
      return [...prevCart, { ...product, quantity }];
    });
  };

  const updateCartQuantity = (productId, quantity) => {
    if (quantity === 0) {
      setCart(prevCart => prevCart.filter(item => item.id !== productId));
    } else {
      setCart(prevCart =>
        prevCart.map(item =>
          item.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const clearCart = () => {
    setCart([]);
  };

  const getTotalItems = () => cart.reduce((sum, item) => sum + item.quantity, 0);
  
  const getSubtotal = () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const getTotalDiscount = () => cart.reduce((sum, item) => {
    const discount = (item.price * item.discount / 100) * item.quantity;
    return sum + discount;
  }, 0);

  const getTotal = () => getSubtotal() - getTotalDiscount();

  const value = {
    cart,
    addToCart,
    updateCartQuantity,
    clearCart,
    getTotalItems,
    getSubtotal,
    getTotalDiscount,
    getTotal
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

