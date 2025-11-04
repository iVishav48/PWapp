import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { useCart } from '../context/CartContext';
import { useApp } from '../context/AppContext';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cart, getSubtotal, getTotalDiscount, getTotal, clearCart } = useCart();
  const { isOnline } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zipCode: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, synced, error

  useEffect(() => {
    if (cart.length === 0) {
      navigate('/cart');
    }
  }, [cart, navigate]);

  useEffect(() => {
    if (!isOnline) {
      setSyncStatus('offline');
    } else if (syncStatus === 'offline') {
      setSyncStatus('syncing');
      setTimeout(() => setSyncStatus('synced'), 2000);
    }
  }, [isOnline, syncStatus]);

  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 5);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSyncStatus('syncing');

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    setSyncStatus('synced');
    setIsSubmitting(false);
    clearCart();
    alert('Order placed successfully!');
    navigate('/');
  };

  if (cart.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-display font-light text-gray-900 mb-8 tracking-wide">Checkout Summary</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200">
              <h2 className="text-2xl font-display font-light text-gray-900 mb-6 tracking-wide">Delivery Information</h2>
              
              <form onSubmit={handleSubmit}>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-light text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-light"
                      placeholder="John Doe"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-light text-gray-700 mb-2">Contact Number</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-light"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-light text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-light"
                      placeholder="john@example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-light text-gray-700 mb-2">ZIP Code</label>
                    <input
                      type="text"
                      required
                      value={formData.zipCode}
                      onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-light"
                      placeholder="10001"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-light text-gray-700 mb-2">Street Address</label>
                    <input
                      type="text"
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-light"
                      placeholder="123 Main Street, Apt 4B"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-light text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-light"
                      placeholder="New York"
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200">
              <h2 className="text-2xl font-display font-light text-gray-900 mb-6 tracking-wide">Order Items</h2>
              <div className="space-y-4">
                {cart.map(item => {
                  const discountedPrice = item.price - (item.price * item.discount / 100);
                  return (
                    <div key={item.id} className="flex items-center gap-4 pb-4 border-b border-gray-200 last:border-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg bg-gray-100"
                      />
                      <div className="flex-1">
                        <h3 className="font-light text-gray-900">{item.name}</h3>
                        <p className="text-sm font-light text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <span className="font-light text-gray-900">${(discountedPrice * item.quantity).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24 border border-gray-200">
              <h2 className="text-2xl font-display font-light text-gray-900 mb-6 tracking-wide">Checkout Details</h2>
              
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

              <div className="flex justify-between text-2xl mb-6 font-light">
                <span className="text-gray-900">Total Bill</span>
                <span className="text-gray-900">${getTotal().toFixed(2)}</span>
              </div>

              <div className="mb-6 pb-6 border-b border-gray-200 space-y-4">
                <div>
                  <p className="text-sm font-light text-gray-600 mb-2">Expected Delivery Date</p>
                  <p className="text-lg font-light text-gray-900">
                    {deliveryDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-light text-gray-600 mb-2">Sync Status</p>
                  <div className="flex items-center space-x-2">
                    {isOnline ? (
                      <>
                        {syncStatus === 'syncing' ? (
                          <>
                            <Loader2 size={16} className="text-blue-600 animate-spin" />
                            <span className="text-sm font-light text-blue-600">Syncing...</span>
                          </>
                        ) : syncStatus === 'synced' ? (
                          <>
                            <Wifi size={16} className="text-green-600" />
                            <span className="text-sm font-light text-green-600">Synced</span>
                          </>
                        ) : (
                          <>
                            <Wifi size={16} className="text-green-600" />
                            <span className="text-sm font-light text-green-600">Online</span>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <WifiOff size={16} className="text-red-600" />
                        <span className="text-sm font-light text-red-600">Offline</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !isOnline}
                className="w-full px-6 py-4 bg-gray-900 text-white font-light rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Processing...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;

