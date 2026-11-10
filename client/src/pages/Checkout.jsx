/**
 * Checkout Page for EthioCraft Global
 * Professional AliExpress-style checkout with clear hierarchy and prominent CTA
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
      setError('Please select or add a shipping address');
      return;
    }
    if (!items.length) {
      setError('Your cart is empty');
      return;
    }
    setError('');
    setProcessingPayment(true);
    try {
      const authToken = token || localStorage.getItem('authToken');
      const payloadItems = items.map(item => ({
        productId: item.product?._id || item._id, // Will be undefined/null for mock custom products
        quantity: item.quantity,
        price: item.product?.price || cartSummary.total, // Fallback to provided total for custom designs
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
        setError(data.message || 'Failed to initialize payment');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError('Failed to initialize payment. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading && shippingAddresses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 lg:py-10">
        
        {/* Header with back button */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/cart')}
            className="inline-flex items-center gap-2 text-gray-500 hover:text-ethiopian-gold transition-colors mb-4 text-sm"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Cart
          </button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Checkout</h1>
            <p className="text-gray-500 text-sm mt-1">Complete your order securely</p>
          </div>
        </div>

        {/* Error alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between"
            >
              <p className="text-red-600 text-sm">{error}</p>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left column: Address & Payment */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Shipping address card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                <MapPinIcon className="w-5 h-5 text-ethiopian-gold" />
                <h2 className="font-semibold text-gray-800">Shipping Address</h2>
              </div>
              <div className="p-5">
                {shippingAddresses.length > 0 && !showAddressForm && (
                  <div className="space-y-3 mb-4">
                    {shippingAddresses.map((addr) => (
                      <div
                        key={addr._id}
                        onClick={() => setSelectedAddressId(addr._id)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedAddressId === addr._id
                            ? 'border-ethiopian-gold bg-amber-50/20'
                            : 'border-gray-200 hover:border-ethiopian-gold/40'
                        }`}
                      >
                        <div className="flex justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {addr.firstName} {addr.lastName}
                              </span>
                              {addr.isDefault && (
                                <span className="text-[10px] bg-ethiopian-gold text-white px-2 py-0.5 rounded-full">Default</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{addr.street}, {addr.city}</p>
                            <p className="text-sm text-gray-600">{addr.region}, {addr.country}</p>
                            <p className="text-sm text-gray-600">{addr.phone}</p>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedAddressId === addr._id ? 'border-ethiopian-gold bg-ethiopian-gold' : 'border-gray-300'
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
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-ethiopian-gold hover:text-ethiopian-gold transition flex items-center justify-center gap-2 text-sm"
                  >
                    <PlusIcon className="w-5 h-5" />
                    Add New Address
                  </button>
                )}

                <AnimatePresence>
                  {showAddressForm && (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={handleSaveAddress}
                      className="space-y-4 mt-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <input type="text" name="firstName" value={addressForm.firstName} onChange={handleAddressFormChange} placeholder="First name *" required className="p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent" />
                        <input type="text" name="lastName" value={addressForm.lastName} onChange={handleAddressFormChange} placeholder="Last name *" required className="p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-ethiopian-gold" />
                      </div>
                      <input type="tel" name="phone" value={addressForm.phone} onChange={handleAddressFormChange} placeholder="Phone number *" required className="w-full p-3 border border-gray-200 rounded-lg" />
                      <input type="text" name="street" value={addressForm.street} onChange={handleAddressFormChange} placeholder="Street address *" required className="w-full p-3 border border-gray-200 rounded-lg" />
                      <div className="grid grid-cols-2 gap-4">
                        <input type="text" name="city" value={addressForm.city} onChange={handleAddressFormChange} placeholder="City *" required className="p-3 border border-gray-200 rounded-lg" />
                        <input type="text" name="region" value={addressForm.region} onChange={handleAddressFormChange} placeholder="Region *" required className="p-3 border border-gray-200 rounded-lg" />
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="isDefault" checked={addressForm.isDefault} onChange={handleAddressFormChange} className="w-4 h-4" />
                        Set as default address
                      </label>
                      <div className="flex gap-3">
                        <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-ethiopian-gold text-white rounded-lg font-medium hover:bg-amber-600 transition">
                          {loading ? 'Saving...' : 'Save Address'}
                        </button>
                        <button type="button" onClick={() => setShowAddressForm(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                          Cancel
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Payment method card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                <CreditCardIcon className="w-5 h-5 text-ethiopian-gold" />
                <h2 className="font-semibold text-gray-800">Payment Method</h2>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { id: 'CHAPA', icon: CreditCardIcon, title: 'Online Payment', desc: 'Chapa (Cards, Telebirr, CBE)', disabled: true },
                  { id: 'COD', icon: BanknotesIcon, title: 'Cash on Delivery', desc: 'Pay when you receive', disabled: false },
                  { id: 'MANUAL', icon: BuildingOfficeIcon, title: 'Manual Payment', desc: 'Bank Transfer / Telebirr', disabled: false }
                ].map((method) => (
                  <div
                    key={method.id}
                    onClick={() => !method.disabled && setSelectedPaymentMethod(method.id)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      method.disabled
                        ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                        : selectedPaymentMethod === method.id
                          ? 'border-ethiopian-gold bg-amber-50/20 cursor-pointer'
                          : 'border-gray-200 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <method.icon className="w-6 h-6 text-ethiopian-gold" />
                        <div>
                          <p className="font-medium text-gray-900">{method.title}</p>
                          <p className="text-xs text-gray-500">{method.desc}</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        !method.disabled && selectedPaymentMethod === method.id ? 'border-ethiopian-gold bg-ethiopian-gold' : 'border-gray-300'
                      }`}>
                        {!method.disabled && selectedPaymentMethod === method.id && <CheckCircleIcon className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  </div>
                ))}

                {selectedPaymentMethod === 'MANUAL' && artisanDetails && (
                  <div className="mt-4 p-4 bg-amber-50 rounded-lg text-sm">
                    <p className="font-semibold text-amber-800 mb-2">Artisan Bank Details</p>
                    <div className="space-y-1 text-amber-700">
                      <p>Bank: {artisanDetails.bankName || 'N/A'}</p>
                      <p>Account: {artisanDetails.accountHolderName}</p>
                      <p>Number: {artisanDetails.accountNumber}</p>
                      {artisanDetails.merchantId && <p>Telebirr ID: {artisanDetails.merchantId}</p>}
                    </div>
                    <p className="text-xs text-amber-600 mt-2">* You'll upload receipt after placing order</p>
                  </div>
                )}
              </div>
            </div>

            {/* Trust & authenticity */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center shadow-sm">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Zema AI Authenticity Verified</h3>
                  <p className="text-xs text-gray-500">Blockchain Certified</p>
                  <p className="text-sm text-gray-600 mt-1">All products are verified authentic and ethically sourced. Your purchase directly supports Ethiopian artisans.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                  <h2 className="font-semibold text-gray-800">Order Summary</h2>
                </div>
                <div className="p-5 space-y-4">
                  {/* Item count */}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Items ({cartSummary.itemCount})</span>
                    <span className="font-medium">{formatCurrency(cartSummary.subtotal)}</span>
                  </div>
                  {/* Shipping */}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-1"><TruckIcon className="w-4 h-4" /> Shipping</span>
                    {cartSummary.shipping === 0 ? (
                      <span className="text-green-600 font-semibold">Free</span>
                    ) : (
                      <span>{formatCurrency(cartSummary.shipping)}</span>
                    )}
                  </div>
                  {/* Tax */}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">VAT (15%)</span>
                    <span>{formatCurrency(cartSummary.tax)}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-900">Total</span>
                      <span className="text-xl font-bold text-ethiopian-gold">{formatCurrency(cartSummary.total)}</span>
                    </div>
                    <p className="text-xs text-gray-400 text-right">Including VAT</p>
                  </div>

                  {/* Free shipping progress */}
                  {cartSummary.subtotal < 5000 && cartSummary.shipping > 0 && (
                    <div className="bg-amber-50 rounded-lg p-3">
                      <p className="text-xs text-amber-700 mb-1">Add {formatCurrency(5000 - cartSummary.subtotal)} more for free shipping</p>
                      <div className="w-full bg-amber-200 rounded-full h-1.5">
                        <div className="bg-ethiopian-gold h-1.5 rounded-full" style={{ width: `${(cartSummary.subtotal / 5000) * 100}%` }}></div>
                      </div>
                    </div>
                  )}

                  {cartSummary.subtotal >= 5000 && (
                    <div className="bg-green-50 rounded-lg p-3 flex items-center gap-2">
                      <TruckIcon className="w-4 h-4 text-green-600" />
                      <p className="text-xs text-green-700 font-semibold">You qualify for free shipping! 🎉</p>
                    </div>
                  )}

                  {/* Delivery estimate */}
                  <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <ClockIcon className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium">Estimated Delivery</p>
                      <p className="text-xs">3-5 business days after shipping</p>
                    </div>
                  </div>

                  {/* Primary CTA button */}
                  <button
                    onClick={handlePayment}
                    disabled={processingPayment || !selectedAddressId}
                    className="w-full py-3.5 bg-ethiopian-gold text-white font-semibold rounded-lg hover:bg-amber-600 transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-base"
                  >
                    {processingPayment ? (
                      <>
                        <LoadingSpinner size="small" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Place Order
                        <ChevronRightIcon className="w-5 h-5" />
                      </>
                    )}
                  </button>

                  {/* Security badge */}
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                    <ShieldCheckIcon className="w-4 h-4 text-green-600" />
                    Secure payment
                  </div>

                  {/* Payment methods footer */}
                  <div className="text-center pt-2 text-xs text-gray-400">
                    Secure payment powered by Chapa, Telebirr, CBE
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