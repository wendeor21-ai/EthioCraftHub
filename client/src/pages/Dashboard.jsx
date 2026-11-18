import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import AdminDashboard from './dashboards/AdminDashboard';
import ArtisanDashboard from './dashboards/ArtisanDashboard';
import Sidebar from '../components/common/Sidebar';
import { AlertCircle, Menu, PlusCircle } from 'lucide-react';
import api from '../utils/api';
import { useCustomTranslation } from '../hooks/useCustomTranslation';

// Admin Tab Components
import ManageUsers from './admin/ManageUsers';
import AddExecutive from './admin/AddExecutive';
import VerifyArtisans from './admin/VerifyArtisans';
import ModerateProducts from './admin/ModerateProducts';
import CustomOrdersAnalytics from './admin/CustomOrdersAnalytics';
import ViewReports from './admin/ViewReports';
import CoreUtilities from './admin/CoreUtilities';
import TradeLedger from './admin/core/TradeLedger';
import AdminMessages from './admin/AdminMessages';
import ZemaAIMonitor from './admin/ZemaAIMonitor';
import AdminSettings from './admin/Settings';
import WithdrawalManagement from './admin/WithdrawalManagement';

// Artisan Tab Components
import MyProducts from './artisan/MyProducts';
import AddProduct from './artisan/AddProduct';
import ManageOrders from './artisan/ManageOrders';
import Finance from './artisan/Finance';
import Reports from './artisan/Reports';
import InventoryAlerts from './artisan/InventoryAlerts';
import Reviews from './artisan/Reviews';
import ShippingDelivery from './artisan/ShippingDelivery';
import Promotions from './artisan/Promotions';
import Settings from './artisan/Settings';
import ArtisanVerification from './artisan/ArtisanVerification';

