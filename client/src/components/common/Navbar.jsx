import { getFileUrl } from '../../utils/getFileUrl';
/**
 * Navigation Component for EthioCraft Global
 * 
 * Features:
 * - Ethiopian flag colors and cultural design
 * - Responsive mobile menu
 * - Authentication state management
 * - Shopping cart indicator
 * - AI-enhanced search bar
 * - Role-based navigation items
 */

import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingCartIcon,
  UserIcon,
  Bars3Icon,
  XMarkIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BellIcon,
  MagnifyingGlassIcon,
  BuildingStorefrontIcon,
  MegaphoneIcon,
  HomeIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useSettings } from '../../contexts/SettingsContext';
import api from '../../utils/api';
import EnhancedSearchBar from './EnhancedSearchBar';
import { supportAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { Bell } from 'lucide-react';
import LanguageSwitcher from '../layout/LanguageSwitcher';
import { useCustomTranslation } from '../../hooks/useCustomTranslation';

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [artisanOrdersCount, setArtisanOrdersCount] = useState(0);
  const [recentArtisanOrders, setRecentArtisanOrders] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const notificationDropdownRef = useRef(null);
  const prevUnreadRef = useRef(null);
  const dropdownRef = useRef(null);
  const pollRef = useRef(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { totalItems } = useCart();
  const { settings, homeConfig, broadcasts, dismissBroadcast } = useSettings();
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const headerLogo = homeConfig?.headerLogo;
  const resolvedLogo = headerLogo || settings.logoUrl ? getFileUrl(headerLogo || settings.logoUrl) : '/logo1.png';

  // Fetch artisan order count and recent orders
  const fetchArtisanOrders = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token || user?.role !== 'artisan') return;
      const res = await fetch('/api/users/artisan/dashboard-stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const body = await res.json();
      const stats = body.data || body.stats || {};
      const pendingCount = stats.pendingOrdersCount ?? stats.newOrders ?? stats.orders?.newOrders ?? stats.pendingOrders ?? 0;
      setArtisanOrdersCount(pendingCount);
      setRecentArtisanOrders(stats.recentOrders || []);
    } catch (err) {
      console.error('Navbar artisan stats error:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === 'artisan') {
      fetchArtisanOrders();
      const interval = setInterval(fetchArtisanOrders, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user?.role]);

  // Listen for real-time newOrder events dispatched by useInventoryAlerts
  useEffect(() => {
    const handleNewOrder = (e) => {
      setArtisanOrdersCount(prev => prev + 1);
      const newO = e?.detail;
      if (newO) {
        setRecentArtisanOrders(prev => [newO, ...prev.slice(0, 9)]);
      }
    };
    window.addEventListener('artisanNewOrder', handleNewOrder);
    return () => window.removeEventListener('artisanNewOrder', handleNewOrder);
  }, []);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutsideNotif = (event) => {
      if (
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(event.target)
      ) {
        setIsNotificationOpen(false);
      }
    };
    if (isNotificationOpen) {
      document.addEventListener('mousedown', handleClickOutsideNotif);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideNotif);
    };
  }, [isNotificationOpen]);

  const totalNotifications = (user?.role === 'artisan'
    ? (unreadMessages + artisanOrdersCount)
    : unreadMessages) + (broadcasts?.length || 0);

  // Helper to get formatted artisan or user display name (never fallback to generic "Profile")
  const getUserDisplayName = () => {
    if (!user) return '';
    if (user.role === 'artisan') {
      const bName = user.profile?.businessInfo?.businessName || user.businessName || user.profile?.businessName;
      if (bName) return bName;
    }
    const fn = user.profile?.firstName;
    const ln = user.profile?.lastName;
    if (fn && ln) return `${fn} ${ln}`;
    if (fn) return fn;
    if (user.name) return user.name;
    if (user.email) {
      const uname = user.email.split('@')[0];
      return uname.charAt(0).toUpperCase() + uname.slice(1);
    }
    return user.role === 'artisan' ? 'የእደ-ጥበብ ባለሙያ' : 'መለያ';
  };

  // Fetch unread messages count based on user role
  useEffect(() => {
    const mounted = pollRef;
    if (isAuthenticated && user) {
      fetchUnreadMessagesCount();
    } else {
      setUnreadMessages(0);
    }

    // poll less frequently to avoid rate limits (60s) and prevent double-intervals in StrictMode
    if (!mounted.current) {
      mounted.current = true;
      const interval = setInterval(() => {
        if (isAuthenticated && user) fetchUnreadMessagesCount();
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  const fetchUnreadMessagesCount = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setUnreadMessages(0);
        return;
      }
      try {
        const res = await supportAPI.getUnreadCount();
        const count = res.data.unreadCount || 0;
        setUnreadMessages(count);
      } catch (err) {
        // If 403 or other auth error, reset count and avoid uncaught error
        const status = err.response?.status;
        console.error('Unread count failed', status || err.message);
        if (status === 429) {
          // back off on rate limit: don't spam the endpoint
          // next poll will still occur but server will be less likely to respond 429
          setUnreadMessages((prev) => prev);
        } else {
          setUnreadMessages(0);
        }
      }
    } catch (error) {
      console.error('Error fetching unread messages:', error);
      setUnreadMessages(0);
    }
  };

  useEffect(() => {
    if (prevUnreadRef.current !== null && unreadMessages > prevUnreadRef.current) {
      toast.success(t('dashboard.recent_activity', 'You have a new message'));
    }
    prevUnreadRef.current = unreadMessages;
  }, [unreadMessages]);

  // Listen for immediate unread count updates from other components (e.g., Messages page)
  useEffect(() => {
    const handler = (e) => {
      try {
        const val = e?.detail;
        if (typeof val === 'number') setUnreadMessages(val);
      } catch (err) {
        console.error('Failed to handle unreadCountUpdated event', err);
      }
    };

    window.addEventListener('unreadCountUpdated', handler);
    return () => window.removeEventListener('unreadCountUpdated', handler);
  }, []);

  // Fetch recent message notifications whenever dropdown opens or unread count changes
  useEffect(() => {
    if (isAuthenticated && (isNotificationOpen || unreadMessages > 0)) {
      supportAPI.getMessages()
        .then((res) => {
          const msgs = res.data?.messages || [];
          setRecentMessages(msgs.slice(0, 5));
        })
        .catch((err) => {
          console.error('Navbar getMessages error:', err);
        });
    }
  }, [isNotificationOpen, unreadMessages, isAuthenticated]);

  // Navigate to and open specific notification
  const handleOpenNotificationMessage = async (msgId) => {
    setIsNotificationOpen(false);
    if (msgId) {
      try {
        await supportAPI.markRead(msgId);
        setUnreadMessages((prev) => Math.max(0, prev - 1));
        window.dispatchEvent(
          new CustomEvent('unreadCountUpdated', { detail: Math.max(0, unreadMessages - 1) })
        );
      } catch (e) {
        console.error('Failed to mark notification read:', e);
      }
    }

    const targetPath =
      user?.role === 'admin'
        ? (msgId ? `/admin/notifications?id=${msgId}` : '/admin/notifications')
        : user?.role === 'artisan'
          ? (msgId ? `/artisan/messages?id=${msgId}` : '/artisan/messages')
          : (msgId ? `/messages?id=${msgId}` : '/messages');
    navigate(targetPath);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setExpandedSection(null);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
    setIsDropdownOpen(false);
  };

  // Handle navigation from dropdown
  const handleDropdownNavigate = (path) => {
    navigate(path);
    setIsDropdownOpen(false);
    setExpandedSection(null);
  };

  // Toggle accordion section
  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Check if current path is active
  const isActivePath = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Scroll listener for sticky navbar polish
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`
      ${isScrolled 
        ? 'bg-white/95 backdrop-blur-md shadow-md border-b border-gray-100' 
        : 'bg-white border-b border-gray-50'
      } 
      sticky top-0 z-[1000] transition-all duration-300
    `}>
      {/* Top Broadcast Announcement Banner - Real-Time with Left-to-Right Animation */}
      {broadcasts && broadcasts.length > 0 && (
        (() => {
          const now = Date.now();
          const relevant = broadcasts.find(b => {
            if (b.expiresAt && new Date(b.expiresAt).getTime() <= now) return false;
            const target = (b.target || 'all').toLowerCase();
            if (target === 'all') return true;
            if (target === 'artisan' || target === 'artisans') {
              return user && user.role === 'artisan';
            }
            if (target === 'customer' || target === 'customers') {
              return !user || user.role === 'customer';
            }
            if (target === 'individual') {
              return user && b.targetEmail && user.email?.toLowerCase() === b.targetEmail.toLowerCase();
            }
            return false;
          });

          if (!relevant) return null;

          // Theme styling based on broadcast type
          const bType = relevant.type || 'announcement';
          const themeStyles = {
            alert: 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-600 text-white border-b border-red-700/50 shadow-md',
            promotion: 'bg-gradient-to-r from-emerald-600 via-teal-500 to-amber-500 text-white border-b border-emerald-700/50 shadow-md',
            info: 'bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-600 text-white border-b border-blue-800/50 shadow-md',
            announcement: 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 text-white border-b border-amber-600/50 shadow-md'
          }[bType] || 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 text-white shadow-md';

          const badgeIcon = {
            alert: '🚨',
            promotion: '🎁',
            info: 'ℹ️',
            announcement: '📢'
          }[bType] || '📢';

          const badgeLabel = {
            alert: 'አስቸኳይ ማስጠንቀቂያ / ALERT',
            promotion: 'ልዩ ቅናሽ / PROMO',
            info: 'መረጃ / INFO',
            announcement: relevant.target === 'artisan' || relevant.target === 'artisans' 
              ? 'የባለሙያ ማስታወቂያ / ARTISAN NOTICE' 
              : relevant.target === 'customer'
              ? 'የደንበኛ ማስታወቂያ / CUSTOMER NOTICE'
              : 'ይፋዊ ማስታወቂያ / ANNOUNCEMENT'
          }[bType];

          // Compute remaining time if expiresAt is set
          let timeRemainingText = null;
          if (relevant.expiresAt) {
            const diffMs = new Date(relevant.expiresAt).getTime() - now;
            if (diffMs > 0) {
              const h = Math.floor(diffMs / (1000 * 60 * 60));
              const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
              timeRemainingText = h > 24 ? `${Math.floor(h / 24)}d left` : h > 0 ? `${h}h ${m}m left` : `${m}m left`;
            }
          }

          return (
            <div className={`relative overflow-hidden py-2 px-3 sm:px-6 transition-all duration-300 z-50 ${themeStyles}`}>
              {/* Continuous Left-to-Right Shimmer Sheen Beam */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-25"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)',
                  animation: 'shimmerBeam 4s cubic-bezier(0.4, 0, 0.2, 1) infinite'
                }}
              />

              <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm relative z-10">
                {/* Left Badge: Type / Role */}
                <div className="flex items-center gap-1.5 shrink-0 bg-black/20 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/20 text-[10px] sm:text-xs font-black tracking-wide shadow-sm">
                  <span className="text-sm animate-bounce">{badgeIcon}</span>
                  <span className="uppercase">{badgeLabel}</span>
                </div>

                {/* Center Animated Message with Left-to-Right Glide */}
                <div className="flex-1 overflow-hidden min-w-0 group cursor-default">
                  <div 
                    className="inline-block whitespace-nowrap font-bold tracking-tight text-white drop-shadow-sm group-hover:[animation-play-state:paused]"
                    style={{
                      animation: 'slideLeftToRight 16s ease-in-out infinite alternate'
                    }}
                  >
                    <span className="text-white/90 mr-2 text-[11px] sm:text-xs font-semibold">[{relevant.title || 'Notice'}]:</span>
                    <span className="text-white text-xs sm:text-sm font-bold">{relevant.message}</span>
                  </div>
                </div>

                {/* Right Controls: Timer Badge & Dismiss Button */}
                <div className="flex items-center gap-2 shrink-0">
                  {timeRemainingText && (
                    <span className="hidden sm:inline-flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold text-white tracking-wide border border-white/20">
                      ⏱️ {timeRemainingText}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => dismissBroadcast && dismissBroadcast(relevant._id)}
                    title="Dismiss notification"
                    className="text-white/80 hover:text-white hover:bg-black/20 rounded-full p-1 transition-all active:scale-90 cursor-pointer"
                  >
                    <XMarkIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </button>
                </div>
              </div>

              {/* Injected CSS for fluid Left-to-Right Animation */}
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes shimmerBeam {
                  0% { transform: translateX(-100%); }
                  100% { transform: translateX(200%); }
                }
                @keyframes slideLeftToRight {
                  0% { transform: translateX(-35%); }
                  50% { transform: translateX(0%); }
                  100% { transform: translateX(35%); }
                }
                @media (max-width: 640px) {
                  @keyframes slideLeftToRight {
                    0% { transform: translateX(-15%); }
                    50% { transform: translateX(0%); }
                    100% { transform: translateX(15%); }
                  }
                }
              `}} />
            </div>
          );
        })()
      )}
      {/* Main Navigation Pill Card Container */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="bg-white rounded-full border border-gray-200/90 shadow-2xs px-3 sm:px-4 py-1.5 transition-all">
          {/* ═════════════════════════════════════════════════════════════
              1. DESKTOP & LAPTOP NAVIGATION (md:flex)
              ═════════════════════════════════════════════════════════════ */}
          <div className="hidden md:flex items-center justify-between gap-1.5 lg:gap-2 h-11 sm:h-12">
            {/* Logo and Brand on Left */}
            <div className="flex items-center shrink-0">
              <Link to="/" className="flex items-center group">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-amber-200/90 bg-white p-0.5 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs group-hover:border-amber-400 transition-colors">
                  <img
                    src={resolvedLogo}
                    alt="EthioCraft Global"
                    className="w-full h-full object-contain"
                    onError={(e) => { e.currentTarget.src = '/logo1.png'; }}
                  />
                </div>
                <div className="h-6 w-px bg-gray-200 mx-2 sm:mx-2.5 shrink-0"></div>
                <div className="flex items-center font-serif tracking-tight select-none">
                  <span className="font-bold text-base lg:text-lg text-[#0F5132] group-hover:text-emerald-800 transition-colors">EthioCraft</span>
                  <span className="font-bold text-base lg:text-lg text-[#D97706] ml-1 group-hover:text-amber-500 transition-colors">Global</span>
                </div>
              </Link>
            </div>

            {/* Compact Search Input Beside Logo */}
            <div className="w-44 lg:w-56 xl:w-64 max-w-[260px] mx-1.5 lg:mx-2 shrink">
              <EnhancedSearchBar
                placeholder={t('nav.search_placeholder', 'Search products, crafts...')}
                className="w-full"
              />
            </div>

            {/* Navigation Items - Consistent Height, Alignment & Spacing */}
            <div className="flex items-center gap-1 lg:gap-1.5 shrink-0">
              {/* Home */}
              <div className="relative">
                <Link
                  to="/"
                  className={`h-9 px-3.5 rounded-full flex items-center gap-1.5 text-xs font-bold transition-all shadow-2xs ${
                    isActivePath('/')
                      ? 'bg-[#FFF3E0] text-[#E65100]'
                      : 'bg-transparent hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <HomeIcon className={`w-4 h-4 shrink-0 ${isActivePath('/') ? 'text-[#E65100]' : 'text-gray-600'}`} />
                  <span>{t('nav.home', 'Home')}</span>
                </Link>
                {isActivePath('/') && (
                  <span className="absolute -bottom-1 left-2.5 right-2.5 h-[2.5px] bg-[#E65100] rounded-full"></span>
                )}
              </div>

              {/* AI Assistant */}
              <Link
                to="/zema-ai"
                className={`h-9 px-2.5 rounded-full flex items-center gap-1 text-xs font-semibold transition-all ${
                  isActivePath('/zema-ai')
                    ? 'bg-[#FFF3E0] text-[#E65100] font-bold'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <CpuChipIcon className="w-4 h-4 text-[#0F5132] shrink-0" />
                <span>{t('sidebar.zema_ai_assistant', 'AI')}</span>
                <ChevronDownIcon className="w-3 h-3 text-gray-400 shrink-0" />
              </Link>

              {/* Shop */}
              <Link
                to="/products"
                className={`h-9 px-2.5 rounded-full flex items-center gap-1 text-xs font-semibold transition-all ${
                  isActivePath('/products')
                    ? 'bg-[#FFF3E0] text-[#E65100] font-bold'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <ShoppingCartIcon className="w-4 h-4 text-[#0F5132] shrink-0" />
                <span>{t('nav.shop', 'Shop')}</span>
                <ChevronDownIcon className="w-3 h-3 text-gray-400 shrink-0" />
              </Link>

              {/* Divider */}
              <div className="h-5 w-px bg-gray-200 mx-0.5 lg:mx-1 shrink-0"></div>

              {/* Notifications */}
              <div className="relative" ref={notificationDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated) {
                      navigate('/login');
                    } else {
                      setIsNotificationOpen(!isNotificationOpen);
                    }
                  }}
                  className="h-9 px-2.5 rounded-full hover:bg-gray-50 flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-[#0F5132] transition-colors cursor-pointer"
                  title={user?.role === 'artisan' ? t('nav.notifications', 'Order & Message Notifications') : t('nav.notifications', 'Notifications')}
                >
                  <div className="relative flex items-center justify-center">
                    <Bell className="w-4 h-4 text-[#0F5132]" />
                    {isAuthenticated && totalNotifications > 0 && (
                      <span className="absolute -top-1.5 -right-2 bg-red-600 text-white text-[8px] font-bold rounded-full min-w-[15px] h-3.5 px-0.5 flex items-center justify-center shadow-xs animate-pulse">
                        {totalNotifications > 99 ? '99+' : totalNotifications}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-800 tracking-tight">Notif</span>
                </button>

                {/* Notifications Dropdown */}
                {isNotificationOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-50 animate-fadeIn">
                    <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Bell className="w-4.5 h-4.5 text-amber-600" />
                        <span className="font-bold text-gray-900 text-sm">{t('nav.notifications', 'Notifications')}</span>
                      </div>
                      {totalNotifications > 0 && (
                        <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                          {totalNotifications} new
                        </span>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                      {/* Broadcast Notices */}
                      {broadcasts && broadcasts.length > 0 && broadcasts.map((b) => (
                        <div key={b._id} className="p-3 bg-amber-50/70 flex items-start space-x-2.5">
                          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                            <MegaphoneIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-900 truncate">{b.title}</span>
                              <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold uppercase">{b.type || 'Notice'}</span>
                            </div>
                            <p className="text-xs text-gray-700 mt-0.5">{b.message}</p>
                          </div>
                        </div>
                      ))}

                      {/* For Artisan: Pending Orders Card */}
                      {user?.role === 'artisan' && artisanOrdersCount > 0 && (
                        <Link
                          to="/artisan/orders"
                          onClick={() => setIsNotificationOpen(false)}
                          className="flex items-start space-x-3 px-4 py-3 hover:bg-amber-50/70 transition-colors group block"
                        >
                          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                            <ShoppingCartIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-gray-900">
                                {t('artisan_panel.pending_orders', 'New Orders')}
                              </p>
                              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">Action Required</span>
                            </div>
                            <p className="text-xs text-gray-600 mt-0.5">
                              You have <span className="font-bold text-amber-700">{artisanOrdersCount}</span> unread / pending orders.
                            </p>
                            {recentArtisanOrders.length > 0 && (
                              <p className="text-[11px] text-gray-500 mt-1 truncate">
                                Latest: #{recentArtisanOrders[0].orderNumber} ({recentArtisanOrders[0].total} ETB)
                              </p>
                            )}
                          </div>
                        </Link>
                      )}

                      {/* Individual Message Notifications */}
                      {recentMessages && recentMessages.length > 0 ? (
                        recentMessages.map((m) => {
                          const senderName = m.sender?.profile?.firstName
                            ? `${m.sender.profile.firstName} ${m.sender.profile.lastName || ''}`.trim()
                            : (m.sender?.email || m.senderRole || 'User');
                          return (
                            <div
                              key={m._id}
                              onClick={() => handleOpenNotificationMessage(m._id)}
                              className={`p-3.5 hover:bg-amber-50/70 transition-colors cursor-pointer flex items-start space-x-2.5 ${
                                !m.read ? 'bg-amber-50/40' : ''
                              }`}
                            >
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                                {senderName.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className={`text-xs truncate ${!m.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                    {senderName}
                                  </span>
                                  {!m.read ? (
                                    <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded-full">
                                      New
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-gray-400">Read</span>
                                  )}
                                </div>
                                <p className={`text-xs truncate mt-0.5 ${!m.read ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                                  {m.subject || 'መልዕክት'}
                                </p>
                                <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                  {m.message}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      ) : unreadMessages > 0 ? (
                        <div
                          onClick={() => handleOpenNotificationMessage(null)}
                          className="flex items-start space-x-3 px-4 py-3 hover:bg-blue-50/70 transition-colors cursor-pointer group"
                        >
                          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <SparklesIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-gray-900">
                                {t('sidebar.messages', 'Messages')}
                              </p>
                              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">New</span>
                            </div>
                            <p className="text-xs text-gray-600 mt-0.5">
                              You have <span className="font-bold text-blue-700">{unreadMessages}</span> unread messages.
                            </p>
                          </div>
                        </div>
                      ) : null}

                      {/* Empty state */}
                      {totalNotifications === 0 && (!broadcasts || broadcasts.length === 0) && (
                        <div className="px-4 py-8 text-center text-gray-400">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-40 text-gray-400" />
                          <p className="text-xs font-medium text-gray-500">{t('nav.no_notifications', 'No new notifications')}</p>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 pt-2 border-t border-gray-100 mt-1 flex justify-between items-center text-xs">
                      {user?.role === 'artisan' ? (
                        <Link
                          to="/artisan/orders"
                          onClick={() => setIsNotificationOpen(false)}
                          className="text-amber-700 hover:text-amber-800 font-bold"
                        >
                          Manage Orders →
                        </Link>
                      ) : (
                        <span />
                      )}
                      <button
                        onClick={() => handleOpenNotificationMessage(null)}
                        className="text-gray-500 hover:text-gray-700 font-medium cursor-pointer"
                      >
                        All Messages →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="h-5 w-px bg-gray-200 mx-0.5 lg:mx-1 shrink-0"></div>

              {/* Language Switcher */}
              <LanguageSwitcher />

              {/* Divider */}
              <div className="h-5 w-px bg-gray-200 mx-0.5 lg:mx-1 shrink-0"></div>

              {/* User Profile */}
              {isAuthenticated ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="h-9 px-3.5 rounded-full bg-[#FFF5EB] hover:bg-[#FFE8D6] border border-[#FFE0B2] text-[#B45309] flex items-center gap-1.5 text-xs font-bold transition-all shadow-2xs max-w-[190px] cursor-pointer"
                    title={getUserDisplayName()}
                  >
                    <UserIcon className="w-4 h-4 text-[#D97706] shrink-0" />
                    <span className="truncate">{getUserDisplayName()}</span>
                    <ChevronDownIcon className={`w-3.5 h-3.5 text-[#D97706] shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Modern Click Dropdown Panel */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 animate-fade-in">
                      {/* Minimalist Profile Header */}
                      <div className="bg-[#1C1C1C] p-4 rounded-t-xl">
                        <div className="flex items-center space-x-3">
                          <div className="w-11 h-11 rounded-full bg-[#CFA66E] flex items-center justify-center text-[#1C1C1C] text-base font-black border-2 border-white shadow-lg overflow-hidden shrink-0">
                            {(user?.profile?.firstName?.charAt(0) || user?.email?.charAt(0) || 'A').toUpperCase()}
                            {(user?.profile?.lastName?.charAt(0) || '').toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-white font-bold text-sm truncate">{getUserDisplayName()}</h3>
                            <p className="text-[#CFA66E] text-[10px] font-semibold uppercase tracking-wider mt-0.5 truncate">
                              {user?.role === 'artisan' ? 'የእደ-ጥበብ ባለሙያ (Artisan)' : user?.role === 'admin' ? 'አስተዳዳሪ (Admin)' : 'ደንበኛ (Customer)'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-2">
                        {(user?.role === 'admin' || user?.role === 'artisan') && (
                          <button
                            onClick={() => {
                              const target = user.role === 'admin' ? '/admin/dashboard' : '/artisan/dashboard';
                              navigate(target);
                              setIsDropdownOpen(false);
                              setIsMenuOpen(false);
                            }}
                            className="w-full mb-2 p-3 bg-ethiopian-gold text-white rounded-lg hover:bg-ethiopian-earth transition-all font-bold"
                          >
                            {t('auth.dashboard')}
                          </button>
                        )}
                        {/* ACCOUNT Section */}
                        <div className="mb-1">
                          <button
                            onClick={() => toggleSection('account')}
                            className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 rounded-lg transition-all"
                          >
                            <span className="font-bold text-gray-800">{t('nav.account', 'ACCOUNT')}</span>
                            {expandedSection === 'account' ? (
                              <ChevronUpIcon className="w-5 h-5 text-gray-600" />
                            ) : (
                              <ChevronDownIcon className="w-5 h-5 text-gray-600" />
                            )}
                          </button>
                          {expandedSection === 'account' && (
                            <div className="mt-1 ml-3 space-y-1">
                              <button
                                onClick={() => handleDropdownNavigate('/profile')}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-amber-50 rounded-lg transition-colors"
                              >
                                • {t('nav.edit_profile', 'Edit Profile')}
                              </button>
                              <button
                                onClick={() => handleDropdownNavigate('/account-settings')}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-amber-50 rounded-lg transition-colors"
                              >
                                • {t('nav.account_settings', 'Account Settings')}
                              </button>
                              <button
                                onClick={() => handleDropdownNavigate('/security')}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-amber-50 rounded-lg transition-colors"
                              >
                                • {t('nav.security', 'Security (Change Password)')}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* SHOPPING Section */}
                        <div className="mb-1">
                          <button
                            onClick={() => toggleSection('shopping')}
                            className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-lg transition-all"
                          >
                            <span className="font-bold text-gray-800">{t('nav.shopping', 'SHOPPING')}</span>
                            {expandedSection === 'shopping' ? (
                              <ChevronUpIcon className="w-5 h-5 text-gray-600" />
                            ) : (
                              <ChevronDownIcon className="w-5 h-5 text-gray-600" />
                            )}
                          </button>
                          {expandedSection === 'shopping' && (
                            <div className="mt-1 ml-3 space-y-1">
                              <button
                                onClick={() => handleDropdownNavigate('/orders')}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-green-50 rounded-lg transition-colors"
                              >
                                • {t('nav.my_orders', 'My Orders')}
                              </button>
                              <button
                                onClick={() => handleDropdownNavigate('/orders/track')}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-green-50 rounded-lg transition-colors"
                              >
                                • {t('nav.order_tracking', 'Order Tracking')}
                              </button>
                              <button
                                onClick={() => handleDropdownNavigate('/wishlist')}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-green-50 rounded-lg transition-colors"
                              >
                                • {t('nav.wishlist', 'Wishlist')}
                              </button>
                              <button
                                onClick={() => handleDropdownNavigate('/shipping-addresses')}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-green-50 rounded-lg transition-colors"
                              >
                                • {t('nav.shipping_addresses', 'Shipping Addresses')}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* HELP & SUPPORT Section */}
                        <div className="mb-1">
                          <button
                            onClick={() => toggleSection('help')}
                            className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg transition-all"
                          >
                            <span className="font-bold text-gray-800">{t('nav.help_support', 'HELP & SUPPORT')}</span>
                            {expandedSection === 'help' ? (
                              <ChevronUpIcon className="w-5 h-5 text-gray-600" />
                            ) : (
                              <ChevronDownIcon className="w-5 h-5 text-gray-600" />
                            )}
                          </button>
                          {expandedSection === 'help' && (
                            <div className="mt-1 ml-3 space-y-1">
                              <button
                                onClick={() => handleDropdownNavigate('/help-center')}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                • {t('nav.help_center', 'Help Center')}
                              </button>
                              <button
                                onClick={() => handleDropdownNavigate('/contact-support')}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                • {t('nav.contact_support', 'Contact Support')}
                              </button>
                              <button
                                onClick={() => handleDropdownNavigate('/faqs')}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                • {t('nav.faqs', 'FAQs')}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* LOGOUT Button */}
                        <button
                          onClick={handleLogout}
                          className="w-full p-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all font-bold"
                        >
                          {t('auth.logout')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Link
                    to="/login"
                    className="h-8.5 px-3 rounded-full text-xs font-semibold text-gray-700 hover:text-amber-700 hover:bg-gray-50 border border-gray-200/90 transition-all flex items-center shadow-2xs"
                  >
                    {t('auth.login', 'Login')}
                  </Link>
                  <Link
                    to="/register"
                    className="h-8.5 px-3 rounded-full text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-2xs transition-all flex items-center"
                  >
                    {t('auth.signup', 'Sign Up')}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════
              2. MOBILE NAVIGATION (md:hidden)
              ═════════════════════════════════════════════════════════════ */}
          <div className="md:hidden flex items-center justify-between h-11 sm:h-12 gap-1">
            {/* Logo and Brand (Left) */}
            <Link to="/" className="flex items-center gap-1.5 min-w-0 shrink-0 group">
              <div className="w-8 h-8 rounded-full border border-amber-200/90 bg-white p-0.5 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs group-hover:border-amber-400 transition-colors">
                <img
                  src={resolvedLogo}
                  alt="EthioCraft"
                  className="w-full h-full object-contain"
                  onError={(e) => { e.currentTarget.src = '/logo1.png'; }}
                />
              </div>
              <div className="h-5 w-px bg-gray-200 mx-1 shrink-0"></div>
              <div className="flex flex-col leading-tight select-none shrink-0 font-serif">
                <span className="font-bold text-xs text-[#1C3B2B] tracking-tight">EthioCraft</span>
                <span className="font-bold text-[11px] text-[#D97706] tracking-tight">Global</span>
              </div>
            </Link>

            {/* Equal-Height Action Buttons (Right) */}
            <div className="flex items-center gap-1 min-[380px]:gap-1.5 shrink-0">
              {/* Search Toggle Button */}
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                className={`w-8.5 h-8.5 min-[380px]:w-9 min-[380px]:h-9 rounded-full border transition-all flex items-center justify-center shadow-2xs active:scale-95 cursor-pointer ${
                  isMobileSearchOpen
                    ? 'bg-amber-100 border-amber-400 text-amber-800'
                    : 'bg-gray-50/90 hover:bg-amber-50 border-gray-200 text-gray-700 hover:border-amber-300'
                }`}
                title={t('nav.search', 'Search')}
              >
                <MagnifyingGlassIcon className="w-4.5 h-4.5" />
              </button>

              {/* Language Switcher (Compact: 🌐 AM ∨) */}
              <LanguageSwitcher compact />

              {/* Notifications Button */}
              <button
                type="button"
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate('/login');
                  } else {
                    setIsNotificationOpen(!isNotificationOpen);
                  }
                }}
                className="w-8.5 h-8.5 min-[380px]:w-9 min-[380px]:h-9 rounded-full bg-gray-50/90 hover:bg-amber-50 border border-gray-200 hover:border-amber-300 text-gray-700 flex items-center justify-center transition-all relative shadow-2xs active:scale-95 cursor-pointer"
                title={t('nav.notifications', 'Notifications')}
              >
                <Bell className="w-4 h-4 text-gray-700" />
                {isAuthenticated && totalNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[15px] h-3.5 px-0.5 flex items-center justify-center shadow-xs animate-pulse">
                    {totalNotifications > 99 ? '99+' : totalNotifications}
                  </span>
                )}
              </button>

              {/* Shopping Cart Button */}
              <Link
                to="/cart"
                className="w-8.5 h-8.5 min-[380px]:w-9 min-[380px]:h-9 rounded-full bg-gray-50/90 hover:bg-amber-50 border border-gray-200 hover:border-amber-300 text-gray-700 flex items-center justify-center transition-all relative shadow-2xs active:scale-95 cursor-pointer"
                title={t('nav.cart', 'Cart')}
              >
                <ShoppingCartIcon className="w-4.5 h-4.5 text-gray-700" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[15px] h-3.5 px-0.5 flex items-center justify-center shadow-xs">
                    {totalItems > 99 ? '99+' : totalItems}
                  </span>
                )}
              </Link>

              {/* Hamburger Menu Toggle Button */}
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`w-8.5 h-8.5 min-[380px]:w-9 min-[380px]:h-9 rounded-full border transition-all flex items-center justify-center shadow-2xs active:scale-95 cursor-pointer ${
                  isMenuOpen
                    ? 'bg-amber-100 border-amber-400 text-amber-800'
                    : 'bg-gray-50/90 hover:bg-amber-50 border-gray-200 text-gray-700 hover:border-amber-300'
                }`}
                title="Menu"
              >
                {isMenuOpen ? (
                  <XMarkIcon className="w-4.5 h-4.5 text-gray-800" />
                ) : (
                  <Bars3Icon className="w-4.5 h-4.5 text-gray-800" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Search Row (Expandable Underneath Pill) */}
        {isMobileSearchOpen && (
          <div className="md:hidden mt-2 p-2 bg-white rounded-2xl border border-gray-200/90 shadow-md animate-fadeIn">
            <EnhancedSearchBar
              placeholder={t('nav.search_placeholder', 'Search products, crafts...')}
              className="w-full"
              autoFocus
            />
          </div>
        )}

        {/* Mobile Notifications Backdrop */}
        {isNotificationOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-40 transition-opacity"
            onClick={() => setIsNotificationOpen(false)}
          />
        )}

        {/* Mobile Notifications Sheet / Popover */}
        {isNotificationOpen && (
          <div className="md:hidden fixed top-[60px] left-3 right-3 max-w-sm mx-auto z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-fadeIn flex flex-col max-h-[75vh]">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BellIcon className="w-5 h-5 text-amber-600" />
                <span className="font-bold text-gray-900 text-sm">{t('nav.notifications', 'ማሳወቂያዎች')}</span>
              </div>
              <div className="flex items-center space-x-2">
                {totalNotifications > 0 && (
                  <span className="text-[11px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                    {totalNotifications} አዲስ
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsNotificationOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {/* Broadcasts */}
              {broadcasts && broadcasts.length > 0 && broadcasts.map((b) => (
                <div key={b._id} className="p-3 bg-amber-50/70 flex items-start space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <MegaphoneIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900 truncate">{b.title}</span>
                      <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold uppercase">{b.type || 'Notice'}</span>
                    </div>
                    <p className="text-xs text-gray-700 mt-0.5">{b.message}</p>
                  </div>
                </div>
              ))}

              {/* Artisan Orders */}
              {user?.role === 'artisan' && artisanOrdersCount > 0 && (
                <Link
                  to="/artisan/orders"
                  onClick={() => setIsNotificationOpen(false)}
                  className="flex items-start space-x-2.5 p-3 hover:bg-amber-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <ShoppingCartIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">{t('artisan_panel.pending_orders', 'አዳዲስ ትዕዛዞች')}</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">Action Required</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      <span className="font-bold text-amber-700">{artisanOrdersCount}</span> በመጠባበቅ ላይ ያሉ ትዕዛዞች አሉዎት።
                    </p>
                  </div>
                </Link>
              )}

              {/* Messages */}
              {recentMessages && recentMessages.length > 0 ? (
                recentMessages.map((m) => {
                  const senderName = m.sender?.profile?.firstName
                    ? `${m.sender.profile.firstName} ${m.sender.profile.lastName || ''}`.trim()
                    : (m.sender?.email || m.senderRole || 'ተጠቃሚ');
                  return (
                    <div
                      key={m._id}
                      onClick={() => handleOpenNotificationMessage(m._id)}
                      className={`p-3 hover:bg-amber-50 transition-colors cursor-pointer flex items-start space-x-2.5 ${
                        !m.read ? 'bg-amber-50/50' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                        {senderName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs truncate ${!m.read ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                            {senderName}
                          </span>
                          {!m.read ? (
                            <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded-full">
                              አዲስ
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400">የተነበበ</span>
                          )}
                        </div>
                        <p className={`text-xs truncate mt-0.5 ${!m.read ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                          {m.subject || 'መልዕክት'}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">
                          {m.message}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : unreadMessages > 0 ? (
                <div
                  onClick={() => handleOpenNotificationMessage(null)}
                  className="flex items-start space-x-2.5 p-3 hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <SparklesIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">{t('sidebar.messages', 'መልዕክቶች')}</span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">New</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      <span className="font-bold text-blue-700">{unreadMessages}</span> ያልተነበቡ መልዕክቶች አሉዎት።
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Empty */}
              {totalNotifications === 0 && (!broadcasts || broadcasts.length === 0) && (
                <div className="py-8 text-center text-gray-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-40 text-gray-400" />
                  <p className="text-xs font-medium text-gray-500">{t('nav.no_notifications', 'ምንም አዲስ ማሳወቂያ የለም')}</p>
                </div>
              )}
            </div>

            <div className="p-2.5 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-xs">
              {user?.role === 'artisan' ? (
                <Link
                  to="/artisan/orders"
                  onClick={() => setIsNotificationOpen(false)}
                  className="text-amber-700 hover:text-amber-800 font-bold"
                >
                  ትዕዛዞችን አስተዳድር →
                </Link>
              ) : (
                <Link
                  to="/orders"
                  onClick={() => setIsNotificationOpen(false)}
                  className="text-amber-700 hover:text-amber-800 font-semibold"
                >
                  ትዕዛዞቼን ይመልከቱ →
                </Link>
              )}
              <button
                onClick={() => handleOpenNotificationMessage(null)}
                className="text-gray-600 hover:text-gray-900 font-medium cursor-pointer"
              >
                መልዕክቶች →
              </button>
            </div>
          </div>
        )}

        {/* Mobile Menu Drawer (Secondary Navigation Links Inside Hamburger) */}
        {isMenuOpen && (
          <div className="md:hidden mt-2 bg-white rounded-2xl border border-gray-200/90 shadow-xl overflow-hidden animate-fadeIn divide-y divide-gray-100">
            {/* User Info Header (if logged in) */}
            {isAuthenticated ? (
              <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                    {(user?.profile?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{getUserDisplayName()}</p>
                    <p className="text-[10px] text-amber-800 font-semibold uppercase tracking-wider truncate">
                      {user?.role === 'artisan' ? 'የእደ-ጥበብ ባለሙያ' : user?.role === 'admin' ? 'አስተዳዳሪ' : 'ደንበኛ'}
                    </p>
                  </div>
                </div>
                {(user?.role === 'admin' || user?.role === 'artisan') && (
                  <Link
                    to={user.role === 'admin' ? '/admin/dashboard' : '/artisan/dashboard'}
                    onClick={() => setIsMenuOpen(false)}
                    className="px-2.5 py-1 text-[11px] font-bold text-white bg-amber-600 rounded-lg shadow-2xs hover:bg-amber-700 shrink-0"
                  >
                    {t('auth.dashboard', 'Dashboard')}
                  </Link>
                )}
              </div>
            ) : (
              <div className="p-3 bg-gray-50 flex items-center gap-2">
                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex-1 py-1.5 text-center text-xs font-semibold text-gray-800 bg-white border border-gray-200 rounded-lg shadow-2xs"
                >
                  {t('auth.login', 'Login')}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex-1 py-1.5 text-center text-xs font-bold text-white bg-amber-600 rounded-lg shadow-2xs"
                >
                  {t('auth.signup', 'Sign Up')}
                </Link>
              </div>
            )}

            {/* Primary Navigation Links */}
            <div className="p-2 space-y-1">
              <Link
                to="/"
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  isActivePath('/') ? 'bg-amber-50 text-amber-800 font-bold' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <HomeIcon className="w-4 h-4 text-amber-600" />
                <span>{t('nav.home', 'Home')}</span>
              </Link>

              <Link
                to="/zema-ai"
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  isActivePath('/zema-ai') ? 'bg-amber-50 text-amber-800 font-bold' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <CpuChipIcon className="w-4 h-4 text-amber-600" />
                <span>{t('sidebar.zema_ai_assistant', 'Zema AI Assistant')}</span>
              </Link>

              <Link
                to="/products"
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  isActivePath('/products') ? 'bg-amber-50 text-amber-800 font-bold' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <ShoppingCartIcon className="w-4 h-4 text-amber-600" />
                <span>{t('nav.shop', 'Shop All Crafts')}</span>
              </Link>
            </div>

            {/* Secondary Account / Orders Links */}
            {isAuthenticated && (
              <div className="p-2 space-y-1">
                <Link
                  to="/orders"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  <span>{t('nav.my_orders', 'My Orders')}</span>
                  <span className="text-[10px] text-gray-400">→</span>
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  <span>{t('nav.profile', 'Account Profile')}</span>
                  <span className="text-[10px] text-gray-400">→</span>
                </Link>
                <Link
                  to="/contact-support"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  <span>{t('nav.contact_support', 'Support')}</span>
                  <span className="text-[10px] text-gray-400">→</span>
                </Link>
              </div>
            )}

            {/* Logout Button */}
            {isAuthenticated && (
              <div className="p-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2 text-center text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                >
                  {t('auth.logout', 'Logout')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Removed flag accent */}
    </nav>

  );
}

export default Navbar;