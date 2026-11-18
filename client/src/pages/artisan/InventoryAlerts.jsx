/**
 * Professional Inventory Management & Low Stock Alert System for EthioCraft Global
 * Enhanced with Times New Roman 12px, compact mobile-friendly cards,
 * Amharic-first labels, and live order-sync to track decremented stock in real time.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  AlertTriangle,
  Package,
  TrendingUp,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Edit2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getFileUrl } from '../../utils/getFileUrl';
import { formatOrderDateTime } from '../../utils/dateUtils';
import { useCustomTranslation } from '../../hooks/useCustomTranslation';

const InventoryAlerts = ({ insideDashboard = false, onSelectTab }) => {
  const { t, currentLanguage } = useCustomTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, out, low
  const [updatingStock, setUpdatingStock] = useState(null);
  const [stockHistory, setStockHistory] = useState([]);
  const [restockModal, setRestockModal] = useState(null);
  const [restockAmount, setRestockAmount] = useState('10');
  const [restockMode, setRestockMode] = useState('add'); // 'add' or 'set'

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const userId = String(user?._id || user?.id || '');
      let myProducts = [];

      if (userId) {
        try {
          const res = await api.get(`/products/artisan/${userId}?includeOutOfStock=true&includeAll=true`);
          myProducts = res.data?.products || res.data?.data || [];
        } catch (apiErr) {
          console.warn('Dedicated artisan route fallback, trying general listing:', apiErr.message);
          const fallbackRes = await api.get('/products?includeOutOfStock=true&limit=50');
          const allProducts = fallbackRes.data?.products || [];
          myProducts = allProducts.filter(p => {
            const artId = String(p.artisan?._id || p.artisan?.id || p.artisan || '');
            return artId === userId;
          });
        }
      } else {
        const fallbackRes = await api.get('/products?includeOutOfStock=true&limit=50');
        myProducts = fallbackRes.data?.products || [];
      }

      setProducts(myProducts);
    } catch (error) {
      console.error('Error fetching inventory products:', error);
      toast.error('ምርቶችን ማግኘት አልተቻለም (Failed to load inventory)');
    } finally {
      setLoading(false);
    }
  }, [user?._id, user?.id]);

  useEffect(() => {
    fetchProducts();
    // Default stock history items
    setStockHistory([
      {
        id: 1,
        productName: 'Wollo Traditional Dress',
        action: 'Added',
        quantity: 10,
        date: new Date(Date.now() - 36 * 60 * 60 * 1000)
      },
      {
        id: 2,
        productName: 'Handwoven Basket (Mesob)',
        action: 'Sold',
        quantity: 2,
        date: new Date(Date.now() - 12 * 60 * 60 * 1000)
      }
    ]);

    // Live update when a new order decrements stock
    const handleLiveOrder = () => {
      console.log('🔄 [InventoryAlerts] Real-time order received, refreshing stock counts...');
      fetchProducts();
    };
    window.addEventListener('artisanNewOrder', handleLiveOrder);
    return () => {
      window.removeEventListener('artisanNewOrder', handleLiveOrder);
    };
  }, [fetchProducts]);

  const updateStock = async (productId, amount, mode = restockMode) => {
    try {
      setUpdatingStock(productId);
      const num = parseInt(amount, 10);
      if (isNaN(num) || (mode === 'add' && num <= 0) || (mode === 'set' && num < 0)) {
        toast.error('ትክክለኛ ቁጥር ያስገቡ (Enter a valid quantity)');
        return;
      }

      let response;
      if (mode === 'set') {
        response = await api.patch(`/products/${productId}/set-stock`, { stock: num });
      } else {
        response = await api.patch(`/products/${productId}/restock`, { amount: num });
      }

      const newQty = response.data?.newQuantity !== undefined ? response.data.newQuantity : num;

      // Optimistically update products state immediately
      setProducts(prev => prev.map(p => {
        const pid = String(p._id || p.id || '');
        if (pid === String(productId)) {
          return {
            ...p,
            inventory: { ...(p.inventory || {}), quantity: newQty },
            status: newQty > 0 ? 'active' : 'out_of_stock'
          };
        }
        return p;
      }));

      // Add to local audit history
      setStockHistory(prev => [
        {
          id: Date.now(),
          productName: restockModal?.productName || 'Product',
          action: mode === 'set' ? 'Set Total to' : 'Added',
          quantity: mode === 'set' ? newQty : num,
          date: new Date()
        },
        ...prev
      ]);

      toast.success(`ክምችት በተሳካ ሁኔታ ተስተካክሏል: ${newQty} units!`);
      setRestockModal(null);
      setRestockAmount('10');
      fetchProducts();
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error(error.response?.data?.message || 'ክምችት ማስተካከል አልተቻለም');
    } finally {
      setUpdatingStock(null);
    }
  };

  const quickRestock = (productId, productName, currentStock, defaultMode = 'add') => {
    setRestockMode(defaultMode);
    setRestockAmount(defaultMode === 'set' ? String(currentStock || 10) : '10');
    setRestockModal({ productId, productName, currentStock });
  };

  // Threshold calculations:
  // Out of stock: quantity <= 0
  // Low stock alert: quantity > 0 && quantity <= 5
  // In stock: quantity > 5
  const outOfStock = products.filter(p => (Number(p.inventory?.quantity) || 0) <= 0);
  const lowStock = products.filter(p => {
    const q = Number(p.inventory?.quantity) || 0;
    return q > 0 && q <= 5;
  });
  const inStock = products.filter(p => (Number(p.inventory?.quantity) || 0) > 5);

  const filteredProducts = products.filter(p => {
    const q = Number(p.inventory?.quantity) || 0;
    if (filter === 'out') return q <= 0;
    if (filter === 'low') return q > 0 && q <= 5;
    return true;
  }).sort((a, b) => (Number(a.inventory?.quantity) || 0) - (Number(b.inventory?.quantity) || 0));

  const getStockBadge = (quantity) => {
    const q = Number(quantity) || 0;
    if (q <= 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
          <XCircle className="w-3 h-3 text-red-500" />
          ያለቀ (Out of Stock)
        </span>
      );
    } else if (q <= 5) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
          <AlertTriangle className="w-3 h-3 text-amber-500" />
          ዝቅተኛ ክምችት (Low Stock: {q})
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
          <CheckCircle className="w-3 h-3 text-green-600" />
          In Stock ({q})
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center p-8">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className={`font-['Times_New_Roman',_Times,_serif,_'Noto_Sans_Ethiopic'] text-xs text-gray-800 ${insideDashboard ? "pb-6" : "min-h-screen bg-gray-50 py-6"}`}>
      <div className={insideDashboard ? "w-full" : "max-w-7xl mx-auto px-3 sm:px-6 lg:px-8"}>
        
        {/* Header */}
        <div className="mb-4">
          {!insideDashboard && (
            <button
              onClick={() => navigate('/artisan/dashboard')}
              className="inline-flex items-center gap-1 text-ethiopian-gold hover:text-amber-700 text-xs font-semibold mb-2 transition-colors"
            >
              ← ወደ ዳሽቦርድ ተመለስ (Back to Dashboard)
            </button>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <Package className="w-4 h-4 text-ethiopian-gold" />
                የክምችት ሁኔታ እና ማንቂያዎች (Inventory Alerts)
              </h1>
              <p className="text-[11px] text-gray-500 mt-0.5">
                የምርቶችዎን ክምችት ይከታተሉ፤ ትዕዛዝ ሲገባ ወዲያውኑ ይቀንሳል፤ ክምችት እንዳያልቅ በወቅቱ ይሙሉ::
              </p>
            </div>
            <button
              onClick={() => navigate('/artisan/products')}
              className="inline-flex items-center justify-center gap-1.5 self-start sm:self-auto rounded-lg bg-ethiopian-gold text-white px-3 py-1.5 text-xs font-bold hover:bg-amber-600 transition-colors shadow-2xs"
            >
              <Package className="w-3.5 h-3.5" />
              ምርቶችን አስተዳድር (Manage)
            </button>
          </div>
        </div>

        {/* Low Stock / Out of Stock Banner */}
        {(lowStock.length > 0 || outOfStock.length > 0) && (
          <div className="bg-amber-50 border-l-3 border-amber-500 p-2.5 mb-4 rounded-r-lg shadow-2xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <div className="text-[11px] text-amber-900">
              <span className="font-bold">የክምችት ማንቂያ (Low Stock Alert):</span>{' '}
              {lowStock.length > 0 && `${lowStock.length} ምርት ከ 5 ወይም ከዚያ በታች ደርሷል:: `}
              {outOfStock.length > 0 && `${outOfStock.length} ምርት ክምችቱ ሙሉ በሙሉ አልቋል:: `}
              እባክዎ ሽያጭ እንዳያመልጥዎ አሁን ይሙሉ::
            </div>
          </div>
        )}

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
          {/* Total Products */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-3 transition hover:shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">TOTAL PRODUCTS</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{products.length}</p>
                <p className="text-[10px] text-gray-400">ጠቅላላ ምርቶች</p>
              </div>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Package className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* In Stock */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-3 transition hover:shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">IN STOCK</p>
                <p className="text-xl font-bold text-green-600 mt-1">{inStock.length}</p>
                <p className="text-[10px] text-gray-400">በክምችት ያለ</p>
              </div>
              <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Low Stock */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-3 transition hover:shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">LOW STOCK</p>
                <p className="text-xl font-bold text-amber-600 mt-1">{lowStock.length}</p>
                <p className="text-[10px] text-gray-400">ዝቅተኛ ክምችት</p>
              </div>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Critical Stock */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-3 transition hover:shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">CRITICAL STOCK</p>
                <p className="text-xl font-bold text-red-600 mt-1">{outOfStock.length}</p>
                <p className="text-[10px] text-gray-400">ያለቀ / አስጊ</p>
              </div>
              <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-2xs mb-3 overflow-hidden">
          <div className="flex px-2 py-1 gap-1 border-b border-gray-100 overflow-x-auto">
            {[
              { key: 'all', label: 'All Products (ሁሉም)', count: products.length },
              { key: 'low', label: 'Low Stock (ዝቅተኛ ክምችት ≤ 5)', count: lowStock.length },
              { key: 'out', label: 'Out of Stock (ያለቀ ክምችት)', count: outOfStock.length }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  filter === tab.key
                    ? 'bg-ethiopian-gold/10 text-ethiopian-gold border border-ethiopian-gold/20'
                    : 'text-gray-600 hover:bg-gray-50 border border-transparent'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  filter === tab.key ? 'bg-ethiopian-gold text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Products List & Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-2xs overflow-hidden">
          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700">ምንም ምርት አልተገኘም (No Products Found)</p>
              <p className="text-[11px] text-gray-500 mt-1">
                {filter === 'all' ? 'ምርት በማከል ክምችት መከታተል ይጀምሩ::' : `በ "${filter}" ሁኔታ ውስጥ ምንም ምርት የለም::`}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile View (< 768px): Compact Cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {filteredProducts.map((product) => {
                  const imgUrl = product.images?.[0]
                    ? getFileUrl(typeof product.images[0] === 'string' ? product.images[0] : product.images[0]?.url)
                    : '/placeholder-product.svg';
                  const currentStock = product.inventory?.quantity || 0;

                  return (
                    <div key={product._id} className="p-2.5 hover:bg-gray-50/50 transition">
                      <div className="flex items-start gap-2.5">
                        <img
                          src={imgUrl}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover bg-gray-100 border border-gray-200 flex-shrink-0"
                          crossOrigin="anonymous"
                          onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-product.svg'; }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-xs font-bold text-gray-900 line-clamp-1">{product.name}</p>
                            {getStockBadge(currentStock)}
                          </div>
                          <p className="text-[10px] text-gray-500 mt-0.5 truncate">{product.category || 'Textiles'}</p>
                          
                          <div className="flex items-center justify-between mt-1 text-[11px]">
                            <div className="flex items-center gap-3">
                              <span>ያለ ክምችት: <strong className="text-gray-900">{currentStock}</strong> pcs</span>
                              <span className="text-gray-400">|</span>
                              <span>የተሸጠ: <strong className="text-gray-900">{product.metrics?.purchases || 0}</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => quickRestock(product._id, product.name, currentStock)}
                              disabled={updatingStock === product._id}
                              className="px-2.5 py-1 rounded bg-green-600 text-white font-bold text-[10px] hover:bg-green-700 transition disabled:opacity-50"
                            >
                              + ክምችት ሙላ (Restock)
                            </button>
                            <button
                              onClick={() => navigate(`/artisan/edit-product/${product._id}`)}
                              className="px-2.5 py-1 rounded border border-gray-200 bg-white text-gray-700 font-semibold text-[10px] hover:bg-gray-50 transition"
                            >
                              አስተካክል (Edit)
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop View (>= 768px): Compact Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-xs">
                  <thead className="bg-gray-50/75">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">
                        PRODUCT (ምርት)
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">
                        CURRENT STOCK (ያለ ክምችት)
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">
                        STATUS (ሁኔታ)
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">
                        TOTAL SALES (የተሸጠ)
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">
                        ACTIONS (እርምጃዎች)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredProducts.map((product) => {
                      const imgUrl = product.images?.[0]
                        ? getFileUrl(typeof product.images[0] === 'string' ? product.images[0] : product.images[0]?.url)
                        : '/placeholder-product.svg';
                      const currentStock = product.inventory?.quantity || 0;

                      return (
                        <tr key={product._id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={imgUrl}
                                alt={product.name}
                                className="w-9 h-9 rounded-lg object-cover bg-gray-100 border border-gray-200 flex-shrink-0"
                                crossOrigin="anonymous"
                                onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-product.svg'; }}
                              />
                              <div className="min-w-0">
                                <p className="font-bold text-gray-900 truncate max-w-[220px]">{product.name}</p>
                                <p className="text-[10px] text-gray-500 truncate">{product.category || 'Handicrafts'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => quickRestock(product._id, product.name, currentStock, 'set')}
                              className="group inline-flex items-center gap-1 cursor-pointer hover:bg-amber-50 px-1.5 py-0.5 rounded transition"
                              title="Click to edit or adjust stock"
                            >
                              <span className="text-sm font-bold text-gray-900 group-hover:text-amber-700">{currentStock}</span>
                              <span className="text-[10px] text-gray-500 ml-0.5">units</span>
                              <Edit2 className="w-2.5 h-2.5 text-gray-400 group-hover:text-amber-600 opacity-60 group-hover:opacity-100" />
                            </button>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {getStockBadge(currentStock)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                            {product.metrics?.purchases || 0} units
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => quickRestock(product._id, product.name, currentStock)}
                                disabled={updatingStock === product._id}
                                className="rounded px-2.5 py-1 text-[11px] font-bold bg-green-600 text-white hover:bg-green-700 transition shadow-2xs disabled:opacity-50"
                              >
                                {updatingStock === product._id ? 'Updating...' : 'Quick Restock'}
                              </button>
                              <button
                                onClick={() => navigate(`/artisan/edit-product/${product._id}`)}
                                className="rounded px-2.5 py-1 text-[11px] font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition shadow-2xs"
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Recent Stock Adjustments */}
        {stockHistory.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-3 mt-4">
            <h3 className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              የቅርብ ጊዜ የክምችት ለውጦች (Recent Stock Adjustments)
            </h3>
            <div className="divide-y divide-gray-50">
              {stockHistory.map((entry) => (
                <div key={entry.id} className="py-1.5 flex items-center justify-between text-[11px]">
                  <div>
                    <span className="font-semibold text-gray-800">{entry.action} {entry.quantity} units</span>
                    <span className="text-gray-500"> — {entry.productName}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {formatOrderDateTime(entry.date, currentLanguage).full}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Restock / Set Stock Modal */}
      {restockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 backdrop-blur-2xs">
          <div className="bg-white rounded-xl shadow-lg p-4 w-full max-w-sm border border-gray-100">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-sm font-bold text-gray-900">
                {restockMode === 'set' ? 'ጠቅላላ ክምችት ቀይር (Set Stock)' : 'ክምችት ጨምር (Add Stock)'}
              </h3>
              <span className="text-[10px] text-gray-400">ያለ ክምችት: <strong>{restockModal.currentStock}</strong></span>
            </div>
            <p className="text-[11px] text-gray-600 mb-2 truncate">
              {restockModal.productName}
            </p>

            {/* Mode Switcher Tabs */}
            <div className="flex rounded-lg bg-gray-100 p-0.5 mb-3 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => {
                  setRestockMode('add');
                  setRestockAmount('10');
                }}
                className={`flex-1 py-1 rounded-md transition ${restockMode === 'add' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-gray-600 hover:text-gray-900'}`}
              >
                + ብዛት ጨምር (Add)
              </button>
              <button
                type="button"
                onClick={() => {
                  setRestockMode('set');
                  setRestockAmount(String(restockModal.currentStock || 0));
                }}
                className={`flex-1 py-1 rounded-md transition ${restockMode === 'set' ? 'bg-white text-amber-800 shadow-2xs' : 'text-gray-600 hover:text-gray-900'}`}
              >
                ✏️ አዲስ ክምችት አስቀምጥ (Set)
              </button>
            </div>
            
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {restockMode === 'set' ? 'አዲሱ ጠቅላላ የክምችት ብዛት (New Total Stock Quantity)' : 'የሚጨመረው ብዛት (Quantity to Add)'}
            </label>
            <input
              type="number"
              min={restockMode === 'set' ? "0" : "1"}
              value={restockAmount}
              onChange={e => setRestockAmount(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-ethiopian-gold mb-2.5"
              autoFocus
            />

            {/* Quick Presets */}
            <div className="flex gap-1.5 mb-3">
              {(restockMode === 'set' ? [0, 5, 10, 20, 50] : [5, 10, 20, 50]).map(qty => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => setRestockAmount(String(qty))}
                  className="flex-1 py-1 rounded bg-gray-100 hover:bg-gray-200 text-[10px] font-bold text-gray-700 transition"
                >
                  {restockMode === 'set' ? qty : `+${qty}`}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setRestockModal(null); setRestockAmount('10'); }}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                ተመለስ (Cancel)
              </button>
              <button
                onClick={() => updateStock(restockModal.productId, restockAmount, restockMode)}
                disabled={
                  restockAmount === '' ||
                  isNaN(restockAmount) ||
                  (restockMode === 'add' && parseInt(restockAmount, 10) <= 0) ||
                  (restockMode === 'set' && parseInt(restockAmount, 10) < 0) ||
                  updatingStock === restockModal.productId
                }
                className="flex-1 rounded-lg bg-ethiopian-gold px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600 transition disabled:opacity-50"
              >
                {updatingStock === restockModal.productId ? 'በማስገባት ላይ...' : 'አረጋግጥ (Confirm)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryAlerts;
