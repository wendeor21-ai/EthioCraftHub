import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import {
  PlusCircle,
  ShoppingCart,
  ShoppingBag,
  Tag,
  AlertTriangle,
  DollarSign,
  Star,
  Shield,
  PackageOpen,
  Volume2,
  VolumeX,
  TrendingUp,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  Box,
  Truck,
  BarChart3,
  Home,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useSound } from '../../contexts/SoundContext';
import { useCustomTranslation } from '../../hooks/useCustomTranslation';
import GuidelinesModal from '../../components/artisan/GuidelinesModal';
import api from '../../utils/api';
import io from 'socket.io-client';
import { API_BASE_URL } from '../../config/api';
import { playNotificationSound } from '../../utils/soundUtils';

const ArtisanDashboard = ({ user }) => {
  const navigate = useNavigate();
  const { t } = useCustomTranslation();
  const isVerified = user?.verification?.status === 'approved';
  const { token } = useAuth();
  const { isMuted, toggleMute } = useSound();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => {
    return !sessionStorage.getItem('artisan_welcome_seen');
  });
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    revenue: 0,
    rating: 0,
    reviews: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [showGuidelines, setShowGuidelines] = useState(
    user?.role === 'artisan' && 
    !user?.hasAcceptedGuidelines && 
    user?.verification?.status !== 'approved'
  );
  const [missingDocs, setMissingDocs] = useState(false);

  const isMounted = useRef(true);
  const fetching = useRef(false);

  // Auto‑hide welcome banner after 30 seconds
  useEffect(() => {
    if (!showWelcome) return;
    // Mark as seen for this session immediately so it doesn't reappear on refresh
    sessionStorage.setItem('artisan_welcome_seen', 'true');
    const timer = setTimeout(() => setShowWelcome(false), 30000);
    return () => clearTimeout(timer);
  }, [showWelcome]);

  const loadStats = useCallback(async () => {
    if (!token || typeof token !== 'string') return;
    if (fetching.current) return;
    fetching.current = true;
    setLoading(true);
    setError(null);
    setFetchFailed(false);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch('/api/users/artisan/dashboard-stats', {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      const body = await res.json().catch(() => null) || {};
      const statsData = body.data || body.stats || body || {};

      if (isMounted.current) {
        // Never fall back to hardcoded values — always show real data or zero.
        // Hardcoded fallbacks caused data from other artisans to appear on the dashboard.
        const products = statsData.totalProducts ?? statsData.products ?? 0;
        const orders   = statsData.totalOrders   ?? statsData.orders   ?? 0;
        const revenue  = statsData.totalRevenue  ?? statsData.revenue  ?? 0;
        const rating   = statsData.averageRating ?? statsData.rating   ?? 0;
        const reviews  = statsData.totalReviews  ?? statsData.reviews  ?? 0;
        const performance = statsData.performance || { storeViews: 0, conversionRate: 0, satisfaction: 0 };

        // Normalise alert shape: backend sends { id, name, quantity, threshold }
        // Guard against any stray data by only keeping fields we expect.
        const lowStockAlerts = (statsData.lowStockAlerts || []).map(alert => ({
          id:          alert.id || alert._id,
          productName: alert.name || alert.productName || 'Unknown product',
          quantity:    alert.quantity ?? 0,
          threshold:   alert.threshold ?? 5,
        }));

        setStats({
          products,
          orders,
          revenue,
          rating,
          reviews,
          performance,
          lowStockAlerts,
        });
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      if (isMounted.current) {
        setError(err.message || 'Failed to load stats');
        setFetchFailed(true);
        // Do NOT fall back to hardcoded values — that would show fake/wrong data.
        // Keep zeros so the UI clearly shows the fetch failed.
        setStats({
          products: 0,
          orders: 0,
          revenue: 0,
          rating: 0,
          reviews: 0,
          performance: { storeViews: 0, conversionRate: 0, satisfaction: 0 },
          lowStockAlerts: [],
        });
      }
    } finally {
      clearTimeout(timeoutId);
      if (isMounted.current) setLoading(false);
      fetching.current = false;
    }
  }, [token]);

  useEffect(() => {
    isMounted.current = true;
    if (token && !fetchFailed) loadStats();
    
    // Check for missing mandatory documents
    if (user?.role === 'artisan') {
      const hasTradeLicense = !!(user.verification?.tradeLicense || user.profile?.businessInfo?.tradeLicenseNumber);
      const hasTIN = !!(user.verification?.tinCertificate || user.profile?.businessInfo?.tinNumber);
      if (!hasTradeLicense || !hasTIN) {
        setMissingDocs(true);
      }
    }
    
    return () => { isMounted.current = false; };
  }, [token, loadStats, fetchFailed, user]);

  const handleGuidelinesAccepted = async () => {
    try {
      // Re-fetch user or update local state
      setShowGuidelines(false);
      toast.success('Guidelines accepted successfully!');
      // Optionally reload the page or re-fetch auth user
      window.location.reload(); 
    } catch (err) {
      console.error('Error handling guidelines acceptance:', err);
    }
  };

  // Load recent activities
  const loadActivity = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/users/audit-logs?limit=5', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const body = await res.json().catch(() => null) || {};
      const logs = body?.data?.logs || body?.logs || (Array.isArray(body) ? body : []);
      const mapped = logs.map((l) => {
        const time = l.timestamp || l.createdAt || l.time || l.date || l.ts || '';
        const when = time ? new Date(time) : null;
        const rel = when ? formatRelativeTime(when) : '';
        let action = l.message || l.event || l.action || l.description || l.type || 'Activity';
        const details = l.details || {};
        const productId = details.productId || l.productId || (l.product?._id || l.product?.id) || null;
        const orderId = details.orderId || l.orderId || (l.order?._id || l.order?.id) || null;
        let targetPath = '/artisan/activity';
        if (productId) targetPath = `/products/${productId}`;
        else if (orderId) targetPath = `/orders/${orderId}`;
        return {
          action,
          meta: details.productName || details.orderNumber || l.info || l.description || '',
          time: rel,
          onClick: () => navigate(targetPath),
        };
      });
      if (isMounted.current) setRecentActivities(mapped);
    } catch (err) {
      console.error('Failed to load activity logs', err);
    }
  }, [token, navigate]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  // Socket.io for Real-time Dashboard Updates
  useEffect(() => {
    if (!user?._id) return;
    const socketUrl = API_BASE_URL.replace('/api', '');
    const newSocket = io(socketUrl, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5
    });
    
    newSocket.on('connect', () => {
      newSocket.emit('join', user._id);
    });
    
    newSocket.on('newOrder', (data) => {
      playNotificationSound();
      toast.success(`🛍️ New order #${data.orderNumber || data.orderId?.slice(-8)}`, { duration: 10000 });
      
      // Browser notification
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('New Order on EthioCraft Global', {
          body: `A new order has been placed! Order #${data.orderNumber || data.orderId?.slice(-8)}`,
        });
      }

      // Reload stats and activities automatically
      if (token && !fetchFailed) {
        loadStats();
        loadActivity();
      }
    });

    // Request browser notification permissions if not set
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      newSocket.off('newOrder');
      newSocket.disconnect();
    };
  }, [user?._id, loadStats, loadActivity, token, fetchFailed]);

  function formatRelativeTime(date) {
    const diff = Date.now() - date.getTime();
    const mins = Math.round(diff / (1000 * 60));
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
  }

  const formatETB = (value) => {
    try {
      return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(Number(value) || 0);
    } catch {
      return `ETB ${value.toLocaleString()}`;
    }
  };

  const quickActions = [
    { 
      icon: PlusCircle, 
      label: t('artisanDashboard.addProduct', 'Add Product'), 
      onClick: isVerified ? () => navigate('/artisan/add-product') : null, 
      color: isVerified ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-md transform active:scale-95 transition-all' : 'bg-gray-100 text-gray-400 cursor-not-allowed',
      disabled: !isVerified,
      tooltip: !isVerified ? t('artisanDashboard.accountApprovalRequired', "Account approval required to add products") : null
    },
    { icon: ShoppingBag, label: t('artisanDashboard.viewOrders', 'View Orders'), onClick: () => navigate('/artisan/orders'), color: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-md transform active:scale-95 transition-all' },
    { icon: Tag, label: t('artisanDashboard.manageStock', 'Manage Stock'), onClick: () => navigate('/artisan/inventory-alerts'), color: 'bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700 shadow-md transform active:scale-95 transition-all' },
    { icon: BarChart3, label: t('artisanDashboard.analytics', 'Analytics'), onClick: () => navigate('/artisan/analytics'), color: 'bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white hover:from-purple-600 hover:to-fuchsia-700 shadow-md transform active:scale-95 transition-all' },
  ];

  const performanceStats = [
    { label: t('artisanDashboard.storeViews', 'Store Views'), value: stats.performance?.storeViews ?? 12, unit: '%', change: '+12%', positive: true },
    { label: t('artisanDashboard.conversionRate', 'Conversion Rate'), value: stats.performance?.conversionRate ?? 3.5, unit: '%', change: '+0.5%', positive: true },
    { label: t('artisanDashboard.customerSatisfaction', 'Customer Satisfaction'), value: stats.rating ?? 4.2, unit: '/5', change: `${(stats.rating ?? 4.2).toFixed(1)}/5`, positive: true },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Artisan Guidelines Modal — Mandatory for all artisans */}
      {showGuidelines && (
        <GuidelinesModal onAccepted={handleGuidelinesAccepted} />
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 pt-4 pb-8">
            {/* Modern Header Section */}
        <AnimatePresence>
          {showWelcome && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, height: 0, marginBottom: 0, overflow: 'hidden' }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4"
            >
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
                  {t('dashboard.welcome_back', 'Welcome back, {{name}}', { name: user.profile?.firstName })} 👋
                </h2>
                <p className="text-sm sm:text-base text-gray-500 mt-1 max-w-xl">{t('artisanDashboard.subtitle', "Here’s a compact, mobile-first overview of your craft business today.")}</p>
              </div>
              
              <div className="flex items-center gap-3">
                 <button
                  onClick={loadStats}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 shadow-sm hover:shadow-md hover:bg-gray-50 transition-all disabled:opacity-50"
                  title="Refresh Stats"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>{t('artisanDashboard.refresh', "Refresh")}</span>
                </button>
                <button
                  onClick={toggleMute}
                  className="p-2.5 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all text-gray-600"
                  title={isMuted ? "Unmute Notifications" : "Mute Notifications"}
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        

        {/* KPI Cards */}
        {loading && stats.products === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 p-4 animate-pulse h-28"></div>
            ))}
          </div>
        ) : error && stats.products === 0 ? (
          <div className="bg-red-50/50 backdrop-blur-sm border border-red-100 rounded-2xl p-4 mb-6 flex items-center justify-between">
            <span className="text-red-600 text-sm font-medium">{t('artisanDashboard.failedToLoad', "Failed to load stats: {{error}}", { error })}</span>
            <button onClick={loadStats} className="px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors">{t('artisanDashboard.retry', "Retry")}</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <StatCard
              label={t('artisanDashboard.products', "Products")}
              value={stats.products}
              icon={PackageOpen}
              trend={"+3 " + t('artisanDashboard.thisMonth', "this month")}
              color="amber"
              onClick={() => navigate('/artisan/products')}
            />
            <StatCard
              label={t('artisanDashboard.orders', "Orders")}
              value={stats.orders}
              icon={ShoppingBag}
              trend={"+12% " + t('artisanDashboard.vsLastMonth', "vs last month")}
              color="amber"
              onClick={() => navigate('/artisan/orders')}
            />
            <StatCard
              label={t('artisanDashboard.revenue', "Revenue")}
              value={formatETB(stats.revenue)}
              icon={DollarSign}
              trend="+8.2%"
              color="emerald"
              trendPositive={true}
              onClick={() => navigate('/artisan/finance')}
            />
            <StatCard
              label={t('artisanDashboard.rating', "Rating")}
              value={stats.rating ? stats.rating.toFixed(1) : '—'}
              subtitle={`${stats.reviews} ${t('artisanDashboard.reviews', "reviews")}`}
              icon={Star}
              trend={stats.rating >= 4 ? t('artisanDashboard.excellent', "Excellent") : t('artisanDashboard.needsImprovement', "Needs improvement")}
              color={stats.rating >= 4 ? "emerald" : "amber"}
              trendPositive={stats.rating >= 4}
              onClick={() => navigate('/artisan/reviews')}
            />
          </div>
        )}

        {/* Low Stock Alerts */}
        {stats.lowStockAlerts && stats.lowStockAlerts.length > 0 && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="font-semibold text-red-800">{t('artisanDashboard.lowStockAlerts', "Low Stock Alerts")} ({stats.lowStockAlerts.length})</h3>
            </div>
            <div className="space-y-2">
              {stats.lowStockAlerts.map((alert, idx) => (
                <div key={alert.id || idx} className="flex items-center justify-between text-sm">
                  <span className="text-red-700">{alert.productName}</span>
                  <span className="text-red-600 font-medium">
                    {alert.quantity} {t('artisanDashboard.leftThreshold', "left (threshold: {{threshold}})", { threshold: alert.threshold })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Grid: Recent Activity + Insights + {t('artisanDashboard.quickActions', "Quick Actions")} */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column (Quick Actions & Pro Tip) - Now 2/5 width (~40%) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions (Now on the left top) */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-5 sm:p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-amber-50 rounded-full -mr-14 -mt-14 opacity-60 z-0"></div>
              <h3 className="font-bold text-gray-900 mb-5 relative z-10 text-lg">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 relative z-10">
                {quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className={`flex flex-col items-center justify-center gap-3 p-5 rounded-2xl transition-all duration-300 group
                      ${action.color} 
                      ${action.disabled ? 'opacity-50 grayscale cursor-not-allowed scale-95' : 'hover:-translate-y-2'}`}
                  >
                    <div className={`p-2.5 rounded-xl bg-white/20 group-hover:bg-white/30 transition-all ${action.disabled ? '' : 'group-hover:scale-110'}`}>
                      <action.icon className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold tracking-tight">{action.label}</span>
                    {action.disabled && (
                      <div className="absolute inset-0 bg-transparent" title={action.tooltip} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Pro Tip (Below Quick Actions) */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
               <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <LightBulbIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-black uppercase tracking-widest text-xs mb-1 text-blue-100">{t('artisanDashboard.expertProTip', "Expert Pro Tip")}</h3>
                  <p className="text-sm font-bold leading-relaxed">
                    "{t('artisanDashboard.proTipText', "Add high-quality photos and detailed descriptions to increase sales by up to 40%.")}"
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-white/30"></div>
                    <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">{t('artisanDashboard.growthGuide', "Growth Guide")}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Banner (If exists, keep it in this column) */}
            {(!isVerified || missingDocs) && (
              <div className="bg-gradient-to-br from-red-600 to-orange-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-[1.02] transition-all border-none">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <AlertTriangle className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                       <h3 className="font-black uppercase tracking-widest text-xs">{t('artisanDashboard.actionRequired', "Action Required")}</h3>
                    </div>
                    <p className="text-sm font-bold leading-snug">
                      {missingDocs 
                        ? "Mandatory Trade License and TIN documents are missing." 
                        : "Verification required before selling."}
                    </p>
                    <button
                      onClick={() => navigate('/artisan/verification')}
                      className="mt-4 w-full py-2.5 bg-white text-red-600 text-xs font-black rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
                    >
                      {missingDocs ? t('artisanDashboard.uploadDocuments', "Upload Documents") : t('artisanDashboard.verifyNow', "Verify Now")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column (Performance & Recent Activity) - Now 3/5 width (~60%) */}
          <div className="lg:col-span-3 space-y-6">
            {/* {t('artisanDashboard.performanceInsights', "Performance Insights")} (Now on the right top) */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 sm:p-6 hover:shadow-md transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="font-bold text-gray-900">Performance Insights</h3>
                </div>
                <button
                  onClick={() => navigate('/artisan/analytics')}
                  className="text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:underline px-3 py-1 rounded-full hover:bg-emerald-50 transition-all"
                >
                  Detailed report
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {performanceStats.map((stat, idx) => (
                  <div key={idx} className="group cursor-default">
                    <div className="flex justify-between text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                      <span>{stat.label}</span>
                      <span className="text-gray-900">
                        {stat.value}{stat.unit}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(stat.value, 100)}%` }}
                        transition={{ duration: 1, delay: idx * 0.2 }}
                        className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full rounded-full"
                      ></motion.div>
                    </div>
                    <div className="flex justify-end mt-2">
                      <span className={`text-xs font-black flex items-center gap-1 ${stat.positive ? 'text-emerald-600' : 'text-red-600'}`}>
                        {stat.positive ? '↑' : '↓'} {stat.change}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity (Below Performance Insights) */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
              <div className="px-4 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50/50 gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="font-bold text-gray-900">{t('artisanDashboard.recentActivity', "Recent Activity")}</h3>
                </div>
                <button
                  onClick={() => navigate('/artisan/activity')}
                  className="text-sm font-bold text-amber-600 hover:text-amber-700 hover:underline px-3 py-1 rounded-full hover:bg-amber-50 transition-all"
                >
                  View all
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity, idx) => (
                    <button
                      key={idx}
                      onClick={activity.onClick}
                      className="w-full px-4 py-4 flex items-center justify-between hover:bg-amber-50 group transition-all text-left"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-amber-700 transition-colors">{activity.action}</p>
                        {activity.meta && (
                          <p className="text-xs text-gray-500 mt-1 font-medium italic">{activity.meta}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[11px] font-bold text-gray-400 group-hover:text-amber-500">{activity.time}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-10 py-12 text-center text-gray-400 text-sm italic">
                    No recent activity to display
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const StatCard = ({ label, value, subtitle, icon: Icon, trend, trendPositive, color, onClick }) => {
  const isEmerald = color === 'emerald';
  const colorClass = isEmerald ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50';
  const trendClass = trendPositive ? 'text-emerald-600' : 'text-amber-600';

  return (
    <motion.div
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      onClick={onClick}
      className="bg-white rounded-3xl border border-gray-100 p-4 sm:p-5 shadow-sm hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between min-h-[150px] h-full"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-full -mr-12 -mt-12 group-hover:bg-amber-50 transition-colors duration-500"></div>
      
      <div className="flex items-start justify-between relative z-10 gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] text-gray-500 font-black uppercase tracking-widest">{label}</p>
          <div className="flex flex-wrap items-baseline gap-1 mt-2">
            <span className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tighter">{value}</span>
            {subtitle && <span className="text-[10px] text-gray-400 font-bold">({subtitle})</span>}
          </div>
        </div>
        <div className={`p-3 rounded-2xl transition-all duration-500 group-hover:rotate-12 ${colorClass} group-hover:scale-110 shadow-sm`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      
      {trend && (
        <div className="flex items-center gap-2 mt-auto relative z-10">
          <div className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${trendPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {trendPositive ? <TrendingUp className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {trend}
          </div>
        </div>
      )}
    </motion.div>
  );
};

// Missing icons (if not already imported from lucide-react)
const CheckCircleIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const XCircleIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const LightBulbIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

export default ArtisanDashboard;