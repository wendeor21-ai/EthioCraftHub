import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supportAPI } from '../../utils/api';
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  ShoppingCart,
  MessageSquare,
  BarChart3,
  DollarSign,
  FileText,
  Settings,
  Users,
  Shield,
  Eye,
  Bell,
  Sparkles,
  Truck,
  Star,
  AlertTriangle,
  Tag,
  ChevronDown,
  Menu,
  X,
  Scissors
} from 'lucide-react';
import useInventoryAlerts from '../../hooks/useInventoryAlerts';
import { useCustomTranslation } from '../../hooks/useCustomTranslation';


const Sidebar = ({ onCollapsedChange }) => {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useCustomTranslation();

  const userRole = user?.role?.toLowerCase?.() || '';
  const isArtisan = userRole === 'artisan';
  const isAdmin = userRole === 'admin';

  // Force re-render when user data changes
  const [, forceUpdate] = useState({});
  useEffect(() => {
    forceUpdate({});
  }, [user?.verification?.status]);

  const [openCategory, setOpenCategory] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 1024);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Notification States
  const [unreadMessages, setUnreadMessages] = useState(0);
  const { inventoryCount, pendingOrdersCount } = useInventoryAlerts();


  useEffect(() => {
    const handleResize = () => {
      // Auto collapse on screens smaller than lg (1024px)
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Validate on mount
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (onCollapsedChange) {
      onCollapsedChange(isCollapsed);
    }
  }, [isCollapsed, onCollapsedChange]);

  useEffect(() => {
    let mounted = true;
    const fetchUnread = async () => {
      try {
        const res = await supportAPI.getUnreadCount();
        const count = res?.data?.count ?? 0;
        if (mounted) setUnreadMessages(count);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUnread();
    return () => { mounted = false; };
  }, []);

  // Verification Logic
  const verification = user?.verification || { status: 'not_submitted' };
  const status = verification.status?.toLowerCase() || 'not_submitted';
  const isVerified = status === 'approved';
  const isPending = ['pending', 'under_review'].includes(status);

   const getVerificationMenuItem = () => {
    if (isVerified) {
      return { label: t('sidebar.verification_status', 'Verification Status'), path: '/artisan/verification', icon: Shield, badge: 'Verified', badgeColor: 'bg-green-500' };
    } else if (isPending) {
      return { label: t('sidebar.verification_pending', 'Verification Pending'), path: '/artisan/verification', icon: Shield, badge: 'Pending', badgeColor: 'bg-yellow-500', disabled: false };
    } else {
      return { label: t('sidebar.verify_my_business', 'Verify My Business'), path: '/artisan/verification', icon: Shield, badge: 'Action Required', badgeColor: 'bg-red-500' };
    }
  };

  const artisanMenuGroups = [
    {
      label: t('sidebar.dashboard', 'Dashboard'),
      path: '/artisan/dashboard',
      icon: LayoutDashboard,
      isTopLevel: true
    },
    {
      ...getVerificationMenuItem(),
      isTopLevel: true
    },
    {
      label: t('sidebar.overview', 'Overview'),
      icon: BarChart3,
      items: [
        { label: t('sidebar.analytics', 'Analytics'), path: '/artisan/analytics', icon: BarChart3 },
        { label: t('sidebar.reports', 'Reports'), path: '/artisan/reports', icon: FileText }
      ]
    },
    {
      label: t('sidebar.products', 'Products'),
      icon: Package,
      items: [
        { label: t('sidebar.my_products', 'My Products'), path: '/artisan/products', icon: Package },
        { label: t('sidebar.add_product', 'Add Product'), path: '/artisan/add-product', icon: PlusCircle },
        { label: t('sidebar.inventory_alert', 'Inventory Alert'), path: '/artisan/inventory-alerts', icon: AlertTriangle, badge: inventoryCount, badgeColor: 'bg-[#CFA66E] text-[#1C1C1C]' },
        { label: t('sidebar.reviews_ratings', 'Reviews & Ratings'), path: '/artisan/reviews', icon: Star }
      ]

    },
    {
      label: t('sidebar.orders_delivery', 'Orders & Delivery'),
      icon: ShoppingCart,
      items: [
        { label: t('sidebar.manage_orders', 'Manage Orders'), path: '/artisan/orders', icon: ShoppingCart, badge: pendingOrdersCount, badgeColor: 'bg-[#CFA66E] text-[#1C1C1C]' },
        { label: t('sidebar.shipping_delivery', 'Shipping & Delivery'), path: '/artisan/shipping', icon: Truck },
        { label: t('sidebar.messages', 'Messages'), path: '/messages', icon: MessageSquare, badge: unreadMessages > 0 ? unreadMessages : null, badgeColor: 'bg-red-500 text-white' }
      ]

    },
    {
      label: t('sidebar.sales_finance', 'Sales & Finance'),
      icon: DollarSign,
      items: [
        { label: t('sidebar.promotions', 'Promotions'), path: '/artisan/promotions', icon: Tag },
        { label: t('sidebar.payments', 'Payments'), path: '/artisan/payments', icon: DollarSign }
      ]
    },
    {
      label: t('sidebar.tools_support', 'Tools & Support'),
      icon: Settings,
      items: [
        { label: t('sidebar.zema_ai_assistant', 'ZemaAI Assistant'), path: '/zema-ai', icon: Sparkles },
        { label: t('sidebar.settings', 'Settings'), path: '/artisan/settings', icon: Settings }
      ]
    }
  ];

  const adminMenuItems = [
    { label: t('sidebar.dashboard', 'Dashboard'), path: '/admin/dashboard', icon: LayoutDashboard, isTopLevel: true },
    { label: t('sidebar.manage_users', 'Manage Users'), path: '/admin/users', icon: Users, isTopLevel: true },
    { label: t('sidebar.verify_artisans', 'Verify Artisans'), path: '/admin/verifications', icon: Shield, isTopLevel: true },
    { label: t('sidebar.moderate_products', 'Moderate Products'), path: '/admin/products', icon: Eye, isTopLevel: true },
    { label: t('sidebar.custom_orders', 'Custom Orders'), path: '/admin/custom-orders', icon: Scissors, isTopLevel: true },
    { label: t('sidebar.view_reports', 'View Reports'), path: '/admin/reports', icon: FileText, isTopLevel: true },
    { label: t('sidebar.core_utilities', 'Core Utilities'), path: '/admin/core-utilities', icon: Settings, isTopLevel: true },
    { label: t('sidebar.trade_ledger', 'Trade Ledger'), path: '/admin/core/ledger', icon: FileText, isTopLevel: true },
    { label: t('sidebar.notifications', 'Notifications'), path: '/admin/notifications', icon: Bell, isTopLevel: true },
    { label: t('sidebar.zema_ai_monitor', 'Zema AI Monitor'), path: '/admin/zema-ai-monitor', icon: Shield, isTopLevel: true },
    { label: t('sidebar.settings', 'Settings'), path: '/admin/settings', icon: Settings, isTopLevel: true }
  ];

  const customerMenuItems = [
    { label: t('sidebar.my_orders', 'My Orders'), path: '/orders', icon: ShoppingCart, isTopLevel: true },
    { label: t('sidebar.messages', 'Messages'), path: '/messages', icon: MessageSquare, isTopLevel: true },
    { label: t('sidebar.zema_ai_assistant', 'ZemaAI Assistant'), path: '/zema-ai', icon: Sparkles, isTopLevel: true },
    { label: t('sidebar.settings', 'Settings'), path: '/account-settings', icon: Settings, isTopLevel: true }
  ];

  const menuGroups = isAdmin
    ? adminMenuItems
    : isArtisan
      ? artisanMenuGroups
      : customerMenuItems;

  const isActive = (path) => {
    return path && (location.pathname === path || location.pathname.startsWith(path + '/'));
  };

  // Initially open the category that contains the active item
  useEffect(() => {
    if (isArtisan) {
      artisanMenuGroups.forEach(group => {
        if (!group.isTopLevel && group.items) {
          if (group.items.some(item => isActive(item.path))) {
            setOpenCategory(group.label);
          }
        }
      });
    }
  }, [location.pathname, isArtisan]); // Note: runs on location.pathname change to update expanded category

  const handleCategoryClick = (label) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setOpenCategory(label);
    } else {
      setOpenCategory(openCategory === label ? null : label);
    }
  };

  const effectivelyCollapsed = isMobileOpen ? false : isCollapsed;

  const renderTooltip = (label) => {
    if (!effectivelyCollapsed) return null;
    return (
      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
        {label}
      </div>
    );
  };

  const renderBadge = (badge, color) => {
    if (!badge && badge !== 0) return null;
    return (
      <span className={`${color} text-[10px] px-2 py-0.5 rounded-full font-bold max-w-min ml-auto ring-1 ring-black/5 shadow-sm`}>
        {badge}
      </span>
    );
  };


  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        className="lg:hidden fixed top-3 left-3 z-50 p-2 bg-white rounded-md shadow-md text-gray-700 hover:text-blue-500"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-[100dvh] bg-[#F8F9FB] flex flex-col transition-all duration-300 z-50 border-r border-gray-200
          ${effectivelyCollapsed ? 'w-0 md:w-[72px] shadow-sm' : 'w-[290px] shadow-lg'}
          ${!isMobileOpen ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}
        `}
      >
        {/* Brand Header */}
        <div className={`p-4 h-[72px] border-b border-gray-200 flex items-center ${effectivelyCollapsed ? 'justify-center' : 'justify-between'} overflow-hidden bg-white shrink-0`}>
          <Link
            to={isArtisan ? '/artisan/dashboard' : '/'}
            className="flex items-center space-x-3 w-full"
            onClick={() => setIsMobileOpen(false)}
          >
            <div className={`w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform ${effectivelyCollapsed ? 'mx-auto' : ''}`}>
              <span className="text-white font-bold text-xl">E</span>
            </div>
            {!effectivelyCollapsed && (
              <div className="flex-1 whitespace-nowrap overflow-hidden">
                <h1 className="text-lg font-bold text-gray-900 leading-tight">EthioCraft</h1>
                <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
                  {isArtisan ? 'Artisan Hub' : isAdmin ? 'Admin' : 'Portal'}
                </p>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 scrollbar-thin scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300">
          <div className="flex flex-col space-y-1.5 px-3">

            {menuGroups.map((group, index) => {
              // Standard rendering for top-level links (like Dashboard)
              if (group.isTopLevel) {
                const Icon = group.icon;
                const active = isActive(group.path);
                const isDisabled = group.disabled;

                return (
                  <div key={group.path || group.label || index} className="relative group">
                    <Link
                      to={group.path}
                      onClick={(e) => {
                        if (isDisabled) e.preventDefault();
                        else setIsMobileOpen(false);
                      }}
                      className={`flex items-center ${effectivelyCollapsed ? 'justify-center p-3 w-12 mx-auto' : 'px-4 py-3'} rounded-xl transition-all duration-200 relative
                        ${active
                          ? 'bg-blue-50 text-blue-600'
                          : isDisabled
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-blue-600'
                        }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-500 rounded-r-lg" />
                      )}
                      <Icon className={`w-[20px] h-[20px] flex-shrink-0 ${active ? 'text-blue-600' : isDisabled ? 'text-gray-400' : 'text-gray-500 group-hover:text-blue-500'} transition-colors duration-200`} />
                      {!effectivelyCollapsed && (
                        <span className="ml-3 flex-1 flex items-center justify-between text-[14px] font-medium whitespace-nowrap">
                          {group.label}
                          {renderBadge(group.badge, group.badgeColor)}
                        </span>
                      )}
                    </Link>
                    {renderTooltip(group.label)}
                  </div>
                );
              }

              // Rendering for expandable categories
              const isCategoryOpen = openCategory === group.label && !effectivelyCollapsed;
              const ParentIcon = group.icon;
              const categoryHasActiveItem = group.items.some(item => isActive(item.path));

              return (
                <div key={group.label} className="relative mb-2">
                  <button
                    onClick={() => handleCategoryClick(group.label)}
                    className={`w-full flex items-center ${effectivelyCollapsed ? 'justify-center p-3 w-12 mx-auto' : 'px-4 py-3'} rounded-xl transition-all duration-200 group relative focus:outline-none
                      ${categoryHasActiveItem && !isCategoryOpen ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'}`}
                  >
                    {categoryHasActiveItem && !isCategoryOpen && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-500 rounded-r-lg" />
                    )}
                    <ParentIcon className={`w-[20px] h-[20px] flex-shrink-0 ${categoryHasActiveItem && !isCategoryOpen ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-500'} transition-colors duration-200`} />
                    {!effectivelyCollapsed && (
                      <span className="ml-3 flex-1 flex items-center justify-between text-[14px] font-semibold tracking-wide whitespace-nowrap">
                        {group.label}
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-300 ${isCategoryOpen ? 'rotate-180' : ''} text-gray-400 group-hover:text-blue-500`}
                        />
                      </span>
                    )}
                  </button>
                  {renderTooltip(group.label)}

                  {/* Dropdown Items (Only render if NOT collapsed) */}
                  {!effectivelyCollapsed && (
                    <div
                      className={`overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-in-out
                        ${isCategoryOpen ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'}
                      `}
                    >
                      <div className="pl-11 pr-3 py-1 flex flex-col space-y-1 relative border-l-2 border-gray-100 ml-6">
                        {group.items.map(item => {
                          const active = isActive(item.path);
                          const ItemIcon = item.icon;
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              onClick={() => setIsMobileOpen(false)}
                              className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 relative group/item
                                ${active
                                  ? 'bg-blue-50 text-blue-600'
                                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                            >
                              {active && (
                                <span className="absolute -left-[18px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500 border border-white" />
                              )}
                              <ItemIcon className={`w-[16px] h-[16px] mr-2.5 ${active ? 'text-blue-600' : 'text-gray-400 group-hover/item:text-gray-600'} transition-colors duration-200`} />
                              <span className={`flex-1 flex items-center justify-between text-[13px] whitespace-nowrap ${active ? 'font-semibold' : 'font-medium'}`}>
                                {item.label}
                                {renderBadge(item.badge, item.badgeColor)}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Footer Toggle Button */}
        <div className="p-4 border-t border-gray-200 flex flex-col items-center shrink-0">
          {effectivelyCollapsed ? (
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-2 text-gray-400 hover:text-blue-500 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
              title="Expand Sidebar"
            >
              <Menu className="w-[20px] h-[20px]" />
            </button>
          ) : (
            <div className="flex items-center justify-between w-full px-2">
              <p className="text-[11px] text-gray-400 font-medium">EthioCraft v1.0.4</p>
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-gray-100 rounded-lg transition-colors hidden lg:block focus:outline-none"
                title="Collapse Sidebar"
              >
                <ChevronDown className="w-4 h-4 rotate-90" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
