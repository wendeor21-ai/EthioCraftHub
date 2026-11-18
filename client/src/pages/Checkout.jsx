/**
 * Checkout Page for EthioCraft Global
 * Mobile-First, Highly Responsive with Complete Amharic & English Localization
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MapPinIcon,
  PhoneIcon,
  HomeIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  BuildingOfficeIcon,
  BanknotesIcon,
  TruckIcon,
  ClockIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useCustomTranslation } from '../hooks/useCustomTranslation';

const PlusIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '0.00 ETB';
  return `${amount.toFixed(2)} ETB`;
};

const Checkout = () => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { items: cartItems, getCartSummary, clearCart } = useCart();
  const { user, token } = useAuth();
  
  const customOrder = location.state?.customOrder;
  const isCustomCheckout = !!customOrder;

  // Determine items based on checkout type
  const items = isCustomCheckout ? [{
    product: customOrder.items && customOrder.items[0]?.product ? customOrder.items[0].product : { _id: null, name: `Custom Design (${customOrder.gender} ${customOrder.itemType})`, price: customOrder.totals.total, artisan: customOrder.items && customOrder.items[0]?.artisan },
    quantity: 1,
    selectedOptions: {},
    isCustomOrder: true,
    customOrderId: customOrder.customOrderId || customOrder._id
  }] : cartItems;

  const [shippingAddresses, setShippingAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('COD');
  const [error, setError] = useState('');
  const [artisanDetails, setArtisanDetails] = useState(null);

  const [addressForm, setAddressForm] = useState({
    firstName: user?.profile?.firstName || '',
    lastName: user?.profile?.lastName || '',
    phone: user?.profile?.phone || '',
    street: '',
    city: '',
    region: '',
    country: 'Ethiopia',
    postalCode: '',
    isDefault: false
  });

  const cartSummary = isCustomCheckout ? {
    itemCount: 1,
    subtotal: customOrder.totals.total,
    shipping: 0,
    tax: Math.round(customOrder.totals.total * 0.15 * 100) / 100,
    total: Math.round(customOrder.totals.total * 1.15 * 100) / 100
  } : getCartSummary();

  useEffect(() => {
    if (items.length === 0 && !isCustomCheckout) {
      navigate('/cart');
      return;
    }
    fetchShippingAddresses();
    if (items.length > 0) fetchArtisanDetails();
  }, []);

  const fetchArtisanDetails = async () => {
    try {
      const firstItem = items[0];
      const artisanId = firstItem.product?.artisan?._id || firstItem.product?.artisan || customOrder?.items[0]?.artisan || customOrder?.artisanId;
      if (!artisanId) return;
      const response = await fetch(`/api/users/artisan-public-details/${artisanId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) setArtisanDetails(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch artisan details:', error);
    }
  };

  const fetchShippingAddresses = async () => {
    try {
      setLoading(true);
      const authToken = token || localStorage.getItem('authToken');
      const response = await fetch('/api/users/shipping-addresses', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await response.json();
      if (data.success) {
        setShippingAddresses(data.data);
        const defaultAddr = data.data.find(addr => addr.isDefault);
        if (defaultAddr) setSelectedAddressId(defaultAddr._id);
        else if (data.data.length > 0) setSelectedAddressId(data.data[0]._id);
        else setShowAddressForm(true);
      } else {
        setError(data.message || 'Failed to fetch addresses');
      }
    } catch (error) {
      setError('Failed to fetch addresses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddressFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddressForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      const authToken = token || localStorage.getItem('authToken');
      const response = await fetch('/api/users/shipping-addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(addressForm)
      });
      const data = await response.json();
      if (data.success) {
        setShippingAddresses(data.data);
        const newAddress = data.data[data.data.length - 1];
        setSelectedAddressId(newAddress._id);
        setShowAddressForm(false);
        setAddressForm({
          firstName: user?.profile?.firstName || '',
          lastName: user?.profile?.lastName || '',
          phone: user?.profile?.phone || '',
          street: '',
          city: '',
          region: '',
          country: 'Ethiopia',
          postalCode: '',
          isDefault: false
        });
      } else {
        setError(data.message || 'Failed to save address');
      }
    } catch (error) {
      setError('Failed to save address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedAddressId) {
      setError(t('checkout.select_address_error', 'እባክዎ የመላኪያ አድራሻ ይምረጡ ወይም ያስገቡ'));
      return;
    }
    if (!items.length) {
      setError(t('checkout.cart_empty_error', 'የግዢ ቅርጫትዎ ባዶ ነው'));
      return;
    }
    setError('');
    setProcessingPayment(true);
    try {
      const authToken = token || localStorage.getItem('authToken');
      const payloadItems = items.map(item => ({
        productId: item.product?._id || item._id,
        quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
        price: item.product?.price || cartSummary.total,
        artisan: item.product?.artisan?._id || item.product?.artisan || (isCustomCheckout ? customOrder?.items[0]?.artisan : null),
        selectedOptions: item.selectedOptions || {},
        selectedColor: item.selectedColor || null,
        selectedSize: item.selectedSize || null,
        variantId: item.variantId || null,
        isCustomOrder: item.isCustomOrder || false,
        customOrderId: item.customOrderId || null
      }));
      
      const cartId = isCustomCheckout ? `custom-${customOrder.customOrderId || customOrder._id}` : `cart-${user?._id}-${items.map(i => i.product._id).sort().join('-')}-${cartSummary.total}`;
      const payload = {
        shippingAddressId: selectedAddressId,
        items: payloadItems,
        paymentMethod: selectedPaymentMethod,
        cartId,
        isCustomCheckout,
        customOrderId: isCustomCheckout ? (customOrder.customOrderId || customOrder._id) : null
      };

      const endpoint = isCustomCheckout ? '/api/payment/custom-initialize' : '/api/payment/initialize';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.success) {
        if (data.data.checkoutUrl) {
          window.location.href = data.data.checkoutUrl;
        } else if (data.data.redirect) {
          const targetUrl = selectedPaymentMethod === 'MANUAL'
            ? `/upload-receipt/${data.data.orderId || data.data.orderNumber}`
            : data.data.redirect;
          if (selectedPaymentMethod === 'COD' || selectedPaymentMethod === 'MANUAL') {
              if(!isCustomCheckout) clearCart();
          }
          navigate(targetUrl, {
            state: {
              order: data.data.order,
              orderNumber: data.data.orderNumber,
              orderId: data.data.orderId,
              total: data.data.order?.totals?.total || cartSummary.total,
              method: selectedPaymentMethod
            }
          });
        }
      } else {
        setError(data.message || t('checkout.payment_fail_error', 'ክፍያውን ማከናወን አልተቻለም'));
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError(t('checkout.payment_fail_error', 'ክፍያውን ማከናወን አልተቻለም። እባክዎ እንደገና ይሞክሩ።'));
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading && shippingAddresses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/70 font-sans text-gray-800">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        
        {/* Header with back button - Compact mobile layout */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => navigate('/cart')}
            className="inline-flex items-center gap-1.5 text-gray-500 hover:text-amber-600 transition-colors mb-2 text-xs sm:text-sm font-medium"
          >
            <ArrowLeftIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {t('checkout.back_to_cart', 'ወደ ቅርጫት ተመለስ')}
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">
              {t('checkout.title', 'ክፍያ')}
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
              {t('checkout.complete_order_desc', 'ትዕዛዝዎን ደህንነቱ በተጠበቀ ሁኔታ ያጠናቁ')}
            </p>
          </div>
        </div>

        {/* Error alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 flex items-center justify-between text-xs sm:text-sm"
            >
              <p className="text-red-700 font-medium">{error}</p>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 font-bold ml-2">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          
          {/* Left column: Address & Payment */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            
            {/* Shipping address card */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden">
              <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-gray-100 bg-gray-50/70 flex items-center gap-2">
                <MapPinIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                <h2 className="font-bold text-gray-900 text-sm sm:text-base">
                  {t('checkout.shipping_address', 'የመላኪያ አድራሻ')}
                </h2>
              </div>
              <div className="p-3.5 sm:p-5">
                {shippingAddresses.length > 0 && !showAddressForm && (
                  <div className="space-y-2.5 mb-3">
                    {shippingAddresses.map((addr) => (
                      <div
                        key={addr._id}
                        onClick={() => setSelectedAddressId(addr._id)}
                        className={`p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedAddressId === addr._id
                            ? 'border-amber-500 bg-amber-50/30 shadow-sm'
                            : 'border-gray-200 hover:border-amber-500/40 bg-white'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-0.5 text-xs sm:text-sm min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-900 truncate">
                                {addr.firstName} {addr.lastName}
                              </span>
                              {addr.isDefault && (
                                <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                                  {t('checkout.default_badge', 'መደበኛ')}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600 truncate">{addr.street}, {addr.city}</p>
                            <p className="text-gray-500 text-[11px] sm:text-xs">{addr.region}, {addr.country}</p>
                            <p className="text-gray-600 font-medium">{addr.phone}</p>
                          </div>
                          <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            selectedAddressId === addr._id ? 'border-amber-500 bg-amber-500' : 'border-gray-300'
                          }`}>
                            {selectedAddressId === addr._id && <CheckCircleIcon className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!showAddressForm && (
                  <button
                    onClick={() => setShowAddressForm(true)}
                    className="w-full py-2.5 sm:py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-amber-500 hover:text-amber-600 transition flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold"
                  >
                    <PlusIcon className="w-4 h-4" />
                    {t('checkout.add_new_address', 'አዲስ አድራሻ ጨምር')}
                  </button>
                )}

                <AnimatePresence>
                  {showAddressForm && (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={handleSaveAddress}
                      className="space-y-3 mt-3 text-xs sm:text-sm"
                    >
                      <div className="grid grid-cols-2 gap-2.5">
                        <input 
                          type="text" 
                          name="firstName" 
                          value={addressForm.firstName} 
                          onChange={handleAddressFormChange} 
                          placeholder={t('checkout.first_name', 'ስም *')} 
                          required 
                          className="p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-xs sm:text-sm" 
                        />
                        <input 
                          type="text" 
                          name="lastName" 
                          value={addressForm.lastName} 
                          onChange={handleAddressFormChange} 
                          placeholder={t('checkout.last_name', 'የአባት ስም *')} 
                          required 
                          className="p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-xs sm:text-sm" 
                        />
                      </div>
                      <input 
                        type="tel" 
                        name="phone" 
                        value={addressForm.phone} 
                        onChange={handleAddressFormChange} 
                        placeholder={t('checkout.phone', 'ስልክ ቁጥር *')} 
                        required 
                        className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-xs sm:text-sm" 
                      />
                      <input 
                        type="text" 
                        name="street" 
                        value={addressForm.street} 
                        onChange={handleAddressFormChange} 
                        placeholder={t('checkout.street_address', 'የጎዳና አድራሻ / የቤት ቁጥር *')} 
                        required 
                        className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-xs sm:text-sm" 
                      />
                      <div className="grid grid-cols-2 gap-2.5">
                        <input 
                          type="text" 
                          name="city" 
                          value={addressForm.city} 
                          onChange={handleAddressFormChange} 
                          placeholder={t('checkout.city', 'ከተማ *')} 
                          required 
                          className="p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-xs sm:text-sm" 
                        />
                        <input 
                          type="text" 
                          name="region" 
                          value={addressForm.region} 
                          onChange={handleAddressFormChange} 
                          placeholder={t('checkout.region', 'ክልል *')} 
                          required 
                          className="p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-xs sm:text-sm" 
                        />
                      </div>
                      <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer pt-1">
                        <input type="checkbox" name="isDefault" checked={addressForm.isDefault} onChange={handleAddressFormChange} className="w-3.5 h-3.5 text-amber-600 rounded" />
                        {t('checkout.set_default_address', 'መደበኛ አድራሻ አድርግ')}
                      </label>
                      <div className="flex gap-2.5 pt-1">
                        <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600 transition text-xs sm:text-sm">
                          {loading ? t('checkout.saving', 'በማስቀመጥ ላይ...') : t('checkout.save_address', 'አድራሻ መዝግብ')}
                        </button>
                        <button type="button" onClick={() => setShowAddressForm(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition text-xs sm:text-sm">
                          {t('common.cancel', 'ሰርዝ')}
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Payment method card */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden">
              <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-gray-100 bg-gray-50/70 flex items-center gap-2">
                <CreditCardIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                <h2 className="font-bold text-gray-900 text-sm sm:text-base">
                  {t('checkout.payment_method', 'የክፍያ ዘዴ')}
                </h2>
              </div>
              <div className="p-3.5 sm:p-5 space-y-2.5">
                {[
                  { 
                    id: 'CHAPA', 
                    icon: CreditCardIcon, 
                    title: t('checkout.payment_method_online', 'ኦንላይን ክፍያ (Online Payment)'), 
                    desc: t('checkout.online_payment_sub', 'Chapa (ካርድ፣ ቴሌብር፣ CBE)'), 
                    disabled: true 
                  },
                  { 
                    id: 'COD', 
                    icon: BanknotesIcon, 
                    title: t('checkout.payment_method_cod', 'በእጅ ሲረከቡ ክፍያ (Cash on Delivery)'), 
                    desc: t('checkout.cod_sub', 'እቃውን ሲረከቡ የሚከፈል (Pay when you receive)'), 
                    disabled: false 
                  },
                  { 
                    id: 'MANUAL', 
                    icon: BuildingOfficeIcon, 
                    title: t('checkout.payment_method_manual', 'ቀጥታ የባንክ ሂሳብ ክፍያ (Manual Payment)'), 
                    desc: t('checkout.manual_payment_sub', 'የባንክ ዝውውር / ቴሌብር (Bank Transfer / Telebirr)'), 
                    disabled: false 
                  }
                ].map((method) => (
                  <div
                    key={method.id}
                    onClick={() => !method.disabled && setSelectedPaymentMethod(method.id)}
                    className={`p-3 sm:p-3.5 rounded-xl border-2 transition-all ${
                      method.disabled
                        ? 'border-gray-100 bg-gray-50/50 opacity-60 cursor-not-allowed'
                        : selectedPaymentMethod === method.id
                          ? 'border-amber-500 bg-amber-50/30 shadow-sm cursor-pointer'
                          : 'border-gray-200 hover:border-amber-500/40 bg-white cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className={`p-1.5 rounded-lg shrink-0 ${selectedPaymentMethod === method.id ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                          <method.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-xs sm:text-sm truncate">{method.title}</p>
                          <p className="text-[11px] sm:text-xs text-gray-500 truncate">{method.desc}</p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        !method.disabled && selectedPaymentMethod === method.id ? 'border-amber-500 bg-amber-500' : 'border-gray-300'
                      }`}>
                        {!method.disabled && selectedPaymentMethod === method.id && <CheckCircleIcon className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  </div>
                ))}

                {selectedPaymentMethod === 'MANUAL' && artisanDetails && (
                  <div className="mt-3 p-3.5 bg-amber-50/80 rounded-xl border border-amber-200 text-xs sm:text-sm animate-fadeIn">
                    <p className="font-bold text-amber-900 mb-1.5 text-xs sm:text-sm">
                      {t('checkout.artisan_payment_details', 'የባለሙያ የባንክ ዝርዝሮች (Artisan Bank Details)')}
                    </p>
                    <div className="space-y-1 text-amber-800 text-xs">
                      <p><span className="font-semibold">{t('checkout.bank_name', 'ባንክ')}:</span> {artisanDetails.bankName || 'CBE'}</p>
                      <p><span className="font-semibold">{t('checkout.account_holder', 'የአካውንት ስም')}:</span> {artisanDetails.accountHolderName}</p>
                      <p><span className="font-semibold">{t('checkout.account_number', 'የአካውንት ቁጥር')}:</span> <span className="font-mono font-bold">{artisanDetails.accountNumber}</span></p>
                      {artisanDetails.merchantId && (
                        <p><span className="font-semibold">{t('checkout.telebirr_merchant', 'የቴሌብር ቁጥር')}:</span> {artisanDetails.merchantId}</p>
                      )}
                    </div>
                    <p className="text-[11px] text-amber-700 mt-2 font-medium">
                      {t('checkout.manual_payment_note', '* ትዕዛዝ ከፈጸሙ በኋላ የክፍያ ደረሰኝ ምስል ያስገባሉ (* You will upload receipt after placing order)')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Trust & authenticity - Compact mobile banner */}
            <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 rounded-2xl p-3.5 sm:p-4 border border-purple-100 shadow-sm">
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                  <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 text-xs sm:text-sm leading-snug">
                    {t('checkout.zema_verified', 'ዜማ AI ትክክለኛነት ማረጋገጫ (Zema AI Authenticity)')}
                  </h3>
                  <p className="text-[10px] text-purple-700 font-semibold">{t('checkout.blockchain_certified', 'በብሎክቼይን የተረጋገጠ (Blockchain Certified)')}</p>
                  <p className="text-[11px] sm:text-xs text-gray-600 mt-1 leading-relaxed">
                    {t('checkout.zema_desc', 'ሁሉም ምርቶች ትክክለኛነታቸው የተረጋገጠ እና ከኢትዮጵያዊያን የእጅ ጥበብ ባለሙያዎች በቀጥታ የተዘጋጁ ናቸው። ግዢዎ የሀገር ውስጥ ባለሙያዎችን በቀጥታ ይደግፋል።')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden">
                <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-gray-100 bg-gray-50/70">
                  <h2 className="font-bold text-gray-900 text-sm sm:text-base">
                    {t('checkout.order_summary', 'የትዕዛዝ ማጠቃለያ')}
                  </h2>
                </div>
                <div className="p-3.5 sm:p-5 space-y-3">
                  {/* Item count */}
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-gray-600">{t('checkout.items', 'ምርቶች')} ({cartSummary.itemCount})</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(cartSummary.subtotal)}</span>
                  </div>
                  {/* Shipping */}
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-gray-600 flex items-center gap-1"><TruckIcon className="w-3.5 h-3.5 text-gray-400" /> {t('orders.shipping', 'ማጓጓዣ')}</span>
                    {cartSummary.shipping === 0 ? (
                      <span className="text-green-600 font-bold">{t('cart.free', 'ነፃ')}</span>
                    ) : (
                      <span className="font-semibold text-gray-900">{formatCurrency(cartSummary.shipping)}</span>
                    )}
                  </div>
                  {/* Tax */}
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-gray-600">{t('orders.vat', 'ተ.እ.ታ (15%)')}</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(cartSummary.tax)}</span>
                  </div>
                  <div className="border-t border-gray-100 pt-2.5">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-gray-900 text-sm sm:text-base">{t('orders.grand_total', 'ጠቅላላ ድምር')}</span>
                      <span className="text-lg sm:text-xl font-black text-amber-600">{formatCurrency(cartSummary.total)}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 text-right">{t('cart.inc_vat', 'ተ.እ.ታን ጨምሮ')}</p>
                  </div>

                  {/* Free shipping progress */}
                  {cartSummary.subtotal < 5000 && cartSummary.shipping > 0 && (
                    <div className="bg-amber-50 rounded-xl p-2.5 border border-amber-200/50">
                      <p className="text-[11px] text-amber-800 mb-1 font-medium">
                        {t('checkout.free_shipping_needed', 'ለነፃ ማጓጓዣ {{amount}} ይጨምሩ', { amount: formatCurrency(5000 - cartSummary.subtotal) })}
                      </p>
                      <div className="w-full bg-amber-200/70 rounded-full h-1.5">
                        <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${(cartSummary.subtotal / 5000) * 100}%` }}></div>
                      </div>
                    </div>
                  )}

                  {cartSummary.subtotal >= 5000 && (
                    <div className="bg-green-50 rounded-xl p-2.5 flex items-center gap-2 border border-green-200/50">
                      <TruckIcon className="w-4 h-4 text-green-600 shrink-0" />
                      <p className="text-xs text-green-800 font-bold">{t('checkout.free_shipping_qualify', 'ነፃ ማጓጓዣ አግኝተዋል! 🎉')}</p>
                    </div>
                  )}

                  {/* Delivery estimate */}
                  <div className="flex items-center gap-2.5 text-xs text-gray-600 bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
                    <ClockIcon className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <p className="font-bold text-gray-800">{t('checkout.estimated_delivery', 'ግምታዊ የማድረሻ ጊዜ')}</p>
                      <p className="text-[11px] text-gray-500">{t('checkout.estimated_delivery_sub', 'ከተላከ ከ 3 - 5 የስራ ቀናት ውስጥ')}</p>
                    </div>
                  </div>

                  {/* Primary CTA button */}
                  <button
                    onClick={handlePayment}
                    disabled={processingPayment || !selectedAddressId}
                    className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 active:scale-[0.99] transition shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                  >
                    {processingPayment ? (
                      <>
                        <LoadingSpinner size="small" />
                        <span>{t('checkout.processing', 'በሂደት ላይ...')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('checkout.place_order', 'ትዕዛዙን አረጋግጥ')}</span>
                        <ChevronRightIcon className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Security badge */}
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500 pt-1">
                    <ShieldCheckIcon className="w-3.5 h-3.5 text-green-600" />
                    <span>{t('checkout.secure_checkout_msg', 'ደህንነቱ የተጠበቀ ክፍያ')}</span>
                  </div>

                  {/* Payment methods footer */}
                  <div className="text-center text-[10px] text-gray-400">
                    {t('checkout.secure_payment_by', 'ክፍያው በ Chapa፣ Telebirr እና CBE ደህንነቱ የተጠበቀ ነው')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
