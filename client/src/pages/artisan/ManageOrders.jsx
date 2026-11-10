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
  CubeIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import TrackingModal from '../../components/orders/TrackingModal';
import OrderDetailModal from '../../components/orders/OrderDetailModal';
import DeleteConfirmModal from '../../components/orders/DeleteConfirmModal';
import { useCustomTranslation } from '../../hooks/useCustomTranslation';
import CustomOrderDetailModal from '../../components/orders/CustomOrderDetailModal';
import { SparklesIcon, Scissors } from 'lucide-react';
import { playNotificationSound } from '../../utils/soundUtils';
import { getFileUrl } from '../../utils/getFileUrl';

const ManageOrders = () => {
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
    { key: 'processing', label: t('common.status_processing', 'Processing'), icon: CubeIcon },
    { key: 'shipped', label: t('common.status_shipped', 'Shipped'), icon: TruckIcon },
    { key: 'completed', label: t('common.status_completed', 'Completed'), icon: CheckCircleIcon },
    { key: 'custom', label: 'Custom Orders', icon: SparklesIcon },
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
      
      // 1. Play loud clear notification sound immediately
      playNotificationSound();

      // 2. Format incoming order object and place it at the VERY TOP of the list
      const orderId = data.orderId || data.id || data._id;
      const orderNumber = data.orderNumber || (orderId ? `EC-${String(orderId).slice(-6)}` : `EC-${Date.now()}`);
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

      // Increment pending badge counts in summary
      setSummary(prev => ({
        ...prev,
        all: (prev.all || 0) + 1,
        pending: (prev.pending || 0) + 1
      }));

      // 3. Display prominent toast notification
      const totalAmount = data.total ? ` (${data.total} ETB)` : '';
      toast.success(`🛍️ አዲስ ትዕዛዝ #${orderNumber}${totalAmount}! New customer order received.`, {
        duration: 12000,
        icon: '🔔',
        style: {
          background: '#111827',
          color: '#f9fafb',
          border: '2px solid #f59e0b',
          borderRadius: '12px',
          padding: '16px',
          fontWeight: 'bold',
          fontSize: '14px',
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
        } catch (_) {}
      }

      // 5. Update full orders list from backend
      if (fetchOrdersRef.current) {
        fetchOrdersRef.current(1);
      }
    };

    newSocket.on('newOrder', handleIncomingOrder);

    // Also listen to window event in case useInventoryAlerts caught it first
    const handleWindowEvent = (e) => handleIncomingOrder(e.detail);
    window.addEventListener('artisanNewOrder', handleWindowEvent);

    newSocket.on('newCustomOrder', (data) => {
      playNotificationSound();
      toast.success(`✨ NEW CUSTOM DESIGN: ${data.customerName || 'Customer'} requested a ${data.itemType || 'design'}!`, { 
        duration: 10000,
        icon: '🎨',
        style: { border: '2px solid #b87b2e', padding: '16px', fontWeight: 'bold' }
      });
      if (filterRef.current === 'custom' && fetchCustomOrdersRef.current) {
        fetchCustomOrdersRef.current();
      } else if (fetchOrdersRef.current) {
        fetchOrdersRef.current(1);
      }
    });

    newSocket.on('customOrderPaid', (data) => {
      playNotificationSound();
      toast.success(`✨ Custom order paid! Check your custom orders.`);
      if (filterRef.current === 'custom' && fetchCustomOrdersRef.current) {
        fetchCustomOrdersRef.current();
      } else if (fetchOrdersRef.current) {
        fetchOrdersRef.current(1);
      }
    });

    // Request browser notification permissions if not set
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
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

  useEffect(() => {
    if (filter === 'custom') {
      fetchCustomOrders();
    } else {
      fetchOrders(currentPage);
    }
  }, [currentPage, filter]);

  const filtered = useMemo(() => {
    let list = [...orders];
    // Always sort descending: newest order at the very top!
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    if (filter !== 'all') {
      if (filter === 'pending') {
        list = list.filter(o => ['pending', 'pending verification'].includes(o.status));
      } else if (filter === 'processing') {
        list = list.filter(o => ['confirmed', 'processing'].includes(o.status));
      } else if (filter === 'shipped') {
        list = list.filter(o => o.status === 'shipped');
      } else if (filter === 'completed') {
        list = list.filter(o => ['completed', 'delivered'].includes(o.status));
      } else {
        list = list.filter(o => o.status === filter);
      }
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(o =>
        (o.orderNumber || '').toLowerCase().includes(q) ||
        (o._id || '').toLowerCase().includes(q) ||
        (`${o.customer?.profile?.firstName || ''} ${o.customer?.profile?.lastName || ''}`).toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, filter, searchTerm]);

  const stats = useMemo(() => ({
    totalEarnings: summary.totalEarnings,
    pending: summary.pending,
    processing: summary.processing,
    shippedCount: summary.shipped,
    completed: summary.completed
  }), [summary]);

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
    setSelectedOrder(order);
    setShowDetailModal(true);
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

  // Render action buttons (original logic, only visual classes updated)
  const renderActions = (order) => {
    const isLoading = actionLoading === order._id;

    const ActionButton = ({ onClick, color, icon: Icon, label, disabled = false }) => (
      <button
        onClick={onClick}
        disabled={disabled || isLoading}
        className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all duration-200 
          ${color === 'gold' ? 'bg-ethiopian-gold text-white hover:bg-ethiopian-gold/90 shadow-sm' :
            color === 'red' ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200' :
            color === 'gray' ? 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200' :
            color === 'blue' ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' :
            color === 'green' ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200' :
            'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
      </button>
    );

    switch (order.status) {
      case 'pending':
      case 'pending verification':
        return (
          <div className="flex flex-wrap gap-2">
            {order.payment?.receipt && (
              <a
                href={order.payment.receipt.startsWith('http') ? order.payment.receipt : `${API_BASE_URL.replace(/\/api$/, '')}${order.payment.receipt}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-200 hover:bg-blue-100"
              >
                <EyeIcon className="w-3.5 h-3.5" />
                Receipt
              </a>
            )}
            <ActionButton onClick={() => acceptOrder(order._id)} color="gold" icon={CheckCircleIcon} label="Accept" />
            <ActionButton onClick={() => rejectOrder(order._id)} color="red" icon={XCircleIcon} label="Reject" />
            <ActionButton onClick={() => viewDetails(order)} color="gray" icon={EyeIcon} label="View" />
            <ActionButton onClick={() => contactCustomer(order)} color="gray" icon={ChatBubbleLeftIcon} label="Contact" />
          </div>
        );
      case 'confirmed':
      case 'processing':
        return (
          <div className="flex flex-wrap gap-2">
            {order.status === 'confirmed' && (
              <ActionButton onClick={() => markAsProcessing(order._id)} color="gold" icon={CubeIcon} label="Start Processing" />
            )}
            <ActionButton onClick={() => markAsShipped(order)} color="gold" icon={TruckIcon} label="Ship" />
            <ActionButton onClick={() => printInvoice(order)} color="gray" icon={PrinterIcon} label="Print" />
            <ActionButton onClick={() => cancelOrder(order._id)} color="red" icon={XCircleIcon} label="Cancel" />
          </div>
        );
      case 'shipped':
        return (
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={() => markAsDelivered(order._id)} color="green" icon={CheckCircleIcon} label="Deliver" />
            <ActionButton onClick={() => updateTracking(order)} color="blue" icon={TruckIcon} label="Update Tracking" />
            <ActionButton onClick={() => printInvoice(order)} color="gray" icon={PrinterIcon} label="Print" />
          </div>
        );
      case 'delivered':
      case 'completed':
        return (
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={() => viewDetails(order)} color="gray" icon={DocumentTextIcon} label="Receipt" />
            <ActionButton onClick={() => printInvoice(order)} color="gray" icon={PrinterIcon} label="Invoice" />
          </div>
        );
      case 'rejected':
      case 'cancelled':
        return (
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={() => viewDetails(order)} color="gray" icon={EyeIcon} label="Details" />
            <ActionButton onClick={() => deleteOrder(order)} color="red" icon={TrashIcon} label="Delete" />
          </div>
        );
      default:
        return <ActionButton onClick={() => viewDetails(order)} color="gray" icon={EyeIcon} label="View" />;
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/artisan/dashboard')}
            className="inline-flex items-center gap-1 text-ethiopian-gold hover:text-ethiopian-gold/80 text-sm font-medium mb-4 transition-colors"
          >
            ← Back to Dashboard
          </button>
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
              const count = tab.key === 'all' ? summary.all :
                           tab.key === 'pending' ? summary.pending :
                           tab.key === 'processing' ? summary.processing :
                           tab.key === 'shipped' ? stats.shippedCount :
                           tab.key === 'custom' ? customOrders.length :
                           summary.completed;
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    filter === tab.key
                      ? 'bg-ethiopian-gold/10 text-ethiopian-gold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                    filter === tab.key ? 'bg-ethiopian-gold/20' : 'bg-gray-100'
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
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          order.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
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
                            <div>{order.createdAt ? new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</div>
                            <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                              {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
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
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Design Photo</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Request ID</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Design Type</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Request Date</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price Quote</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                    {customOrders.map((order) => (
                      <tr 
                        key={order._id} 
                        className="hover:bg-gray-50/80 transition cursor-pointer"
                        onClick={() => { setSelectedCustomOrder(order); setShowCustomDetailModal(true); }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {order.photos && (order.photos.front || order.photos.back) ? (
                              <img 
                                src={getFileUrl(order.photos.front || order.photos.back)} 
                                alt="Design" 
                                className="w-10 h-10 rounded-lg object-cover bg-gray-100 border border-gray-200"
                                crossOrigin="anonymous"
                                onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-product.svg'; }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center border border-amber-100 italic text-[8px] text-amber-400 text-center px-1 font-black">NO PHOTO</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">#{order._id.slice(-8).toUpperCase()}</div>
                          <div className="flex gap-1 mt-1">
                            {order.photos && (order.photos.front || order.photos.back) && (
                              <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-md font-bold uppercase border border-amber-100">With Photos</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {order.customer?.profile?.firstName} {order.customer?.profile?.lastName}
                          </div>
                          <div className="text-xs text-gray-400">{order.customer?.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                             <div className="p-1.5 bg-amber-50 rounded-lg">
                               <Scissors className="w-3.5 h-3.5 text-amber-600" />
                             </div>
                             <div>
                               <div className="text-sm font-bold text-gray-800 capitalize">{order.gender} {order.itemType}</div>
                               <div className="text-[10px] text-gray-400 font-medium">Custom Measurement</div>
                             </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 font-medium">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                          </div>
                          <div className="text-[11px] text-gray-400 font-mono flex items-center gap-1 mt-0.5">
                            <span>🕒</span>
                            <span>{order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`text-sm font-bold ${order.price ? 'text-amber-600' : 'text-gray-400'}`}>
                            {order.price ? `${order.price.toFixed(2)} ETB` : 'Not Quoted'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            order.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                            order.status === 'accepted' || order.status === 'price_quoted' ? 'bg-green-50 text-green-600 border-green-100' : 
                            'bg-gray-50 text-gray-600 border-gray-100'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => {
                              setSelectedCustomOrder(order);
                              setShowCustomDetailModal(true);
                            }}
                            className="text-ethiopian-gold hover:text-amber-700 font-bold text-xs uppercase tracking-widest flex items-center gap-1.5 px-3 py-1.5 bg-ethiopian-gold/10 rounded-lg border border-ethiopian-gold/20 transition-all"
                          >
                             <EyeIcon className="w-3.5 h-3.5" />
                             Review
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
                <div className="space-y-4 md:hidden">
                  {filtered.map((order) => {
                    const isDeletable = ['rejected', 'cancelled'].includes(order.status);
                    return (
                      <div key={order._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 ring-1 ring-gray-100">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">#{order.orderNumber || order._id?.slice(-8)}</p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-600 mt-1">
                              <span>{order.createdAt ? new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</span>
                              <span className="font-mono text-gray-500 font-medium">
                                {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold border ${
                            order.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-100' :
                            order.status === 'processing' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                            order.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            order.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            order.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                            'bg-gray-50 text-gray-600 border-gray-100'
                          }`}>
                            <span className="h-2.5 w-2.5 rounded-full bg-current" />
                            {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3 text-xs sm:text-sm text-gray-600">
                          <div className="rounded-2xl bg-gray-50 p-3">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">Customer</p>
                            <p className="mt-2 font-semibold text-gray-900">{order.customer?.profile?.firstName} {order.customer?.profile?.lastName}</p>
                          </div>
                          <div className="rounded-2xl bg-gray-50 p-3">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">Net Earnings</p>
                            <p className="mt-2 font-semibold text-gray-900">{(order.totals?.artisanEarning || (order.totals?.total * 0.85))?.toFixed(2)} ETB</p>
                          </div>
                          <div className="rounded-2xl bg-gray-50 p-3">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">Payment</p>
                            <p className="mt-2 font-semibold text-gray-900">{order.payment?.method || 'Unknown'}</p>
                          </div>
                          <div className="rounded-2xl bg-gray-50 p-3">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">Payout</p>
                            <p className="mt-2 font-semibold text-gray-900">{order.payoutStatus || 'Pending'}</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-3 rounded-3xl bg-indigo-50/50 p-3 text-[12px] text-indigo-700">
                            <TruckIcon className="w-4 h-4" />
                            <span>{order.isCustom ? 'Custom order' : 'Standard order'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {order.isCustom && order.photos?.front ? (
                              <img
                                src={getFileUrl(order.photos.front)}
                                alt="Custom Design"
                                className="w-14 h-14 rounded-3xl object-cover bg-amber-50 border border-amber-100"
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
                                className="w-14 h-14 rounded-3xl object-cover bg-gray-100 border border-gray-100"
                                crossOrigin="anonymous"
                                onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-product.svg'; }}
                              />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{order.isCustom ? 'Special Clothing Design' : order.items?.[0]?.product?.name || 'Product'}</p>
                              <p className="text-xs text-gray-500 mt-1 truncate">
                                {order.items?.[0]?.color ? `${order.items[0].color} • ` : ''}{order.items?.[0]?.size || 'Size N/A'}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 pt-2 mt-2 border-t border-gray-50">
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
                      <thead className="bg-gray-50">
                      <tr>
                        {bulkDeleteMode && (
                          <th className="px-4 py-3 w-10">
                            <input
                              type="checkbox"
                              checked={selectedOrders.length > 0 && selectedOrders.length === filtered.filter(o => ['rejected', 'cancelled'].includes(o.status)).length}
                              onChange={toggleSelectAll}
                              className="w-4 h-4 rounded border-gray-300 text-ethiopian-gold focus:ring-ethiopian-gold"
                            />
                          </th>
                        )}
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('common.order_id', 'Order')}</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('common.customer', 'Customer')}</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('nav.shop', 'Product')}</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('artisan_panel.total_revenue', 'Net Earning')}</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('checkout.billing_details', 'Payment & Payout')}</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('common.status', 'Status')}</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('common.action', 'Actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filtered.map((order) => {
                        const isDeletable = ['rejected', 'cancelled'].includes(order.status);
                        return (
                          <tr key={order._id} className="hover:bg-gray-50/80 transition">
                            {bulkDeleteMode && (
                              <td className="px-4 py-4">
                                {isDeletable ? (
                                  <input
                                    type="checkbox"
                                    checked={selectedOrders.includes(order._id)}
                                    onChange={() => toggleOrderSelection(order._id)}
                                    className="w-4 h-4 rounded border-gray-300 text-ethiopian-gold"
                                  />
                                ) : (
                                  <span className="text-gray-300 text-xs">N/A</span>
                                )}
                              </td>
                            )}
                            <td className="px-6 py-4">
                              <div className="text-sm font-semibold text-gray-900">#{order.orderNumber || order._id?.slice(-8)}</div>
                              <div className="text-xs text-gray-600 font-medium mt-1">
                                {order.createdAt ? new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                              </div>
                              <div className="text-[11px] text-gray-500 font-mono flex items-center gap-1 mt-0.5">
                                <span>🕒</span>
                                <span>{order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">
                                {order.customer?.profile?.firstName} {order.customer?.profile?.lastName}
                              </div>
                              <div className="flex flex-col gap-1 mt-1">
                                <span className="text-[10px] font-bold text-gray-400">
                                  {order.payment?.method} - <span className={order.payment?.status === 'Paid' ? 'text-green-600' : 'text-amber-600'}>{order.payment?.status}</span>
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {order.shippingAddress?.isAddressVisible ? order.shippingAddress?.phone : 'Phone Hidden'}
                                </span>
                                {!order.shippingAddress?.isAddressVisible && (
                                  <span className="text-[9px] text-amber-500 font-medium italic">Verify payment to reveal details</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="relative flex-shrink-0">
                                  {order.isCustom && order.photos?.front ? (
                                    <img
                                      src={getFileUrl(order.photos.front)}
                                      alt="Custom Design"
                                      className="w-10 h-10 rounded-lg object-cover bg-amber-50 border border-amber-100 shadow-sm"
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
                                      className="w-10 h-10 rounded-lg object-cover bg-gray-100 border border-gray-100"
                                      crossOrigin="anonymous"
                                      onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-product.svg'; }}
                                    />
                                  )}
                                  {order.isCustom && (
                                    <div className="absolute -top-1 -right-1 flex h-3 w-3">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {order.isCustom ? (
                                      <span className="text-ethiopian-gold font-bold">Special Clothing Design</span>
                                    ) : (
                                      order.items?.[0]?.product?.name || 'Product'
                                    )}
                                  </div>
                                  <div className="flex gap-1 mt-0.5">
                                    {order.items?.[0]?.color && (
                                      <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md font-bold uppercase border border-blue-100">
                                        {order.items[0].color}
                                      </span>
                                    )}
                                    {order.items?.[0]?.size && (
                                      <span className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-md font-bold uppercase border border-purple-100">
                                        {order.items[0].size}
                                      </span>
                                    )}
                                  </div>
                                  {order.items?.length > 1 && (
                                    <div className="text-xs text-gray-500">+{order.items.length - 1} more</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-bold text-ethiopian-gold">
                                {(order.totals?.artisanEarning || (order.totals?.total * 0.85))?.toFixed(2)} ETB
                              </div>
                              <div className="text-xs text-gray-400 font-normal">Total: {order.totals?.total?.toFixed(2)}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <span className={`px-2 py-0.5 text-[10px] rounded-full inline-block w-fit ${
                                  order.payment?.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  Pay: {order.payment?.status || 'Unpaid'}
                                </span>
                                <span className={`px-2 py-0.5 text-[10px] rounded-full inline-block w-fit ${
                                  order.payoutStatus === 'Paid' ? 'bg-blue-100 text-blue-800' :
                                  order.payoutStatus === 'Ready' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  Payout: {order.payoutStatus || 'Pending'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                                statusStyles[order.status] || 'bg-gray-100 text-gray-800 border-gray-200'
                              }`}>
                                {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
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
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                        currentPage === i + 1
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