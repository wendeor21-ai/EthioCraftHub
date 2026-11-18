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
  Wallet,
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
  RefreshCw,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useSound } from '../../contexts/SoundContext';
import { useCustomTranslation } from '../../hooks/useCustomTranslation';
import api from '../../utils/api';
import io from 'socket.io-client';
import { API_BASE_URL } from '../../config/api';
import { playNotificationSound } from '../../utils/soundUtils';

const ArtisanDashboard = ({ user, onSelectTab }) => {
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
  const [missingDocs, setMissingDocs] = useState(false);

  const isMounted = useRef(true);
  const fetching = useRef(false);

  // Auto-hide welcome banner after 30 seconds
  useEffect(() => {
    if (!showWelcome) return;
    sessionStorage.setItem('artisan_welcome_seen', 'true');
    const timer = setTimeout(() => setShowWelcome(false), 30000);
    return () => clearTimeout(timer);
  }, [showWelcome]);

  // Robust helper to get artisan business or real name
  const artisanDisplayName = 
    user?.profile?.businessInfo?.businessName ||
    user?.businessName ||
    (user?.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim() : null) ||
    user?.name ||
    (user?.email ? user.email.split('@')[0] : 'የእደ-ጥበብ ባለሙያ');

  const loadStats = useCallback(async () => {
    if (!token) return;
    if (fetching.current) return;
    fetching.current = true;
    setLoading(true);
    setError(null);
    setFetchFailed(false);

    try {
      const res = await api.get('/users/artisan/dashboard-stats');
      const statsData = res.data?.data || res.data?.stats || res.data || {};

      if (isMounted.current) {
        const products = statsData.totalProducts ?? statsData.products ?? 0;
        const orders   = statsData.totalOrders   ?? statsData.orders   ?? 0;
        const revenue  = statsData.totalRevenue  ?? statsData.revenue  ?? 0;
        const rating   = statsData.averageRating ?? statsData.rating   ?? 0;
        const reviews  = statsData.totalReviews  ?? statsData.reviews  ?? 0;
        const performance = statsData.performance || { storeViews: 0, conversionRate: 0, satisfaction: 0 };

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
      if (err.name === 'AbortError' || err.name === 'CanceledError') return;
      console.error('Dashboard fetch error:', err);
      if (isMounted.current) {
        setError(err.response?.data?.message || err.message || 'ስታቲስቲክስ መጫን አልተቻለም');
        setFetchFailed(true);
        setStats({
          products: 0,
          orders: 0,
          revenue: 0,
          rating: 0,
          reviews: 0,
          performance: { storeViews: 0, conversionRate: 0, satisfaction: 0 },
          lowStockAlerts: []
        });
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
      fetching.current = false;
    }
  }, [token]);

  const loadActivity = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/users/artisan/activity');
      if (isMounted.current) {
        const rawActivities = res.data?.data || res.data?.activities || res.data || [];
        const formatted = rawActivities.map(act => {
          let actionText = act.action || act.title || 'እንቅስቃሴ';
          let metaText = act.meta || act.description || '';
          let timeAgo = act.createdAt ? formatRelativeTime(new Date(act.createdAt)) : (act.time || 'አሁን');

          return {
            action: actionText,
            meta: metaText,
            time: timeAgo,
            onClick: () => {
              if (act.type === 'order' || act.orderId) {
                if (onSelectTab) onSelectTab('orders');
                else navigate('/artisan/orders');
              } else if (act.type === 'product' || act.productId) {
                if (onSelectTab) onSelectTab('products');
                else navigate('/artisan/products');
              }
            }
          };
        });
        setRecentActivities(formatted);
      }
    } catch (err) {
      console.error('Activity fetch error:', err);
    }
  }, [token, onSelectTab, navigate]);

  useEffect(() => {
    isMounted.current = true;
    loadStats();
    loadActivity();

    return () => {
      isMounted.current = false;
    };
  }, [loadStats, loadActivity]);

  function formatRelativeTime(date) {
    const diff = Date.now() - date.getTime();
    const mins = Math.round(diff / (1000 * 60));
    if (mins < 60) return `${mins} ደቂቃ በፊት`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} ሰዓት በፊት`;
    const days = Math.round(hours / 24);
    return `${days} ቀን በፊት`;
  }

  // Format Ethiopian Birr without any dollar sign
  const formatETB = (value) => {
    const num = Number(value) || 0;
    return `ETB ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const quickActions = [
    { 
      icon: PlusCircle, 
      label: 'ምርት አክል',
      subLabel: 'Add Product', 
      onClick: isVerified ? () => (onSelectTab ? onSelectTab('add-product') : navigate('/artisan/add-product')) : null, 
      color: isVerified 
        ? 'bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-xs' 
        : 'bg-gray-100 text-gray-400 cursor-not-allowed',
      disabled: !isVerified,
      tooltip: !isVerified ? 'ምርት ለመጨመር መለያዎ መረጋገጥ አለበት' : null
    },
    { 
      icon: ShoppingBag, 
      label: 'ትዕዛዞችን እይ',
      subLabel: 'View Orders', 
      onClick: () => (onSelectTab ? onSelectTab('orders') : navigate('/artisan/orders')), 
      color: 'bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white shadow-xs' 
    },
    { 
      icon: Tag, 
      label: 'ክምችት አስተዳድር',
      subLabel: 'Manage Stock', 
      onClick: () => (onSelectTab ? onSelectTab('inventory-alerts') : navigate('/artisan/inventory-alerts')), 
      color: 'bg-gradient-to-br from-amber-700 to-orange-800 hover:from-amber-800 hover:to-orange-900 text-white shadow-xs' 
    },
    { 
      icon: BarChart3, 
      label: 'የሽያጭ ትንታኔ',
      subLabel: 'Analytics', 
      onClick: () => (onSelectTab ? onSelectTab('reports') : navigate('/artisan/analytics')), 
      color: 'bg-gradient-to-br from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white shadow-xs' 
    },
  ];

  const performanceStats = [
    { label: 'የሱቅ ጎብኝዎች (Store Views)', value: stats.performance?.storeViews ?? 12, unit: '%', change: '+12%', positive: true },
    { label: 'የግዢ ምጣኔ (Conversion Rate)', value: stats.performance?.conversionRate ?? 3.5, unit: '%', change: '+0.5%', positive: true },
    { label: 'የደንበኞች እርካታ (Satisfaction)', value: stats.rating ? Number(stats.rating).toFixed(1) : '4.0', unit: '/5', change: `${stats.rating ? Number(stats.rating).toFixed(1) : '4.0'}/5`, positive: true },
  ];

  return (
    <div className="w-full bg-[#F8F9FB] min-h-[calc(100vh-80px)] font-['Times_New_Roman',_Times,_serif,_'Noto_Sans_Ethiopic'] text-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 pt-4 pb-8">
        
        {/* Welcome Header Section */}
        <AnimatePresence>
          {showWelcome && (
            <motion.div 
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16, height: 0, marginBottom: 0, overflow: 'hidden' }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200/80 shadow-xs"
            >
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight leading-tight">
                  እንኳን ደህና መጡ፣ {artisanDisplayName} 👋
                </h2>
                <p className="text-xs text-gray-500 mt-0.5 max-w-xl">
                  የእደ-ጥበብ ስራዎችዎ፣ ትዕዛዞችዎ እና የገቢ ሁኔታዎ ማጠቃለያ
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={loadStats}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-100 transition-all disabled:opacity-50"
                  title="አድስ (Refresh Stats)"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>አድስ</span>
                </button>
                <button
                  onClick={toggleMute}
                  className="p-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all text-gray-600"
                  title={isMuted ? "ድምፅ ክፈት" : "ድምፅ ዝጋ"}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4 KPI Cards - Professional 12px & NO Dollar Sign */}
        {loading && stats.products === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-3 animate-pulse h-24"></div>
            ))}
          </div>
        ) : error && stats.products === 0 ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-center justify-between">
            <span className="text-red-700 text-xs font-medium">{error}</span>
            <button onClick={loadStats} className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors">
              እንደገና ሞክር
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 mb-4">
            {/* 1. Products */}
            <StatCard
              label="ምርቶች (PRODUCTS)"
              value={stats.products}
              icon={PackageOpen}
              trend="+3 በዚህ ወር"
              color="amber"
              onClick={() => (onSelectTab ? onSelectTab('products') : navigate('/artisan/products'))}
            />

            {/* 2. Orders */}
            <StatCard
              label="ትዕዛዞች (ORDERS)"
              value={stats.orders}
              icon={ShoppingBag}
              trend="+12% ካለፈው ወር"
              color="amber"
              onClick={() => (onSelectTab ? onSelectTab('orders') : navigate('/artisan/orders'))}
            />

            {/* 3. Revenue - Wallet icon, ETB format, NO $ SIGN */}
            <StatCard
              label="ጠቅላላ ሽያጭ (REVENUE)"
              value={formatETB(stats.revenue)}
              icon={Wallet}
              trend="+8.2% እድገት"
              color="emerald"
              trendPositive={true}
              onClick={() => (onSelectTab ? onSelectTab('finance') : navigate('/artisan/finance'))}
            />

            {/* 4. Rating */}
            <StatCard
              label="ደረጃ (RATING)"
              value={stats.rating ? Number(stats.rating).toFixed(1) : '4.0'}
              subtitle={`${stats.reviews || 1} ግምገማዎች`}
              icon={Star}
              trend={stats.rating >= 4 || !stats.rating ? "ምርጥ (Excellent)" : "ማሻሻያ ያስፈልጋል"}
              color="emerald"
              trendPositive={true}
              onClick={() => (onSelectTab ? onSelectTab('reviews') : navigate('/artisan/reviews'))}
            />
          </div>
        )}

        {/* Low Stock Alerts */}
        {stats.lowStockAlerts && stats.lowStockAlerts.length > 0 && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <h3 className="font-bold text-red-800 text-xs">
                ዝቅተኛ ክምችት ማስጠንቀቂያ ({stats.lowStockAlerts.length})
              </h3>
            </div>
            <div className="space-y-1.5">
              {stats.lowStockAlerts.map((alert, idx) => (
                <div key={alert.id || idx} className="flex items-center justify-between text-xs bg-white/70 px-2.5 py-1.5 rounded-lg border border-red-100">
                  <span className="text-red-900 font-semibold">{alert.productName}</span>
                  <span className="text-red-700 font-medium">
                    {alert.quantity} ብቻ ቀርቷል (መነሻ: {alert.threshold})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          
          {/* Left Column (Quick Actions & Pro Tip) - 2/5 width */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Quick Actions - Attractive, Professional Ethiopian Palette */}
            <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-3.5 sm:p-4 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                <h3 className="font-bold text-gray-900 text-xs sm:text-sm flex items-center space-x-1.5">
                  <span>ፈጣን ተግባራት</span>
                  <span className="text-[10px] text-gray-400 font-normal">(Quick Actions)</span>
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                {quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 group text-center ${action.color} ${action.disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'active:scale-98 hover:shadow-sm'}`}
                    title={action.tooltip || action.label}
                  >
                    <div className="p-2 rounded-lg bg-white/15 mb-1 group-hover:scale-105 transition-transform">
                      <action.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs font-bold leading-tight text-white">{action.label}</span>
                    <span className="text-[10px] text-white/70 font-medium mt-0.5">{action.subLabel}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pro Tip - Professional Craft Growth Guide */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-4 text-white shadow-xs border border-slate-800">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold uppercase tracking-wider text-[11px] text-amber-400 mb-1">
                    የባለሙያ ጠቃሚ ምክር (Expert Pro Tip)
                  </h3>
                  <p className="text-xs text-gray-200 leading-relaxed font-normal">
                    "ጥራት ያላቸው የምርት ፎቶዎችን እና ዝርዝር መግለጫዎችን ማከል ሽያጭዎን እስከ 40% ያሳድጋል።"
                  </p>
                  <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>የስራ ዕድገት መመሪያ (Growth Guide)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Alert Banner if unverified */}
            {(!isVerified || missingDocs) && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3.5">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-bold text-xs text-amber-900">
                      የማረጋገጫ ሰነድ ያስፈልጋል (Verification Required)
                    </h4>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">
                      ምርቶችን በቀጥታ ለመሸጥ የንግድ ፈቃድ ወይም የታክስ ሰነድ ማረጋገጫ ያጠናቅቁ።
                    </p>
                    <button
                      onClick={() => (onSelectTab ? onSelectTab('verification') : navigate('/artisan/verification'))}
                      className="mt-2.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors shadow-xs"
                    >
                      አሁን አረጋግጥ (Verify Now)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column (Performance & Recent Activity) - 3/5 width */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Performance Insights */}
            <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-3.5 sm:p-4">
              <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-xs sm:text-sm">
                      የስራ አፈፃፀም (Performance Insights)
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => (onSelectTab ? onSelectTab('reports') : navigate('/artisan/analytics'))}
                  className="text-xs font-bold text-amber-700 hover:text-amber-900 hover:underline transition-all"
                >
                  ዝርዝር ሪፖርት ›
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {performanceStats.map((stat, idx) => (
                  <div key={idx} className="bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                    <div className="flex justify-between items-center text-[11px] font-semibold text-gray-600 mb-1.5">
                      <span className="truncate">{stat.label}</span>
                      <span className="text-gray-900 font-bold ml-1">
                        {stat.value}{stat.unit}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        style={{ width: `${Math.min(parseFloat(stat.value) * 20, 100)}%` }}
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                      />
                    </div>
                    <div className="flex justify-end mt-1 text-[10px] font-bold text-emerald-700">
                      <span>↑ {stat.change}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-700" />
                  <h3 className="font-bold text-gray-900 text-xs sm:text-sm">
                    የቅርብ ጊዜ እንቅስቃሴዎች (Recent Activity)
                  </h3>
                </div>
                <button
                  onClick={() => (onSelectTab ? onSelectTab('reports') : navigate('/artisan/activity'))}
                  className="text-xs font-bold text-amber-700 hover:text-amber-900 hover:underline transition-all"
                >
                  ሁሉንም እይ
                </button>
              </div>

              <div className="divide-y divide-gray-100">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity, idx) => (
                    <button
                      key={idx}
                      onClick={activity.onClick}
                      className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-amber-50/30 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-xs font-semibold text-gray-900 truncate">{activity.action}</p>
                        {activity.meta && (
                          <p className="text-[11px] text-gray-500 truncate mt-0.5">{activity.meta}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0 font-medium">
                        {activity.time}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-6 py-8 text-center text-gray-400 text-xs">
                    ምንም አዲስ እንቅስቃሴ የለም (No recent activity)
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

// Clean Helper StatCard Component - NO DOLLAR SIGN
const StatCard = ({ label, value, subtitle, icon: Icon, trend, trendPositive, color, onClick }) => {
  const isEmerald = color === 'emerald';
  const colorClass = isEmerald ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-amber-700 bg-amber-50 border-amber-100';

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200/90 p-3 shadow-xs hover:border-amber-400 transition-all cursor-pointer flex flex-col justify-between min-h-[90px] sm:min-h-[105px] h-full"
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider truncate">{label}</p>
          <div className="flex flex-wrap items-baseline gap-1 mt-1">
            <span className="text-base sm:text-lg md:text-xl font-bold text-gray-900 tracking-tight leading-tight">{value}</span>
            {subtitle && <span className="text-[10px] text-gray-400 font-normal">({subtitle})</span>}
          </div>
        </div>
        <div className={`p-1.5 sm:p-2 rounded-lg border ${colorClass} shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${trendPositive ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
            {trend}
          </span>
        </div>
      )}
    </div>
  );
};

export default ArtisanDashboard;
