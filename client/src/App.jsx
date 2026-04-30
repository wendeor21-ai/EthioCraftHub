

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';

// Context Providers
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { SoundProvider } from './contexts/SoundContext';

// Layout Components
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import Preloader from './components/common/Preloader';

// Page Components
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import ArtisanProfile from './pages/ArtisanProfile';
import ArtisanActivity from './pages/ArtisanActivity';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import ReceiptUpload from './pages/checkout/ReceiptUpload';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import OAuthCallback from './pages/auth/OAuthCallback';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import AddProduct from './pages/artisan/AddProduct';
import ArtisanPromotions from './pages/artisan/Promotions';
import ManageOrders from './pages/artisan/ManageOrders';
import EditProfile from './pages/EditProfile';
import Analytics from './pages/Analytics';
import VerificationDocuments from './pages/VerificationDocuments';
import ArtisanVerification from './pages/artisan/ArtisanVerification';
import BulkUpload from './pages/BulkUpload';
import Messages from './pages/Messages';
import Promotions from './pages/Promotions';
import EditProduct from './pages/artisan/EditProduct';
import OrderSuccess from './pages/OrderSuccess';
import PaymentSuccess from './pages/PaymentSuccess';
import NotFound from './pages/NotFound';
import MyProducts from './pages/artisan/MyProducts';
import Settings from './pages/settings/Settings';
import ArtisanSettings from './pages/artisan/Settings';
import AccountSettings from './pages/AccountSettings';
import Security from './pages/Security';
import Orders from './pages/Orders';
import OrderTracking from './pages/OrderTracking';
import OrderDetail from './pages/OrderDetail';
import Wishlist from './pages/Wishlist';
import ShippingAddresses from './pages/ShippingAddresses';
import Payments from './pages/support/Payments';
import Finance from './pages/artisan/Finance';
import Reports from './pages/artisan/Reports';
import InventoryAlerts from './pages/artisan/InventoryAlerts';
import Reviews from './pages/artisan/Reviews';
import ShippingDelivery from './pages/artisan/ShippingDelivery';
import HelpSupport from './pages/support/HelpSupport';
import ZemaAI from './pages/ZemaAI';
import HelpCenter from './pages/HelpCenter';
import ContactSupport from './pages/ContactSupport';
import FAQ from './pages/FAQ';
import CustomOrderForm from './pages/orders/CustomOrderForm';

// Admin Pages
import ManageUsers from './pages/admin/ManageUsers';
import VerifyArtisans from './pages/admin/VerifyArtisans';
import ModerateProducts from './pages/admin/ModerateProducts';
import AnalyticsDashboard from './pages/admin/AnalyticsDashboard';
import ViewReports from './pages/admin/Reports';
import ZemaAIMonitor from './pages/admin/ZemaAIMonitor';
import WithdrawalManagement from './pages/admin/WithdrawalManagement';
import AdminMessages from './pages/admin/AdminMessages';
import UserDetail from './pages/admin/UserDetail';
import AdminSettings from './pages/admin/Settings';
import CustomOrdersAnalytics from './pages/admin/CustomOrdersAnalytics';
// Core utilities
import CoreUtilities from './pages/admin/CoreUtilities';
import PaymentsManagement from './pages/admin/core/PaymentsManagement';
import Disputes from './pages/admin/core/Disputes';
import CMSSettings from './pages/admin/core/CMSSettings';
import PlatformSettings from './pages/admin/core/PlatformSettings';
import NotificationsCenter from './pages/admin/core/NotificationsCenter';
import AuditLogs from './pages/admin/core/AuditLogs';
import CommissionTracking from './pages/admin/core/CommissionTracking';
import TradeLedger from './pages/admin/core/TradeLedger';

// Protected Route Component
import ProtectedRoute, { AdminRoute, ArtisanRoute, CustomerRoute } from './components/auth/ProtectedRoute';

