/**
 * My Orders Page for EthioCraft Global
 * 
 * Displays customer's order history with real-time updates and mobile-first responsive design.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import io from 'socket.io-client';
import { API_BASE_URL } from '../config/api';
import { playNotificationSound } from '../utils/soundUtils';
import { getFileUrl } from '../utils/getFileUrl';
import { 
  Package, 
  Calendar, 
  DollarSign, 
  Eye, 
  ArrowLeft, 
  ShoppingBag, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatOrderDateTime } from '../utils/dateUtils';
import { useCustomTranslation } from '../hooks/useCustomTranslation';

const Orders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, currentLanguage } = useCustomTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  // Socket.io Real-time Connection for Customer
  useEffect(() => {
    if (!user?._id) return;
    if (typeof window === 'undefined') return;
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) return;

    const socketUrl = API_BASE_URL.replace(/\/api\/?$/, '');
    const newSocket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket'],
      reconnectionAttempts: 2,
      timeout: 5000
    });

    newSocket.on('connect', () => {
      newSocket.emit('join', user._id);
    });

    newSocket.on('customOrderPriceQuoted', (data) => {
      playNotificationSound();
      toast.success('✨ New price quote received for your custom design!', {
        duration: 8000,
        icon: '💰',
        style: { border: '2px solid #b87b2e', padding: '16px', fontWeight: 'bold' }
      });
      fetchOrders();
    });

    newSocket.on('orderStatusUpdated', (data) => {
      playNotificationSound();
      toast.success(`📦 Order #${data.orderNumber} status updated to ${data.status}`);
      fetchOrders();
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user?._id]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Fetch normal orders
      let normalOrders = [];
      try {
        const response = await api.get('/orders');
        normalOrders = response.data.orders || [];
      } catch (err) {
        console.error('Normal orders fetch failed:', err);
      }

      // Fetch custom orders
      let customOrders = [];
      try {
        const customRes = await api.get('/custom-orders');
        const rawCustom = customRes.data.orders || [];
        
        // Format CustomOrders to look like standard Orders for the UI
        customOrders = rawCustom.map(co => ({
          ...co,
          isCustom: true,
          orderNumber: `CUST-${co._id.slice(-6).toUpperCase()}`,
          items: [{
            product: co.product,
            quantity: 1,
            title: `${co.gender || ''} ${co.itemType || 'Custom Design'}`.trim()
          }],
          totals: {
            total: co.price || 0 
          }
        }));
      } catch (err) {
        console.error('Custom orders fetch failed:', err);
      }

      // Merge and filter out duplicates (don't show CustomOrder request if official shadow Order exists)
      const officialCustomOrderIds = new Set(
        normalOrders
          .filter(o => o.items && o.items[0]?.customOrderId)
          .map(o => o.items[0].customOrderId.toString())
      );

      const uniqueCustomOrders = customOrders.filter(co => !officialCustomOrderIds.has(co._id.toString()));

      const allOrders = [...normalOrders, ...uniqueCustomOrders].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );

      setOrders(allOrders);
    } catch (error) {
      console.error('Error in fetching process:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusAmharic = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'ደርሷል';
      case 'shipped':
      case 'shipping':
        return 'በመንገድ ላይ';
      case 'cancelled':
        return 'ተሰርዟል';
      case 'pending':
        return 'በመጠባበቅ ላይ';
      case 'processing':
        return 'በመስራት ላይ';
      case 'price_quoted':
        return 'ዋጋ ተቆርጧል';
      case 'accepted':
        return 'ተቀባይነት አግኝቷል';
      case 'completed':
        return 'ተጠናቋል';
      case 'unpaid':
        return 'ያልተከፈለ';
      default:
        return status || 'Pending';
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'shipped':
      case 'shipping':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'cancelled':
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'processing':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'price_quoted':
      case 'accepted':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'unpaid':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
      case 'completed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'shipped':
      case 'shipping':
        return <Truck className="w-3.5 h-3.5 text-blue-600" />;
      case 'cancelled':
      case 'rejected':
        return <XCircle className="w-3.5 h-3.5 text-red-600" />;
      case 'pending':
      case 'processing':
        return <Clock className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <Package className="w-3.5 h-3.5 text-gray-600" />;
    }
  };

  const filterTabs = [
    { id: 'all', label: 'ሁሉም', en: 'All' },
    { id: 'pending', label: 'በመጠባበቅ ላይ', en: 'Pending' },
    { id: 'processing', label: 'በመስራት ላይ', en: 'Processing' },
    { id: 'shipped', label: 'በመንገድ ላይ', en: 'Shipped' },
    { id: 'delivered', label: 'የደረሱ', en: 'Delivered' },
    { id: 'cancelled', label: 'የተሰረዙ', en: 'Cancelled' }
  ];

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (filter === 'all') return true;
      const s = order.status?.toLowerCase();
      if (filter === 'delivered') return s === 'delivered' || s === 'completed';
      return s === filter;
    });
  }, [orders, filter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-xs font-semibold text-gray-500">ትዕዛዞች በመጫን ላይ ናቸው...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 pt-3 sm:py-8">
      <div className="container mx-auto px-3.5 sm:px-6 max-w-5xl">
        
        {/* Top Navigation & Title Bar */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors py-1.5 px-3 rounded-xl shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-gray-500" />
              <span>ተመለስ (Back)</span>
            </button>
            <button
              onClick={fetchOrders}
              title="አድስ (Refresh)"
              className="p-1.5 text-gray-500 hover:text-gray-900 bg-white border border-gray-200 rounded-xl shadow-2xs hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-lg sm:text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                <span>የትዕዛዝ ታሪክ</span>
                <span className="text-xs font-normal text-gray-400 font-mono">/ My Orders</span>
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">ያዘዟቸውን እቃዎችና ብጁ ዲዛይኖች ሁኔታ እዚህ ይከታተሉ</p>
            </div>
            
            <button
              onClick={() => navigate('/custom-order')}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors w-full sm:w-auto"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>አዲስ ብጁ ዲዛይን እዘዝ</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs - Smooth Horizontal Scroll without collapsing */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
            {filterTabs.map((tab) => {
              const count = tab.id === 'all'
                ? orders.length
                : orders.filter(o => {
                    const s = o.status?.toLowerCase();
                    if (tab.id === 'delivered') return s === 'delivered' || s === 'completed';
                    return s === tab.id;
                  }).length;

              const isActive = filter === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-gray-900 text-white shadow-xs font-bold'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Orders Content */}
        {filteredOrders.length > 0 ? (
          <div>
            {/* Mobile View: High-Quality Compact Cards (block md:hidden) */}
            <div className="block md:hidden space-y-3">
              {filteredOrders.map((order) => {
                const isCustom = order.isCustom;
                const photoSrc = isCustom && order.photos?.front 
                  ? order.photos.front 
                  : (order.items?.[0]?.product?.images?.[0] 
                      ? (typeof order.items[0].product.images[0] === 'string' 
                          ? order.items[0].product.images[0] 
                          : order.items[0].product.images[0]?.url)
                      : order.items?.[0]?.image);

                const itemTitle = isCustom
                  ? (order.gender ? `${order.gender} ${order.itemType || 'ብጁ ዲዛይን'}` : 'ብጁ የልብስ ዲዛይን')
                  : (order.items?.[0]?.product?.name || order.items?.[0]?.title || 'የእጅ ጥበብ ውጤት');

                const totalFormatted = order.totals?.total 
                  ? `${order.totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`
                  : (isCustom ? 'ዋጋ በመገመት ላይ...' : '0.00 ETB');

                return (
                  <div 
                    key={order._id} 
                    className="bg-white rounded-2xl border border-gray-200 shadow-2xs hover:shadow-xs transition-shadow p-3.5"
                  >
                    {/* Top Row: Order ID + Status */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-gray-100">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[11px] font-bold text-gray-900 font-mono">
                          #{order.orderNumber || order._id?.slice(-8).toUpperCase()}
                        </span>
                        {isCustom && (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[8px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            ✨ ብጁ
                          </span>
                        )}
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-semibold border whitespace-nowrap ${getStatusBadgeStyle(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span>{getStatusAmharic(order.status)}</span>
                      </span>
                    </div>

                    {/* Middle Section: Thumbnail + Item Details + Price */}
                    <div className="flex items-center gap-3 py-3">
                      {/* Thumbnail */}
                      <div className="shrink-0 relative">
                        {photoSrc ? (
                          <img 
                            src={getFileUrl(photoSrc)} 
                            alt={itemTitle} 
                            className="w-14 h-14 rounded-xl object-cover border border-gray-200 bg-gray-50 shadow-2xs"
                            crossOrigin="anonymous"
                            onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-product.svg'; }}
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-200 flex flex-col items-center justify-center text-center p-1">
                            <Package className="w-5 h-5 text-gray-400 mb-0.5" />
                            <span className="text-[8px] font-bold text-gray-500 leading-tight">
                              {isCustom ? 'ብጁ ዲዛይን' : 'ምርት'}
                            </span>
                          </div>
                        )}
                        {order.items?.length > 1 && (
                          <span className="absolute -bottom-1 -right-1 bg-gray-900 text-white text-[8px] font-bold px-1.5 py-0.2 rounded-full">
                            +{order.items.length - 1}
                          </span>
                        )}
                      </div>

                      {/* Info & Price */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-bold text-gray-900 truncate leading-snug">
                          {itemTitle}
                        </h3>

                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-500">
                          <span className="font-mono">
                            {order.createdAt ? formatOrderDateTime(order.createdAt, currentLanguage).date : 'N/A'}
                          </span>
                          {order.items?.[0]?.size && (
                            <>
                              <span>•</span>
                              <span className="uppercase font-medium bg-gray-100 px-1 py-0.2 rounded text-[8.5px] text-gray-600">
                                {order.items[0].size}
                              </span>
                            </>
                          )}
                        </div>

                        <div className="mt-1.5">
                          <span className={`text-xs font-bold font-mono ${order.totals?.total ? 'text-gray-900' : 'text-amber-700'}`}>
                            {totalFormatted}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Mobile Actions */}
                    <div className="flex items-center gap-2 pt-2.5 border-t border-gray-100">
                      <button
                        onClick={() => navigate(`/orders/${order._id}`)}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 text-[11px] font-semibold transition-colors shadow-2xs"
                      >
                        <Eye className="w-3 h-3 text-gray-500" />
                        <span>ዝርዝር እይ</span>
                      </button>
                      
                      <button
                        onClick={() => navigate('/orders/track', { state: { orderId: order._id } })}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 text-[11px] font-semibold transition-colors shadow-2xs"
                      >
                        <Truck className="w-3 h-3 text-gray-500" />
                        <span>ተከታተል</span>
                      </button>

                      {isCustom && (order.status === 'price_quoted' || order.status === 'accepted') && order.totals?.total > 0 && (
                        <button
                          onClick={() => navigate('/checkout', { state: { customOrder: order } })}
                          className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-[11px] font-bold rounded-xl shadow-xs transition-colors"
                        >
                          <DollarSign className="w-3 h-3" />
                          <span>ክፈሉ (Pay)</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View: Clean Table Format (hidden md:block) */}
            <div className="hidden md:block bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">የትዕዛዝ መለያ</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">ምስል</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">የምርት ዓይነት</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">ጠቅላላ ዋጋ</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">ሁኔታ</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">እርምጃዎች</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredOrders.map((order) => {
                      const isCustom = order.isCustom;
                      const photoSrc = isCustom && order.photos?.front 
                        ? order.photos.front 
                        : (order.items?.[0]?.product?.images?.[0] 
                            ? (typeof order.items[0].product.images[0] === 'string' 
                                ? order.items[0].product.images[0] 
                                : order.items[0].product.images[0]?.url)
                            : order.items?.[0]?.image);

                      const itemTitle = isCustom
                        ? (order.gender ? `${order.gender} ${order.itemType || 'ብጁ ዲዛይን'}` : 'ብጁ የልብስ ዲዛይን')
                        : (order.items?.[0]?.product?.name || order.items?.[0]?.title || 'የእጅ ጥበብ ውጤት');

                      return (
                        <tr key={order._id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-900 font-mono">
                                #{order.orderNumber || order._id?.slice(-8).toUpperCase()}
                              </span>
                              {isCustom && (
                                <span className="text-[8px] bg-amber-50 text-amber-800 border border-amber-200 px-1 py-0.2 rounded font-bold">
                                  ብጁ
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                              {order.createdAt ? formatOrderDateTime(order.createdAt, currentLanguage).date : 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {photoSrc ? (
                              <img 
                                src={getFileUrl(photoSrc)} 
                                alt={itemTitle} 
                                className="w-10 h-10 rounded-lg object-cover border border-gray-200 bg-gray-50"
                                crossOrigin="anonymous"
                                onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-product.svg'; }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-[8px] text-gray-400 font-bold uppercase text-center px-1">
                                {isCustom ? 'ብጁ' : 'ምስል የለም'}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs font-semibold text-gray-900 truncate max-w-[200px]">
                              {itemTitle}
                            </div>
                            {isCustom && <div className="text-[9.5px] text-amber-700 font-medium">በልክ የተዘጋጀ ልዩ ትዕዛዝ</div>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className={`text-xs font-bold font-mono ${order.totals?.total ? 'text-gray-900' : 'text-amber-700'}`}>
                              {order.totals?.total 
                                ? `${order.totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB` 
                                : (isCustom ? 'ዋጋ በመገመት ላይ...' : '0.00 ETB')}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-semibold border ${getStatusBadgeStyle(order.status)}`}>
                              {getStatusIcon(order.status)}
                              <span>{getStatusAmharic(order.status)}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => navigate(`/orders/${order._id}`)}
                                title="ዝርዝር እይ"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-[10px] font-medium transition-colors shadow-2xs"
                              >
                                <Eye className="w-3 h-3 text-gray-500" />
                                <span>ዝርዝር</span>
                              </button>
                              
                              <button
                                onClick={() => navigate('/orders/track', { state: { orderId: order._id } })}
                                title="ተከታተል"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-[10px] font-medium transition-colors shadow-2xs"
                              >
                                <Truck className="w-3 h-3 text-gray-500" />
                                <span>ተከታተል</span>
                              </button>

                              {isCustom && (order.status === 'price_quoted' || order.status === 'accepted') && order.totals?.total > 0 && (
                                <button
                                  onClick={() => navigate('/checkout', { state: { customOrder: order } })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded-lg shadow-xs transition-colors"
                                >
                                  <DollarSign className="w-3 h-3" />
                                  <span>ክፈሉ</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 text-center shadow-2xs">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1">
              {filter === 'all' ? 'ምንም ትዕዛዝ አልተገኘም' : 'በዚህ ሁኔታ ውስጥ ምንም ትዕዛዝ የለም'}
            </h3>
            <p className="text-xs text-gray-500 mb-4 max-w-sm mx-auto">
              {filter === 'all' 
                ? 'እስካሁን ያዘዙት ምርት የለም። ምርቶችን በመመልከት ይጀምሩ!'
                : 'በዚህ ምድብ ውስጥ የተመዘገበ ትዕዛዝ የለም።'}
            </p>
            <button
              onClick={() => navigate('/products')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              <span>ምርቶችን ይመልከቱ (Shop Now)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
