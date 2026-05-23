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
  const [unreadMessages, setUnreadMessages] = useState(0); // Changed from hardcoded 3 to 0
  const prevUnreadRef = useRef(null);
  const dropdownRef = useRef(null);
  const pollRef = useRef(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { totalItems } = useCart();
  const { settings, homeConfig, broadcasts } = useSettings();
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const headerLogo = homeConfig?.headerLogo;

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
            <div className="bg-ethiopian-gold text-white text-center py-1.5 sm:py-2 text-xs sm:text-sm px-4">
              {relevant.message}
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

            {/* Notifications/Messages - Only show when authenticated */}
            {isAuthenticated && (
              <Link
                to="/messages"
                className="relative p-2 text-gray-700 hover:text-ethiopian-gold transition-colors duration-200"
              >
                <BellIcon className="w-6 h-6" />
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium animate-pulse">
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </span>
                )}
              </Link>
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
                to="/messages"
                className="relative p-1.5 text-gray-700 hover:text-ethiopian-gold transition-colors duration-200"
              >
                <BellIcon className="w-5 h-5" />
                {unreadMessages > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-green-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-medium animate-pulse">
                    {unreadMessages > 99 ? '99+' : unreadMessages}
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