// Styles
import './App.css';
function App() {
  const [loading, setLoading] = useState(() => !sessionStorage.getItem('hasSeenLoader'));
  const [showContent, setShowContent] = useState(() => !!sessionStorage.getItem('hasSeenLoader'));

  const handleLoadingComplete = () => {
    sessionStorage.setItem('hasSeenLoader', 'true');
    setLoading(false);
    // Small delay before showing content for smooth transition
    setTimeout(() => {
      setShowContent(true);
    }, 100);
  };

  return (
    <ThemeProvider>
      <SoundProvider>
        <SettingsProvider>
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              {/* Show preloader while loading */}
              {loading && <Preloader onLoadingComplete={handleLoadingComplete} />}

              {/* Main app content with fade-in animation */}
              <div className={`transition-opacity duration-700 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
                {/* እዚህ ጋር Future Flags ተጨምረዋል ማስጠንቀቂያውን ለማጥፋት */}
                <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                  <div className="App min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
                    {/* Navigation */}
                    <Navbar />

                    {/* Main Content */}
                    <main className="flex-grow">
                      <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={<Home />} />
                        {/* ... የተቀሩት የRoute ዝርዝሮች እንደነበሩ ይቀጥላሉ ... */}
                        <Route path="/products" element={<Products />} />
                        <Route path="/products/:id" element={<ProductDetail />} />
                        <Route path="/artisan/activity" element={<ArtisanActivity />} />
                         <Route path="/cart" element={<Cart />} />

                        {/* Authentication Routes */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password/:token" element={<ResetPassword />} />
                        {/* OAuth callback — receives token from backend after Google/Apple login */}
                        <Route path="/auth/callback" element={<OAuthCallback />} />

                        {/* Protected Routes */}
                        <Route
                          path="/profile"
                          element={
                            <ProtectedRoute>
                              <Profile />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/account-settings"
                          element={
                            <ProtectedRoute>
                              <AccountSettings />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/security"
                          element={
                            <ProtectedRoute>
                              <Security />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/orders"
                          element={
                            <ProtectedRoute>
                              <Orders />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/orders/:id"
                          element={
                            <ProtectedRoute>
                              <OrderDetail />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/orders/track"
                          element={
                            <ProtectedRoute>
                              <OrderTracking />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/wishlist"
                          element={
                            <ProtectedRoute>
                              <Wishlist />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/shipping-addresses"
                          element={
                            <ProtectedRoute>
                              <ShippingAddresses />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/checkout"
                          element={
                            <ProtectedRoute roles={['customer']}>
                              <Checkout />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/upload-receipt/:orderId"
                          element={
                            <ProtectedRoute roles={['customer']}>
                              <ReceiptUpload />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/order-success"
                          element={
                            <ProtectedRoute>
                              <OrderSuccess />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/payment/success"
                          element={
                            <ProtectedRoute>
                              <PaymentSuccess />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/payment/callback"
                          element={
                            <ProtectedRoute>
                              <PaymentSuccess />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/custom-order"
                          element={
                            <ProtectedRoute roles={['customer']}>
                              <CustomOrderForm />
                            </ProtectedRoute>
                          }
                        />

                        {/* Role-based Dashboard Routes */}
                        <Route
                          path="/admin/dashboard"
                          element={
                            <AdminRoute>
                              <Dashboard />
                            </AdminRoute>
                          }
                        />
                        <Route
                          path="/artisan/dashboard"
                          element={
                            <ArtisanRoute requireVerification={true}>
                              <Dashboard />
                            </ArtisanRoute>
                          }
                        />
                        <Route
                          path="/dashboard"
                          element={
                            <ArtisanRoute requireVerification={true}>
                              <Dashboard />
                            </ArtisanRoute>
                          }
                        />

                        {/* Artisan-specific Routes */}
                        <Route
                          path="/artisan/add-product"
                          element={
                            <ArtisanRoute>
                              <AddProduct />
                            </ArtisanRoute>
                          }
                        />
                        <Route
                          path="/artisan/edit-product/:id"
                          element={
                            <ArtisanRoute>
                              <AddProduct />
                            </ArtisanRoute>
                          }
                        />
                        <Route
                          path="/artisan/products"
                          element={
                            <ArtisanRoute>
                              <MyProducts />
                            </ArtisanRoute>
                          }
                        />
                        <Route
                          path="/artisan/promotions"
                          element={
                            <ArtisanRoute>
                              <ArtisanPromotions />
                            </ArtisanRoute>
                          }
                        />
                        <Route
                          path="/artisan/settings"
                          element={
                            <ArtisanRoute>
                              <ArtisanSettings />
                            </ArtisanRoute>
                          }
                        />
                        <Route
                          path="/artisan/payments"
                          element={
                            <ArtisanRoute>
                              <Finance />
                            </ArtisanRoute>
                          }
                        />
                        <Route
                          path="/artisan/finance"
                          element={
                            <ArtisanRoute>
                              <Finance />
                            </ArtisanRoute>
                          }
                        />
                        <Route
                          path="/artisan/reports"
                          element={
                            <ArtisanRoute>
                              <Reports />
                            </ArtisanRoute>
                          }
                        />
                        <Route
                          path="/artisan/inventory-alerts"
                          element={
                            <ArtisanRoute>
                              <InventoryAlerts />
                            </ArtisanRoute>
                          }
                        />
                        <Route
                          path="/artisan/reviews"
                          element={
                            <ArtisanRoute>
                              <Reviews />
                            </ArtisanRoute>
                          }
                        />
                        <Route
                          path="/artisan/shipping"
                          element={
                            <ArtisanRoute>
                              <ShippingDelivery />
                            </ArtisanRoute>
                          }
                        />
                        <Route
                          path="/artisan/help"
                          element={
                            <ArtisanRoute requireVerification={false}>
                              <HelpSupport />
                            </ArtisanRoute>
                          }
                        />
                        <Route
                          path="/artisan/orders"
                          element={
                            <ArtisanRoute>
                              <ManageOrders />
                            </ArtisanRoute>
                          }
                        />
                        <Route
                          path="/artisan/edit-profile"
                          element={
                            <ArtisanRoute>
                              <EditProfile />
                            </ArtisanRoute>
                          }
                        />
                        <Route
                          path="/artisan/analytics"
                          element={
                            <ArtisanRoute>
                              <Analytics />
                            </ArtisanRoute>
                          }
                        />
                        <Route
                          path="/artisan/bulk-upload"
                          element={
                            <ArtisanRoute>
                              <BulkUpload />
                            </ArtisanRoute>
                          }
                        />
                        <Route
                          path="/artisan/messages"
                          element={
                            <ArtisanRoute>
                              <Messages />
                            </ArtisanRoute>
                          }
                        />
                        <Route
                          path="/artisan/verification"
                          element={
                            <ArtisanRoute requireVerification={false}>
                              <ArtisanVerification />
                            </ArtisanRoute>
                          }
                        />
                        <Route path="/artisan/:id" element={<ArtisanProfile />} />

                        {/* ZemaAI - Available to All Authenticated Users */}
                        <Route
                          path="/zema-ai"
                          element={
                            <ProtectedRoute roles={[]}>
                              <ZemaAI />
                            </ProtectedRoute>
                          }
                        />

                        {/* Help & Support Routes */}
                        <Route
                          path="/help-center"
                          element={
                            <ProtectedRoute>
                              <HelpCenter />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/contact-support"
                          element={
                            <ProtectedRoute>
                              <ContactSupport />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/faqs"
                          element={
                            <ProtectedRoute>
                              <FAQ />
                            </ProtectedRoute>
                          }
                        />

                        {/* Messages - Available to All Authenticated Users */}
                        <Route
                          path="/messages"
                          element={
                            <ProtectedRoute>
                              <Messages />
                            </ProtectedRoute>
                          }
                        />

                        {/* Admin-specific Routes */}
                        <Route
                          path="/admin/users"
                          element={
                            <AdminRoute>
                              <ManageUsers />
                            </AdminRoute>
                          }
                        />
                        <Route
                          path="/admin/verifications"
                          element={
                            <AdminRoute>
                              <VerifyArtisans />
                            </AdminRoute>
                          }
                        />
                        <Route
                          path="/admin/products"
                          element={
                            <AdminRoute>
                              <ModerateProducts />
                            </AdminRoute>
                          }
                        />
                        <Route
                          path="/admin/analytics"
                          element={
                            <AdminRoute>
                              <AnalyticsDashboard />
                            </AdminRoute>
                          }
                        />
                        <Route
                          path="/admin/reports"
                          element={
                            <AdminRoute>
                              <ViewReports />
                            </AdminRoute>
                          }
                        />
                        <Route
                          path="/admin/settings"
                          element={
                            <AdminRoute>
                              <AdminSettings />
                            </AdminRoute>
                          }
                        />
                        <Route
                          path="/admin/zema-ai-monitor"
                          element={
                            <AdminRoute>
                              <ZemaAIMonitor />
                            </AdminRoute>
                          }
                        />
                        <Route
                          path="/admin/withdrawals"
                          element={
                            <AdminRoute>
                              <WithdrawalManagement />
                            </AdminRoute>
                          }
                        />
                        {/* Core Utilities Module */}
                        <Route
                          path="/admin/core-utilities"
                          element={
                            <AdminRoute>
                              <CoreUtilities />
                            </AdminRoute>
                          }
                        />
                        <Route
                          path="/admin/core/payments"
                          element={
                            <AdminRoute>
                              <PaymentsManagement />
                            </AdminRoute>
                          }
                        />
                        <Route
                          path="/admin/core/commissions"
                          element={
                            <AdminRoute>
                              <CommissionTracking />
                            </AdminRoute>
                          }
                        />
                        <Route
                          path="/admin/core/ledger"
                          element={
                            <AdminRoute>
                              <TradeLedger />
                            </AdminRoute>
                          }
                        />
                        <Route
                          path="/admin/core/disputes"
                          element={
                            <AdminRoute>
                              <Disputes />
                            </AdminRoute>
                          }
                        />
                        <Route
                          path="/admin/core/cms"
                          element={
                            <AdminRoute>
                              <CMSSettings />
                            </AdminRoute>
                          }
                        />
                        <Route
                          path="/admin/core/platform-settings"
                          element={
                            <AdminRoute>
                              <PlatformSettings />
                            </AdminRoute>
                          }
                        />
                        <Route
                          path="/admin/custom-orders"
                          element={
                            <AdminRoute>
                              <CustomOrdersAnalytics />
                            </AdminRoute>
                          }
                        />
                        <Route
                          path="/admin/core/notifications"
                          element={
                            <AdminRoute>
                              <NotificationsCenter />
                            </AdminRoute>
                          }
                        />
                        <Route
                          path="/admin/core/audit-logs"
                          element={
                            <AdminRoute>
                              <AuditLogs />
                            </AdminRoute>
                          }
                        />
                        <Route
                          path="/admin/users/:userId"
                          element={
                            <AdminRoute>
                              <UserDetail />
                            </AdminRoute>
                          }
                        />
                        <Route
                          path="/admin/notifications"
                          element={
                            <AdminRoute>
                              <AdminMessages />
                            </AdminRoute>
                          }
                        />

                        {/* 404 Route */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </main>

                    {/* Footer */}
                    <Footer />

                    {/* Toast Notifications */}
                    <Toaster
                      position="top-right"
                      toastOptions={{
                        duration: 4000,
                        style: {
                          background: '#FEF3C7', // Ethiopian gold
                          color: '#92400E',
                          border: '1px solid #F59E0B',
                          borderRadius: '8px',
                          fontFamily: 'Inter, sans-serif',
                        },
                        success: {
                          style: {
                            background: '#D1FAE5', // Ethiopian green
                            color: '#065F46',
                            border: '1px solid #10B981',
                          },
                        },
                        error: {
                          style: {
                            background: '#FEE2E2', // Ethiopian red
                            color: '#991B1B',
                            border: '1px solid #EF4444',
                          },
                        },
                      }}
                    />
                  </div>
                </Router>
              </div>
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </SettingsProvider>
    </SoundProvider>
  </ThemeProvider >
  );
}

export default App;