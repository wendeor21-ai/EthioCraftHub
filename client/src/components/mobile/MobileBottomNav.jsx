/**
 * AliExpress-style Mobile Bottom Navigation Bar
 * Only visible on mobile (< 768px), hidden on desktop
 */

import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';

const MobileBottomNav = () => {
  const location = useLocation();
  const { totalItems } = useCart();
  const { isAuthenticated } = useAuth();

  // Hide bottom nav on dashboard/admin/artisan/messages pages
  const hiddenPaths = ['/admin', '/artisan', '/dashboard', '/messages', '/zema-ai'];
  const shouldHide = hiddenPaths.some(p => location.pathname.startsWith(p));
  if (shouldHide) return null;

  const isActive = (path, exact = false) =>
    exact ? location.pathname === path : location.pathname === path || location.pathname.startsWith(path + '/');

  const navItems = [
    {
      path: '/',
      exact: true,
      label: 'Home',
      icon: (active) => (
        <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill={active ? '#e43a3a' : 'none'} stroke={active ? '#e43a3a' : '#888'} strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      path: '/products',
      label: 'Category',
      icon: (active) => (
        <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill={active ? '#e43a3a' : 'none'} stroke={active ? '#e43a3a' : '#888'} strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
    },
    {
      path: '/cart',
      label: 'Cart',
      badge: totalItems > 0 ? totalItems : null,
      icon: (active) => (
        <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill={active ? '#e43a3a' : 'none'} stroke={active ? '#e43a3a' : '#888'} strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
    },
    {
      path: isAuthenticated ? '/profile' : '/login',
      label: 'Account',
      icon: (active) => (
        <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill={active ? '#e43a3a' : 'none'} stroke={active ? '#e43a3a' : '#888'} strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Bottom spacer so page content isn't hidden behind nav */}
      <div className="h-[56px] md:hidden" aria-hidden="true" />

      {/* Fixed Bottom Nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-[9999] bg-white"
        style={{
          borderTop: '1px solid #f0f0f0',
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
                {/* Active indicator line at top */}
                {active && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full"
                    style={{ width: 28, height: 2, background: '#e43a3a' }}
                  />
                )}

                {/* Icon with badge */}
                <div className="relative">
                  {item.icon(active)}
                  {item.badge && (
                    <span
                      className="absolute flex items-center justify-center font-bold text-white"
                      style={{
                        top: -5,
                        right: -7,
                        minWidth: 15,
                        height: 15,
                        fontSize: 9,
                        background: '#e43a3a',
                        borderRadius: 8,
                        padding: '0 3px',
                        lineHeight: 1,
                      }}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: active ? 600 : 400,
                    color: active ? '#e43a3a' : '#888',
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
