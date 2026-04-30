import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Users, Package, ShoppingCart, DollarSign, BarChart3, RefreshCw, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCustomTranslation } from '../../hooks/useCustomTranslation';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { t } = useCustomTranslation();
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, activeArtisans: 0, monthlyOrders: 0, monthlyRevenue: 0, platformEarnings: 0 });
  const [pending, setPending] = useState({ artisanApplications: 0, productApprovals: 0 });
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/dashboard`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          setStats({
            totalUsers: data.users?.total || data.users?.reduce?.((s, g) => s + (g.count || 0), 0) || 0,
            activeArtisans: data.artisans?.active || data.users?.find?.(u => u._id === 'artisan')?.active || 0,
            monthlyOrders: data.orders?.totalOrders || 0,
            monthlyRevenue: data.orders?.totalRevenue || 0,
            platformEarnings: data.platformEarnings?.totalFees || 0,
          });

          setPending({
            artisanApplications: data.verifications?.find?.(v => v._id === 'pending')?.count || data.pendingArtisanApplications || 0,
            productApprovals: data.productsPending || 0,
          });
        } else {
          // graceful fallback
          const usersRes = await fetch(`${API_BASE_URL}/api/users`, { headers });
          if (usersRes.ok) {
            const ujson = await usersRes.json();
            if (!cancelled) setStats(s => ({ ...s, totalUsers: ujson.total || (ujson.users || []).length }));
          }
        }

        // pending products fallback
        try {
          const prodRes = await fetch(`${API_BASE_URL}/api/admin/products?status=pending`, { headers });
          if (prodRes.ok) {
            const prodJson = await prodRes.json();
            if (!cancelled) setPending(p => ({ ...p, productApprovals: Array.isArray(prodJson.products) ? prodJson.products.length : (prodJson.total || 0) }));
          }
        } catch (e) { }

        // audit logs
        try {
          const logsRes = await fetch(`${API_BASE_URL}/api/admin/audit-logs?limit=8`, { headers });
          if (logsRes.ok) {
            const logsJson = await logsRes.json();
            if (!cancelled) setActivities((logsJson.logs || []).map(l => ({ id: l._id || String(Math.random()), message: formatActivity(l, t), time: l.createdAt })));
          }
        } catch (e) { }

      } catch (err) {
        console.error('Failed to load admin dashboard', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token]);

  const formatCurrency = (value) => {
    try {
      return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', maximumFractionDigits: 0 }).format(value || 0);
    } catch (e) {
      return `ETB ${value}`;
    }
  };

  if (loading) return <div className="min-h-[200px] flex items-center justify-center"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6">
      {/* Modern Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {t('dashboard.welcome_back', 'Welcome back, {{name}}', { name: user.profile?.firstName })} 👋
          </h2>
          <p className="text-sm text-gray-500 mt-1">Platform administration and oversight overview.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 shadow-sm hover:shadow-md hover:bg-gray-50 transition-all"
            title="Refresh Dashboard"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <StatCard label={t('admin_panel.total_users', 'Total Users')} value={stats.totalUsers} icon={Users} color="sky" />
        <StatCard label={t('admin_panel.active_artisans', 'Active Artisans')} value={stats.activeArtisans} icon={Package} color="emerald" />
        <StatCard label={t('admin_panel.monthly_orders', 'Monthly Orders')} value={stats.monthlyOrders} icon={ShoppingCart} color="violet" />
        <StatCard label={t('admin_panel.total_revenue', 'Total Revenue')} value={formatCurrency(stats.monthlyRevenue)} icon={DollarSign} color="emerald" trendPositive={true} />
      </div>

      {/* Platform Earnings Card - Standardized Glassmorphism Highlight */}
      <motion.div 
        whileHover={{ y: -4 }}
        className="bg-white/80 backdrop-blur-md rounded-2xl border border-emerald-100 p-6 mb-6 shadow-sm hover:shadow-md transition-all"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">{t('artisan_panel.platform_earnings', 'Platform Earnings (5% Fee)')}</p>
            <h3 className="text-4xl font-black text-gray-900">{formatCurrency(stats.platformEarnings)}</h3>
            <p className="text-sm text-emerald-600 font-medium mt-2">{t('artisan_panel.platform_earnings_sub', 'Total fees collected from all completed sales')}</p>
          </div>
          <div className="p-5 rounded-2xl bg-emerald-50 text-emerald-600">
            <DollarSign size={40} strokeWidth={2.5} />
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.pending_actions', 'Pending Actions')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-amber-50 p-4 rounded-lg flex flex-col justify-between">
              <div>
                <p className="font-semibold text-amber-900">{t('admin_panel.artisan_applications', 'Artisan Applications')}</p>
                <p className="text-sm text-amber-700">
                  {t('admin_panel.apps_awaiting_review', '{{count}} applications awaiting review', { count: pending.artisanApplications })}
                </p>
              </div>
              <div className="mt-4">
                <button onClick={() => navigate('/admin/verify-artisans')} className="bg-amber-500 text-white px-4 py-2 rounded-lg font-medium">{t('admin_panel.review', 'Review')}</button>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg flex flex-col justify-between">
              <div>
                <p className="font-semibold text-blue-800">{t('admin_panel.product_approvals', 'Product Approvals')}</p>
                <p className="text-sm text-blue-700">
                  {t('admin_panel.products_pending_mod', '{{count}} products pending moderation', { count: pending.productApprovals })}
                </p>
              </div>
              <div className="mt-4">
                <button onClick={() => navigate('/admin/products?status=pending')} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium">{t('admin_panel.moderate', 'Moderate')}</button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.recent_activity', 'Recent Activity')}</h3>
            <button onClick={() => navigate('/admin/activity')} className="text-sm text-ethiopian-gold hover:text-ethiopian-earth font-medium">{t('dashboard.view_all', 'View All')}</button>
          </div>
          <div className="space-y-3">
            {activities.length === 0 && <p className="text-sm text-gray-500">{t('dashboard.no_recent_activity', 'No recent activity.')}</p>}
            {activities.map(a => (
              <ActivityItem key={a.id} item={a} onClick={() => navigate('/admin/activity')} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const formatActivity = (log, t) => {
  if (!log) return '';
  
  if (log.action === 'user_registered') {
    return `${t('sidebar.verify_artisans', 'Artisan')} ${log.details || log.userName || log.email || ''} ${t('common.status_pending', 'Registered')}`;
  }
  
  if (log.action === 'product_flagged') {
    return `${t('sidebar.products', 'Product')} ${log.details || log.title || ''} ${t('admin_panel.flag_order', 'Flagged')}`;
  }
  
  if (log.action === 'order_created') {
    return `${t('sidebar.manage_orders', 'Order')} ${log.details || log.orderNumber || ''} ${t('common.status_pending', 'Created')}`;
  }

  // Fallback to ensuring we return a string, never an object which crashes React
  if (log.message) {
    const msg = typeof log.message === 'object' ? JSON.stringify(log.message) : log.message;
    return t(`activity.${log.action}`, msg);
  }
  
  if (log.action) {
    const act = typeof log.action === 'object' ? JSON.stringify(log.action) : log.action;
    return t(`activity.${log.action}`, act);
  }

  // If the log itself is somehow just the raw object, stringify it securely
  return typeof log === 'object' ? JSON.stringify(log).substring(0, 100) + '...' : String(log);
};

const ActivityItem = ({ item, onClick }) => (
  <button onClick={onClick} className="w-full flex items-start space-x-3 hover:bg-gray-50 p-3 rounded-lg transition-colors text-left border border-transparent hover:border-gray-200">
    <div className="w-2 h-2 mt-2 rounded-full bg-green-500 flex-shrink-0"></div>
    <div className="flex-1">
      <p className="text-sm font-medium text-gray-900">{item.message}</p>
      <p className="text-xs text-gray-500 mt-1">{item.time ? new Date(item.time).toLocaleString() : ''}</p>
    </div>
  </button>
);

const StatCard = ({ label, value, icon: Icon, color, trendPositive }) => {
  const isEmerald = color === 'emerald';
  const colorClass = isEmerald ? 'text-emerald-600 bg-emerald-50' : 
                    color === 'sky' ? 'text-sky-600 bg-sky-50' :
                    color === 'violet' ? 'text-violet-600 bg-violet-50' : 'text-amber-600 bg-amber-50';

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/60 p-5 shadow-sm hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between h-32"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">{label}</p>
          <div className="mt-1">
            <span className="text-2xl font-black text-gray-900 leading-tight">{value}</span>
          </div>
        </div>
        <div className={`p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110 ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trendPositive && (
        <div className="flex items-center gap-1 mt-auto">
          <TrendingUp className="w-3 h-3 text-emerald-500" />
          <p className="text-[11px] font-bold text-emerald-600">Increasing</p>
        </div>
      )}
    </motion.div>
  );
};

export default AdminDashboard;
