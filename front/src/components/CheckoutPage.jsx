import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { useCart } from '../context/CartContext';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { orderService } from '../services/api';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { idbPut } from '../utils/idb';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cart, getSubtotal, getTotalDiscount, getTotal, clearCart } = useCart();
  const { isOnline } = useApp();
  const { isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
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
    
    // Check if user is authenticated
    if (!isAuthenticated) {
      alert('Please login to place an order');
      navigate('/login');
      return;
    }
    
    if (!isOnline) {
      alert('You are currently offline. Your order will be created locally and can be paid when you are back online.');
    }
    
    setIsSubmitting(true);
    setSyncStatus('syncing');

    try {
      // Prepare order data
      const orderData = {
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity
        })),
        shippingAddress: {
          fullName: formData.name,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode
        },
        paymentMethod: 'credit_card', // Default payment method
        discount: getTotalDiscount(),
        notes: ''
      };

      // If offline or cart contains non-Mongo ObjectIds (likely mock data), create a local bill instead of calling API
      const hasInvalidIds = cart.some(item => !String(item.id).match(/^[a-fA-F0-9]{24}$/));
      if (!isOnline || hasInvalidIds) {
        const createdAt = new Date().toISOString();
        const itemsDetailed = cart.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
        }));
        const subtotal = getSubtotal();
        const tax = subtotal * 0.08;
        const shippingCost = subtotal > 50 ? 0 : 9.99;
        const discount = getTotalDiscount();
        const total = subtotal + tax + shippingCost - discount;

        const bill = {
          items: itemsDetailed,
          shippingAddress: orderData.shippingAddress,
          paymentMethod: orderData.paymentMethod,
          subtotal,
          tax,
          shippingCost,
          discount,
          total,
          paymentStatus: 'pending',
          orderStatus: 'pending',
          createdAt,
          expectedDeliveryDate: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(),
        };

        await idbPut('bills', bill);
        clearCart();
        setSyncStatus('synced');
        navigate('/bill', { state: { bill } });
        return;
      }

      // Create order via API
      const response = await orderService.createOrder(orderData);

      // Normalize server order
      const order = response?.data?.order || response?.data || {};
      const bill = {
        orderId: order._id || order.id,
        orderNumber: order.orderNumber || (order._id ? String(order._id).slice(-6).toUpperCase() : undefined),
        items: Array.isArray(order.items) && order.items.length > 0
          ? order.items.map(it => ({ name: it.name, price: it.price, quantity: it.quantity, image: it.image }))
          : cart.map(item => ({ name: item.name, quantity: item.quantity, price: item.price - (item.price * (item.discount || 0) / 100), image: item.image })),
        shippingAddress: order.shippingAddress || {
          fullName: formData.name,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          phone: formData.phone,
        },
        customer: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        },
        subtotal: typeof order.subtotal === 'number' ? order.subtotal : getSubtotal(),
        tax: typeof order.tax === 'number' ? order.tax : getSubtotal() * 0.08,
        shippingCost: typeof order.shippingCost === 'number' ? order.shippingCost : (getSubtotal() > 50 ? 0 : 9.99),
        discount: typeof order.discount === 'number' ? order.discount : getTotalDiscount(),
        total: typeof order.total === 'number' ? order.total : getTotal(),
        paymentStatus: order.paymentStatus || 'pending',
        orderStatus: order.orderStatus || 'pending',
        createdAt: order.createdAt || new Date().toISOString(),
        expectedDeliveryDate: order.expectedDeliveryDate || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      };

      setSyncStatus('synced');
      clearCart();
      
      // Store bill in IndexedDB
      await idbPut('bills', bill);
      
      // Navigate to bill page with bill data
      navigate('/bill', { state: { bill } });
    } catch (error) {
      console.error('Order creation error:', error);
      // As a fallback, create a local bill and navigate
      const createdAt = new Date().toISOString();
      const subtotal = getSubtotal();
      const tax = subtotal * 0.08;
      const shippingCost = subtotal > 50 ? 0 : 9.99;
      const discount = getTotalDiscount();
      const total = subtotal + tax + shippingCost - discount;
      const offlineBill = {
        orderId: `offline_${Date.now()}`,
        orderNumber: `OFF-${Date.now()}`,
        items: cart.map(item => ({ name: item.name, quantity: item.quantity, price: item.price - (item.price * (item.discount || 0) / 100), image: item.image })),
        shippingAddress: { fullName: formData.name, address: formData.address, city: formData.city, state: formData.state, zipCode: formData.zipCode, phone: formData.phone },
        customer: { name: formData.name, email: formData.email, phone: formData.phone },
        subtotal, tax, shippingCost, discount, total,
        paymentStatus: 'pending', orderStatus: 'pending', createdAt,
        expectedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      };
      await idbPut('bills', offlineBill);
      clearCart();
      setSyncStatus('offline');
      navigate('/bill', { state: { bill: offlineBill } });
    } finally {
      setIsSubmitting(false);
    }
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
                disabled={isSubmitting}
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