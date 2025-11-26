import React, { createContext, useContext, useEffect, useState } from 'react';
import { idbGetAll, idbPut, idbDelete, idbClear } from '../utils/idb';
import { enqueueAction, reconcileCartAgainstCatalog, replayQueueOnline } from '../utils/offlineQueue';

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

  // Load from IndexedDB on start
  useEffect(() => {
    (async () => {
      const items = await idbGetAll('cart');
      setCart(items);
    })();
  }, []);

  // Save each item to IndexedDB whenever cart changes
  useEffect(() => {
    (async () => {
      await idbClear('cart');
      await Promise.all(cart.map(item => idbPut('cart', item)));
    })();
  }, [cart]);

  useEffect(() => {
    const onOnline = async () => {
      // reconcile against catalog and replay queued actions
      setCart(prev => reconcileCartAgainstCatalog(prev));
      await replayQueueOnline();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

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
    if (!navigator.onLine) enqueueAction({ type: 'add', payload: { productId: product.id, quantity } });
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
    if (!navigator.onLine) enqueueAction({ type: 'update', payload: { productId, quantity } });
  };

  const clearCart = () => {
    setCart([]);
    if (!navigator.onLine) enqueueAction({ type: 'clear' });
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