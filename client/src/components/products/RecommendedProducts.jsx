/**
 * Recommended Products Component for EthioCraft Global
 * 
 * Displays personalized product recommendations based on:
 * - User search history
 * - Viewed products
 * - Category preferences
 * - Comment/review interactions
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SparklesIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import ProductCard from './ProductCard';
import LoadingSpinner from '../common/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';

const RecommendedProducts = ({ limit = 8 }) => {
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && token) {
      fetchRecommendations();
    } else {
      // Show popular products for non-logged-in users
      fetchPopularProducts();
    }
  }, [user, token]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const authToken = token || localStorage.getItem('authToken');

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const origin = apiUrl.replace(/\/api\/?$/, "");
      const response = await fetch(`${origin}/api/recommendations/recommendations?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Recommendations API not available');
      }

      const data = await response.json();

      if (data.success) {
        setProducts(data.data);
      } else {
        console.log('Recommendations not available, falling back to popular products');
        // Fallback to popular products
        fetchPopularProducts();
      }
    } catch (error) {
      console.log('Recommendations API not available, showing popular products instead');
      // Fallback to popular products
      fetchPopularProducts();
    } finally {
      setLoading(false);
    }
  };

  const fetchPopularProducts = async () => {
    try {
      setLoading(true);
      // Phase 3: Prioritize High Sales Count (purchases) explicitly
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const origin = apiUrl.replace(/\/api\/?$/, "");
      const response = await fetch(`${origin}/api/products?limit=${limit}&sortBy=salesCount&sortOrder=desc`);
      const data = await response.json();

      if (data.products) {
        // Double check sorting on frontend to ensure 'Best Sellers' are prioritized
        const sortedProducts = [...data.products].sort((a, b) => {
          // 1. Sales Count (purchases) priority
          const aSales = a.metrics?.purchases || 0;
          const bSales = b.metrics?.purchases || 0;
          if (bSales !== aSales) return bSales - aSales;

          // 2. Urgent (low stock: inventory.quantity > 0 and < 5)
          const aUrgent = a.inventory?.quantity > 0 && a.inventory?.quantity < 5;
          const bUrgent = b.inventory?.quantity > 0 && b.inventory?.quantity < 5;
          if (aUrgent && !bUrgent) return -1;
          if (!aUrgent && bUrgent) return 1;

          // 3. Views
          const aViews = a.metrics?.views || 0;
          const bViews = b.metrics?.views || 0;
          return bViews - aViews;
        });

        setProducts(sortedProducts);
      }
    } catch (error) {
      console.error('Error fetching popular products:', error);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center">
            <LoadingSpinner size="large" />
          </div>
        </div>
      </div>
    );
  }

  if (error || products.length === 0) {
    return null; // Don't show section if no products
  }

  return (
    <section className="py-12 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <SparklesIcon className="w-8 h-8 text-ethiopian-gold" />
            <div>
              <h2 className="text-3xl font-bold text-[#1e293b]">
                {user ? 'Recommended for You' : 'Popular Products'}
              </h2>
              <p className="text-gray-500 mt-1">
                {user
                  ? 'Curated based on your interests and browsing history'
                  : 'Discover our most loved Ethiopian crafts'
                }
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/products')}
            className="hidden md:flex items-center space-x-2 text-ethiopian-gold hover:text-[#b8962c] transition-colors"
          >
            <span className="font-semibold">View All</span>
            <ArrowRightIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>

        {/* Mobile View All Button */}
        <div className="mt-8 text-center md:hidden">
          <button
            onClick={() => navigate('/products')}
            className="btn-ethiopian w-full inline-flex items-center justify-center space-x-2"
          >
            <span>View All Products</span>
            <ArrowRightIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Personalization Note for Logged-in Users */}
        {user && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              💡 Tip: The more you browse and interact, the better your recommendations become!
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default RecommendedProducts;
