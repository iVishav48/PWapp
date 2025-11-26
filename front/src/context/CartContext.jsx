import React, { createContext, useContext, useEffect, useState } from 'react';
import { idbGetAll, idbPut, idbDelete, idbClear } from '../utils/idb';
import { cartService } from '../services/api';

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
  const [loading, setLoading] = useState(false);

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

  // Sync with backend when online
  useEffect(() => {
    const syncCart = async () => {
      try {
        setLoading(true);
        const serverCart = await cartService.getCart();
        if (serverCart?.items && Array.isArray(serverCart.items)) {
          setCart(serverCart.items);
        }
      } catch {
        // Keep local IndexedDB cart
      } finally {
        setLoading(false);
      }
    };
    syncCart();
  }, []);

  const addToCart = async (product) => {
    const existing = cart.find(item => item.id === product.id);
    const updated = existing
      ? cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      : [...cart, { ...product, quantity: 1 }];
    setCart(updated);
    try {
      await cartService.addToCart(product.id, 1);
    } catch {
      // Offline; keep local state
    }
  };

  const updateQuantity = async (productId, quantity) => {
    if (quantity === 0) {
      const updated = cart.filter(item => item.id !== productId);
      setCart(updated);
      try {
        await cartService.removeFromCart(productId);
      } catch {}
    } else {
      const updated = cart.map(item => item.id === productId ? { ...item, quantity } : item);
      setCart(updated);
      try {
        await cartService.updateCart(productId, quantity);
      } catch {}
    }
  };

  const clearCart = async () => {
    setCart([]);
    try {
      await cartService.clearCart();
    } catch {}
  };

  const getSubtotal = () => {
    return cart.reduce((sum, item) => {
      const price = item.discountPrice || item.price || 0;
      return sum + price * item.quantity;
    }, 0);
  };

  const getTotalDiscount = () => {
    return cart.reduce((sum, item) => {
      if (!item.discountPrice) return sum;
      return sum + (item.price - item.discountPrice) * item.quantity;
    }, 0);
  };

  const getTotal = () => {
    const subtotal = getSubtotal();
    const tax = subtotal * 0.08;
    const shippingCost = subtotal > 50 ? 0 : 9.99;
    const discount = getTotalDiscount();
    return subtotal + tax + shippingCost - discount;
  };

  const value = {
    cart,
    loading,
    addToCart,
    updateQuantity,
    clearCart,
    getSubtotal,
    getTotalDiscount,
    getTotal,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};