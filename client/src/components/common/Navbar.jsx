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
  BellIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useSettings } from '../../contexts/SettingsContext';
import api from '../../utils/api';
import EnhancedSearchBar from './EnhancedSearchBar';
import { supportAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import LanguageSwitcher from '../layout/LanguageSwitcher';
import { useCustomTranslation } from '../../hooks/useCustomTranslation';

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [artisanOrdersCount, setArtisanOrdersCount] = useState(0);
  const [recentArtisanOrders, setRecentArtisanOrders] = useState([]);
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

  const totalNotifications = user?.role === 'artisan'
    ? (unreadMessages + artisanOrdersCount)
    : unreadMessages;

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
    return location.pathname === path;
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
      {/* Top broadcast banner */}
      {broadcasts && broadcasts.length > 0 && (
        (() => {
          const relevant = broadcasts.find(b => b.target === 'all' || (user && (b.target === user.role || (b.target === 'artisans' && user.role === 'artisan'))));
          return relevant ? (
            <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 text-white py-2 px-4 shadow-sm flex items-center justify-between gap-3 text-xs sm:text-sm animate-fadeIn">
              <div className="flex items-center gap-2 max-w-5xl mx-auto flex-1 justify-center">
                <span className="flex-shrink-0 bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                  📢 {relevant.target === 'artisans' ? 'Artisan Notice' : 'Notice'}
                </span>
                <span className="font-medium text-center truncate sm:whitespace-normal">
                  {relevant.message}
                </span>
              </div>
              <button
                type="button"
                onClick={() => dismissBroadcast && dismissBroadcast(relevant._id)}
                title="Dismiss announcement"
                className="flex-shrink-0 text-white/80 hover:text-white hover:bg-black/10 rounded-full p-1 transition"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ) : null;
        })()
      )}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-13 sm:h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-1.5 sm:space-x-2 text-ethiopian-brown hover:text-ethiopian-gold transition-colors duration-200">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-ethiopian-gold to-ethiopian-earth rounded-lg flex items-center justify-center overflow-hidden shadow-sm">
                {headerLogo || settings.logoUrl ? (
                  (() => {
                    const url = headerLogo || settings.logoUrl;
                    if (url.startsWith('http')) {
                      return <img src={url} alt="logo" className="w-full h-full object-contain" />;
                    }
                    const apiRoot = api.defaults.baseURL.replace(/\/api\/?$/, '');
                    const src = url.startsWith('/') ? `${apiRoot}${url}` : `${apiRoot}/${url}`;
                    return <img src={src} alt="logo" className="w-full h-full object-contain" />;
                  })()
                ) : (
                  <SparklesIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                )}
              </div>
              <div className="hidden sm:block">
                <span className="font-display font-bold text-lg sm:text-xl">{settings.name || 'EthioCraft'}</span>
                <span className="text-ethiopian-gold font-display font-bold text-lg sm:text-xl ml-1">Global</span>
              </div>
              <div className="sm:hidden">
                <span className="font-display font-bold text-base">{settings.name || 'EthioCraft'}</span>
              </div>
            </Link>
          </div>

          {/* Enhanced Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-sm lg:max-w-md mx-4 lg:mx-8">
            <EnhancedSearchBar
              placeholder={t('nav.search_placeholder', 'Search authentic Ethiopian crafts...')}
              className="w-full"
            />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
            {/* Navigation Links */}
            <Link
              to="/products"
              className={`font-medium transition-colors duration-200 ${isActivePath('/products')
                ? 'text-ethiopian-gold border-b-2 border-ethiopian-gold'
                : 'text-gray-700 hover:text-ethiopian-gold'
                }`}
            >
              {t('nav.shop')}
            </Link>

            {isAuthenticated && (
              <Link
                to="/zema-ai"
                className={`font-medium transition-colors duration-200 ${isActivePath('/zema-ai')
                  ? 'text-ethiopian-gold border-b-2 border-ethiopian-gold'
                  : 'text-gray-700 hover:text-ethiopian-gold'
                  }`}
              >
                {t('sidebar.zema_ai_assistant', 'Zema AI')}
              </Link>
            )}

            {/* Shopping Cart */}
            <Link
              to="/cart"
              className="relative p-2 text-gray-700 hover:text-ethiopian-gold transition-colors duration-200"
            >
              <ShoppingCartIcon className="w-6 h-6" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-ethiopian-red text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </Link>

            {/* Notifications/Orders Bell - Only show when authenticated */}
            {isAuthenticated && (
              <div className="relative" ref={notificationDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                  className="relative p-2 text-gray-700 hover:text-ethiopian-gold transition-colors duration-200 focus:outline-none"
                  title={user?.role === 'artisan' ? t('nav.notifications', 'Order & Message Notifications') : t('nav.notifications', 'Notifications')}
                >
                  <BellIcon className="w-6 h-6" />
                  {totalNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-amber-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-md animate-pulse">
                      {totalNotifications > 99 ? '99+' : totalNotifications}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {isNotificationOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-50 animate-fadeIn">
                    <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <BellIcon className="w-5 h-5 text-amber-600" />
                        <span className="font-bold text-gray-900 text-sm">{t('nav.notifications', 'Notifications')}</span>
                      </div>
                      {totalNotifications > 0 && (
                        <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                          {totalNotifications} new
                        </span>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
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

                      {/* Messages Card */}
                      {unreadMessages > 0 && (
                        <Link
                          to="/messages"
                          onClick={() => setIsNotificationOpen(false)}
                          className="flex items-start space-x-3 px-4 py-3 hover:bg-blue-50/70 transition-colors group block"
                        >
                          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
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
                        </Link>
                      )}

                      {/* Empty state */}
                      {totalNotifications === 0 && (
                        <div className="px-4 py-8 text-center text-gray-400">
                          <BellIcon className="w-8 h-8 mx-auto mb-2 opacity-40 text-gray-400" />
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
                      <Link
                        to="/messages"
                        onClick={() => setIsNotificationOpen(false)}
                        className="text-gray-500 hover:text-gray-700 font-medium"
                      >
                        All Messages →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Back to Store & Public Shop */}
            <div className="hidden md:flex items-center space-x-3">
              
              {isAuthenticated && (user?.role === 'artisan' || user?.role === 'admin') && (
                <Link
                  to="/"
                  className="flex items-center space-x-2 px-4 py-2 text-gray-500 hover:text-[#1C1C1C] border border-gray-200 hover:border-[#1C1C1C] rounded-lg transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="font-medium text-xs">{t('nav.back_to_store', 'Back to Store')}</span>
                </Link>
              )}
            </div>


            {/* Language Switcher */}
            <div className="ml-2">
              <LanguageSwitcher />
            </div>

            {/* Authentication */}
            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-ethiopian-gold transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-amber-50"
                >
                  <UserIcon className="w-6 h-6" />
                  <span className="font-medium">{user?.profile?.firstName || t('auth.profile')}</span>
                </button>

                {/* Modern Click Dropdown Panel */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 animate-fade-in">
                    {/* Minimalist Profile Header */}
                    <div className="bg-[#1C1C1C] p-5 rounded-t-xl">
                      <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 rounded-full bg-[#CFA66E] flex items-center justify-center text-[#1C1C1C] text-xl font-black border-2 border-white shadow-lg overflow-hidden">
                          {(user?.profile?.firstName?.charAt(0) || user?.email?.charAt(0) || 'A').toUpperCase()}
                          {(user?.profile?.lastName?.charAt(0) || '').toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-lg">{user?.profile?.firstName || 'User'}</h3>
                          <p className="text-[#CFA66E] text-xs font-medium uppercase tracking-widest">{user?.role}</p>
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
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-ethiopian-gold font-medium transition-colors duration-200"
                >
                  {t('auth.login')}
                </Link>
                <Link
                  to="/register"
                  className="btn-ethiopian text-sm"
                >
                  {t('auth.signup')}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-1">
            {/* Language Switcher — mobile top bar */}
            <div className="mr-0.5">
              <LanguageSwitcher compact />
            </div>

            {/* Mobile Cart Icon */}
            <Link
              to="/cart"
              className="relative p-1.5 text-gray-700 hover:text-ethiopian-gold transition-colors duration-200"
            >
              <ShoppingCartIcon className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-ethiopian-red text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-medium">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </Link>

            {/* Mobile Notifications - Only show when authenticated */}
            {isAuthenticated && (
              <Link
                to={user?.role === 'artisan' ? "/artisan/orders" : "/messages"}
                className="relative p-1.5 text-gray-700 hover:text-ethiopian-gold transition-colors duration-200"
                title={user?.role === 'artisan' ? "Manage Orders" : "Messages"}
              >
                <BellIcon className="w-5 h-5" />
                {totalNotifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-amber-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold animate-pulse">
                    {totalNotifications > 99 ? '99+' : totalNotifications}
                  </span>
                )}
              </Link>
            )}

            {/* Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 text-gray-700 hover:text-ethiopian-gold transition-colors duration-200"
            >
              {isMenuOpen ? (
                <XMarkIcon className="w-5 h-5" />
              ) : (
                <Bars3Icon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-amber-100 bg-white bg-opacity-95 backdrop-blur-md">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {/* Mobile Enhanced Search */}
              <div className="mb-4">
                <EnhancedSearchBar
                  placeholder={t('nav.search_placeholder', 'Search crafts...')}
                  className="w-full"
                />
              </div>

              {/* Mobile Navigation Links */}
              <Link
                to="/products"
                onClick={() => setIsMenuOpen(false)}
                className={`block px-3 py-2 rounded-md font-medium transition-colors duration-200 ${isActivePath('/products')
                  ? 'text-ethiopian-gold bg-amber-50'
                  : 'text-gray-700 hover:text-ethiopian-gold hover:bg-amber-50'
                  }`}
              >
                {t('nav.shop', 'Products')}
              </Link>

              {isAuthenticated && (
                <Link
                  to="/zema-ai"
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md font-medium transition-colors duration-200 ${isActivePath('/zema-ai')
                    ? 'text-ethiopian-gold bg-amber-50'
                    : 'text-gray-700 hover:text-ethiopian-gold hover:bg-amber-50'
                    }`}
                >
                  {t('sidebar.zema_ai_assistant', 'Zema AI')}
                </Link>
              )}

              {isAuthenticated ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-gray-700 hover:text-ethiopian-gold hover:bg-amber-50 font-medium transition-colors duration-200"
                  >
                    {t('nav.profile')}
                  </Link>
                  {(user?.role === 'artisan' || user?.role === 'admin') && (
                    <Link
                      to="/dashboard"
                      onClick={() => setIsMenuOpen(false)}
                      className="block px-3 py-2 rounded-md text-gray-700 hover:text-ethiopian-gold hover:bg-amber-50 font-medium transition-colors duration-200"
                    >
                      {t('nav.dashboard')}
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-2 rounded-md text-gray-700 hover:text-ethiopian-red hover:bg-red-50 font-medium transition-colors duration-200"
                  >
                    {t('auth.logout', 'Logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-gray-700 hover:text-ethiopian-gold hover:bg-amber-50 font-medium transition-colors duration-200"
                  >
                    {t('auth.login', 'Login')}
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-white bg-ethiopian-gold hover:bg-ethiopian-earth font-medium transition-colors duration-200"
                  >
                    {t('nav.join_ethiocraft', 'Join EthioCraft')}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Removed flag accent */}
    </nav>

  );
}

export default Navbar;