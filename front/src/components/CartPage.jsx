import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, AlertCircle, RefreshCw } from 'lucide-react';
import Navbar from './Navbar';
import { useCart } from '../context/CartContext';
import { productService } from '../services/api';
import Loading from './Loading';

const CartPage = () => {
  const navigate = useNavigate();
  const { cart, updateCartQuantity, getSubtotal, getTotalDiscount, getTotal } = useCart();
  const [stockWarnings, setStockWarnings] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Validate stock for cart items
  const validateStock = async () => {
    if (cart.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const productIds = cart.map(item => item.id);
      const stockData = await productService.validateStock(productIds);
      
      const warnings = {};
      cart.forEach(item => {
        const stockInfo = stockData.find(stock => stock.productId === item.id);
        if (stockInfo && item.quantity > stockInfo.stock) {
          warnings[item.id] = `Only ${stockInfo.stock} items available in stock`;
          // Auto-adjust quantity to available stock
          if (stockInfo.stock > 0) {
            updateCartQuantity(item.id, stockInfo.stock);
          }
        }
      });
      
      setStockWarnings(warnings);
    } catch (error) {
      console.error('Stock validation failed:', error);
      setError(error.message || 'Failed to validate stock. Please check your connection.');
      
      // Fallback to local stock data if API fails
      const warnings = {};
      cart.forEach(item => {
        if (item.quantity > item.stock) {
          warnings[item.id] = `Stock validation failed. Showing local data.`;
        }
      });
      setStockWarnings(warnings);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    validateStock();
  }, [cart]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-display font-light text-gray-900 tracking-wide flex items-center">
            <ShoppingCart className="mr-3" />
            Shopping Cart
            {loading && <Loading size="sm" message="Checking stock..." className="ml-2" />}
          </h1>
          {cart.length > 0 && (
            <button
              onClick={validateStock}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Validating...' : 'Check Stock'}
            </button>
          )}
        </div>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center text-red-700">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          </div>
        )}

        {cart.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
            <ShoppingCart size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-xl font-light text-gray-600 mb-4">Your cart is empty</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-gray-900 text-white font-light rounded-lg hover:bg-gray-800 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="mb-4">
                <p className="text-sm font-light text-gray-600">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} {cart.reduce((sum, item) => sum + item.quantity, 0) === 1 ? 'item' : 'items'} in your cart
                  {cart.some(item => item.quantity >= item.stock) && (
                    <span className="text-orange-600 ml-2">(Some items at stock limit)</span>
                  )}
                </p>
              </div>
              {cart.map(item => {
                const discountedPrice = item.price - (item.price * item.discount / 100);
                return (
                  <div key={item.id} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <div className="flex gap-6">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-24 h-24 object-cover rounded-lg bg-gray-100"
                      />
                      <div className="flex-1">
                        <h3 className="text-lg font-light text-gray-900 mb-1">{item.name}</h3>
                        <p className="text-sm font-light text-gray-500 mb-3">{item.category}</p>
                        {stockWarnings[item.id] && (
                          <div className="flex items-center mb-2 text-sm text-red-600">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            {stockWarnings[item.id]}
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-light text-gray-900">${discountedPrice.toFixed(2)}</span>
                          {item.discount > 0 && (
                            <span className="text-sm font-light text-gray-400 line-through">${item.price.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-between">
                        <button
                          onClick={() => updateCartQuantity(item.id, 0)}
                          className="text-sm font-light text-gray-500 hover:text-red-600 transition-colors"
                        >
                          Remove
                        </button>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 border border-gray-300 rounded hover:bg-gray-100 transition-colors font-light"
                          >
                            -
                          </button>
                          <span className="w-12 text-center font-light">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.id, Math.min(item.stock, item.quantity + 1))}
                            disabled={item.quantity >= item.stock}
                            className="w-8 h-8 border border-gray-300 rounded hover:bg-gray-100 transition-colors font-light disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            +
                          </button>
                        </div>
                        <p className="text-xs font-light text-gray-500 mt-1">Limit: {item.stock}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24 border border-gray-200">
                <h2 className="text-2xl font-display font-light text-gray-900 mb-6 tracking-wide">Order Summary</h2>
                
                <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
                  <div className="flex justify-between font-light">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900">${getSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-light">
                    <span className="text-gray-600">Discount</span>
                    <span className="text-green-600">-${getTotalDiscount().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-light">
                    <span className="text-gray-600">Shipping</span>
                    <span className="text-gray-900">Free</span>
                  </div>
                </div>

                <div className="flex justify-between text-xl mb-6 font-light">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900">${getTotal().toFixed(2)}</span>
                </div>

                <button
                  onClick={() => navigate('/checkout')}
                  className="w-full px-6 py-4 bg-gray-900 text-white font-light rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;

