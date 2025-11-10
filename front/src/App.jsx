import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import HomePage from './components/HomePage';
import NotFound from './components/NotFound';
import ProductPage from './components/ProductPage';
import CartPage from './components/CartPage';
import CheckoutPage from './components/CheckoutPage';
import Login from './components/Login';

function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <CartProvider>
          <Router>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/login" element={<Login />} />
              {/* Temporary pages route to 404 */}
              <Route path="/about" element={<NotFound />} />
              <Route path="/contact" element={<NotFound />} />
              <Route path="/faqs" element={<NotFound />} />
              <Route path="/terms" element={<NotFound />} />
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
        </CartProvider>
      </AuthProvider>
    </AppProvider>
  );
}

export default App;