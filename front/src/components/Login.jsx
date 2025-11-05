import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, User, Loader2 } from 'lucide-react';

const Login = ({ onClose, onSwitchToRegister }) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { login, register, error } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isLogin) {
        const result = await login(formData.email, formData.password);
        if (result.success && onClose) {
          onClose();
        }
        if (result.success) {
          navigate('/');
        }
      } else {
        if (!formData.name.trim()) {
          alert('Full name is required');
          setLoading(false);
          return;
        }
        if (!formData.email.trim()) {
          alert('Valid email is required');
          setLoading(false);
          return;
        }
        if (formData.password.length < 6) {
          alert('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          alert('Passwords do not match');
          setLoading(false);
          return;
        }
        
        const result = await register({
          name: formData.name,
          email: formData.email,
          password: formData.password
        });
        
        if (result.success && onClose) {
          onClose();
        }
        if (result.success) {
          navigate('/');
        }
      }
    } catch (err) {
      console.error('Authentication error:', err);
      // The error message from AuthContext should already be set, but we can add additional logging
      if (err.message?.includes('Cannot connect') || err.message?.includes('offline')) {
        console.log('Connection error detected:', err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-10 transform transition-all duration-500">
        <div className="text-center">
          <h2 className="text-4xl font-display font-light text-gray-900 tracking-[0.1em] mb-3">
            {isLogin ? 'SIGN IN' : 'SIGN UP'}
          </h2>
          <p className="text-sm font-light text-gray-600 tracking-wide">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={switchMode}
              className="font-light text-gray-900 hover:text-gray-700 focus:outline-none transition-all duration-300 border-b border-gray-900 hover:border-gray-700"
            >
              {isLogin ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>
        
        <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-6">
            {!isLogin && (
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required={!isLogin}
                    value={formData.name}
                    onChange={handleInputChange}
                    className="appearance-none relative block w-full pl-12 pr-4 py-4 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-light bg-gray-50 transition-all duration-300"
                    placeholder="Full Name"
                  />
                </div>
              </div>
            )}
            
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="appearance-none relative block w-full pl-12 pr-4 py-4 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-light bg-gray-50 transition-all duration-300"
                    placeholder="Email Address"
                  />
              </div>
            </div>
            
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="appearance-none relative block w-full pl-12 pr-12 py-4 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-light bg-gray-50 transition-all duration-300"
                    placeholder="Password"
                  />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  )}
                </button>
              </div>
            </div>
            
            {!isLogin && (
              <div className="mb-4">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required={!isLogin}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="appearance-none relative block w-full pl-12 pr-12 py-4 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-light bg-gray-50 transition-all duration-300"
                    placeholder="Confirm Password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center font-light animate-pulse">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-4 px-6 border border-transparent text-base font-light rounded-full text-white bg-gradient-to-r from-gray-900 to-gray-700 hover:from-gray-800 hover:to-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                isLogin ? 'Sign In' : 'Sign Up'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
