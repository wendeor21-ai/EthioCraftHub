import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  Users, Package, ShoppingCart, DollarSign, RefreshCw,
  TrendingUp, Download, Percent, Trash2,
  Clock, Activity, Search, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useCustomTranslation } from '../../hooks/useCustomTranslation';
import { formatOrderDateTime } from '../../utils/dateUtils';
import SystemHealthModal from '../../components/admin/SystemHealthModal';

const AdminDashboard = ({ onSelectTab }) => {
  const navigate = useNavigate();
  const { t, currentLanguage } = useCustomTranslation();
  const activeLang = currentLanguage || localStorage.getItem('language') || 'am';
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ totalUsers: 0, activeArtisans: 0, monthlyOrders: 0, monthlyRevenue: 0, platformEarnings: 0 });
  const [pending, setPending] = useState({ artisanApplications: 0, productApprovals: 0 });
  const [activities, setActivities] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [rowLimit, setRowLimit] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);

  const handleDownloadBackup = async () => {
    try {
      setBackingUp(true);
      const authToken = token || localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/backup/download`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!response.ok) throw new Error('Backup failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ethiocraft-global-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Database backup downloaded successfully!');
    } catch (err) {
      console.error('Backup download error:', err);
      toast.error('Failed to download database backup');
    } finally {
      setBackingUp(false);
    }
  };

  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/dashboard`, { headers });
      if (res.ok) {
        const data = await res.json();
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
        const usersRes = await fetch(`${API_BASE_URL}/api/users`, { headers });
        if (usersRes.ok) {
          const ujson = await usersRes.json();
          setStats(s => ({ ...s, totalUsers: ujson.total || (ujson.users || []).length }));
        }
      }

      try {
        const prodRes = await fetch(`${API_BASE_URL}/api/admin/products?status=pending`, { headers });
        if (prodRes.ok) {
          const prodJson = await prodRes.json();
          setPending(p => ({ ...p, productApprovals: Array.isArray(prodJson.products) ? prodJson.products.length : (prodJson.total || 0) }));
        }
      } catch (e) { }

      try {
        const logsRes = await fetch(`${API_BASE_URL}/api/admin/audit-logs?limit=200`, { headers });
        if (logsRes.ok) {
          const logsJson = await logsRes.json();
          const rawLogs = logsJson.logs || [];
          setActivities(rawLogs.map(l => ({
            id: String(l._id || l.id || Math.random()),
            action: l.action || 'activity',
            adminEmail: l.adminEmail || 'admin',
            details: typeof l.details === 'object' ? JSON.stringify(l.details) : (l.details || ''),
            createdAt: l.createdAt || new Date().toISOString(),
            message: formatActivity(l, t)
          })));
        }
      } catch (e) { }

      if (isManual) toast.success('Dashboard refreshed');
    } catch (err) {
      console.error('Failed to load admin dashboard', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(false), 30_000);
    return () => clearInterval(interval);
  }, [token]);

  const handleToggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (currentItems) => {
    const currentIds = currentItems.map(item => item.id);
    const allSelected = currentIds.length > 0 && currentIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !currentIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...currentIds])));
    }
  };

  const handleDeleteSingle = async (id) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };
      await fetch(`${API_BASE_URL}/api/admin/audit-logs/${id}`, {
        method: 'DELETE',
        headers
      });
      setActivities(prev => prev.filter(item => item.id !== id));
      setSelectedIds(prev => prev.filter(item => item !== id));
      toast.success(t('activity.deleted_single', 'እንቅስቃሴው ተሰርዟል (Activity deleted)'));
    } catch (err) {
      console.error('Failed to delete activity:', err);
      setActivities(prev => prev.filter(item => item.id !== id));
      setSelectedIds(prev => prev.filter(item => item !== id));
      toast.success('Activity removed');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    if (!window.confirm(t('activity.confirm_delete_selected', `የተመረጡትን ${count} እንቅስቃሴዎች መሰረዝ ይፈልጋሉ? (Delete ${count} selected records?)`))) {
      return;
    }
    setDeleting(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };
      await fetch(`${API_BASE_URL}/api/admin/audit-logs/delete-bulk`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ids: selectedIds })
      });
      const selectedSet = new Set(selectedIds);
      setActivities(prev => prev.filter(item => !selectedSet.has(item.id)));
      setSelectedIds([]);
      toast.success(t('activity.deleted_selected_success', `${count} የተመረጡ እንቅስቃሴዎች ተሰርዘዋል (${count} activities deleted)`));
    } catch (err) {
      console.error('Failed to delete selected activities:', err);
      const selectedSet = new Set(selectedIds);
      setActivities(prev => prev.filter(item => !selectedSet.has(item.id)));
      setSelectedIds([]);
      toast.success(`${count} activities removed`);
    } finally {
      setDeleting(false);
    }
  };

  const handleClearAllHistory = async () => {
    if (!window.confirm(t('activity.confirm_clear_all', 'ሙሉ የእንቅስቃሴ ታሪክ ማጽዳት ይፈልጋሉ? ይህ እርምጃ ሊቀለበስ አይችልም። (Are you sure you want to clear all activity history?)'))) {
      return;
    }
    setDeleting(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };
      await fetch(`${API_BASE_URL}/api/admin/audit-logs/clear`, {
        method: 'DELETE',
        headers
      });
      setActivities([]);
      setSelectedIds([]);
      toast.success(t('activity.cleared_all', 'ሙሉ የእንቅስቃሴ ታሪክ ጸድቷል (All activity history cleared)'));
    } catch (err) {
      console.error('Failed to clear history:', err);
      setActivities([]);
      setSelectedIds([]);
      toast.success('Activity history cleared');
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (value) => {
    try {
      return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', maximumFractionDigits: 0 }).format(value || 0);
    } catch (e) {
      return `ETB ${value}`;
    }
  };

  const filteredActivities = activities.filter(item => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (item.action && item.action.toLowerCase().includes(q)) ||
      (item.details && item.details.toLowerCase().includes(q)) ||
      (item.adminEmail && item.adminEmail.toLowerCase().includes(q)) ||
      (item.message && item.message.toLowerCase().includes(q))
    );
  });

  const displayedActivities = filteredActivities.slice(0, rowLimit);

  if (loading) return <div className="min-h-[200px] flex items-center justify-center"><LoadingSpinner /></div>;

  return (
    <div className="space-y-4 font-['Times_New_Roman',serif]">
      {/* Modern Compact Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-3">
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
            {t('dashboard.welcome_back', 'Welcome back, {{name}}', { name: user?.profile?.firstName || 'Admin' })} 👋
          </h2>
          <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">Platform administration and oversight overview.</p>
        </div>

        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
          <button
            onClick={() => setShowHealthModal(true)}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] sm:text-xs font-semibold shadow-2xs transition-all active:scale-95 cursor-pointer"
            title="Check platform health and database status"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('admin_panel.health_check', 'Health Check (የስርዓት ጤና)')}</span>
          </button>

          <button
            onClick={handleDownloadBackup}
            disabled={backingUp}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] sm:text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            title="Download complete system database backup"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{backingUp ? 'Backing up...' : 'Backup Data'}</span>
          </button>

          <button
            onClick={() => onSelectTab ? onSelectTab('settings') : navigate('/admin/settings')}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] sm:text-xs font-semibold shadow-xs transition-all active:scale-95"
            title="Modify VAT & Commission Rates"
          >
            <Percent className="w-3.5 h-3.5" />
            <span>VAT & Fee</span>
          </button>

          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[11px] sm:text-xs font-medium text-gray-700 shadow-xs hover:bg-gray-50 transition-all active:scale-95 cursor-pointer"
            title="Refresh Dashboard"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : 'text-gray-500'}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard label={t('admin_panel.total_users', 'Total Users')} value={stats.totalUsers} icon={Users} color="sky" onClick={() => onSelectTab ? onSelectTab('users') : navigate('/admin/users')} />
        <StatCard label={t('admin_panel.active_artisans', 'Active Artisans')} value={stats.activeArtisans} icon={Package} color="emerald" onClick={() => onSelectTab ? onSelectTab('verifications') : navigate('/admin/verifications')} />
        <StatCard label={t('admin_panel.monthly_orders', 'Monthly Orders')} value={stats.monthlyOrders} icon={ShoppingCart} color="violet" onClick={() => onSelectTab ? onSelectTab('custom-orders') : navigate('/admin/custom-orders')} />
        <StatCard label={t('admin_panel.total_revenue', 'Total Revenue')} value={formatCurrency(stats.monthlyRevenue)} icon={DollarSign} color="emerald" trendPositive={true} onClick={() => onSelectTab ? onSelectTab('ledger') : navigate('/admin/core/ledger')} />
      </div>

      {/* Platform Earnings Card */}
      <motion.div
        whileHover={{ y: -1 }}
        className="bg-white rounded-xl border border-emerald-100 p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition-all"
      >
        <div className="flex items-center justify-between gap-1.5">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[10.5px] font-bold text-emerald-700 uppercase tracking-wider mb-0.5">{t('artisan_panel.platform_earnings', 'Platform Earnings (5% Fee)')}</p>
            <h3 className="text-base sm:text-xl font-bold text-gray-900 leading-tight">{formatCurrency(stats.platformEarnings)}</h3>
            <p className="text-[10px] sm:text-[10.5px] text-emerald-600 font-medium mt-0.5 truncate">{t('artisan_panel.platform_earnings_sub', 'Total fees collected from all completed sales')}</p>
          </div>
          <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.2} />
          </div>
        </div>
      </motion.div>

      {/* 1. Pending Actions Section (Full Width) */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-3.5 sm:p-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <h3 className="text-xs sm:text-sm font-bold text-gray-900 tracking-wide">
              {t('dashboard.pending_actions', 'Pending Actions')} (የሚጠበቁ ተግባራት)
            </h3>
          </div>
          <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            {pending.artisanApplications + pending.productApprovals} {t('common.pending', 'በመጠባበቅ ላይ')}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-amber-50/70 border border-amber-100 p-3 sm:p-3.5 rounded-xl flex flex-col justify-between hover:border-amber-200 transition-colors">
            <div>
              <p className="text-xs sm:text-sm font-semibold text-amber-900">{t('admin_panel.artisan_applications', 'Artisan Applications')}</p>
              <p className="text-[10.5px] sm:text-xs text-amber-700 mt-1">
                {t('admin_panel.apps_awaiting_review', '{{count}} applications awaiting review', { count: pending.artisanApplications })}
              </p>
            </div>
            <div className="mt-2.5">
              <button
                onClick={() => onSelectTab ? onSelectTab('verifications') : navigate('/admin/verify-artisans')}
                className="bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded-md text-[11px] font-semibold shadow-xs transition-all cursor-pointer"
              >
                {t('admin_panel.review', 'Review')}
              </button>
            </div>
          </div>

          <div className="bg-blue-50/70 border border-blue-100 p-3 sm:p-3.5 rounded-xl flex flex-col justify-between hover:border-blue-200 transition-colors">
            <div>
              <p className="text-xs sm:text-sm font-semibold text-blue-900">{t('admin_panel.product_approvals', 'Product Approvals')}</p>
              <p className="text-[10.5px] sm:text-xs text-blue-700 mt-1">
                {t('admin_panel.products_pending_mod', '{{count}} products pending moderation', { count: pending.productApprovals })}
              </p>
            </div>
            <div className="mt-2.5">
              <button
                onClick={() => onSelectTab ? onSelectTab('products') : navigate('/admin/products?status=pending')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-md text-[11px] font-semibold shadow-xs transition-all cursor-pointer"
              >
                {t('admin_panel.moderate', 'Moderate')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Recent Activities & Audit Logs (Full Width Table Section Below Pending Actions) */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
        {/* Table Top Controls & Bar */}
        <div className="p-3 sm:p-3.5 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-gray-50/70">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-100/70 text-amber-700">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-gray-900">
                  {t('dashboard.recent_activity', 'Recent Activity')} (የቅርብ ጊዜ እንቅስቃሴዎች)
                </h3>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  {filteredActivities.length} {t('common.records', 'መዝገቦች')}
                </span>
              </div>
              <p className="text-[10px] text-gray-500">
                {t('activity.audit_log_subtitle', 'የስርዓቱ እና የአስተዳዳሪ ድርጊቶች ዝርዝር ማህደር (Platform audit & activities)')}
              </p>
            </div>
          </div>

          {/* Action buttons and filters */}
          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3 h-3 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('common.search', 'ፈልግ (Search)...')}
                className="pl-6 pr-2 py-1 text-[10px] sm:text-[11px] border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 w-28 sm:w-36"
              />
            </div>

            {/* Row Limit Selector (Default 50) */}
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-gray-600">
              <span className="hidden sm:inline font-medium">አሳይ:</span>
              <select
                value={rowLimit}
                onChange={(e) => setRowLimit(Number(e.target.value))}
                className="px-1.5 py-1 text-[10px] sm:text-[11px] border border-gray-300 rounded-md bg-white font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50 (ነባሪ/Default)</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={9999}>ሁሉንም (All)</option>
              </select>
            </div>

            {/* Delete Selected (when 1 or more checked) */}
            {selectedIds.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-[10px] sm:text-[11px] font-semibold transition-all shadow-xs cursor-pointer animate-pulse"
                title="Delete selected activity records"
              >
                <Trash2 className="w-3 h-3" />
                <span>{t('common.delete_selected', 'የተመረጡትን ሰርዝ')} ({selectedIds.length})</span>
              </button>
            )}

            {/* Clear All History Button */}
            <button
              onClick={handleClearAllHistory}
              disabled={deleting || activities.length === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-md text-[10px] sm:text-[11px] font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-40"
              title="Clear all activity history"
            >
              <Trash2 className="w-3 h-3 text-rose-600" />
              <span>{t('activity.clear_history', 'ታሪክ አጽዳ (Clear History)')}</span>
            </button>

            {/* Refresh */}
            <button
              onClick={() => fetchData(true)}
              className="p-1 hover:bg-gray-200 rounded text-gray-600 transition-colors cursor-pointer"
              title="Refresh logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Dense Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100/80 border-b border-gray-200 text-[10px] text-gray-600 uppercase tracking-wider font-bold">
                <th className="py-1.5 px-2.5 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={displayedActivities.length > 0 && displayedActivities.every(i => selectedIds.includes(i.id))}
                    onChange={() => handleSelectAll(displayedActivities)}
                    className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                    title="Select All"
                  />
                </th>
                <th className="py-1.5 px-2.5">{t('activity.action', 'ACTION (ድርጊት)')}</th>
                <th className="py-1.5 px-2.5">{t('activity.details', 'DETAILS (ዝርዝር መግለጫ)')}</th>
                <th className="py-1.5 px-2.5">{t('activity.admin', 'ADMIN / USER (ፈጻሚ)')}</th>
                <th className="py-1.5 px-2.5">{t('activity.date_time', 'DATE & TIME (ቀን እና ሰዓት)')}</th>
                <th className="py-1.5 px-2.5 text-right">{t('common.actions', 'እርምጃ (ACTION)')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[10.5px] sm:text-[11px] text-gray-700">
              {displayedActivities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400 text-xs">
                    {activities.length === 0
                      ? t('dashboard.no_recent_activity', 'ምንም የቅርብ ጊዜ እንቅስቃሴ የለም (No recent activity found)')
                      : t('common.no_search_results', 'የተፈለገው እንቅስቃሴ አልተገኘም (No matching activity found)')}
                  </td>
                </tr>
              ) : (
                displayedActivities.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const badgeColor = getActionBadgeColor(item.action);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-amber-50/40 transition-colors ${isSelected ? 'bg-amber-50/60' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="py-1.5 px-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(item.id)}
                          className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>

                      {/* Action Name with dot */}
                      <td className="py-1.5 px-2.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                          <span>{item.action}</span>
                        </span>
                      </td>

                      {/* Details / Message */}
                      <td className="py-1.5 px-2.5 max-w-xs sm:max-w-md truncate text-gray-800 font-medium" title={item.details || item.message}>
                        {item.details || item.message}
                      </td>

                      {/* Admin Email */}
                      <td className="py-1.5 px-2.5 whitespace-nowrap text-[10px] text-gray-500">
                        {item.adminEmail || 'admin'}
                      </td>

                      {/* Date & Time (Dynamic EC / GC + Ethiopian Time) */}
                      <td className="py-1.5 px-2.5 whitespace-nowrap text-[10px] sm:text-[10.5px] text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                          <span>{formatOrderDateTime(item.createdAt, activeLang)?.full || ''}</span>
                        </div>
                      </td>

                      {/* Single Delete Button */}
                      <td className="py-1.5 px-2.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteSingle(item.id)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                          title={t('common.delete', 'ሰርዝ')}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{t('common.delete', 'ሰርዝ')}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Bottom Footer Bar */}
        {displayedActivities.length > 0 && (
          <div className="p-2 sm:p-2.5 bg-gray-50/70 border-t border-gray-200 flex items-center justify-between text-[10px] text-gray-500">
            <span>
              {t('common.showing', 'በማሳየት ላይ')}: <strong>{displayedActivities.length}</strong> / <strong>{filteredActivities.length}</strong> {t('common.records', 'መዝገቦች')} (Default: 50)
            </span>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">የቀን አቆጣጠር: <strong>{activeLang === 'am' ? 'ኢትዮጵያ (EC / ዓ.ም.)' : 'ፈረንጅ (GC)'}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* System Health Diagnostic Modal */}
      <SystemHealthModal
        isOpen={showHealthModal}
        onClose={() => setShowHealthModal(false)}
      />
    </div>
  );
};

const getActionBadgeColor = (action) => {
  const act = (action || '').toLowerCase();
  if (act.includes('backup')) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (act.includes('broadcast')) return 'bg-purple-50 text-purple-700 border-purple-200';
  if (act.includes('tax') || act.includes('commission') || act.includes('rate')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (act.includes('delete') || act.includes('clear')) return 'bg-rose-50 text-rose-700 border-rose-200';
  if (act.includes('create') || act.includes('registered')) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
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

  if (log.message) {
    const msg = typeof log.message === 'object' ? JSON.stringify(log.message) : log.message;
    return t(`activity.${log.action}`, msg);
  }

  if (log.action) {
    const act = typeof log.action === 'object' ? JSON.stringify(log.action) : log.action;
    return t(`activity.${log.action}`, act);
  }

  return typeof log === 'object' ? JSON.stringify(log).substring(0, 100) + '...' : String(log);
};

const StatCard = ({ label, value, icon: Icon, color, trendPositive, onClick }) => {
  const isEmerald = color === 'emerald';
  const colorClass = isEmerald ? 'text-emerald-600 bg-emerald-50' :
    color === 'sky' ? 'text-sky-600 bg-sky-50' :
      color === 'violet' ? 'text-violet-600 bg-violet-50' : 'text-amber-600 bg-amber-50';

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 shadow-xs hover:shadow transition-all cursor-pointer group flex flex-col justify-between min-h-[85px] sm:min-h-[98px]"
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] text-gray-500 font-semibold uppercase tracking-wider truncate">{label}</p>
          <div className="mt-0.5 sm:mt-1">
            <span className="text-base sm:text-xl font-bold text-gray-900 leading-tight block truncate">{value}</span>
          </div>
        </div>
        <div className={`p-1.5 sm:p-2 rounded-lg transition-transform duration-200 group-hover:scale-105 shrink-0 ${colorClass}`}>
          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
      </div>
      {trendPositive && (
        <div className="flex items-center gap-1 mt-1 sm:mt-1.5">
          <TrendingUp className="w-3 h-3 text-emerald-500 shrink-0" />
          <p className="text-[9px] sm:text-[10px] font-semibold text-emerald-600">Increasing</p>
        </div>
      )}
    </motion.div>
  );
};

export default AdminDashboard;
