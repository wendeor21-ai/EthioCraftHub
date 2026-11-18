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
  Wallet,
  Receipt,
  FileText,
  Settings,
  Users,
  UserPlus,
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
  Scissors,
  Megaphone
} from 'lucide-react';
import useInventoryAlerts from '../../hooks/useInventoryAlerts';
import { useCustomTranslation } from '../../hooks/useCustomTranslation';
import toast from 'react-hot-toast';
import { Lock } from 'lucide-react';


const Sidebar = ({
  onCollapsedChange,
  activeTab,
  onSelectTab,
  isMobileOpen: controlledMobileOpen,
  setIsMobileOpen: setControlledMobileOpen,
  hideFloatingToggle = false
}) => {
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
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);

  const isMobileOpen = controlledMobileOpen !== undefined ? controlledMobileOpen : internalMobileOpen;
  const setIsMobileOpen = setControlledMobileOpen || setInternalMobileOpen;

  // Notification States
  const [unreadMessages, setUnreadMessages] = useState(0);
  const { inventoryCount, pendingOrdersCount } = useInventoryAlerts();

  useEffect(() => {
    const handleOpenMobile = () => setIsMobileOpen(true);
    window.addEventListener('openArtisanMobileSidebar', handleOpenMobile);
    window.addEventListener('openAdminMobileSidebar', handleOpenMobile);
    return () => {
      window.removeEventListener('openArtisanMobileSidebar', handleOpenMobile);
      window.removeEventListener('openAdminMobileSidebar', handleOpenMobile);
    };
  }, [setIsMobileOpen]);


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
  const isApproved = status === 'approved' && user?.isVerified === true;
  const isVerified = isApproved;
  const isPending = ['pending', 'under_review'].includes(status);

  const getVerificationMenuItem = () => {
    if (isVerified) {
      return { label: t('sidebar.verification_status', 'Verification Status'), path: '/artisan/verification', icon: Shield, badge: 'Verified', badgeColor: 'bg-green-500 text-white' };
    } else if (isPending) {
      return { label: t('sidebar.verification_pending', 'Verification Pending'), path: '/artisan/verification', icon: Shield, badge: 'In Review', badgeColor: 'bg-amber-500 text-white font-bold animate-pulse', disabled: false };
    } else if (status === 'rejected') {
      return { label: t('sidebar.verification_rejected', 'Verification Rejected'), path: '/artisan/verification', icon: Shield, badge: 'Action Required', badgeColor: 'bg-red-500 text-white font-bold', disabled: false };
    } else {
      return { label: t('sidebar.verify_my_business', 'Verify My Business'), path: '/artisan/verification', icon: Shield, badge: 'Action Required', badgeColor: 'bg-red-500 text-white font-bold', disabled: false };
    }
  };

  const artisanMenuGroups = [
    {
      id: 'dashboard',
      label: t('sidebar.dashboard', 'Dashboard'),
      path: '/artisan/dashboard',
      icon: LayoutDashboard,
      isTopLevel: true
    },
    {
      id: 'verification',
      ...getVerificationMenuItem(),
      isTopLevel: true
    },
    {
      label: t('sidebar.overview', 'Overview'),
      icon: BarChart3,
      items: [
        { id: 'analytics', label: t('sidebar.analytics', 'Analytics'), path: '/artisan/analytics', icon: BarChart3 },
        { id: 'reports', label: t('sidebar.reports', 'Reports'), path: '/artisan/reports', icon: FileText }
      ]
    },
    {
      label: t('sidebar.products', 'Products'),
      icon: Package,
      items: [
        { id: 'products', label: t('sidebar.my_products', 'My Products'), path: '/artisan/products', icon: Package },
        { id: 'add-product', label: t('sidebar.add_product', 'Add Product'), path: '/artisan/add-product', icon: PlusCircle },
        { id: 'inventory-alerts', label: t('sidebar.inventory_alert', 'Inventory Alert'), path: '/artisan/inventory-alerts', icon: AlertTriangle, badge: inventoryCount, badgeColor: 'bg-[#CFA66E] text-[#1C1C1C]' },
        { id: 'reviews', label: t('sidebar.reviews_ratings', 'Reviews & Ratings'), path: '/artisan/reviews', icon: Star }
      ]

    },
    {
      label: t('sidebar.orders_delivery', 'Orders & Delivery'),
      icon: ShoppingCart,
      items: [
        { id: 'orders', label: t('sidebar.manage_orders', 'Manage Orders'), path: '/artisan/orders', icon: ShoppingCart, badge: pendingOrdersCount, badgeColor: pendingOrdersCount > 0 ? 'bg-amber-500 text-white font-bold animate-pulse' : 'bg-gray-200 text-gray-600' },
        { id: 'shipping', label: t('sidebar.shipping_delivery', 'Shipping & Delivery'), path: '/artisan/shipping', icon: Truck },
        { id: 'messages', label: t('sidebar.messages', 'Messages'), path: '/messages', icon: MessageSquare, badge: unreadMessages > 0 ? unreadMessages : null, badgeColor: 'bg-red-500 text-white' }
      ]

    },
    {
      label: t('sidebar.sales_finance', 'Sales & Finance'),
      icon: Wallet,
      items: [
        { id: 'promotions', label: t('sidebar.promotions', 'Promotions'), path: '/artisan/promotions', icon: Tag },
        { id: 'finance', label: t('sidebar.payments', 'Payments'), path: '/artisan/payments', icon: Receipt }
      ]
    },
    {
      label: t('sidebar.tools_support', 'Tools & Support'),
      icon: Settings,
      items: [
        { id: 'zema-ai', label: t('sidebar.zema_ai_assistant', 'ZemaAI Assistant'), path: '/zema-ai', icon: Sparkles },
        { id: 'settings', label: t('sidebar.settings', 'Settings'), path: '/artisan/settings', icon: Settings }
      ]
    }
  ];

  const adminMenuItems = [
    { id: 'dashboard', label: t('sidebar.dashboard', 'Dashboard'), path: '/admin/dashboard', icon: LayoutDashboard, isTopLevel: true },
    { id: 'users', label: t('sidebar.manage_users', 'Manage Users'), path: '/admin/users', icon: Users, isTopLevel: true },
    { id: 'executives', label: t('sidebar.add_executive', 'Add Executive'), path: '/admin/executives/add', icon: UserPlus, isTopLevel: true },
    { id: 'verifications', label: t('sidebar.verify_artisans', 'Verify Artisans'), path: '/admin/verifications', icon: Shield, isTopLevel: true },
    { id: 'products', label: t('sidebar.moderate_products', 'Moderate Products'), path: '/admin/products', icon: Eye, isTopLevel: true },
    { id: 'custom-orders', label: t('sidebar.custom_orders', 'Custom Orders'), path: '/admin/custom-orders', icon: Scissors, isTopLevel: true },
    { id: 'reports', label: t('sidebar.view_reports', 'View Reports'), path: '/admin/reports', icon: FileText, isTopLevel: true },
    { id: 'core-utilities', label: t('sidebar.core_utilities', 'Core Utilities'), path: '/admin/core-utilities', icon: Settings, isTopLevel: true },
    { id: 'ledger', label: t('sidebar.trade_ledger', 'Trade Ledger'), path: '/admin/core/ledger', icon: FileText, isTopLevel: true },
    { id: 'notifications', label: t('sidebar.notifications', 'Notifications'), path: '/admin/notifications', icon: Bell, isTopLevel: true },
    { id: 'broadcast', label: t('sidebar.broadcast_messages', '📢 Broadcast Messages'), path: '/admin/settings?sub=broadcast', icon: Megaphone, isTopLevel: true },
    { id: 'zema-ai-monitor', label: t('sidebar.zema_ai_monitor', 'Zema AI Monitor'), path: '/admin/zema-ai-monitor', icon: Shield, isTopLevel: true },
    { id: 'settings', label: t('sidebar.settings', 'Settings'), path: '/admin/settings', icon: Settings, isTopLevel: true }
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

  const isActive = (path, id) => {
    if ((isAdmin || isArtisan) && activeTab && id) {
      return activeTab === id;
    }
    return path && (location.pathname === path || location.pathname.startsWith(path + '/'));
  };

  // Initially open the category that contains the active item
  useEffect(() => {
    if (isArtisan) {
      artisanMenuGroups.forEach(group => {
        if (!group.isTopLevel && group.items) {
          if (group.items.some(item => isActive(item.path, item.id))) {
            setOpenCategory(group.label);
          }
        }
      });
    }
  }, [location.pathname, activeTab, isArtisan]); // Note: runs on location.pathname change to update expanded category

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
      {/* Mobile Floating Toggle Button - Clean pill positioned below navbar */}
      {!hideFloatingToggle && !isMobileOpen && (
        <button
          type="button"
          className="lg:hidden fixed top-[68px] left-3 z-[990] flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-gray-200 text-gray-800 hover:text-amber-600 active:scale-95 transition-all text-xs font-semibold focus:outline-none"
          onClick={() => setIsMobileOpen(true)}
          aria-label="Open sidebar menu"
        >
          <Menu size={18} className="text-amber-600" />
          <span className="font-bold text-gray-800">ሜኑ</span>
        </button>
      )}

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-[10050] transition-opacity duration-300"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 left-0 h-full max-h-screen shrink-0 bg-[#F8F9FB] flex flex-col transition-all duration-300 border-r border-gray-200 overflow-hidden overscroll-contain
          ${isMobileOpen
            ? 'z-[10100] translate-x-0 w-[290px] max-w-[85vw] shadow-2xl'
            : '-translate-x-full lg:translate-x-0 z-40'
          }
          ${effectivelyCollapsed ? 'lg:w-[72px] shadow-sm' : 'lg:w-[290px] shadow-lg lg:shadow-none'}
        `}
      >
        {/* Brand Header */}
        <div className={`p-4 h-[72px] border-b border-gray-200 flex items-center justify-between overflow-hidden bg-white shrink-0`}>
          <Link
            to={isArtisan ? '/artisan/dashboard' : '/'}
            className="flex items-center space-x-3 min-w-0"
            onClick={() => setIsMobileOpen(false)}
          >
            <div className={`w-10 h-10 bg-gradient-to-br from-amber-600 to-amber-800 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform shadow-xs ${effectivelyCollapsed ? 'mx-auto' : ''}`}>
              <span className="text-white font-bold text-xl">E</span>
            </div>
            {!effectivelyCollapsed && (
              <div className="flex-1 whitespace-nowrap overflow-hidden">
                <h1 className="text-base font-bold text-gray-900 leading-tight">EthioCraft</h1>
                <p className="text-[10px] text-amber-700 uppercase tracking-wider font-semibold">
                  {isArtisan ? 'የባለሙያ ማዕከል (Artisan)' : isAdmin ? 'አስተዳዳሪ (Admin)' : 'Portal'}
                </p>
              </div>
            )}
          </Link>

          {/* Close button on mobile drawer */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg active:scale-95 transition-all ml-2 focus:outline-none"
            aria-label="Close sidebar menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation - Independent Isolated Scroll */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 scrollbar-thin scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300 overscroll-contain">
          <div className="flex flex-col space-y-1.5 px-3">

            {menuGroups.map((group, index) => {
              // Standard rendering for top-level links (like Dashboard)
              if (group.isTopLevel) {
                const Icon = group.icon;
                const active = isActive(group.path, group.id);
                const isDisabled = group.disabled || (isArtisan && !isVerified && group.path !== '/artisan/verification');

                return (
                  <div key={group.path || group.label || index} className="relative group">
                    <Link
                      to={isDisabled ? '#' : group.path}
                      onClick={(e) => {
                        if (isDisabled) {
                          e.preventDefault();
                          toast.error('የአስተዳዳሪ ማረጋገጫ ያስፈልጋል — መለያዎ በአስተዳዳሪ እስኪጸድቅ ድረስ ሌሎች ገጾች አይከፈቱም (Admin approval required)');
                          return;
                        }
                        if (isMobileOpen) {
                          setIsMobileOpen(false);
                        }
                        if ((isAdmin || isArtisan) && onSelectTab && group.id) {
                          e.preventDefault();
                          onSelectTab(group.id);
                        }
                      }}
                      className={`flex items-center ${effectivelyCollapsed ? 'justify-center p-2.5 w-11 mx-auto' : 'px-3.5 py-2.5'} rounded-xl transition-all duration-200 relative
                        ${active
                          ? 'bg-blue-50 text-blue-600 font-semibold'
                          : isDisabled
                            ? 'text-gray-400 cursor-not-allowed opacity-50 bg-gray-100/40 select-none'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-blue-600'
                        }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-500 rounded-r-lg" />
                      )}
                      <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-blue-600' : isDisabled ? 'text-gray-400' : 'text-gray-500 group-hover:text-blue-500'} transition-colors duration-200`} />
                      {!effectivelyCollapsed && (
                        <span className="ml-3 flex-1 flex items-center justify-between text-[13px] whitespace-nowrap">
                          {group.label}
                          {isDisabled && !group.badge ? (
                            <span className="text-[10px] text-gray-400 font-semibold flex items-center gap-1">🔒 Locked</span>
                          ) : (
                            renderBadge(group.badge, group.badgeColor)
                          )}
                        </span>
                      )}
                    </Link>
                    {renderTooltip(isDisabled ? `${group.label} (Locked - Admin Approval Required)` : group.label)}
                  </div>
                );
              }

              // Rendering for expandable categories
              const isCategoryOpen = openCategory === group.label && !effectivelyCollapsed;
              const ParentIcon = group.icon;
              const categoryHasActiveItem = group.items.some(item => isActive(item.path));
              const isCategoryDisabled = isArtisan && !isVerified;

              return (
                <div key={group.label} className="relative mb-2">
                  <button
                    onClick={() => handleCategoryClick(group.label)}
                    className={`w-full flex items-center ${effectivelyCollapsed ? 'justify-center p-3 w-12 mx-auto' : 'px-4 py-3'} rounded-xl transition-all duration-200 group relative focus:outline-none
                      ${isCategoryDisabled ? 'text-gray-400 opacity-60' : ''}
                      ${categoryHasActiveItem && !isCategoryOpen ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'}`}
                  >
                    {categoryHasActiveItem && !isCategoryOpen && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-500 rounded-r-lg" />
                    )}
                    <ParentIcon className={`w-[20px] h-[20px] flex-shrink-0 ${categoryHasActiveItem && !isCategoryOpen ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-500'} transition-colors duration-200`} />
                    {!effectivelyCollapsed && (
                      <span className="ml-3 flex-1 flex items-center justify-between text-[14px] font-semibold tracking-wide whitespace-nowrap">
                        {group.label}
                        <div className="flex items-center gap-1">
                          {isCategoryDisabled && <span className="text-[10px] text-gray-400">🔒</span>}
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-300 ${isCategoryOpen ? 'rotate-180' : ''} text-gray-400 group-hover:text-blue-500`}
                          />
                        </div>
                      </span>
                    )}
                  </button>
                  {renderTooltip(isCategoryDisabled ? `${group.label} (Locked)` : group.label)}

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
                          const isItemDisabled = item.disabled || (isArtisan && !isVerified);
                          return (
                            <Link
                              key={item.path}
                              to={isItemDisabled ? '#' : item.path}
                              onClick={(e) => {
                                if (isItemDisabled) {
                                  e.preventDefault();
                                  toast.error('የአስተዳዳሪ ማረጋገጫ ያስፈልጋል — መለያዎ በአስተዳዳሪ እስኪጸድቅ ድረስ ሌሎች ገጾች አይከፈቱም (Admin approval required)');
                                  return;
                                }
                                if (isMobileOpen) {
                                  setIsMobileOpen(false);
                                }
                                if ((isAdmin || isArtisan) && onSelectTab && item.id && item.id !== 'messages') {
                                  e.preventDefault();
                                  onSelectTab(item.id);
                                }
                              }}
                              className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 relative group/item
                                ${active
                                  ? 'bg-blue-50 text-blue-600'
                                  : isItemDisabled
                                    ? 'text-gray-400 opacity-45 cursor-not-allowed select-none'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                            >
                              {active && (
                                <span className="absolute -left-[18px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500 border border-white" />
                              )}
                              <ItemIcon className={`w-[16px] h-[16px] mr-2.5 ${active ? 'text-blue-600' : isItemDisabled ? 'text-gray-400' : 'text-gray-400 group-hover/item:text-gray-600'} transition-colors duration-200`} />
                              <span className={`flex-1 flex items-center justify-between text-[13px] whitespace-nowrap ${active ? 'font-semibold' : 'font-medium'}`}>
                                {item.label}
                                {isItemDisabled ? (
                                  <span className="text-[10px] text-gray-400 font-normal">🔒 Locked</span>
                                ) : (
                                  renderBadge(item.badge, item.badgeColor)
                                )}
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
