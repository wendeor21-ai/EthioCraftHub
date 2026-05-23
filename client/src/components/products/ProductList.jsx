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
import MobileFilterSheet from '../mobile/MobileFilterSheet';
import { useCustomTranslation } from '../../hooks/useCustomTranslation';

const ProductList = ({
  category = null,
  searchQuery = '',
  artisanId = null,
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
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
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
    { value: 'Jewelry', label: t('categories.jewelry', 'Jewelry'), icon: '💍' }
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
      if (artisanId) params.append('artisan', artisanId);
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
  }, [filters, searchQuery, category, limit, artisanId]);

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

      {/* ── DESKTOP: Header + Sticky Filter Bar ── */}
      <div className="hidden md:block">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-2 font-['Playfair_Display',serif]">
            {t('product_discovery.hero_title', title)}
          </h2>
        </div>

        {showFilters && (
          <div className="sticky top-[88px] z-40 bg-white shadow-sm p-4 mb-8 border border-gray-100 rounded-lg backdrop-blur-md">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
              {/* Category Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  {t('product_discovery.filter_category', 'Category')}
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                  ))}
                </select>
              </div>
              {/* Region Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  {t('product_discovery.filter_region', 'Region')}
                </label>
                <select
                  value={filters.region}
                  onChange={(e) => handleFilterChange('region', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold"
                >
                  <option value="">{t('product_discovery.all_regions', 'All Regions')}</option>
                  {Object.keys(regionalZones).map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>
              {/* Zone Filter */}
              {filters.region && regionalZones[filters.region] && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    {t('product_discovery.filter_zone', 'Zone')}
                  </label>
                  <select
                    value={filters.zone}
                    onChange={(e) => handleFilterChange('zone', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold"
                  >
                    <option value="">Select Zone</option>
                    {regionalZones[filters.region].map(zone => (
                      <option key={zone} value={zone}>{zone}</option>
                    ))}
                  </select>
                </div>
              )}
              {/* Min Price */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  {t('product_discovery.filter_min_price', 'Min Price (ETB)')}
                </label>
                <input
                  type="number" placeholder="0" value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              {/* Max Price */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  {t('product_discovery.filter_max_price', 'Max Price (ETB)')}
                </label>
                <input
                  type="number" placeholder="10000" value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              {/* Sort */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  {t('product_discovery.filter_sort_by', 'Sort By')}
                </label>
                <select
                  value={`${filters.sortBy}-${filters.sortOrder}`}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <button onClick={clearFilters} className="text-orange-600 hover:text-orange-800 text-sm font-medium">
                {t('product_discovery.clear_filters', 'Clear All Filters')}
              </button>
              <span className="text-sm text-gray-600">
                {pagination.totalProducts} {t('product_discovery.products_found', 'products found')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── MOBILE: Clean single sticky filter bar ── */}
      {showFilters && (
        <div className="md:hidden sticky z-40 bg-gray-50" style={{ top: 52 }}>

          {/* ── Row 1: Category pill strip ── */}
          {/* Visually separated from search bar above by bg-gray-50 + border-t */}
          <div
            className="flex gap-1.5 px-2 py-2 overflow-x-auto border-t-4 border-gray-100 bg-white"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categories.map(cat => (
              <button
                key={cat.value}
                onClick={() => handleFilterChange('category', cat.value)}
                className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all whitespace-nowrap ${
                  filters.category === cat.value
                    ? 'bg-ethiopian-gold text-white border-ethiopian-gold'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                <span className="text-[11px]">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* ── Row 2: Sort | Filter | Count — separated by gray bg ── */}
          <div className="flex items-stretch divide-x divide-gray-200 border-t border-gray-200 border-b border-gray-200 bg-white mt-0.5">

            {/* Sort */}
            <div className="flex-1 flex items-center justify-center gap-1 py-2 min-w-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-gray-500 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              <select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => handleSortChange(e.target.value)}
                className="text-[11px] text-gray-700 bg-transparent border-none outline-none font-medium cursor-pointer max-w-[90px] truncate"
                style={{ fontSize: '11px' }}
              >
                {sortOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Filter */}
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="flex-1 flex items-center justify-center gap-1 py-2"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-gray-500 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="text-[11px] text-gray-700 font-medium">Filter</span>
              {(filters.region || filters.minPrice || filters.maxPrice) && (
                <span className="w-1.5 h-1.5 rounded-full bg-ethiopian-gold shrink-0" />
              )}
            </button>

            {/* Count */}
            <div className="flex-1 flex items-center justify-center py-2">
              <span className="text-[11px] text-gray-500 font-medium">
                {pagination.totalProducts > 0 ? `${pagination.totalProducts} items` : '—'}
              </span>
            </div>
          </div>

          {/* ── Visual gap below filter bar before products ── */}
          <div className="h-2 bg-gray-100" />
        </div>
      )}

      {/* ── MOBILE Filter Sheet ── */}
      <MobileFilterSheet isOpen={mobileFilterOpen} onClose={() => setMobileFilterOpen(false)}>
        <div className="space-y-4">
          {/* Region */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Region</label>
            <select
              value={filters.region}
              onChange={(e) => handleFilterChange('region', e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e43a3a]"
              style={{ fontSize: '16px' }}
            >
              <option value="">All Regions</option>
              {Object.keys(regionalZones).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {/* Zone */}
          {filters.region && regionalZones[filters.region] && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Zone</label>
              <select
                value={filters.zone}
                onChange={(e) => handleFilterChange('zone', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e43a3a]"
                style={{ fontSize: '16px' }}
              >
                <option value="">All Zones</option>
                {regionalZones[filters.region].map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
          )}
          {/* Price Range */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Price Range (ETB)</label>
            <div className="flex gap-3">
              <input
                type="number" placeholder="Min" value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e43a3a]"
                style={{ fontSize: '16px' }}
              />
              <span className="self-center text-gray-400">—</span>
              <input
                type="number" placeholder="Max" value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e43a3a]"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>
          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { clearFilters(); setMobileFilterOpen(false); }}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold"
            >
              Reset
            </button>
            <button
              onClick={() => setMobileFilterOpen(false)}
              className="flex-1 py-3 bg-[#e43a3a] text-white rounded-xl text-sm font-semibold"
            >
              Apply
            </button>
          </div>
        </div>
      </MobileFilterSheet>

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

      {/* ── Products Grid ── */}
      <div className={`relative transition-opacity duration-300 ${loading || isFiltering ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        {!error && products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 sm:gap-4 md:gap-6 mb-8 px-1 md:px-0">
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
          <div className="text-center py-16 bg-gray-50 rounded-2xl mb-8 mx-2">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {t('product_discovery.no_products_found', 'No products found')}
            </h3>
            <p className="text-gray-500 text-sm max-w-xs mx-auto mb-6">
              {t('product_discovery.no_products_subtitle', "Try adjusting your filters.")}
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-2.5 bg-[#e43a3a] text-white font-bold rounded-xl text-sm"
            >
              {t('product_discovery.clear_filters', 'Clear Filters')}
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
        <div className="flex justify-center items-center gap-1.5 mt-6 mb-4 px-3">
          <button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={!pagination.hasPrev}
            className={`px-3 py-1.5 rounded-lg border text-sm ${pagination.hasPrev ? 'border-orange-300 text-orange-600' : 'border-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            ‹
          </button>
          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
            const pageNum = Math.max(1, pagination.currentPage - 2) + i;
            if (pageNum > pagination.totalPages) return null;
            return (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`w-8 h-8 rounded-lg border text-sm font-medium ${pageNum === pagination.currentPage ? 'border-[#e43a3a] bg-[#e43a3a] text-white' : 'border-gray-200 text-gray-600'}`}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={!pagination.hasNext}
            className={`px-3 py-1.5 rounded-lg border text-sm ${pagination.hasNext ? 'border-orange-300 text-orange-600' : 'border-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductList;