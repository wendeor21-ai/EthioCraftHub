/**
 * Professional Inventory Management & Low Stock Alert System
 * Prevents missed sales due to out-of-stock items
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  AlertTriangle,
  Package,
  TrendingUp,
  Edit,
  Plus,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const InventoryAlerts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, low, out
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [updatingStock, setUpdatingStock] = useState(null);
  const [stockHistory, setStockHistory] = useState([]);

  useEffect(() => {
    fetchProducts();
    fetchStockHistory();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/products');
      const allProducts = response.data.products || [];

      // Filter to only artisan's products
      const myProducts = allProducts.filter(p =>
        p.artisan?._id === user._id || p.artisan === user._id
      );

      setProducts(myProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchStockHistory = async () => {
    // Mock history for now - in production, this would come from a StockHistory model
    setStockHistory([
      {
        id: 1,
        productName: 'Wollo Dress',
        action: 'Added',
        quantity: 10,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: 2,
        productName: 'Handwoven Basket',
        action: 'Reduced',
        quantity: 5,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      }
    ]);
  };

  const updateStock = async (productId, currentStock, increment) => {
    try {
      setUpdatingStock(productId);
      const newStock = Math.max(0, currentStock + increment);

      await api.put(`/products/${productId}`, {
        inventory: {
          quantity: newStock,
          lowStockThreshold: lowStockThreshold
        },
        // Auto-toggle availability based on stock
        isAvailable: newStock > 0
      });

      toast.success(`Stock updated to ${newStock} units`);
      fetchProducts();
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Failed to update stock');
    } finally {
      setUpdatingStock(null);
    }
  };

  const quickRestock = async (productId, currentStock) => {
    const amount = window.prompt('Enter quantity to add:', '10');
    if (amount && !isNaN(amount)) {
      await updateStock(productId, currentStock, parseInt(amount));
    }
  };

  // Calculate stats using strict global thresholds
  const outOfStock = products.filter(p => p.inventory?.quantity < 5);
  const lowStock = products.filter(p =>
    p.inventory?.quantity >= 5 && p.inventory?.quantity <= 15
  );
  const inStock = products.filter(p => p.inventory?.quantity > 15);

  // Filter products using strict global thresholds
  const filteredProducts = products.filter(p => {
    if (filter === 'out') return p.inventory?.quantity < 5;
    if (filter === 'low') return p.inventory?.quantity >= 5 && p.inventory?.quantity <= 15;
    return true;
  }).sort((a, b) => (a.inventory?.quantity || 0) - (b.inventory?.quantity || 0));

  // Smart restock recommendations
  const restockRecommendations = filteredProducts
    .filter(p => p.inventory?.quantity <= 15)
    .sort((a, b) => {
      // Prioritize: out of stock > low stock > sales velocity
      if (a.inventory?.quantity === 0 && b.inventory?.quantity !== 0) return -1;
      if (a.inventory?.quantity !== 0 && b.inventory?.quantity === 0) return 1;
      return (b.metrics?.totalSales || 0) - (a.metrics?.totalSales || 0);
    })
    .slice(0, 5);

  const getStockBadge = (quantity) => {
    if (quantity < 5) {
      return (
        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          {quantity === 0 ? 'Out of Stock' : `Critical Stock (${quantity})`}
        </span>
      );
    } else if (quantity <= 15) {
      return (
        <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Limited Stock ({quantity})
        </span>
      );
    } else {
      return (
        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          In Stock ({quantity})
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/artisan/dashboard')}
            className="text-ethiopian-gold hover:text-ethiopian-earth mb-4"
          >
            ← Back to Dashboard
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Inventory Alerts</h1>
              <p className="text-gray-600 mt-2">Monitor stock levels and prevent missed sales</p>
            </div>
            <button
              onClick={() => navigate('/artisan/products')}
              className="bg-ethiopian-gold text-white px-6 py-3 rounded-lg hover:bg-ethiopian-earth transition-colors flex items-center gap-2"
            >
              <Package className="w-5 h-5" />
              Manage Products
            </button>
          </div>
        </div>

        {/* Critical Alerts Banner */}
        {outOfStock.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="w-6 h-6 text-red-500 mr-3" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900">
                  Critical: {outOfStock.length} Product{outOfStock.length !== 1 ? 's' : ''} with Critical Stock
                </h3>
                <p className="text-red-700 text-sm mt-1">
                  These products have less than 5 units left. Restock immediately to prevent lost sales.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{products.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Stock</p>
                <p className="text-2xl font-bold text-green-600 mt-2">{inStock.length}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-orange-600 mt-2">{lowStock.length}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Stock</p>
                <p className="text-2xl font-bold text-red-600 mt-2">{outOfStock.length}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Smart Restock Recommendations */}
        {restockRecommendations.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-ethiopian-gold" />
              Smart Restock Recommendations
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Based on sales data and current stock levels, prioritize restocking these items:
            </p>
            <div className="space-y-3">
              {restockRecommendations.map((product, index) => (
                <div key={product._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-ethiopian-gold text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-500">
                        Current: {product.inventory?.quantity || 0} units •
                        Sold: {product.metrics?.totalSales || 0} units
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => quickRestock(product._id, product.inventory?.quantity || 0)}
                    disabled={updatingStock === product._id}
                    className="px-4 py-2 bg-ethiopian-gold text-white rounded-lg hover:bg-ethiopian-earth transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Quick Restock
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { key: 'all', label: 'All Products', count: products.length },
                { key: 'out', label: 'Critical Stock', count: outOfStock.length },
                { key: 'low', label: 'Limited Stock', count: lowStock.length }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${filter === tab.key
                      ? 'border-ethiopian-gold text-ethiopian-gold'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  {tab.label}
                  <span className="ml-2 bg-gray-100 px-2 py-0.5 rounded-full text-xs">
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Products Found</h3>
              <p className="text-gray-600">
                {filter === 'all'
                  ? 'Add products to start tracking inventory'
                  : `No products in "${filter}" status`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Current Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total Sales
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <tr key={product._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {product.images?.[0] && (
                            <img
                              src={product.images[0].url}
                              alt={product.name}
                              className="h-10 w-10 rounded-lg object-cover mr-3"
                            />
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{product.name}</p>
                            <p className="text-xs text-gray-500">{product.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-2xl font-bold text-gray-900">
                          {product.inventory?.quantity || 0}
                        </p>
                        <p className="text-xs text-gray-500">units</p>
                      </td>
                      <td className="px-6 py-4">
                        {getStockBadge(product.inventory?.quantity || 0)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">
                          {product.metrics?.totalSales || 0} units
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => quickRestock(product._id, product.inventory?.quantity || 0)}
                            disabled={updatingStock === product._id}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1 text-sm"
                          >
                            <Plus className="w-4 h-4" />
                            Add Stock
                          </button>
                          <button
                            onClick={() => navigate(`/artisan/edit-product/${product._id}`)}
                            className="px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-1 text-sm"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stock History */}
        {stockHistory.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-600" />
              Recent Stock Adjustments
            </h3>
            <div className="space-y-3">
              {stockHistory.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {entry.action} {entry.quantity} units to {entry.productName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {entry.date.toLocaleDateString()} at {entry.date.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryAlerts;
