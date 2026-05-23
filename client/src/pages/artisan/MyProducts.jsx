/**
 * My Products Page for EthioCraft Global
 * 
 * Displays artisan's existing products with Edit and Delete options
 * Separate from AddProduct.js which handles product creation
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { API_ENDPOINTS } from '../../config/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { getImageUrl } from '../../utils/imageUtils';
import { Package, Edit, Trash2, Eye, PlusCircle, Search } from 'lucide-react';

const MyProducts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deletingProduct, setDeletingProduct] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('authToken');

      if (!token) {
        setError('Authentication required. Please login.');
        setLoading(false);
        return;
      }

      // Use user.id (from backend) or user._id (fallback)
      const artisanId = user?.id || user?._id;

      if (!artisanId) {
        setError('Invalid artisan: User ID not found. Please login again.');
        setLoading(false);
        return;
      }

      // Request all artisan products including out-of-stock items so artisans can edit/restock them
      const response = await fetch(`${API_ENDPOINTS.PRODUCTS.BY_ARTISAN(artisanId)}?includeOutOfStock=true&includeAll=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to load products from server');
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Unable to connect to server. Please ensure the backend is running on http://localhost:5000');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (productId) => {
    navigate(`/artisan/edit-product/${productId}`);
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to permanently delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingProduct(productId);
      const token = localStorage.getItem('authToken');

      const response = await fetch(API_ENDPOINTS.PRODUCTS.BY_ID(productId), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete product');
      }

      // refresh the list from server to make sure counts/stats stay accurate
      await fetchProducts();
      setError('');
    } catch (error) {
      console.error('Error deleting product:', error);
      setError(error.message || 'Failed to delete product');
    } finally {
      setDeletingProduct(null);
    }
  };

  const handleView = (productId) => {
    navigate(`/products/${productId}`);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || product.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      draft: 'bg-yellow-100 text-yellow-800',
      inactive: 'bg-gray-100 text-gray-800',
      sold: 'bg-blue-100 text-blue-800'
    };
    return colors[status] || colors.draft;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/artisan/dashboard')}
            className="text-ethiopian-gold hover:text-ethiopian-earth mb-4 flex items-center"
          >
            ← Back to Dashboard
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Products</h1>
              <p className="text-gray-600 mt-2">Manage your product catalog</p>
            </div>
            <button
              onClick={() => navigate('/artisan/add-product')}
              className="bg-ethiopian-gold text-white px-6 py-3 rounded-lg hover:bg-ethiopian-earth transition-colors flex items-center space-x-2 shadow-lg"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Add New Product</span>
            </button>
          </div>
        </div>

        {error && <ErrorMessage message={error} className="mb-6" />}

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
              >
                <option value="all">All Products</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="inactive">Inactive</option>
                <option value="sold">Sold</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{products.length}</p>
              <p className="text-sm text-gray-600">Total Products</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {products.filter(p => p.status === 'active').length}
              </p>
              <p className="text-sm text-gray-600">Active</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {products.filter(p => p.status === 'draft').length}
              </p>
              <p className="text-sm text-gray-600">Draft</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {products.reduce((sum, p) => sum + (p.metrics?.purchases || 0), 0)}
              </p>
              <p className="text-sm text-gray-600">Total Sales</p>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm || filterStatus !== 'all' ? 'No Products Found' : 'No Products Yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || filterStatus !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Start by adding your first product to your catalog'
              }
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <button
                onClick={() => navigate('/artisan/add-product')}
                className="bg-ethiopian-gold text-white px-6 py-3 rounded-lg hover:bg-ethiopian-earth transition-colors inline-flex items-center space-x-2"
              >
                <PlusCircle className="w-5 h-5" />
                <span>Add Your First Product</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map(product => (
              <div key={product._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
                {/* Product Image */}
                <div className="relative h-40 sm:h-44 bg-gray-200">
                  <img
                    src={
                      getImageUrl(product.images?.[0]?.url) ||
                      '/images/gondar_drass1.jpg'
                    }
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-0.5 bg-white/50 backdrop-blur-sm border rounded-full text-[10px] font-bold shadow-sm uppercase tracking-wider
                      ${product.status === 'active' ? 'border-emerald-500 text-emerald-600' :
                        product.status === 'draft' ? 'border-yellow-500 text-yellow-600' : 'border-gray-500 text-gray-600'}`}>
                      {product.status}
                    </span>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="text-lg font-bold font-['Playfair_Display',serif] text-gray-900 mb-1 line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                    {product.description}
                  </p>

                  <div className="flex items-center justify-between mb-3 border-b border-gray-50 pb-3">
                    <span className="text-xl font-bold text-gray-900 font-['Inter',sans-serif]">
                      {formatCurrency(product.price)}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${(product.inventory?.quantity || 0) < 5
                      ? 'border-red-500 text-red-600 bg-red-50'
                      : (product.inventory?.quantity || 0) <= 15
                        ? 'border-orange-400 text-orange-500 bg-orange-50'
                        : 'border-emerald-500 text-emerald-600 bg-emerald-50'
                      }`}>
                      Stock: {product.inventory?.quantity || 0}
                    </span>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-4 font-bold">
                    <div className="flex items-center space-x-1">
                      <Eye className="w-4 h-4 text-gray-300" />
                      <span>{product.metrics?.views || 0}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>❤️</span>
                      <span>{product.metrics?.likes || 0}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-ethiopian-gold">★</span>
                      <span>{product.metrics?.purchases || 0}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-3 gap-1 mt-auto">
                    <Link
                      to={`/products/${product.slug || product._id}`}
                      className="flex items-center justify-center space-x-1 px-2 py-2 bg-ethiopian-gold/10 text-ethiopian-gold rounded-md hover:bg-ethiopian-gold hover:text-white transition-colors border border-ethiopian-gold/20 shadow-sm"
                      title="View Public Listing"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold">View</span>
                    </Link>
                    <button
                      onClick={() => handleEdit(product._id)}
                      className="flex items-center justify-center space-x-1 px-2 py-2 bg-gray-50 text-gray-600 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors border border-gray-100 shadow-sm"
                      title="Edit Product"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold">Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(product._id)}
                      disabled={deletingProduct === product._id}
                      className="flex items-center justify-center space-x-1 px-2 py-2 bg-white text-gray-400 rounded-md hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors border border-gray-100 shadow-sm disabled:opacity-50"
                      title="Delete Product"
                    >
                      {deletingProduct === product._id ? (
                        <LoadingSpinner size="small" />
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold">Delete</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Created Date */}
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    Created: {formatDate(product.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyProducts;
