/**
 * ProductList Component for EthioCraft Global
 * 
 * Features:
 * - Fetches products from backend API with proper loading states
 * - Grid layout with Ethiopian-inspired design
 * - Loading states and error handling
 * - Category filtering and search integration
 * - Responsive design for all devices
 * - Cultural storytelling integration
 * - Robust data fetching with retry logic
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ProductCard from './ProductCard';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import { useCustomTranslation } from '../../hooks/useCustomTranslation';

const ProductList = ({
  category = null,
  searchQuery = '',
  limit = 20,
  showFilters = true,
  title = 'Discover Authentic Ethiopian Crafts',
  onClearSearch = null
}) => {
  const { t } = useCustomTranslation();

  // State management
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [filters, setFilters] = useState({
    category: category || '',
    region: '',
    zone: '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [isFiltering, setIsFiltering] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalProducts: 0,
    hasNext: false,
    hasPrev: false
  });

  // Categories for filtering - MUST match Product model enum
  const categories = [
    { value: '', label: t('product_discovery.all_categories', 'All Categories'), icon: '🎨' },
    { value: 'Textiles', label: t('categories.textiles', 'Textiles'), icon: '🧵' },
    { value: 'Leather Goods', label: t('categories.leather_goods', 'Leather Goods'), icon: '👜' },
    { value: 'Basketry', label: t('categories.basketry', 'Basketry'), icon: '🧺' },
    { value: 'Jewelry', label: t('categories.jewelry', 'Jewelry'), icon: '💍' },
    { value: 'Pottery', label: t('categories.pottery', 'Pottery'), icon: '🏺' },
    { value: 'Wood Crafts', label: t('categories.wood_crafts', 'Wood Crafts'), icon: '🪵' },
    { value: 'Metalwork', label: t('categories.metalwork', 'Metalwork'), icon: '⚒️' },
    { value: 'Paintings', label: t('categories.paintings', 'Paintings'), icon: '🎨' }
  ];

  // Ethiopian regional zones mapping
  const regionalZones = {
    'Addis Ababa': ['Bole', 'Kirkos', 'Arada', 'Kolfe Keranio', 'Yeka', 'Lideta', 'Nefas Silk-Lafto'],
    'Amhara': ['Gonder', 'Wollo', 'South Wollo', 'North Wollo', 'Shoa', 'Gojjam', 'Bahir Dar'],
    'Oromia': ['Shoa', 'Wollega', 'Arsi', 'Bale', 'Borena', 'Hararghe', 'Jimma'],
    'Tigray': ['Mekelle', 'Adwa', 'Aksum', 'Shire'],
    'Sidama': ['Hawassa', 'Wensho', 'Loko'],
    'SNNPR': ['Wolayta', 'Gamo', 'Gurage', 'Hadiya', 'Keffa'],
    'Harari': ['Harar'],
    'Dire Dawa': ['Dire Dawa City']
  };

  // Sort options
  const sortOptions = [
    { value: 'createdAt-desc', label: t('product_discovery.sort_newest', 'Newest First') },
    { value: 'createdAt-asc', label: t('product_discovery.sort_oldest', 'Oldest First') },
    { value: 'price-asc', label: t('product_discovery.sort_price_low', 'Price: Low to High') },
    { value: 'price-desc', label: t('product_discovery.sort_price_high', 'Price: High to Low') },
    { value: 'views-desc', label: t('product_discovery.sort_popular', 'Most Popular') }
  ];

  // Fetch products from API with improved error handling and retry logic
  const fetchProducts = useCallback(async (page = 1, retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters - don't include limit if it's too high
      const params = new URLSearchParams({
        page: page.toString()
      });

      // Only add limit if it's reasonable (backend might have max limit)
      if (limit && limit <= 50) {
        params.append('limit', limit.toString());
      }

      // Add filters
      if (filters.category) params.append('category', filters.category);
      if (filters.region) params.append('region', filters.region);
      if (filters.zone) params.append('zone', filters.zone);
      if (searchQuery) params.append('search', searchQuery);
      if (filters.minPrice) params.append('minPrice', filters.minPrice);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      // Request that the API include out-of-stock products for the Product listing page
      params.append('includeOutOfStock', 'true');

      console.log('Fetching products with params:', params.toString());

      // Make API request with timeout
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/products?${params}`, {
        timeout: 10000 // 10 second timeout
      });

      console.log('Products fetched successfully:', response.data);

      setProducts(response.data.products || []);
      setPagination(response.data.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalProducts: response.data.products?.length || 0,
        hasNext: false,
        hasPrev: false
      });

      setInitialLoad(false);

    } catch (err) {
      console.error('Error fetching products:', err);
      console.error('Error response:', err.response?.data);

      // Retry logic for network errors
      if (retryCount < 2 && (err.code === 'ECONNABORTED' || err.code === 'NETWORK_ERROR')) {
        console.log(`Retrying request (attempt ${retryCount + 1})...`);
        setTimeout(() => {
          fetchProducts(page, retryCount + 1);
        }, 1000 * (retryCount + 1)); // Exponential backoff
        return;
      }

      const errorMessage = err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to load products. Please check your connection and try again.';

      setError(errorMessage);
      setInitialLoad(false);
    } finally {
      setLoading(false);
      setIsFiltering(false);
    }
  }, [filters, searchQuery, category, limit]);

  // Effect to fetch products when filters or search change - with debouncing for filters
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchProducts(1);
    }, initialLoad ? 0 : 500); // Only debounce after initial load

    return () => clearTimeout(handler);
  }, [filters.category, filters.region, filters.zone, filters.minPrice, filters.maxPrice, filters.sortBy, filters.sortOrder, searchQuery, fetchProducts]);

  // Effect to handle category prop changes from URL navigation
  useEffect(() => {
    if (category !== null && category !== undefined) {
      setFilters(prev => {
        if (prev.category !== category) {
          return { ...prev, category: category };
        }
        return prev;
      });
    }
  }, [category]);

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [filterName]: value };
      // Reset zone if region changes
      if (filterName === 'region') {
        newFilters.zone = '';
      }
      return newFilters;
    });
    if (!initialLoad) setIsFiltering(true);
  };

  // Handle sort change
  const handleSortChange = (sortValue) => {
    const [sortBy, sortOrder] = sortValue.split('-');
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder
    }));
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    fetchProducts(newPage);
    // Scroll to top of product list
    document.getElementById('product-list-top')?.scrollIntoView({
      behavior: 'smooth'
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      category: '',
      region: '',
      zone: '',
      minPrice: '',
      maxPrice: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    if (onClearSearch) {
      onClearSearch();
    }
  };

  return (
    <div className="w-full" id="product-list-top">
      {/* Header Section */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 font-['Playfair_Display',serif]">
          {t('product_discovery.hero_title', title)}
        </h2>
      </div>

      {/* Filters Section (Sticky) */}
      {showFilters && (
        <div className="sticky top-[88px] z-40 bg-white shadow-sm p-4 mb-8 border border-gray-100 rounded-lg backdrop-blur-md">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('product_discovery.filter_category', 'Category')}
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Region Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('product_discovery.filter_region', 'Region')}
              </label>
              <select
                value={filters.region}
                onChange={(e) => handleFilterChange('region', e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all"
              >
                <option value="">{t('product_discovery.all_regions', 'All Regions')}</option>
                {Object.keys(regionalZones).map(region => (
                  <option key={region} value={region}>
                    {t(`regions.${region.toLowerCase().replace(/ /g, '_')}`, region)}
                  </option>
                ))}
              </select>
            </div>

            {/* Zone Filter - Hierarchical */}
            {filters.region && regionalZones[filters.region] && (
              <div className="animate-in slide-in-from-left-2 duration-300">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('product_discovery.filter_zone', 'Specific Zone')}
                </label>
                <select
                  value={filters.zone}
                  onChange={(e) => handleFilterChange('zone', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all"
                >
                  <option value="">{t('product_discovery.select_zone', 'Select Zone')}</option>
                  {regionalZones[filters.region].map(zone => (
                    <option key={zone} value={zone}>
                      {t(`zones.${zone.toLowerCase().replace(/ /g, '_')}`, zone)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('product_discovery.filter_min_price', 'Min Price (ETB)')}
              </label>
              <input
                type="number"
                placeholder="0"
                value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('product_discovery.filter_max_price', 'Max Price (ETB)')}
              </label>
              <input
                type="number"
                placeholder="10000"
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('product_discovery.filter_sort_by', 'Sort By')}
              </label>
              <select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          <div className="flex justify-between items-center">
            <button
              onClick={clearFilters}
              className="text-orange-600 hover:text-orange-800 text-sm font-medium transition-colors duration-200"
            >
              {t('product_discovery.clear_filters', 'Clear All Filters')}
            </button>

            {/* Results Count */}
            <span className="text-sm text-gray-600">
              {t('product_discovery.products_found', '{{count}} products found', { count: pagination.totalProducts })}
            </span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="large" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-8">
          <ErrorMessage
            message={error}
            onRetry={() => fetchProducts(pagination.currentPage)}
          />
        </div>
      )}

      {/* Products Grid with Skeleton Loading */}
      <div className={`relative transition-opacity duration-300 ${loading || isFiltering ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        {!error && products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6 mb-8">
            {products.map(product => (
              <ProductCard
                key={`${product._id}-${product.updatedAt || Date.now()}`}
                product={product}
                showArtisan={true}
                lazyLoad={!initialLoad}
                showUnavailableStyling={true}
              />
            ))}
          </div>
        ) : !loading && !error && (
          /* No Products Found */
          <div className="text-center py-20 bg-gray-50 rounded-3xl mb-8">
            <div className="text-6xl mb-6">🔍</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {t('product_discovery.no_products_found', 'No masterpieces found')}
            </h3>
            <p className="text-gray-500 max-w-md mx-auto mb-8">
              {t('product_discovery.no_products_subtitle', "We couldn't find any products matching your current filters. Try adjusting your search or clearing filters.")}
            </p>
            <button
              onClick={clearFilters}
              className="px-8 py-3 bg-ethiopian-gold text-white font-bold rounded-2xl hover:bg-ethiopian-earth transition-all shadow-lg"
            >
              {t('product_discovery.clear_filters', 'Clear All Filters')}
            </button>
          </div>
        )}

        {(loading || isFiltering) && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[2px] rounded-3xl z-30">
            <LoadingSpinner size="large" />
          </div>
        )}
      </div>

      {/* Pagination */}
      {products.length > 0 && pagination.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-8">
          {/* Previous Button */}
          <button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={!pagination.hasPrev}
            className={`px-4 py-2 rounded-md border ${pagination.hasPrev
              ? 'border-orange-300 text-orange-600 hover:bg-orange-50'
              : 'border-gray-200 text-gray-400 cursor-not-allowed'
              } transition-colors duration-200`}
          >
            {t('product_discovery.previous', 'Previous')}
          </button>

          {/* Page Numbers */}
          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
            const pageNum = Math.max(1, pagination.currentPage - 2) + i;
            if (pageNum > pagination.totalPages) return null;

            return (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`px-4 py-2 rounded-md border ${pageNum === pagination.currentPage
                  ? 'border-orange-500 bg-orange-500 text-white'
                  : 'border-orange-300 text-orange-600 hover:bg-orange-50'
                  } transition-colors duration-200`}
              >
                {pageNum}
              </button>
            );
          })}

          {/* Next Button */}
          <button
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={!pagination.hasNext}
            className={`px-4 py-2 rounded-md border ${pagination.hasNext
              ? 'border-orange-300 text-orange-600 hover:bg-orange-50'
              : 'border-gray-200 text-gray-400 cursor-not-allowed'
              } transition-colors duration-200`}
          >
            {t('product_discovery.next', 'Next')}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductList;