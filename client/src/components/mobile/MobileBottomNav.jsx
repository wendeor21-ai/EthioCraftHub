/**
 * Mobile Bottom Navigation Bar (WebApp / Native App Standard)
 * Only visible on mobile (< 1024px), hidden on desktop
 */

import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import useInventoryAlerts from '../../hooks/useInventoryAlerts';
import { useCustomTranslation } from '../../hooks/useCustomTranslation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  DollarSign,
  Menu,
  Home,
  Layers,
  User,
  Users,
  ShieldCheck
} from 'lucide-react';

const MobileBottomNav = () => {
  const location = useLocation();
  const { totalItems } = useCart();
  const { isAuthenticated, user } = useAuth();
  const { pendingOrdersCount } = useInventoryAlerts();
  const { t } = useCustomTranslation();

  const isAdminView = user?.role === 'admin' && (
    location.pathname.startsWith('/admin') || location.pathname === '/dashboard'
  );

  // ─────────────────────────────────────────────────────────────
  // 1. ADMIN DASHBOARD MOBILE BOTTOM BAR
  // ─────────────────────────────────────────────────────────────
  if (isAdminView) {
    const searchParams = new URLSearchParams(location.search);
    const currentTab = searchParams.get('tab') || (location.pathname === '/admin/dashboard' || location.pathname === '/dashboard' ? 'dashboard' : '');

    const adminItems = [
      {
        id: 'dashboard',
        to: '/admin/dashboard',
        label: t('sidebar.dashboard', 'ዳሽቦርድ'),
        icon: LayoutDashboard,
        active: (!currentTab || currentTab === 'dashboard') && (location.pathname === '/admin/dashboard' || location.pathname === '/dashboard'),
      },
      {
        id: 'users',
        to: '/admin/dashboard?tab=users',
        label: t('sidebar.manage_users', 'ተጠቃሚዎች'),
        icon: Users,
        active: currentTab === 'users' || location.pathname.includes('/users'),
      },
      {
        id: 'verifications',
        to: '/admin/dashboard?tab=verifications',
        label: t('sidebar.verify_artisans', 'ማረጋገጫ'),
        icon: ShieldCheck,
        active: currentTab === 'verifications' || location.pathname.includes('/verifications'),
      },
      {
        id: 'products',
        to: '/admin/dashboard?tab=products',
        label: t('sidebar.products', 'ምርቶች'),
        icon: Package,
        active: currentTab === 'products' || location.pathname.includes('/products'),
      },
      {
        id: 'menu',
        isAction: true,
        onClick: () => {
          window.dispatchEvent(new CustomEvent('openAdminMobileSidebar'));
        },
        label: t('common.more', 'ተጨማሪ'),
        icon: Menu,
        active: false,
      }
    ];

    return (
      <>
        <div className="h-[60px] lg:hidden" aria-hidden="true" />
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-[9999] bg-white/95 backdrop-blur-md border-t border-gray-200"
          style={{
            boxShadow: '0 -2px 10px rgba(0,0,0,0.06)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <div className="flex items-stretch h-[56px] max-w-lg mx-auto">
            {adminItems.map((item) => {
              const Icon = item.icon;
              const content = (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 relative select-none active:scale-95 transition-all">
                  {item.active && (
                    <span
                      className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full bg-blue-600"
                      style={{ width: 28, height: 2.5 }}
                    />
                  )}
                  <div className="relative">
                    <Icon className={`w-5 h-5 ${item.active ? 'text-blue-600 stroke-[2.2]' : 'text-gray-500 stroke-[1.8]'}`} />
                  </div>
                  <span className={`text-[10px] leading-tight ${item.active ? 'font-bold text-blue-700' : 'font-medium text-gray-500'}`}>
                    {item.label}
                  </span>
                </div>
              );

              if (item.isAction) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    className="flex-1 flex items-center justify-center focus:outline-none"
                  >
                    {content}
                  </button>
                );
              }

              return (
                <Link
                  key={item.id}
                  to={item.to}
                  className="flex-1 flex items-center justify-center"
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </nav>
      </>
    );
  }

  // If on other admin page without bottom bar
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const isArtisanView = user?.role === 'artisan' && (
    location.pathname.startsWith('/artisan') || location.pathname.startsWith('/dashboard')
  );

  // ─────────────────────────────────────────────────────────────
  // 1. ARTISAN DASHBOARD MOBILE BOTTOM BAR
  // ─────────────────────────────────────────────────────────────
  if (isArtisanView) {
    const searchParams = new URLSearchParams(location.search);
    const currentTab = searchParams.get('tab') || (location.pathname === '/artisan/dashboard' ? 'dashboard' : '');

    const artisanItems = [
      {
        id: 'dashboard',
        to: '/artisan/dashboard',
        label: t('sidebar.dashboard', 'ዳሽቦርድ'),
        icon: LayoutDashboard,
        active: (!currentTab || currentTab === 'dashboard') && location.pathname === '/artisan/dashboard',
      },
      {
        id: 'products',
        to: '/artisan/dashboard?tab=products',
        label: t('sidebar.products', 'ምርቶች'),
        icon: Package,
        active: currentTab === 'products' || currentTab === 'add-product' || location.pathname.includes('/products'),
      },
      {
        id: 'orders',
        to: '/artisan/dashboard?tab=orders',
        label: t('sidebar.orders', 'ትዕዛዞች'),
        icon: ShoppingCart,
        badge: pendingOrdersCount > 0 ? pendingOrdersCount : null,
        active: currentTab === 'orders' || location.pathname.includes('/orders'),
      },
      {
        id: 'finance',
        to: '/artisan/dashboard?tab=finance',
        label: t('sidebar.finance', 'ፋይናንስ'),
        icon: DollarSign,
        active: currentTab === 'finance' || currentTab === 'payments' || location.pathname.includes('/finance') || location.pathname.includes('/payments'),
      },
      {
        id: 'menu',
        isAction: true,
        onClick: () => {
          window.dispatchEvent(new CustomEvent('openArtisanMobileSidebar'));
        },
        label: t('common.more', 'ተጨማሪ'),
        icon: Menu,
        active: false,
      }
    ];

    return (
      <>
        {/* Bottom spacer so page content isn't covered */}
        <div className="h-[60px] lg:hidden" aria-hidden="true" />

        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-[9999] bg-white/95 backdrop-blur-md border-t border-gray-200"
          style={{
            boxShadow: '0 -2px 10px rgba(0,0,0,0.06)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <div className="flex items-stretch h-[56px] max-w-lg mx-auto">
            {artisanItems.map((item) => {
              const Icon = item.icon;
              const content = (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 relative select-none active:scale-95 transition-all">
                  {item.active && (
                    <span
                      className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full bg-amber-600"
                      style={{ width: 28, height: 2.5 }}
                    />
                  )}
                  <div className="relative">
                    <Icon className={`w-5 h-5 ${item.active ? 'text-amber-600 stroke-[2.2]' : 'text-gray-500 stroke-[1.8]'}`} />
                    {item.badge && (
                      <span className="absolute -top-1.5 -right-2.5 bg-amber-600 text-white text-[9px] font-bold px-1 min-w-[15px] h-[15px] rounded-full flex items-center justify-center animate-pulse shadow-sm">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] leading-tight ${item.active ? 'font-bold text-amber-700' : 'font-medium text-gray-500'}`}>
                    {item.label}
                  </span>
                </div>
              );

              if (item.isAction) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    className="flex-1 flex items-center justify-center focus:outline-none"
                  >
                    {content}
                  </button>
                );
              }

              return (
                <Link
                  key={item.id}
                  to={item.to}
                  className="flex-1 flex items-center justify-center"
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </nav>
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. SHOPPER / CUSTOMER MOBILE BOTTOM BAR
  // ─────────────────────────────────────────────────────────────
  const isActive = (path, exact = false) =>
    exact ? location.pathname === path : location.pathname === path || location.pathname.startsWith(path + '/');

  const navItems = [
    {
      path: '/',
      exact: true,
      label: t('nav.home', 'Home'),
      icon: (active) => <Home className={`w-5 h-5 ${active ? 'text-amber-600' : 'text-gray-500'}`} />,
    },
    {
      path: '/products',
      label: t('nav.shop', 'Shop'),
      icon: (active) => <Layers className={`w-5 h-5 ${active ? 'text-amber-600' : 'text-gray-500'}`} />,
    },
    {
      path: '/cart',
      label: t('nav.cart', 'Cart'),
      badge: totalItems > 0 ? totalItems : null,
      icon: (active) => <ShoppingCart className={`w-5 h-5 ${active ? 'text-amber-600' : 'text-gray-500'}`} />,
    },
    {
      path: isAuthenticated ? (user?.role === 'artisan' ? '/artisan/dashboard' : '/profile') : '/login',
      label: isAuthenticated ? (user?.role === 'artisan' ? t('nav.dashboard', 'Hub') : t('nav.account', 'Account')) : t('auth.login', 'Login'),
      icon: (active) => <User className={`w-5 h-5 ${active ? 'text-amber-600' : 'text-gray-500'}`} />,
    },
  ];

  return (
    <>
      <div className="h-[56px] md:hidden" aria-hidden="true" />

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-gray-200"
        style={{
          boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-stretch h-[56px]">
          {navItems.map((item) => {
            const active = isActive(item.path, item.exact);
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex-1 flex flex-col items-center justify-center gap-[3px] relative select-none active:opacity-70 transition-opacity"
              >
                {active && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full bg-amber-600"
                    style={{ width: 28, height: 2 }}
                  />
                )}

                <div className="relative">
                  {item.icon(active)}
                  {item.badge && (
                    <span
                      className="absolute flex items-center justify-center font-bold text-white bg-amber-600 rounded-full"
                      style={{
                        top: -5,
                        right: -7,
                        minWidth: 15,
                        height: 15,
                        fontSize: 9,
                        padding: '0 3px',
                        lineHeight: 1,
                      }}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>

                <span
                  style={{
                    fontSize: 10,
                    fontWeight: active ? 600 : 400,
                    color: active ? '#D97706' : '#6B7280',
                    lineHeight: 1,
                  }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default MobileBottomNav;
