import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop
 * Ensures that whenever the route, search params, or history navigation changes,
 * the window and all active scroll containers immediately reset to the top (scrollTop = 0)
 * without animation delays or scroll retention.
 */
const ScrollToTop = () => {
  const { pathname, search, key } = useLocation();

  useEffect(() => {
    const resetScroll = () => {
      // 1. Instant window scroll reset
      window.scrollTo(0, 0);
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }

      // 2. Instant reset of portal and custom scroll containers
      const containers = document.querySelectorAll(
        'main, #portal-main-scroll, [data-scroll-container="true"], .overflow-y-auto'
      );
      containers.forEach((container) => {
        // Do not reset the persistent sidebar nav
        if (container.closest('aside') || container.tagName.toLowerCase() === 'aside') {
          return;
        }
        container.scrollTop = 0;
      });
    };

    // Immediate synchronous reset
    resetScroll();

    // Additional immediate next-frame reset to guard against layout shifts on mount
    const rafId = requestAnimationFrame(resetScroll);
    return () => cancelAnimationFrame(rafId);
  }, [pathname, search, key]);

  return null;
};

export default ScrollToTop;
