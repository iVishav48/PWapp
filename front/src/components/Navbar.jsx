import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Home, Package, Menu, X, Wifi, WifiOff, User, LogOut } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import InstallPrompt from './InstallPrompt';
import { useApp } from '../context/AppContext';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { getTotalItems } = useCart();
  const { user, logout, isAuthenticated } = useAuth();
  const { isOnline } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white/95 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-50 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-2xl font-display font-light tracking-[0.3em] text-gray-900 hover:text-gray-700 transition-all duration-300 transform hover:scale-105">
              VAULT
            </Link>
            <div className="hidden md:flex space-x-6">
              <Link
                to="/"
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-light tracking-wide transition-all duration-300 group ${
                  isActive('/') ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Home size={18} className="transition-transform duration-300 group-hover:scale-110" />
                <span className="relative after:content-[''] after:absolute after:left-0 after:bottom-[-2px] after:w-0 after:h-[1px] after:bg-gray-900 after:transition-all after:duration-300 group-hover:after:w-full">
                  Home
                </span>
              </Link>
              <Link
                to="/cart"
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-light tracking-wide transition-all duration-300 group ${
                  isActive('/cart') ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Package size={18} className="transition-transform duration-300 group-hover:scale-110" />
                <span className="relative after:content-[''] after:absolute after:left-0 after:bottom-[-2px] after:w-0 after:h-[1px] after:bg-gray-900 after:transition-all after:duration-300 group-hover:after:w-full">
                  Orders
                </span>
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
            
            <InstallPrompt />

            <Link
              to="/cart"
              className="relative p-2 hover:bg-gray-100 rounded-full transition-all duration-300 group hover:scale-110"
            >
              <ShoppingCart size={22} className="text-gray-700 group-hover:text-gray-900 transition-colors" />
              {getTotalItems() > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-gray-900 to-gray-700 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-light animate-pulse">
                  {getTotalItems()}
                </span>
              )}
            </Link>

            {isAuthenticated ? (
              <div className="relative group">
                <button className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <User size={22} className="text-gray-700" />
                  <span className="text-sm font-medium text-gray-700 hidden md:inline">
                    {user?.name || 'Profile'}
                  </span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <button
                    onClick={() => navigate('/profile')}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    My Profile
                  </button>
                  <button
                    onClick={() => navigate('/orders')}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    My Orders
                  </button>
                  <button
                    onClick={logout}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left flex items-center"
                  >
                    <LogOut size={16} className="mr-2" />
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-full hover:from-gray-800 hover:to-gray-600 transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md"
              >
                <User size={18} />
                <span className="text-sm font-light tracking-wide">Login</span>
              </Link>
            )}

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
                <button
                  onClick={() => {
                    navigate('/profile');
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center space-x-2 w-full px-3 py-2 text-sm font-light text-gray-700 hover:bg-gray-50"
                >
                  <User size={18} />
                  <span>Profile</span>
                </button>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center space-x-2 w-full px-3 py-2 text-sm font-light text-gray-700 hover:bg-gray-50"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 w-full px-3 py-2 text-sm font-light text-gray-700 hover:bg-gray-50"
              >
                <User size={18} />
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

