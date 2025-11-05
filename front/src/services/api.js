import axios from 'axios';

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
  ? import.meta.env.VITE_API_BASE_URL
  : 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    if (status === 401) {
      const message = error.response?.data?.message || '';
      const isAuthError = /invalid token|authentication required/i.test(message);
      const isProtectedEndpoint = url.startsWith('/auth/me') || url.startsWith('/orders') || url.startsWith('/cart');
      const isAuthRoute = url.startsWith('/auth/login') || url.startsWith('/auth/register');

      if (isProtectedEndpoint || isAuthError) {
        localStorage.removeItem('token');
        window.dispatchEvent(new CustomEvent('auth:token-expired'));
        if (!isAuthRoute) {
          window.location.href = '/login';
        }
      }
    }
    
    // Handle network errors (offline)
    if (!error.response) {
      // More specific network error handling
      if (error.code === 'ECONNREFUSED') {
        error.message = 'Cannot connect to server. Please ensure the backend server is running.';
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        error.message = 'Network error. Please check your internet connection.';
      } else if (error.code === 'TIMEOUT') {
        error.message = 'Request timed out. Please try again.';
      } else {
        error.message = 'You are currently offline. Please check your internet connection.';
      }
    }
    
    // Handle specific HTTP errors
    if (error.response?.status === 403) {
      error.message = 'You do not have permission to perform this action.';
    } else if (error.response?.status === 404) {
      error.message = 'The requested resource was not found.';
    } else if (error.response?.status >= 500) {
      error.message = 'Server error. Please try again later.';
    }
    
    return Promise.reject(error);
  }
);

// Product service
export const productService = {
  getProducts: async (params = {}) => {
    try {
      return await api.get('/products', { params });
    } catch (error) {
      // Fallback to mock data when offline or server unavailable
      if (!error.response) {
        console.log('Using fallback product data');
        const { products } = await import('../data/products');
        return { data: products };
      }
      throw error;
    }
  },
  
  getProduct: async (id) => {
    try {
      return await api.get(`/products/${id}`);
    } catch (error) {
      // Fallback to mock data when offline or server unavailable
      if (!error.response) {
        console.log('Using fallback product data for ID:', id);
        const { products } = await import('../data/products');
        const product = products.find(p => p.id === parseInt(id));
        if (product) {
          return { data: product };
        }
      }
      throw error;
    }
  },
  getCategories: () => api.get('/categories'),
  validateStock: async (productIds) => {
    try {
      const response = await api.post('/products/validate-stock', { productIds });
      return response.data;
    } catch (error) {
      console.error('Error validating stock:', error);
      // Fallback to individual product calls
      const stockData = {};
      for (const productId of productIds) {
        try {
          const productResponse = await api.get(`/products/${productId}`);
          stockData[productId] = { stock: productResponse.data.stock };
        } catch (err) {
          stockData[productId] = { stock: 0 };
        }
      }
      return stockData;
    }
  },
};

// Auth service
export const authService = {
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      if (!error.response) {
        throw new Error('Cannot connect to authentication server. Please check if the backend server is running.');
      }
      throw error;
    }
  },
  
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      if (!error.response) {
        throw new Error('Cannot connect to authentication server. Please check if the backend server is running.');
      }
      throw error;
    }
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data?.user || response.data;
  },
  
  updateProfile: async (userData) => {
    const response = await api.put('/auth/profile', userData);
    return response.data;
  },
  
  refreshToken: async () => {
    const response = await api.post('/auth/refresh');
    return response.data;
  },
  
  logout: async () => {
    await api.post('/auth/logout');
  },
};

export const cartService = {
  getCart: () => api.get('/cart'),
  addToCart: (productId, quantity) => api.post('/cart/add', { productId, quantity }),
  updateCart: (productId, quantity) => api.put('/cart/update', { productId, quantity }),
  removeFromCart: (productId) => api.delete(`/cart/remove/${productId}`),
  clearCart: () => api.delete('/cart/clear'),
  syncCart: (cartData) => api.post('/cart/sync', cartData),
};

export const orderService = {
  createOrder: (orderData) => api.post('/orders', orderData),
  getOrders: (params = {}) => api.get('/orders', { params }),
  getOrder: (id) => api.get(`/orders/${id}`),
};

export const syncService = {
  syncData: () => api.get('/sync'),
};

export default api;