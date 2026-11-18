/**
 * Professional Order Management System for EthioCraft Global
 * 
 * Order Flow:
 * Path A: Pending → Confirmed → Processing → Shipped → Delivered → Completed
 * Path B: Pending → Rejected
 * 
 * UI: Modern, clean, responsive dashboard with enhanced action buttons
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import io from 'socket.io-client';
import api from '../../utils/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { API_BASE_URL } from '../../config/api';
import {
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
  EyeIcon,
  PrinterIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ShoppingBagIcon,
  CubeIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import TrackingModal from '../../components/orders/TrackingModal';
import OrderDetailModal from '../../components/orders/OrderDetailModal';
import DeleteConfirmModal from '../../components/orders/DeleteConfirmModal';
import { useCustomTranslation } from '../../hooks/useCustomTranslation';
import CustomOrderDetailModal from '../../components/orders/CustomOrderDetailModal';
import { SparklesIcon, Scissors } from 'lucide-react';
import { playNotificationSound, shouldNotifyForOrder } from '../../utils/soundUtils';
import { getFileUrl } from '../../utils/getFileUrl';
import { formatOrderDateTime } from '../../utils/dateUtils';

const formatEthiopianDateTime = (dateStr, lang = null) => {
  return formatOrderDateTime(dateStr, lang);
};

const ManageOrders = ({ insideDashboard = false, onSelectTab }) => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [customOrders, setCustomOrders] = useState([]);
  const [selectedCustomOrder, setSelectedCustomOrder] = useState(null);
  const [showCustomDetailModal, setShowCustomDetailModal] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [limit] = useState(10);
  const [summary, setSummary] = useState({
    all: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    completed: 0,
    totalEarnings: 0
  });
  const [socket, setSocket] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  // Track latest known order ID for polling-based new order detection
  const latestOrderIdRef = useRef(null);
  const isFirstPollRef = useRef(true);

  // Status badge styles
  const statusStyles = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    'pending verification': 'bg-orange-50 text-orange-700 border-orange-200',
    confirmed: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    processing: 'bg-blue-50 text-blue-700 border-blue-200',
    shipped: 'bg-purple-50 text-purple-700 border-purple-200',
    delivered: 'bg-green-50 text-green-700 border-green-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    cancelled: 'bg-gray-50 text-gray-700 border-gray-200',
    // Custom Order specific statuses
    accepted: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    price_quoted: 'bg-violet-50 text-violet-700 border-violet-200',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  const tabs = [
    { key: 'all', label: t('nav.all_orders', 'All Orders'), icon: ShoppingBagIcon },
    { key: 'pending', label: t('common.status_pending', 'Pending'), icon: ClockIcon },
    { key: 'custom', label: t('nav.custom_orders', '✨ Custom Orders (ብጁ ዲዛይኖች)'), icon: SparklesIcon },
    { key: 'processing', label: t('common.status_processing', 'Processing'), icon: CubeIcon },
    { key: 'shipped', label: t('common.status_shipped', 'Shipped'), icon: TruckIcon },
    { key: 'completed', label: t('common.status_completed', 'Completed'), icon: CheckCircleIcon },
  ];

  // Keep refs for live callbacks inside socket listener
  const filterRef = useRef(filter);
  const fetchOrdersRef = useRef(null);
  const fetchCustomOrdersRef = useRef(null);

  // Socket.io Real-time Connection (connected continuously for artisan)
  useEffect(() => {
    const userId = user?._id || user?.id;
    if (!userId) return;

    const socketUrl = API_BASE_URL.replace(/\/api\/?$/, '');
    const newSocket = io(socketUrl, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsSocketConnected(true);
      console.log('📡 [ManageOrders] Socket connected! Joining room for user:', userId);
      newSocket.emit('join', userId);
      if (user?._id && user?.id && user._id !== user.id) {
        newSocket.emit('join', user.id);
      }
    });

    newSocket.on('connect_error', () => setIsSocketConnected(false));
    newSocket.on('disconnect', () => setIsSocketConnected(false));

    const handleIncomingOrder = (data) => {
      if (!data) return;
      console.log('🔔 [ManageOrders] Incoming real-time order received:', data);

      const orderId = data.orderId || data.id || data._id;
      const orderNumber = data.orderNumber || (orderId ? `EC-${String(orderId).slice(-6)}` : `EC-${Date.now()}`);
      const orderKey = orderId || orderNumber;

      // 1. Format incoming order object and place it at the VERY TOP of the list
      const newOrderDoc = {
        _id: orderId,
        id: orderId,
        orderNumber,
        status: data.status || 'pending',
        createdAt: data.createdAt || new Date().toISOString(),
        totals: data.totals || { total: data.total || 0, subtotal: data.total || 0, artisanEarning: data.total || 0 },
        items: data.items || [],
        customer: data.customer || { profile: { firstName: 'Customer', lastName: '' } },
        shippingAddress: data.shippingAddress || {},
        payment: data.payment || { method: 'COD', status: 'pending' },
        ...data
      };

      setOrders(prev => {
        const withoutCurrent = prev.filter(o => {
          const matchNum = o.orderNumber && orderNumber && o.orderNumber === orderNumber;
          const matchId = (o._id || o.id) && orderId && (o._id || o.id) === orderId;
          return !matchNum && !matchId;
        });
        return [newOrderDoc, ...withoutCurrent];
      });

      // Switch to 'all' filter if current tab hides pending orders
      setFilter(curr => {
        if (curr !== 'all' && curr !== 'pending') return 'all';
        return curr;
      });

      // Increment pending badge counts in summary
      setSummary(prev => ({
        ...prev,
        all: (prev.all || 0) + 1,
        pending: (prev.pending || 0) + 1
      }));

      // Deduplicate so audio and toasts fire strictly ONCE across the entire app
      const isFresh = shouldNotifyForOrder(orderKey, 8000);
      if (isFresh) {
        // 2. Play warm harmonic chime
        playNotificationSound();

        // 3. Display prominent toast notification
        const totalAmount = data.total ? ` (${data.total} ETB)` : '';
        toast.success(`🛍️ አዲስ ትዕዛዝ #${orderNumber}${totalAmount}! New customer order received.`, {
          duration: 10000,
          icon: '🔔',
          style: {
            background: '#111827',
            color: '#f9fafb',
            border: '2px solid #f59e0b',
            borderRadius: '12px',
            padding: '14px',
            fontWeight: 'bold',
            fontSize: '13px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
          }
        });

        // 4. Browser system notification
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('🛍️ New Order on EthioCraft Global', {
              body: `Order #${orderNumber} has arrived! Check your orders.`,
              icon: '/favicon.ico'
            });
          } catch (_) { }
        }
      }

      // 5. Update full orders list from backend with a safe delay to avoid DB commit race
      setTimeout(() => {
        if (fetchOrdersRef.current) {
          fetchOrdersRef.current(1);
        }
      }, 1500);
    };

    newSocket.on('newOrder', handleIncomingOrder);

    // Also listen to window event in case useInventoryAlerts caught it first
    const handleWindowEvent = (e) => handleIncomingOrder(e.detail);
    window.addEventListener('artisanNewOrder', handleWindowEvent);

    newSocket.on('newCustomOrder', (data) => {
      playNotificationSound();
      toast.success(`✨ አዲስ የብጁ ዲዛይን ጥያቄ መጥቷል! New custom design requested: ${data?.customerName || 'Customer'} (${data?.itemType || 'Design'})`, {
        duration: 12000,
        icon: '🎨',
        style: { border: '2px solid #b87b2e', padding: '16px', fontWeight: 'bold' }
      });
      if (fetchCustomOrdersRef.current) fetchCustomOrdersRef.current();
      if (fetchOrdersRef.current) fetchOrdersRef.current(1);
    });

    newSocket.on('customOrderPaid', (data) => {
      playNotificationSound();
      toast.success(`✨ ብጁ ዲዛይን ተከፍሏል! Custom design paid.`);
      if (fetchCustomOrdersRef.current) fetchCustomOrdersRef.current();
      if (fetchOrdersRef.current) fetchOrdersRef.current(1);
    });

    // Request browser notification permissions if not set
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => { });
    }

    return () => {
      window.removeEventListener('artisanNewOrder', handleWindowEvent);
      newSocket.off('newOrder');
      newSocket.off('newCustomOrder');
      newSocket.off('customOrderPaid');
      newSocket.disconnect();
    };
  }, [user?._id, user?.id]);

  // Polling fallback — detects new orders every 30s when socket is unavailable
  useEffect(() => {
    const userId = user?._id || user?.id;
    if (!userId) return;
    const poll = async () => {
      try {
        const response = await api.get('/orders', { params: { page: 1, limit: 1, status: undefined } });
        const latest = (response.data.orders || [])[0];
        if (!latest) return;
        const latestId = latest._id || latest.id;
        if (isFirstPollRef.current) {
          latestOrderIdRef.current = latestId;
          isFirstPollRef.current = false;
          return;
        }
        if (latestId && latestId !== latestOrderIdRef.current) {
          latestOrderIdRef.current = latestId;
          playNotificationSound();
          toast.success(
            `🛍️ New order #${latest.orderNumber}`,
            {
              duration: 10000,
              position: 'top-right',
              style: { background: '#FFF9F0', border: '1px solid #CFA66E', borderRadius: '12px' }
            }
          );
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('New Order on EthioCraft Global', {
              body: `Order #${latest.orderNumber} received!`,
            });
          }
          fetchOrders(1);
        }
      } catch {
        // silent — don't disrupt UI on poll failure
      }
    };
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [user?._id]);

  useEffect(() => {
    fetchOrders(currentPage);
  }, [currentPage, filter]);

  const fetchOrders = async (page = currentPage) => {
    try {
      setLoading(true);
      const response = await api.get('/orders', {
        params: { page, limit, status: filter === 'all' ? undefined : filter }
      });
      setOrders(response.data.orders || []);
      setSummary(response.data.summary || {
        all: 0, pending: 0, processing: 0, shipped: 0, completed: 0, totalEarnings: 0
      });
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotalOrders(response.data.pagination?.totalOrders || 0);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
      setDataLoaded(true);
    }
  };

  const fetchCustomOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/custom-orders/artisan');
      setCustomOrders(response.data.data || []);
    } catch (error) {
      console.error('Error fetching custom orders:', error);
    } finally {
      setLoading(false);
    }
  };

  filterRef.current = filter;
  fetchOrdersRef.current = fetchOrders;
  fetchCustomOrdersRef.current = fetchCustomOrders;

  // Always fetch custom orders on mount so counts and merged lists are available immediately
  useEffect(() => {
    fetchCustomOrders();
  }, []);

  useEffect(() => {
    if (filter === 'custom') {
      fetchCustomOrders();
    } else {
      fetchOrders(currentPage);
      fetchCustomOrders();
    }
  }, [currentPage, filter]);

  // Formatted custom orders to match the list structure
  const formattedCustomOrders = useMemo(() => {
    return (customOrders || []).map(co => ({
      ...co,
      orderNumber: `CUST-${(co._id || '').slice(-6).toUpperCase()}`,
      isCustomOrder: true,
      totals: {
        total: co.price || 0,
        subtotal: co.price || 0,
        artisanEarning: co.artisanEarning || co.price || 0
      },
      payment: {
        method: 'ብጁ ዲዛይን (Custom)',
        status: co.status === 'paid' ? 'Paid' : co.status === 'price_quoted' ? 'Price Quoted' : 'Pending'
      },
      items: [{
        product: co.product || {
          name: `ብጁ ዲዛይን (${co.gender === 'Female' ? 'የሴት' : 'የወንድ'} ${co.itemType})`,
          images: [co.photos?.front || co.photos?.back || '/placeholder-craft.jpg']
        },
        quantity: 1,
        price: co.price || 0,
        customOrderId: co._id
      }]
    }));
  }, [customOrders]);

  const filtered = useMemo(() => {
    if (filter === 'custom') {
      let list = [...(customOrders || [])];
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        list = list.filter(o =>
          (o._id || '').toLowerCase().includes(q) ||
          (`${o.customer?.profile?.firstName || ''} ${o.customer?.profile?.lastName || ''}`).toLowerCase().includes(q) ||
          (o.itemType || '').toLowerCase().includes(q)
        );
      }
      return list;
    }

    let list = [...orders];

    if (filter === 'all') {
      list = [...orders, ...formattedCustomOrders];
    } else if (filter === 'pending') {
      const pendingCustom = formattedCustomOrders.filter(co => ['pending', 'price_quoted'].includes(co.status));
      list = [...orders.filter(o => ['pending', 'pending verification'].includes(o.status)), ...pendingCustom];
    } else if (filter === 'processing') {
      const processingCustom = formattedCustomOrders.filter(co => ['accepted', 'paid', 'processing'].includes(co.status));
      list = [...orders.filter(o => ['confirmed', 'processing'].includes(o.status)), ...processingCustom];
    } else if (filter === 'shipped') {
      list = list.filter(o => o.status === 'shipped');
    } else if (filter === 'completed') {
      const completedCustom = formattedCustomOrders.filter(co => ['completed', 'delivered'].includes(co.status));
      list = [...orders.filter(o => ['completed', 'delivered'].includes(o.status)), ...completedCustom];
    } else {
      list = list.filter(o => o.status === filter);
    }

    // Always sort descending: newest order at the very top!
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(o =>
        (o.orderNumber || '').toLowerCase().includes(q) ||
        (o._id || '').toLowerCase().includes(q) ||
        (`${o.customer?.profile?.firstName || ''} ${o.customer?.profile?.lastName || ''}`).toLowerCase().includes(q) ||
        (o.items?.[0]?.product?.name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, formattedCustomOrders, customOrders, filter, searchTerm]);

  const pendingCustomCount = useMemo(() => {
    return (customOrders || []).filter(co => ['pending', 'price_quoted'].includes(co.status)).length;
  }, [customOrders]);

  const stats = useMemo(() => ({
    totalEarnings: summary.totalEarnings,
    pending: (summary.pending || 0) + pendingCustomCount,
    processing: summary.processing,
    shippedCount: summary.shipped,
    completed: summary.completed
  }), [summary, pendingCustomCount]);

  // Order Actions (all original)
  const handleArtisanApprove = async (id) => {
    try {
      setIsLoading(true);
      const response = await api.put(`/orders/${id}/artisan-approve-payment`);
      if (response.data.success) {
        toast.success(t('success'));
        fetchOrders();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to authorize payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArtisanReject = async (id) => {
    const reason = window.prompt('Please enter a reason for rejecting the payment:');
    if (reason === null) return;
    try {
      setIsLoading(true);
      const response = await api.put(`/orders/${id}/artisan-reject-payment`, { reason });
      if (response.data.success) {
        toast.success(t('success'));
        fetchOrders();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to decline payment');
    } finally {
      setIsLoading(false);
    }
  };

  const acceptOrder = async (orderId) => {
    try {
      setActionLoading(orderId);
      await api.put(`/orders/${orderId}/accept`);
      await fetchOrders();
      toast.success(t('success'));
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error(error.response?.data?.message || 'Failed to accept order');
    } finally {
      setActionLoading(null);
    }
  };

  const rejectOrder = async (orderId) => {
    const reason = window.prompt('Please provide a reason for rejection:');
    if (!reason) return;
    try {
      setActionLoading(orderId);
      await api.put(`/orders/${orderId}/reject`, { reason });
      await fetchOrders();
      toast.success('Order rejected');
    } catch (error) {
      console.error('Error rejecting order:', error);
      toast.error(error.response?.data?.message || 'Failed to reject order');
    } finally {
      setActionLoading(null);
    }
  };

  const markAsProcessing = async (orderId) => {
    try {
      setActionLoading(orderId);
      await api.put(`/orders/${orderId}/processing`);
      await fetchOrders();
      toast.success('Order marked as processing');
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const markAsShipped = (order) => {
    setSelectedOrder(order);
    setShowTrackingModal(true);
  };

  const handleShipOrder = async (trackingData) => {
    try {
      setActionLoading(selectedOrder._id);
      await api.put(`/orders/${selectedOrder._id}/ship`, trackingData);
      await fetchOrders();
      setShowTrackingModal(false);
      setSelectedOrder(null);
      toast.success(t('success'));
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.response?.data?.message || 'Failed to ship order');
    } finally {
      setActionLoading(null);
    }
  };

  const updateTracking = (order) => {
    setSelectedOrder(order);
    setShowTrackingModal(true);
  };

  const handleUpdateTracking = async (trackingData) => {
    try {
      setActionLoading(selectedOrder._id);
      await api.put(`/orders/${selectedOrder._id}/tracking`, trackingData);
      await fetchOrders();
      setShowTrackingModal(false);
      setSelectedOrder(null);
      toast.success(t('success'));
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.response?.data?.message || 'Failed to update tracking');
    } finally {
      setActionLoading(null);
    }
  };

  const markAsDelivered = async (orderId) => {
    if (!window.confirm('Mark this order as delivered? This will complete the order and record earnings.')) return;
    try {
      setActionLoading(orderId);
      await api.put(`/orders/${orderId}/deliver`);
      await fetchOrders();
      toast.success(t('success'));
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.response?.data?.message || 'Failed to mark as delivered');
    } finally {
      setActionLoading(null);
    }
  };

  const cancelOrder = async (orderId) => {
    const reason = window.prompt('Please provide a reason for cancellation:');
    if (!reason) return;
    try {
      setActionLoading(orderId);
      await api.put(`/orders/${orderId}/cancel`, { reason });
      await fetchOrders();
      toast.success(t('success'));
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    } finally {
      setActionLoading(null);
    }
  };

  const printInvoice = (order) => {
    const w = window.open('', '_blank');
    const html = `
      <!doctype html>
      <html>
      <head><meta charset="utf-8"><title>Invoice - ${order.orderNumber}</title>
      <style>
        body { font-family: 'Inter', sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; }
        .header { border-bottom: 2px solid #b87b2e; padding-bottom: 1rem; margin-bottom: 2rem; }
        .total { font-size: 1.5rem; font-weight: bold; color: #b87b2e; text-align: right; }
        table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
        th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; }
      </style>
      </head>
      <body>
        <div class="header"><h1>EthioCraft Global</h1><p>Invoice #${order.orderNumber}</p></div>
        <div><h3>Customer</h3><p>${order.customer?.profile?.firstName} ${order.customer?.profile?.lastName}<br/>${order.shippingAddress?.street}, ${order.shippingAddress?.city}</p></div>
        <table><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>
          ${(order.items || []).map(item => `<tr><td>${item.product?.name || 'Product'}</td><td>${item.quantity}</td><td>${item.price.toFixed(2)} ETB</td><td>${(item.price * item.quantity).toFixed(2)} ETB</td></tr>`).join('')}
        </tbody></table>
        <div class="total">Total: ${order.totals?.total?.toFixed(2)} ETB</div>
        <div style="margin-top: 2rem; text-align: center;">Thank you for supporting Ethiopian artisans!</div>
      </body>
      </html>
    `;
    w.document.write(html);
    w.document.close();
    w.print();
  };

  const viewDetails = (order) => {
    if (order.isCustomOrder || order.measurements || order.itemType) {
      const match = (customOrders || []).find(co => String(co._id || co.id) === String(order._id || order.id)) || order;
      setSelectedCustomOrder(match);
      setShowCustomDetailModal(true);
    } else {
      setSelectedOrder(order);
      setShowDetailModal(true);
    }
  };

  const contactCustomer = (order) => {
    toast.success('Opening chat with customer...');
  };

  const deleteOrder = (order) => {
    if (!['rejected', 'cancelled'].includes(order.status)) {
      toast.error('Only rejected or cancelled orders can be deleted');
      return;
    }
    setOrderToDelete(order);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!orderToDelete) return;
    try {
      setActionLoading(orderToDelete._id);
      await api.delete(`/orders/${orderToDelete._id}`);
      await fetchOrders();
      toast.success(t('success'));
      setShowDeleteModal(false);
      setOrderToDelete(null);
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error(error.response?.data?.message || 'Failed to delete order');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const toggleSelectAll = () => {
    const deletableOrders = filtered.filter(o => ['rejected', 'cancelled'].includes(o.status));
    if (selectedOrders.length === deletableOrders.length) setSelectedOrders([]);
    else setSelectedOrders(deletableOrders.map(o => o._id));
  };

  const bulkDelete = async () => {
    if (selectedOrders.length === 0) {
      toast.error('Please select orders to delete');
      return;
    }
    setOrderToDelete({ _id: 'bulk', count: selectedOrders.length });
    setShowDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    try {
      setActionLoading('bulk');
      const response = await api.post('/orders/bulk-delete', { orderIds: selectedOrders });
      await fetchOrders();
      toast.success(response.data.message);
      setSelectedOrders([]);
      setBulkDeleteMode(false);
      setShowDeleteModal(false);
      setOrderToDelete(null);
    } catch (error) {
      console.error('Error bulk deleting orders:', error);
      toast.error(error.response?.data?.message || 'Failed to delete orders');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteConfirm = () => {
    if (orderToDelete?._id === 'bulk') confirmBulkDelete();
    else confirmDelete();
  };

  // Render action buttons (compact, minimal, and unified single-color style)
  const renderActions = (order) => {
    const isLoading = actionLoading === order._id;

    const ActionButton = ({ onClick, icon: Icon, label, disabled = false }) => (
      <button
        onClick={onClick}
        disabled={disabled || isLoading}
        style={{ fontSize: '10px', lineHeight: '14px' }}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 !text-[10px] font-medium transition-colors shadow-2xs whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Icon className="w-2.5 h-2.5 text-gray-500 flex-shrink-0" />
        <span style={{ fontSize: '10px', lineHeight: '14px' }}>{label}</span>
      </button>
    );

    if (order.isCustomOrder || order.measurements || order.itemType) {
      return (
        <div className="flex items-center gap-1">
          <ActionButton
            onClick={() => viewDetails(order)}
            icon={EyeIcon}
            label={order.status === 'pending' ? 'ዋጋ ቆርጥ' : 'ዲዛይን እይ'}
          />
        </div>
      );
    }

    switch (order.status) {
      case 'pending':
      case 'pending verification':
        return (
          <div className="flex items-center gap-1">
            {order.payment?.receipt && (
              <a
                href={order.payment.receipt.startsWith('http') ? order.payment.receipt : `${API_BASE_URL.replace(/\/api$/, '')}${order.payment.receipt}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '10px', lineHeight: '14px' }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 !text-[10px] font-medium transition-colors shadow-2xs whitespace-nowrap"
              >
                <EyeIcon className="w-2.5 h-2.5 text-gray-500 flex-shrink-0" />
                <span style={{ fontSize: '10px', lineHeight: '14px' }}>Receipt</span>
              </a>
            )}
            <ActionButton onClick={() => acceptOrder(order._id)} icon={CheckCircleIcon} label="Accept" />
            <ActionButton onClick={() => rejectOrder(order._id)} icon={XCircleIcon} label="Reject" />
            <ActionButton onClick={() => viewDetails(order)} icon={EyeIcon} label="View" />
            <ActionButton onClick={() => contactCustomer(order)} icon={ChatBubbleLeftIcon} label="Chat" />
          </div>
        );
      case 'confirmed':
      case 'processing':
        return (
          <div className="flex items-center gap-1">
            {order.status === 'confirmed' && (
              <ActionButton onClick={() => markAsProcessing(order._id)} icon={CubeIcon} label="Process" />
            )}
            <ActionButton onClick={() => markAsShipped(order)} icon={TruckIcon} label="Ship" />
            <ActionButton onClick={() => printInvoice(order)} icon={PrinterIcon} label="Print" />
            <ActionButton onClick={() => cancelOrder(order._id)} icon={XCircleIcon} label="Cancel" />
          </div>
        );
      case 'shipped':
        return (
          <div className="flex items-center gap-1">
            <ActionButton onClick={() => markAsDelivered(order._id)} icon={CheckCircleIcon} label="Deliver" />
            <ActionButton onClick={() => updateTracking(order)} icon={TruckIcon} label="Track" />
            <ActionButton onClick={() => printInvoice(order)} icon={PrinterIcon} label="Print" />
          </div>
        );
      case 'delivered':
      case 'completed':
        return (
          <div className="flex items-center gap-1">
            <ActionButton onClick={() => viewDetails(order)} icon={DocumentTextIcon} label="Receipt" />
            <ActionButton onClick={() => printInvoice(order)} icon={PrinterIcon} label="Invoice" />
          </div>
        );
      case 'rejected':
      case 'cancelled':
        return (
          <div className="flex items-center gap-1">
            <ActionButton onClick={() => viewDetails(order)} icon={EyeIcon} label="Details" />
            <ActionButton onClick={() => deleteOrder(order)} icon={TrashIcon} label="Delete" />
          </div>
        );
      default:
        return <ActionButton onClick={() => viewDetails(order)} icon={EyeIcon} label="View" />;
    }
  };

  if (loading && !dataLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className={`font-['Times_New_Roman',_Times,_serif,_'Noto_Sans_Ethiopic'] text-xs text-gray-800 ${insideDashboard ? "pb-8" : "min-h-screen bg-gray-50 py-8"}`}>
      <div className={insideDashboard ? "w-full" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"}>

        {/* Header */}
        <div className="mb-6">
          {!insideDashboard && (
            <button
              onClick={() => navigate('/artisan/dashboard')}
              className="inline-flex items-center gap-1 text-ethiopian-gold hover:text-ethiopian-gold/80 text-sm font-medium mb-3 transition-colors"
            >
              ← Back to Dashboard
            </button>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('artisan_panel.my_products', 'Manage Orders')}</h1>
              <p className="text-gray-500 text-sm mt-1">{t('footer.about_text', 'Professional order management system')}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-white px-3 py-1.5 rounded-full shadow-sm">
              <div className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>{isSocketConnected ? 'Live updates active' : 'Reconnecting...'}</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-5 transition-all hover:shadow-md flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wide truncate">{t('artisan_panel.total_revenue')}</p>
                <p className="text-sm sm:text-2xl font-bold text-gray-900 mt-1 truncate">{stats.totalEarnings.toFixed(2)} ETB</p>
                <p className="text-[9px] sm:text-xs text-green-600 mt-1 truncate">+8.2% vs last month</p>
              </div>
              <div className="p-2 sm:p-3 bg-ethiopian-gold/10 rounded-lg sm:rounded-xl shrink-0">
                <CurrencyDollarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-ethiopian-gold" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-5 transition-all hover:shadow-md flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wide truncate">{t('common.status_pending', 'Pending')}</p>
                <p className="text-lg sm:text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p>
                <p className="text-[9px] sm:text-xs text-gray-500 mt-1 truncate">{t('common.awaiting_action', 'Awaiting action')}</p>
              </div>
              <div className="p-2 sm:p-3 bg-amber-50 rounded-lg sm:rounded-xl shrink-0">
                <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-5 transition-all hover:shadow-md flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wide truncate">{t('common.status_processing', 'Processing')}</p>
                <p className="text-lg sm:text-2xl font-bold text-blue-600 mt-1">{stats.processing}</p>
                <p className="text-[9px] sm:text-xs text-gray-500 mt-1 truncate">{t('common.in_progress', 'In progress')}</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-50 rounded-lg sm:rounded-xl shrink-0">
                <CubeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-5 transition-all hover:shadow-md flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wide truncate">{t('common.status_completed', 'Completed')}</p>
                <p className="text-lg sm:text-2xl font-bold text-emerald-600 mt-1">{stats.completed}</p>
                <p className="text-[9px] sm:text-xs text-gray-500 mt-1 truncate">{t('common.success_delivery', 'Successfully delivered')}</p>
              </div>
              <div className="p-2 sm:p-3 bg-emerald-50 rounded-lg sm:rounded-xl shrink-0">
                <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Bulk Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('common.search')}
              className="w-full pl-9 pr-4 py-2 sm:py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent bg-white text-xs sm:text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {bulkDeleteMode ? (
              <>
                <button
                  onClick={() => { setBulkDeleteMode(false); setSelectedOrders([]); }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition"
                >
                  {t('common.cancel')}
                </button>
                {selectedOrders.length > 0 && (
                  <button
                    onClick={bulkDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition flex items-center gap-2 shadow-sm"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Delete ({selectedOrders.length})
                  </button>
                )}
                <button
                  onClick={toggleSelectAll}
                  className="text-sm text-ethiopian-gold hover:underline"
                >
                  {selectedOrders.length === filtered.filter(o => ['rejected', 'cancelled'].includes(o.status)).length
                    ? 'Deselect All'
                    : 'Select All Deletable'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setBulkDeleteMode(true)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition flex items-center gap-2 shadow-sm"
              >
                <TrashIcon className="w-4 h-4" />
                {t('common.select_multiple', 'Select Multiple')}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex w-max px-2 py-1 gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const count = tab.key === 'all' ? (summary.all || 0) + (customOrders?.length || 0) :
                  tab.key === 'pending' ? (summary.pending || 0) + pendingCustomCount :
                    tab.key === 'processing' ? summary.processing :
                      tab.key === 'shipped' ? stats.shippedCount :
                        tab.key === 'custom' ? (customOrders?.length || 0) :
                          summary.completed;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${filter === tab.key
                      ? 'bg-ethiopian-gold/10 text-ethiopian-gold'
                      : 'text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${filter === tab.key ? 'bg-ethiopian-gold/20' : 'bg-gray-100'
                      }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Custom Orders View - Table Format */}
        {filter === 'custom' && (
          <div className="space-y-4">
            {customOrders.length === 0 ? (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center">
                <SparklesIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-bold">No custom design requests yet.</p>
              </div>
            ) : (
              <>
                <div className="md:hidden space-y-4">
                  {customOrders.map((order) => (
                    <div key={order._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          {order.photos && (order.photos.front || order.photos.back) ? (
                            <img
                              src={getFileUrl(order.photos.front || order.photos.back)}
                              alt="Design"
                              className="w-14 h-14 rounded-2xl object-cover bg-gray-100 border border-gray-200"
                              crossOrigin="anonymous"
                              onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-product.svg'; }}
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-100 italic text-[10px] text-amber-400 text-center px-1 font-black">
                              NO PHOTO
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-gray-900">#{order._id.slice(-8).toUpperCase()}</p>
                            <p className="text-xs text-gray-500 mt-1">{order.customer?.profile?.firstName} {order.customer?.profile?.lastName}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${order.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          order.status === 'accepted' || order.status === 'price_quoted' ? 'bg-green-50 text-green-600 border-green-100' :
                            'bg-gray-50 text-gray-600 border-gray-100'
                          }`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-4 text-xs text-gray-500">
                        <div>
                          <p className="font-semibold text-gray-700">Design</p>
                          <p className="mt-1 text-gray-600 capitalize">{order.gender} {order.itemType}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-700">Requested</p>
                          <div className="text-xs text-gray-600 mt-1">
                            <div>{formatEthiopianDateTime(order.createdAt).date}</div>
                            <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                              {formatEthiopianDateTime(order.createdAt).time}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-amber-600">{order.price ? `${order.price.toFixed(2)} ETB` : 'Not Quoted'}</p>
                        <button
                          onClick={() => {
                            setSelectedCustomOrder(order);
                            setShowCustomDetailModal(true);
                          }}
                          className="text-ethiopian-gold hover:text-amber-700 font-bold text-[10px] sm:text-xs uppercase tracking-widest px-3 py-1.5 bg-ethiopian-gold/10 rounded-xl sm:rounded-2xl border border-ethiopian-gold/20 transition-all"
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50/80">
                        <tr>
                          <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">ዲዛይን</th>
                          <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">የትዕዛዝ ቁጥር</th>
                          <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">ደንበኛ</th>
                          <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">የዲዛይን ዓይነት</th>
                          <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">ቀን</th>
                          <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">ዋጋ</th>
                          <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">ሁኔታ</th>
                          <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">እርምጃ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {customOrders.map((order) => (
                          <tr
                            key={order._id}
                            className="hover:bg-gray-50/60 transition cursor-pointer"
                            onClick={() => { setSelectedCustomOrder(order); setShowCustomDetailModal(true); }}
                          >
                            <td className="px-2 py-1.5">
                              <div className="flex items-center gap-1.5">
                                {order.photos && (order.photos.front || order.photos.back) ? (
                                  <img
                                    src={getFileUrl(order.photos.front || order.photos.back)}
                                    alt="Design"
                                    className="w-7 h-7 rounded object-cover bg-gray-100 border border-gray-200"
                                    crossOrigin="anonymous"
                                    onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-product.svg'; }}
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded bg-gray-50 flex items-center justify-center border border-gray-200 italic text-[7px] text-gray-400 text-center font-bold">NO PIC</div>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              <div className="text-[11px] font-bold text-gray-900">#{order._id.slice(-8).toUpperCase()}</div>
                              <span className="text-[8px] bg-gray-50 text-gray-600 px-1 py-0.2 rounded font-medium uppercase border border-gray-200">ብጁ</span>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCustomOrder(order);
                                  setShowCustomDetailModal(true);
                                }}
                                title={`${order.customer?.profile?.firstName || ''} ${order.customer?.profile?.lastName || ''} (${order.customer?.email || ''})`}
                                style={{ fontSize: '10px', lineHeight: '14px' }}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 rounded border border-gray-200 !text-[10px] font-medium transition-colors max-w-[105px]"
                              >
                                <UserIcon className="w-2.5 h-2.5 text-gray-500 flex-shrink-0" />
                                <span className="truncate" style={{ fontSize: '10px', lineHeight: '14px' }}>{order.customer?.profile?.firstName || 'ደንበኛ'}</span>
                              </button>
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="flex items-center gap-1">
                                <Scissors className="w-2.5 h-2.5 text-gray-400 flex-shrink-0" />
                                <span className="text-[10px] font-medium text-gray-800 capitalize truncate max-w-[120px]">{order.gender} {order.itemType}</span>
                              </div>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              <div className="text-[10px] text-gray-600 font-medium">
                                {formatEthiopianDateTime(order.createdAt).date}
                              </div>
                              <div className="text-[9px] text-gray-400 font-mono">
                                {formatEthiopianDateTime(order.createdAt).time}
                              </div>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              <div className={`text-[10px] font-bold ${order.price ? 'text-gray-900' : 'text-gray-400'}`}>
                                {order.price ? `${order.price.toFixed(2)} ETB` : 'Not Quoted'}
                              </div>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${order.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                order.status === 'accepted' || order.status === 'price_quoted' ? 'bg-green-50 text-green-700 border-green-200' :
                                  'bg-gray-50 text-gray-600 border-gray-200'
                                }`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setSelectedCustomOrder(order);
                                  setShowCustomDetailModal(true);
                                }}
                                style={{ fontSize: '10px', lineHeight: '14px' }}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 !text-[10px] font-medium transition-colors shadow-2xs whitespace-nowrap"
                              >
                                <EyeIcon className="w-2.5 h-2.5 text-gray-500 flex-shrink-0" />
                                <span style={{ fontSize: '10px', lineHeight: '14px' }}>Review</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Regular Orders Table */}
        {filter !== 'custom' && (
          <>
            {!dataLoaded && loading ? (
              <div className="bg-white rounded-xl shadow-sm p-12 flex flex-col items-center">
                <LoadingSpinner size="large" />
                <p className="mt-4 text-gray-500">{t('common.loading')}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-lg font-medium text-gray-600">{t('common.no_orders_found', 'No orders found')}</p>
                <button
                  onClick={() => { setFilter('all'); setSearchTerm(''); }}
                  className="mt-4 text-ethiopian-gold hover:underline font-medium"
                >
                  {t('common.clear_all', 'Clear all filters')}
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-2.5 md:hidden">
                  {filtered.map((order) => {
                    const isDeletable = ['rejected', 'cancelled'].includes(order.status);
                    return (
                      <div key={order._id} className="bg-white rounded-xl border border-gray-100 shadow-xs p-2.5">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-1 flex-wrap">
                              <p className="text-xs font-bold text-gray-900">#{order.orderNumber || order._id?.slice(-8)}</p>
                              {order.isCustomOrder && (
                                <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                                  ✨ ብጁ ዲዛይን
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                              <span>{formatEthiopianDateTime(order.createdAt).date} • {formatEthiopianDateTime(order.createdAt).time}</span>
                            </div>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${order.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-100' :
                            order.status === 'processing' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                              order.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                order.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                  order.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                                    'bg-gray-50 text-gray-600 border-gray-100'
                            }`}>
                            {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 mb-2 text-xs text-gray-600">
                          <div className="rounded-lg bg-gray-50/80 p-1.5">
                            <p className="text-[9px] uppercase tracking-wider text-gray-400">ደንበኛ</p>
                            <p className="text-xs font-bold text-gray-900 truncate">{order.customer?.profile?.firstName || 'Customer'}</p>
                          </div>
                          <div className="rounded-lg bg-gray-50/80 p-1.5">
                            <p className="text-[9px] uppercase tracking-wider text-gray-400">የተጣራ ገቢ</p>
                            <p className="text-xs font-bold text-ethiopian-gold">{(order.totals?.artisanEarning || (order.totals?.total * 0.85))?.toFixed(2)} ETB</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            {order.isCustom && order.photos?.front ? (
                              <img
                                src={getFileUrl(order.photos.front)}
                                alt="Custom Design"
                                className="w-10 h-10 rounded-lg object-cover bg-amber-50 border border-amber-100 shrink-0"
                                crossOrigin="anonymous"
                                onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-product.svg'; }}
                              />
                            ) : (
                              <img
                                src={
                                  order.items?.[0]?.product?.images?.[0]
                                    ? getFileUrl(
                                      typeof order.items[0].product.images[0] === 'string'
                                        ? order.items[0].product.images[0]
                                        : order.items[0].product.images[0].url
                                    )
                                    : (order.items?.[0]?.image ? getFileUrl(order.items[0].image) : '/placeholder-product.svg')
                                }
                                alt={order.items?.[0]?.product?.name || 'Product'}
                                className="w-10 h-10 rounded-lg object-cover bg-gray-100 border border-gray-100 shrink-0"
                                crossOrigin="anonymous"
                                onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-product.svg'; }}
                              />
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-900 truncate">{order.isCustom ? 'ልዩ የልብስ ዲዛይን' : order.items?.[0]?.product?.name || 'ምርት'}</p>
                              <p className="text-[10px] text-gray-500 truncate">
                                {order.items?.[0]?.color ? `${order.items[0].color} • ` : ''}{order.items?.[0]?.size || 'Size N/A'}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-gray-100">
                            {renderActions(order)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50/80">
                        <tr>
                          {bulkDeleteMode && (
                            <th className="px-2 py-1.5 w-7">
                              <input
                                type="checkbox"
                                checked={selectedOrders.length > 0 && selectedOrders.length === filtered.filter(o => ['rejected', 'cancelled'].includes(o.status)).length}
                                onChange={toggleSelectAll}
                                className="w-3 h-3 rounded border-gray-300 text-gray-700 focus:ring-gray-400"
                              />
                            </th>
                          )}
                          <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{t('common.order_id', 'Order')}</th>
                          <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{t('common.customer', 'Customer')}</th>
                          <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{t('nav.shop', 'Product')}</th>
                          <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{t('artisan_panel.total_revenue', 'Net Earning')}</th>
                          <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{t('checkout.billing_details', 'Payment')}</th>
                          <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{t('common.status', 'Status')}</th>
                          <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{t('common.action', 'Actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filtered.map((order) => {
                          const isDeletable = ['rejected', 'cancelled'].includes(order.status);
                          return (
                            <tr key={order._id} className="hover:bg-gray-50/60 transition">
                              {bulkDeleteMode && (
                                <td className="px-2 py-1.5">
                                  {isDeletable ? (
                                    <input
                                      type="checkbox"
                                      checked={selectedOrders.includes(order._id)}
                                      onChange={() => toggleOrderSelection(order._id)}
                                      className="w-3 h-3 rounded border-gray-300 text-gray-700"
                                    />
                                  ) : (
                                    <span className="text-gray-300 text-[9px]">N/A</span>
                                  )}
                                </td>
                              )}
                              <td className="px-2 py-1.5 whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  <div className="text-[11px] font-bold text-gray-900">#{order.orderNumber || order._id?.slice(-8)}</div>
                                  {order.isCustomOrder && (
                                    <span className="px-1 py-0.2 rounded text-[8px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                      ብጁ
                                    </span>
                                  )}
                                </div>
                                <div className="text-[9px] text-gray-400 font-mono flex items-center gap-1 mt-0.5">
                                  <span>{formatEthiopianDateTime(order.createdAt).date}</span>
                                  <span>{formatEthiopianDateTime(order.createdAt).time}</span>
                                </div>
                              </td>
                              <td className="px-2 py-1.5 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    viewDetails(order);
                                  }}
                                  title={`ደንበኛ: ${order.customer?.profile?.firstName || ''} ${order.customer?.profile?.lastName || ''} | ${order.payment?.method || ''} | ${order.shippingAddress?.phone || 'ስልክ ተደብቋል'}`}
                                  style={{ fontSize: '10px', lineHeight: '14px' }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 rounded border border-gray-200 !text-[10px] font-medium transition-colors max-w-[105px]"
                                >
                                  <UserIcon className="w-2.5 h-2.5 text-gray-500 flex-shrink-0" />
                                  <span className="truncate" style={{ fontSize: '10px', lineHeight: '14px' }}>
                                    {order.customer?.profile?.firstName ? `${order.customer.profile.firstName} ${order.customer.profile.lastName?.charAt(0) || ''}.` : 'ደንበኛ'}
                                  </span>
                                </button>
                              </td>
                              <td className="px-2 py-1.5">
                                <div className="flex items-center gap-1.5">
                                  <div className="relative flex-shrink-0">
                                    {order.isCustom && order.photos?.front ? (
                                      <img
                                        src={getFileUrl(order.photos.front)}
                                        alt="Custom Design"
                                        className="w-7 h-7 rounded object-cover bg-amber-50 border border-amber-100"
                                        crossOrigin="anonymous"
                                        onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-product.svg'; }}
                                      />
                                    ) : (
                                      <img
                                        src={
                                          order.items?.[0]?.product?.images?.[0]
                                            ? getFileUrl(
                                              typeof order.items[0].product.images[0] === 'string'
                                                ? order.items[0].product.images[0]
                                                : order.items[0].product.images[0].url
                                            )
                                            : (order.items?.[0]?.image ? getFileUrl(order.items[0].image) : '/placeholder-product.svg')
                                        }
                                        alt={order.items?.[0]?.product?.name || ''}
                                        className="w-7 h-7 rounded object-cover bg-gray-100 border border-gray-100"
                                        crossOrigin="anonymous"
                                        onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-product.svg'; }}
                                      />
                                    )}
                                    {order.isCustom && (
                                      <div className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0 max-w-[115px]">
                                    <div className="text-[10px] font-medium text-gray-900 truncate">
                                      {order.isCustom ? (
                                        <span className="text-amber-700 font-semibold">ብጁ ዲዛይን</span>
                                      ) : (
                                        order.items?.[0]?.product?.name || 'Product'
                                      )}
                                    </div>
                                    <div className="flex gap-1 mt-0.5">
                                      {order.items?.[0]?.color && (
                                        <span className="text-[7.5px] bg-gray-50 text-gray-600 px-1 py-0.2 rounded font-medium border border-gray-200 uppercase">
                                          {order.items[0].color}
                                        </span>
                                      )}
                                      {order.items?.[0]?.size && (
                                        <span className="text-[7.5px] bg-gray-50 text-gray-600 px-1 py-0.2 rounded font-medium border border-gray-200 uppercase">
                                          {order.items[0].size}
                                        </span>
                                      )}
                                      {order.items?.length > 1 && (
                                        <span className="text-[8px] text-gray-400 font-medium">+{order.items.length - 1}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 py-1.5 whitespace-nowrap">
                                <div className="text-[11px] font-bold text-gray-900">
                                  {(order.totals?.artisanEarning || (order.totals?.total * 0.85))?.toFixed(2)} ETB
                                </div>
                                <div className="text-[9px] text-gray-400 font-normal">ድምር: {order.totals?.total?.toFixed(2)}</div>
                              </td>
                              <td className="px-2 py-1.5 whitespace-nowrap">
                                <div className="flex flex-col gap-0.5">
                                  <span className="px-1 py-0.2 text-[8.5px] font-medium rounded border border-gray-200 bg-gray-50 text-gray-600 inline-block w-fit">
                                    Pay: {order.payment?.status || 'Unpaid'}
                                  </span>
                                  <span className="px-1 py-0.2 text-[8.5px] font-medium rounded border border-gray-200 bg-gray-50 text-gray-600 inline-block w-fit">
                                    Payout: {order.payoutStatus || 'Pending'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-2 py-1.5 whitespace-nowrap">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-medium border ${statusStyles[order.status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                                  {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                                </span>
                              </td>
                              <td className="px-2 py-1.5 whitespace-nowrap">
                                {renderActions(order)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between bg-white px-4 py-3 sm:px-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {t('common.back', 'Previous')}
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * limit + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(currentPage * limit, totalOrders)}</span> of{' '}
                  <span className="font-medium">{totalOrders}</span> orders
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01.02 1.06L8.832 10l3.978 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === i + 1
                        ? 'z-10 bg-ethiopian-gold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ethiopian-gold'
                        : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                        }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.19 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        {showTrackingModal && selectedOrder && (
          <TrackingModal
            order={selectedOrder}
            onClose={() => { setShowTrackingModal(false); setSelectedOrder(null); }}
            onSubmit={selectedOrder.status === 'shipped' ? handleUpdateTracking : handleShipOrder}
            isUpdate={selectedOrder.status === 'shipped'}
          />
        )}
        {showDetailModal && selectedOrder && (
          <OrderDetailModal
            order={selectedOrder}
            onClose={() => { setShowDetailModal(false); setSelectedOrder(null); }}
          />
        )}

        {showCustomDetailModal && selectedCustomOrder && (
          <CustomOrderDetailModal
            order={selectedCustomOrder}
            onClose={() => { setShowCustomDetailModal(false); setSelectedCustomOrder(null); }}
            onRefresh={fetchCustomOrders}
          />
        )}
        {showDeleteModal && orderToDelete && (
          <DeleteConfirmModal
            isOpen={showDeleteModal}
            onClose={() => { setShowDeleteModal(false); setOrderToDelete(null); }}
            onConfirm={handleDeleteConfirm}
            orderCount={orderToDelete._id === 'bulk' ? orderToDelete.count : 1}
            loading={actionLoading !== null}
          />
        )}
      </div>
    </div>
  );
};

export default ManageOrders;