const Dashboard = ({ defaultTab }) => {
  const { user, loading } = useAuth();
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const mainContentRef = useRef(null);

  const tabFromQuery = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(defaultTab || tabFromQuery || 'dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Instantly resets all portal and window scroll positions to zero (top)
  const resetScrollToTop = () => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
      mainContentRef.current.scrollLeft = 0;
    }
    const portalEl = document.getElementById('portal-main-scroll');
    if (portalEl) {
      portalEl.scrollTop = 0;
      portalEl.scrollLeft = 0;
    }
    window.scrollTo(0, 0);
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  };

  // Tab Title helper for mobile portal header
  const getTabTitle = (tab) => {
    const titles = {
      'dashboard': t('sidebar.dashboard', 'ዳሽቦርድ (Dashboard)'),
      'products': t('sidebar.products', 'የእኔ ምርቶች (Products)'),
      'add-product': t('sidebar.add_product', 'አዲስ ምርት (Add Product)'),
      'orders': t('sidebar.orders', 'የትዕዛዝ አስተዳደር (Orders)'),
      'finance': t('sidebar.finance', 'ፋይናንስና ሂሳብ (Finance)'),
      'payments': t('sidebar.finance', 'ክፍያዎች (Payments)'),
      'reports': t('sidebar.reports', 'ሽያጭና ሪፖርት (Reports)'),
      'analytics': t('sidebar.reports', 'ትንታኔ (Analytics)'),
      'inventory-alerts': t('sidebar.inventory_alerts', 'የክምችት ማንቂያ (Inventory)'),
      'reviews': t('sidebar.reviews', 'ግምገማዎች (Reviews)'),
      'shipping': t('sidebar.shipping', 'ማድረሻና ፖሊሲ (Shipping)'),
      'promotions': t('sidebar.promotions', 'ልዩ ቅናሾች (Promotions)'),
      'settings': t('sidebar.settings', 'ቅንብሮች (Settings)'),
      'verification': t('sidebar.verification', 'የባለሙያ ማረጋገጫ (Verification)'),
      'users': t('sidebar.manage_users', 'ተጠቃሚዎች (Users)'),
      'executives': t('sidebar.add_executive', 'አስተዳዳሪዎች (Executives)'),
      'verifications': t('sidebar.verify_artisans', 'ማረጋገጫዎች (Verifications)'),
      'custom-orders': t('sidebar.custom_orders', 'ልዩ ትዕዛዞች (Custom Orders)'),
      'core-utilities': t('sidebar.core_utilities', 'መሰረታዊ ቅንብሮች (Utilities)'),
      'ledger': t('sidebar.trade_ledger', 'የግብይት መዝገብ (Ledger)'),
      'notifications': t('sidebar.notifications', 'ማሳወቂያዎች (Notifications)'),
      'zema-ai-monitor': 'Zema AI Monitor',
      'withdrawals': t('sidebar.withdrawals', 'የገንዘብ ማውጣት (Withdrawals)'),
      'broadcast': t('sidebar.broadcast_messages', 'የስርጭት መልእክት (Broadcast)')
    };
    return titles[tab] || titles['dashboard'];
  };

  useEffect(() => {
    const current = searchParams.get('tab') || defaultTab || 'dashboard';
    setActiveTab(current);
    resetScrollToTop();
  }, [searchParams, defaultTab]);

  useEffect(() => {
    resetScrollToTop();
  }, [activeTab]);

  const handleSelectTab = (tabId) => {
    if (activeTab === tabId) {
      resetScrollToTop();
      return;
    }
    setActiveTab(tabId);
    if (tabId === 'dashboard') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab: tabId }, { replace: true });
    }
    // Instant zero-delay scroll reset
    resetScrollToTop();
  };

  useEffect(() => {
    if (user?.role === 'customer') {
      navigate('/orders', { replace: true });
    } else if (user?.role === 'admin') {
      const fetch = () =>
        api.get('/admin/withdrawals?status=pending&limit=1000')
          .then(r => setPendingWithdrawals(r.data?.data?.withdrawals?.length || 0))
          .catch(() => { });
      fetch();
      const id = setInterval(fetch, 30000);
      return () => clearInterval(id);
    }
  }, [user, navigate]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoadingSpinner size="large" />
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Required</h2>
        <p className="text-gray-600 mb-6">Please log in to access your dashboard</p>
        <button
          onClick={() => navigate('/login')}
          className="w-full bg-amber-500 text-white py-3 rounded-lg font-semibold hover:bg-amber-600 transition-colors"
        >
          Go to Login
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen max-h-screen w-full bg-[#F8F9FB] overflow-hidden">
      {/* Permanent Persistent Sidebar with Independent Scroll */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        hideFloatingToggle={true}
      />

      {/* Main content pane with Independent Scroll */}
      <div className="flex-1 h-full max-h-screen flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Portal Navigation Bar - Sticky at top of content, never hidden */}
        <header className="lg:hidden shrink-0 bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between z-30 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-xs transition-all focus:outline-none shrink-0"
              aria-label="Open portal menu"
            >
              <Menu className="w-4 h-4" />
              <span>{t('sidebar.menu', 'ሜኑ')}</span>
            </button>
            <div className="h-4 w-px bg-gray-200 shrink-0" />
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <span className="text-xs font-bold text-gray-800 truncate">
                {getTabTitle(activeTab)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {user?.role === 'artisan' && activeTab !== 'add-product' && (
              <button
                type="button"
                onClick={() => handleSelectTab('add-product')}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200/80 rounded-lg text-[11px] font-semibold hover:bg-amber-100 active:scale-95 transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>አዲስ</span>
              </button>
            )}
          </div>
        </header>

        <main
          ref={mainContentRef}
          id="portal-main-scroll"
          data-scroll-container="true"
          className="flex-1 h-full overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 lg:p-8 overscroll-contain"
        >
          {user.role === 'admin' ? (
            <div className="w-full max-w-7xl mx-auto pb-12">
              {activeTab === 'dashboard' && <AdminDashboard onSelectTab={handleSelectTab} pendingWithdrawals={pendingWithdrawals} />}
              {activeTab === 'users' && <ManageUsers insideDashboard={true} onSelectTab={handleSelectTab} />}
              {activeTab === 'executives' && <AddExecutive insideDashboard={true} onSelectTab={handleSelectTab} />}
              {activeTab === 'verifications' && <VerifyArtisans insideDashboard={true} onSelectTab={handleSelectTab} />}
              {activeTab === 'products' && <ModerateProducts insideDashboard={true} onSelectTab={handleSelectTab} />}
              {activeTab === 'custom-orders' && <CustomOrdersAnalytics insideDashboard={true} onSelectTab={handleSelectTab} />}
              {activeTab === 'reports' && <ViewReports insideDashboard={true} onSelectTab={handleSelectTab} />}
              {activeTab === 'core-utilities' && <CoreUtilities insideDashboard={true} onSelectTab={handleSelectTab} />}
              {activeTab === 'ledger' && <TradeLedger insideDashboard={true} onSelectTab={handleSelectTab} />}
              {activeTab === 'notifications' && <AdminMessages insideDashboard={true} onSelectTab={handleSelectTab} />}
              {activeTab === 'zema-ai-monitor' && <ZemaAIMonitor insideDashboard={true} onSelectTab={handleSelectTab} />}
              {activeTab === 'settings' && <AdminSettings insideDashboard={true} onSelectTab={handleSelectTab} />}
              {activeTab === 'broadcast' && <AdminSettings insideDashboard={true} onSelectTab={handleSelectTab} initialTab="broadcast" />}
              {activeTab === 'withdrawals' && <WithdrawalManagement insideDashboard={true} onSelectTab={handleSelectTab} />}
            </div>
          ) : (
            <div className="w-full max-w-7xl mx-auto pb-12">
              {(activeTab === 'dashboard' || !activeTab) && <ArtisanDashboard user={user} onSelectTab={handleSelectTab} />}
              {activeTab === 'products' && <MyProducts insideDashboard={true} onSelectTab={handleSelectTab} />}
              {activeTab === 'add-product' && <AddProduct insideDashboard={true} onSelectTab={handleSelectTab} />}
              {activeTab === 'orders' && <ManageOrders insideDashboard={true} onSelectTab={handleSelectTab} />}
              {(activeTab === 'finance' || activeTab === 'payments') && <Finance insideDashboard={true} onSelectTab={handleSelectTab} />}
              {(activeTab === 'reports' || activeTab === 'analytics') && <Reports insideDashboard={true} onSelectTab={handleSelectTab} />}
              {activeTab === 'inventory-alerts' && <InventoryAlerts insideDashboard={true} onSelectTab={handleSelectTab} />}
              {activeTab === 'reviews' && <Reviews insideDashboard={true} onSelectTab={handleSelectTab} />}
              {activeTab === 'shipping' && <ShippingDelivery insideDashboard={true} onSelectTab={handleSelectTab} />}
              {activeTab === 'promotions' && <Promotions insideDashboard={true} onSelectTab={handleSelectTab} />}
              {activeTab === 'settings' && <Settings insideDashboard={true} onSelectTab={handleSelectTab} />}
              {activeTab === 'verification' && <ArtisanVerification insideDashboard={true} onSelectTab={handleSelectTab} />}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
