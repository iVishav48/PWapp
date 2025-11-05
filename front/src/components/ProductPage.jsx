import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { useCart } from '../context/CartContext';
import { productService } from '../services/api';
import { Loader2 } from 'lucide-react';

const ProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await productService.getProduct(id);
        // Handle both direct data and response.data formats
        const productData = response.data || response;
        setProduct(productData);
      } catch (err) {
        console.error('Error fetching product:', err);
        setError('Failed to load product details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchProduct();
    }
  }, [id]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <Loader2 className="animate-spin text-gray-400 mx-auto" size={48} />
          <p className="text-lg font-light text-gray-600 mt-4">Loading product details...</p>
        </div>
      </div>
    );
  }
  
  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-light text-gray-900 mb-4">
            {error ? 'Error loading product' : 'Product not found'}
          </h1>
          <p className="text-gray-600 mb-6">{error || 'The product you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const effectivePrice = typeof product.discountPrice === 'number' && product.discountPrice > 0
    ? product.discountPrice
    : product.price;
  const discountPercent = (typeof product.discountPrice === 'number' && product.discountPrice > 0 && product.price > 0)
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : (typeof product.discount === 'number' ? product.discount : 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-12">
        <button
          onClick={() => navigate('/')}
          className="mb-6 text-sm font-light text-gray-600 hover:text-gray-900 transition-colors"
        >
          ← Back to products
        </button>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          <div className="grid md:grid-cols-2 gap-8 p-8">
            <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
              <img
                src={product.images?.[0]?.url || product.image}
                alt={product.name}
                loading="lazy"
                decoding="async"
                sizes="(max-width: 768px) 100vw, 50vw"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex flex-col">
              <p className="text-xs font-light text-gray-500 uppercase tracking-wider mb-2">{product.category?.name || product.category}</p>
              <h1 className="text-4xl font-display font-light text-gray-900 mb-3 tracking-wide">{product.name}</h1>
              <p className="text-lg font-light text-gray-600 mb-6">{product.shortDescription || product.shortDesc}</p>

              <div className="flex items-baseline gap-3 mb-6">
                <span className="text-4xl font-light text-gray-900">${effectivePrice?.toFixed ? effectivePrice.toFixed(2) : Number(effectivePrice).toFixed(2)}</span>
                {discountPercent > 0 && (
                  <>
                    <span className="text-xl font-light text-gray-400 line-through">${product.price?.toFixed ? product.price.toFixed(2) : Number(product.price).toFixed(2)}</span>
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-light rounded-full">
                      Save {discountPercent}%
                    </span>
                  </>
                )}
              </div>

              <div className="mb-8 pb-8 border-b border-gray-200">
                <h3 className="text-lg font-light text-gray-900 mb-3">Description</h3>
                <p className="text-gray-600 font-light leading-relaxed">{product.description}</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-light text-gray-700 mb-2">Quantity</label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-light"
                  >
                    -
                  </button>
                  <span className="w-16 text-center text-lg font-light">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-light"
                  >
                    +
                  </button>
                  <span className="text-sm font-light text-gray-500 ml-4">
                    {product.stock} available
                  </span>
                </div>
              </div>

              <div className="flex gap-4 mt-auto">
                <button
                  onClick={() => {
                    addToCart(product, quantity);
                    navigate('/cart');
                  }}
                  className="flex-1 px-6 py-4 bg-gray-900 text-white font-light rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Add to Cart
                </button>
                <button
                  onClick={() => {
                    addToCart(product, quantity);
                    navigate('/cart');
                  }}
                  className="flex-1 px-6 py-4 border-2 border-gray-900 text-gray-900 font-light rounded-lg hover:bg-gray-900 hover:text-white transition-colors"
                >
                  Buy Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;

