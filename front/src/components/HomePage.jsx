import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import Navbar from './Navbar';
import ConnectivityBanner from './ConnectivityBanner';
import { productService } from '../services/api';
import DockBar from './DockBar';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { useIntersectionObserver } from '../hooks/useScrollAnimation';

const HomePage = () => {
  const { addToCart } = useCart();
  const { isOnline } = useApp();
  const navigate = useNavigate();
  const { searchQuery, setSearchQuery, selectedCategory, setSelectedCategory } = useApp();
  const [sortBy, setSortBy] = useState('relevance'); // 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc'
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pageSize = 6;
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Build a lightweight cache key for product lists
  const cacheKey = useMemo(() => {
    const cat = selectedCategory || 'All';
    const q = (debouncedSearch || '').trim();
    return `home.products:${cat}:${q}`;
  }, [selectedCategory, debouncedSearch]);
  
  // Scroll animations
  const [heroRef, heroVisible] = useIntersectionObserver({ threshold: 0.1 });
  const [productsRef, productsVisible] = useIntersectionObserver({ threshold: 0.1 });

  // Debounce search to avoid refetching on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery || ''), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Fetch categories once on mount
  useEffect(() => {
    let isCancelled = false;
    const fetchCategories = async () => {
      try {
        const categoriesResponse = await productService.getCategories();
        if (isCancelled) return;
        const rawCategories = categoriesResponse.data?.categories || [];
        const categoryNames = ['All', ...rawCategories.map(c => c.name).filter(Boolean)];
        setCategories(categoryNames);
      } catch (err) {
        if (isCancelled) return;
        // Fallback categories
        try {
          const { CATEGORIES } = await import('../data/products');
          setCategories(CATEGORIES);
        } catch (_) {
          setCategories(['All']);
        }
      }
    };
    fetchCategories();
    return () => { isCancelled = true; };
  }, []);

  // Fetch products when filters change
  useEffect(() => {
    let isCancelled = false;
    // Abort controller to cancel in-flight requests if filters change quickly
    const controller = new AbortController();

    // Try to show cached results immediately (perceived performance)
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProducts(parsed);
          setLoading(false);
        }
      }
    } catch (_) {}

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const productsResponse = await productService.getProducts({
          page: 1,
          // Fetch fewer items initially to reduce payload; client paginates
          limit: 18,
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          search: debouncedSearch || undefined,
          // Pass abort signal when supported by axios
          signal: controller.signal,
        });
        if (isCancelled) return;
        let rawProducts = productsResponse.data?.products || productsResponse.data || [];

        // If backend returns no products, fallback to local sample data for a better UX
        if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
          try {
            const { PRODUCTS } = await import('../data/products');
            rawProducts = PRODUCTS;
          } catch (_) {
            rawProducts = [];
          }
        }

        const normalizedProducts = rawProducts.map(p => {
          const id = p._id || p.id;
          const categoryName = (p.category && (p.category.name || p.category)) || 'Uncategorized';
          const images = Array.isArray(p.images) ? p.images : [];
          const firstImage = images.length > 0 ? (typeof images[0] === 'string' ? images[0] : images[0]?.url) : p.image;
          const price = (typeof p.discountPrice === 'number' && p.discountPrice > 0) ? p.discountPrice : p.price;
          const discount = (typeof p.discountPrice === 'number' && p.discountPrice > 0 && p.price > 0)
            ? Math.round(((p.price - p.discountPrice) / p.price) * 100)
            : (typeof p.discount === 'number' ? p.discount : 0);
          return {
            ...p,
            id,
            image: firstImage,
            category: categoryName,
            price,
            discount,
          };
        });
        setProducts(normalizedProducts);
        // Persist in sessionStorage for instant rendering on next visit
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(normalizedProducts));
        } catch (_) {}
        // Reset to first page when filter/search changes
        setPage(1);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Error fetching products:', err);
        setError('Failed to load products. Please try again.');
        // Fallback to mock data if API fails
        const { PRODUCTS } = await import('../data/products');
        if (isCancelled) return;
        setProducts(PRODUCTS);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchProducts();
    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [selectedCategory, debouncedSearch, cacheKey]);

  const filteredProducts = useMemo(() => {
    const q = (searchQuery || '').toLowerCase();
    return products.filter(product => {
      const matchesSearch = product.name?.toLowerCase?.().includes(q);
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const sortedProducts = useMemo(() => {
    const arr = [...filteredProducts];
    switch (sortBy) {
      case 'name-asc':
        return arr.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return arr.sort((a, b) => b.name.localeCompare(a.name));
      case 'price-asc':
        return arr.sort((a, b) => a.price - b.price);
      case 'price-desc':
        return arr.sort((a, b) => b.price - a.price);
      default:
        return arr; // relevance: keep filtered order
    }
  }, [filteredProducts, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, currentPage]);

  return (
    <div className="min-h-screen bg-transparent">
      <DockBar />
      <Navbar />
      <ConnectivityBanner />
      
      <div ref={heroRef} className={`bg-white border-b border-gray-100 transition-all duration-1000 pt-32 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search for products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-light bg-gray-50 transition-all duration-300"
                />
              </div>
              <div className="flex gap-3">
                <select
                  value={selectedCategory}
                  onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
                  className="px-6 py-4 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-light bg-gray-50 transition-all duration-300"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                  className="px-6 py-4 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-light bg-gray-50 transition-all duration-300"
                >
                  <option value="relevance">Sort: Relevance</option>
                  <option value="name-asc">Name: A → Z</option>
                  <option value="name-desc">Name: Z → A</option>
                  <option value="price-asc">Price: Low → High</option>
                  <option value="price-desc">Price: High → Low</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div ref={productsRef} className={`max-w-7xl mx-auto px-4 py-16 transition-all duration-1000 ${productsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="text-center mb-16">
          <h2 className="text-5xl font-display font-light text-gray-900 mb-4 tracking-[0.1em]">CURATED COLLECTION</h2>
          <p className="text-lg font-light text-gray-600 tracking-wide">Discover our carefully selected premium products</p>
        </div>
        
        {loading && (
          <div className="flex justify-center items-center py-24">
            <div className="relative">
              <Loader2 className="animate-spin text-gray-300" size={64} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-gradient-to-r from-gray-900 to-gray-700 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 font-light">{error}</p>
          </div>
        )}
        
        {!loading && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {pageItems.map(product => (
                <div
                  key={product.id}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer group border border-gray-100 transform hover:-translate-y-2"
                >
                  <div className="aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 relative">
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>
                  <div className="p-8">
                    <p className="text-xs font-light text-gray-500 uppercase tracking-[0.2em] mb-3">{product.category}</p>
                    <h3 className="text-xl font-light text-gray-900 mb-4 leading-tight group-hover:text-gray-700 transition-colors duration-300">{product.name}</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-3xl font-light text-gray-900 tracking-tight">${product.price.toFixed(2)}</p>
                        {product.discount > 0 && (
                          <p className="text-sm font-light text-emerald-600 mt-1 animate-pulse">{product.discount}% off</p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product);
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-gray-900 to-gray-700 text-white text-sm font-light rounded-full hover:from-gray-800 hover:to-gray-600 transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-lg group-hover:shadow-xl"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {sortedProducts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-lg font-light text-gray-500">No products found matching your criteria.</p>
              </div>
            )}

            {sortedProducts.length > 0 && (
              <div className="mt-16 flex items-center justify-center gap-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-8 py-3 text-sm rounded-full border border-gray-200 disabled:opacity-50 hover:bg-gray-50 transition-all duration-300 font-light tracking-wide transform hover:scale-105 disabled:hover:scale-100"
                >
                  Previous
                </button>
                <span className="text-sm font-light text-gray-600 tracking-wide">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-8 py-3 text-sm rounded-full border border-gray-200 disabled:opacity-50 hover:bg-gray-50 transition-all duration-300 font-light tracking-wide transform hover:scale-105 disabled:hover:scale-100"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HomePage;

