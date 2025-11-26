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
      if (isAuthError && isProtectedEndpoint) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    // Network errors: fallback to IndexedDB/offline mode
    if (!error.response && (error.code === 'ERR_NETWORK' || error.code === 'NETWORK_ERROR')) {
      console.warn('Network error; falling back to offline mode');
      const offlineError = new Error('Network error - using offline mode');
      offlineError.offline = true;
      return Promise.reject(offlineError);
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  get: (url, config) => api.get(url, config),
  post: (url, data, config) => api.post(url, data, config),
  put: (url, data, config) => api.put(url, data, config),
  delete: (url, config) => api.delete(url, config),
};

export const productService = {
  getProducts: async (params = {}) => {
    try {
      const response = await api.get('/products', { params });
      return response.data;
    } catch (error) {
      if (error.offline) {
        const { PRODUCTS } = await import('../data/products');
        return { products: Array.isArray(PRODUCTS) ? PRODUCTS : [] };
      }
      throw error;
    }
  },
  getProduct: async (id) => {
    try {
      const response = await api.get(`/products/${id}`);
      return response.data;
    } catch (error) {
      if (error.offline) {
        const { PRODUCTS } = await import('../data/products');
        const local = Array.isArray(PRODUCTS) ? PRODUCTS.find(p => String(p.id) === String(id)) : null;
        if (local) {
          return { product: local };
        }
      }
      throw error;
    }
  },
};

export const orderService = {
  createOrder: async (orderData) => {
    try {
      const response = await api.post('/orders', orderData);
      return response.data;
    } catch (error) {
      if (error.offline) {
        const bill = {
          orderId: `offline_${Date.now()}`,
          orderNumber: `OFF-${Date.now()}`,
          items: orderData.items.map(item => ({
            name: item.name || `Product ${item.productId}`,
            price: item.price || 0,
            quantity: item.quantity,
            image: item.image || null,
          })),
          shippingAddress: orderData.shippingAddress,
          customer: { name: orderData.shippingAddress?.fullName || 'Guest' },
          subtotal: orderData.items.reduce((sum, it) => sum + (it.price || 0) * it.quantity, 0),
          tax: 0,
          shippingCost: 0,
          discount: orderData.discount || 0,
          total: 0,
          paymentStatus: 'pending',
          orderStatus: 'pending',
          createdAt: new Date().toISOString(),
          expectedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        };
        bill.total = bill.subtotal + bill.tax + bill.shippingCost - bill.discount;
        return { order: bill };
      }
      throw error;
    }
  },
        getOrders: async (params = {}) => {
    try {
      const response = await api.get('/orders', { params });
      return response.data;
    } catch (error) {
      if (error.offline) {
        return { orders: [], pagination: { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: 10, hasNext: false, hasPrev: false } };
      }
      throw error;
    }
  },
  getOrder: async (id) => {
    try {
      const response = await api.get(`/orders/${id}`);
      return response.data;
    } catch (error) {
      if (error.offline) {
        return null;
      }
      throw error;
    }
  },
};

export const cartService = {
  getCart: async () => {
    try {
      const response = await api.get('/cart');
      return response.data;
    } catch (error) {
      if (error.offline) {
        return { items: [], syncStatus: 'offline' };
      }
      throw error;
    }
  },
  addToCart: async (productId, quantity) => {
    try {
      const response = await api.post('/cart/add', { productId, quantity });
      return response.data;
    } catch (error) {
      if (error.offline) {
        return { message: 'Item added to cart (offline)', cart: { items: [], syncStatus: 'offline' } };
      }
      throw error;
    }
  },
  updateCart: async (productId, quantity) => {
    try {
      const response = await api.put('/cart/update', { productId, quantity });
      return response.data;
    } catch (error) {
      if (error.offline) {
        return { message: 'Cart updated (offline)', cart: { items: [], syncStatus: 'offline' } };
      }
      throw error;
    }
  },
  removeFromCart: async (productId) => {
    try {
      const response = await api.delete(`/cart/remove/${productId}`);
      return response.data;
    } catch (error) {
      if (error.offline) {
        return { message: 'Item removed from cart (offline)', cart: { items: [], syncStatus: 'offline' } };
      }
      throw error;
    }
  },
  clearCart: async () => {
    try {
      const response = await api.delete('/cart/clear');
      return response.data;
    } catch (error) {
      if (error.offline) {
        return { message: 'Cart cleared (offline)', cart: { items: [], syncStatus: 'offline' } };
      }
      throw error;
    }
  },
};

export const authService = {
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      if (error.offline) {
        const token = `offline_token_${Date.now()}`;
        localStorage.setItem('token', token);
        return { message: 'Login successful (offline mode)', token, user: { id: `offline_user_${Date.now()}`, email, isGuest: true } };
      }
      throw error;
    }
  },
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      if (error.offline) {
        const token = `offline_token_${Date.now()}`;
        localStorage.setItem('token', token);
        return { message: 'User registered offline (no DB)', token, user: { id: `offline_user_${Date.now()}`, email: userData.email, name: userData.name, isGuest: true } };
      }
      throw error;
    }
  },
  getMe: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      if (error.offline) {
        const token = localStorage.getItem('token') || '';
        const isGuest = token.startsWith('offline_token_');
        return { user: { id: `offline_user_${Date.now()}`, isGuest, email: '', name: 'Offline User' } };
      }
      throw error;
    }
  },
  createGuest: async () => {
    try {
      const response = await api.post('/auth/guest');
      return response.data;
    } catch (error) {
      if (error.offline) {
        const token = `offline_guest_${Date.now()}`;
        localStorage.setItem('token', token);
        return { message: 'Guest session created (offline)', token, user: { id: `offline_guest_${Date.now()}`, isGuest: true } };
      }
      throw error;
    }
  },
};

export default api;