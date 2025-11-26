import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Home, Package, Menu, X, Wifi, WifiOff, LogIn, LogOut, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const location = useLocation();
  const { getTotalItems } = useCart();
  const { isOnline } = useApp();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-2xl font-display font-semibold tracking-wide text-gray-900">
              LUXE
            </Link>
            <div className="hidden md:flex space-x-6">
              <Link
                to="/"
                className={`flex items-center space-x-2 px-3 py-2 text-sm font-light tracking-wide transition-colors ${
                  isActive('/') ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Home size={18} />
                <span>Home</span>
              </Link>
              <Link
                to="/cart"
                className={`flex items-center space-x-2 px-3 py-2 text-sm font-light tracking-wide transition-colors ${
                  isActive('/cart') ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Package size={18} />
                <span>Orders</span>
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <Wifi size={16} className="text-green-600" />
              ) : (
                <WifiOff size={16} className="text-red-600" />
              )}
              <span className="text-xs font-light text-gray-600 hidden sm:inline">
                {isOnline ? 'Connected' : 'Offline'}
              </span>
            </div>

            {isAuthenticated ? (
              <div className="hidden md:flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gray-100">
                  <User size={16} className="text-gray-700" />
                  <span className="text-sm font-light text-gray-700">
                    {user?.name || user?.email}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-3 py-2 text-sm font-light text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden md:flex items-center space-x-2 px-4 py-2 text-sm font-light text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              >
                <LogIn size={16} />
                <span>Login</span>
              </Link>
            )}

            <Link
              to="/cart"
              className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ShoppingCart size={22} className="text-gray-700" />
              {getTotalItems() > 0 && (
                <span className="absolute -top-1 -right-1 bg-gray-900 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-light">
                  {getTotalItems()}
                </span>
              )}
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center space-x-2 w-full px-3 py-2 text-sm font-light transition-colors ${
                isActive('/') ? 'text-gray-900 bg-gray-50' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Home size={18} />
              <span>Home</span>
            </Link>
            <Link
              to="/cart"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center space-x-2 w-full px-3 py-2 text-sm font-light transition-colors ${
                isActive('/cart') ? 'text-gray-900 bg-gray-50' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Package size={18} />
              <span>Orders</span>
            </Link>
            {isAuthenticated ? (
              <>
                <div className="flex items-center space-x-2 w-full px-3 py-2 text-sm font-light text-gray-700">
                  <User size={18} />
                  <span>{user?.name || user?.email}</span>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center space-x-2 w-full px-3 py-2 text-sm font-light text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 w-full px-3 py-2 text-sm font-light text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <LogIn size={18} />
                <span>Login</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;