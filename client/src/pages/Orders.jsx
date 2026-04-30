/**
 * My Orders Page for EthioCraft Global
 * 
 * Displays user's order history with details
 */

import { useState, useEffect } from 'react';
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
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

const Orders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  // Socket.io Real-time Connection for Customer
  useEffect(() => {
    if (!user?._id) return;
    const socketUrl = API_BASE_URL.replace('/api', '');
    const newSocket = io(socketUrl, {
      withCredentials: true,
      transports: ['polling', 'websocket']
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
            product: co.product, // This is optional based on custom request
            quantity: 1,
            title: `${co.gender} ${co.itemType} (Custom)`
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
      if (allOrders.length === 0 && (normalOrders.length === 0 && customOrders.length === 0)) {
         // Optionally toast if completely failed, but silently recovering is better for 500s.
      }
    } catch (error) {
      console.error('Error in fetching process:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'shipped':
      case 'shipping':
        return <Truck className="w-5 h-5 text-blue-600" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
      case 'processing':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'unpaid':
        return <DollarSign className="w-5 h-5 text-red-500" />;
      default:
        return <Package className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'shipped':
      case 'shipping':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
      case 'processing':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'unpaid':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status?.toLowerCase() === filter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">My Orders</h1>
          <p className="text-gray-600">View and track your order history</p>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === status
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {/* Orders List - Table Format */}
        {filteredOrders.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Order Info</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Image</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Product</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Total Price</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${getStatusColor(order.status).split(' ')[0]}`}>
                            {getStatusIcon(order.status)}
                          </div>
                          <div>
                            <div className="text-sm font-black text-gray-900">
                              #{order.orderNumber || order._id?.slice(-8)}
                              {order.isCustom && <span className="ml-2 text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-black uppercase">Custom</span>}
                            </div>
                            <div className="text-xs text-gray-400 font-medium">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center">
                          {(order.isCustom && order.photos?.front) || order.items?.[0]?.product?.images?.[0] ? (
                            <img 
                              src={getFileUrl(
                                order.isCustom && order.photos?.front 
                                  ? order.photos.front 
                                  : (typeof order.items?.[0]?.product?.images?.[0] === 'string' 
                                      ? order.items[0].product.images[0] 
                                      : order.items?.[0]?.product?.images?.[0]?.url)
                              )} 
                              alt="Product" 
                              className="w-12 h-12 rounded-xl object-cover border border-gray-100 shadow-sm"
                              crossOrigin="anonymous"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-[10px] text-gray-400 font-bold uppercase text-center px-1">
                              {order.isCustom ? 'Custom Design' : 'No Photo'}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-bold text-gray-900 group-hover:text-amber-600 transition-colors">
                          {order.isCustom ? 'Special Clothing Design' : (order.items?.[0]?.product?.name || 'Product')}
                          {order.items?.length > 1 && <span className="text-gray-400 ml-1 font-medium">+{order.items.length - 1} more</span>}
                        </div>
                        {order.isCustom && <div className="text-[10px] text-gray-400 font-medium">Custom tailored request</div>}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm font-black text-gray-900">
                          {order.totals?.total?.toFixed(2) || '0.00'} ETB
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                          getStatusColor(order.status)
                        }`}>
                          {order.status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/orders/${order._id}`)}
                            title="View Details"
                            className="p-2 text-gray-400 hover:text-ethiopian-gold hover:bg-amber-50 rounded-lg transition-all"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          
                          <button
                            onClick={() => navigate('/orders/track', { state: { orderId: order._id } })}
                            title="Track Order"
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Truck className="w-5 h-5" />
                          </button>

                          {order.isCustom && (order.status === 'price_quoted' || order.status === 'accepted') && order.totals?.total > 0 && (
                            <button
                              onClick={() => navigate('/checkout', { state: { customOrder: order } })}
                              className="ml-2 px-4 py-2 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-lg shadow-gray-200"
                            >
                              Pay Now
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <ShoppingBag className="w-24 h-24 text-gray-300 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              {filter === 'all' ? 'No orders yet' : `No ${filter} orders`}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all' 
                ? "Start shopping to see your orders here"
                : `You don't have any ${filter} orders at the moment`
              }
            </p>
            <button
              onClick={() => navigate('/products')}
              className="px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg font-semibold"
            >
              Start Shopping
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
