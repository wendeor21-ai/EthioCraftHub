/**
 * Shopping Cart Page for EthioCraft Global
 * AliExpress-style modern cart with clean layout, subtle shadows, and professional typography
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  TrashIcon,
  ShoppingBagIcon,
  TruckIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  SparklesIcon,
  XMarkIcon,
  ChevronRightIcon,
  PlusIcon,
  MinusIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useCustomTranslation } from '../hooks/useCustomTranslation';
import { getBestProductImage, getImageUrl } from '../utils/imageUtils';

// Helper to format currency
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '0.00 ETB';
  return `${amount.toFixed(2)} ETB`;
};

const Cart = () => {
  const {
    items,
    totalItems,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartSummary
  } = useCart();
  const { t } = useCustomTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const cartSummary = getCartSummary();

  // Group items by artisan (if artisan data exists)
  const groupedItems = items.reduce((groups, item) => {
    const artisanId = item.product?.artisan?._id || 'default';
    const artisanName = item.product?.artisan?.profile?.firstName 
      ? `${item.product.artisan.profile.firstName} ${item.product.artisan.profile.lastName || ''}`
      : 'EthioCraft Artisan';
    if (!groups[artisanId]) {
      groups[artisanId] = { name: artisanName, items: [] };
    }
    groups[artisanId].items.push(item);
    return groups;
  }, {});

  const handleQuantityUpdate = async (item, newQuantity) => {
    const key = `${item.product._id}-${item.variantId || 'default'}`;
    setIsUpdating(key);
    // Simulate async (the context update is synchronous, but we add a tiny delay for UX)
    setTimeout(() => {
      updateQuantity(item.product._id, item.variantId, newQuantity);
      setIsUpdating(null);
    }, 200);
  };

  const handleRemoveItem = (item) => {
    removeFromCart(item.product._id, item.variantId);
  };

  const handleClearCart = () => {
    clearCart();
    setShowClearConfirm(false);
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
      return;
    }
    navigate('/checkout');
  };

  // Empty cart
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBagIcon className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{t("cart.empty_title", "Your cart is empty")}</h2>
          <p className="text-gray-500 mb-6">{t("cart.empty_subtitle", "Explore our collection and add some magic to your bag!")}</p>
          <button
            onClick={() => navigate('/products')}
            className="px-6 py-3 bg-ethiopian-gold text-white rounded-xl font-medium hover:bg-amber-600 transition shadow-md"
          >
            {t("cart.start_shopping", "Start Shopping")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-10">
        
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-gray-500 hover:text-ethiopian-gold transition-colors mb-3 sm:mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span className="text-sm">{t("common.continue_shopping", "Continue Shopping")}</span>
          </button>
          <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{t("cart.title", "Shopping Cart")}</h1>
              <p className="text-gray-500 mt-0.5 sm:mt-1 text-sm">
                <span className="font-semibold text-ethiopian-gold">{totalItems}</span> {totalItems === 1 ? t("checkout.item", "item") : t("checkout.items", "items")}
              </p>
            </div>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-red-600 hover:bg-red-50 rounded-lg transition text-xs sm:text-sm"
            >
              <TrashIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {t("cart.clear_cart", "Clear Cart")}
            </button>
          </div>
        </div>

        {/* Main two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          
          {/* Left: Cart items */}
          <div className="lg:col-span-2 space-y-5">
            {Object.entries(groupedItems).map(([artisanId, group]) => (
              <div key={artisanId} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Artisan header */}
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-ethiopian-gold/20 flex items-center justify-center">
                      <SparklesIcon className="w-3 h-3 text-ethiopian-gold" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{t("cart.from_artisan", { name: group.name, defaultValue: `From ${group.name}` })}</span>
                  </div>
                </div>
                
                {/* Items */}
                <div className="divide-y divide-gray-100">
                  {group.items.map((item, idx) => {
                    const isUpdatingThis = isUpdating === `${item.product._id}-${item.variantId || 'default'}`;
                    const product = item.product;
                    const variant = item.selectedVariant;
                    const price = variant?.price || product.price;
                    const totalPrice = price * item.quantity;
                    const imageUrl = getBestProductImage(product);
                    
                    return (
                      <div key={idx} className="p-3 sm:p-5 flex flex-row gap-3 sm:gap-4">
                        {/* Product image */}
                        <Link to={`/products/${product._id}`} className="w-16 h-16 sm:w-24 sm:h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity">
                          <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        </Link>
                        
                        {/* Product details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                            <div className="flex-1 min-w-0">
                              <Link to={`/products/${product._id}`}>
                                <h3 className="font-medium text-gray-800 hover:text-ethiopian-gold transition cursor-pointer text-sm sm:text-base truncate">
                                  {product.name}
                                </h3>
                              </Link>
                              {variant && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {variant.color} | {variant.size}
                                </p>
                              )}
                            </div>
                            <div className="text-left sm:text-right shrink-0">
                              <div className="font-bold text-gray-900 text-sm sm:text-base">{formatCurrency(price)}</div>
                              {product.comparePrice && product.comparePrice > price && (
                                <div className="text-xs text-gray-400 line-through">{formatCurrency(product.comparePrice)}</div>
                              )}
                            </div>
                          </div>
                          
                          {/* Quantity & remove */}
                          <div className="flex items-center justify-between mt-2 sm:mt-4">
                            <div className="flex items-center border border-gray-200 rounded-lg">
                              <button
                                onClick={() => handleQuantityUpdate(item, Math.max(1, item.quantity - 1))}
                                disabled={isUpdatingThis}
                                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                              >
                                <MinusIcon className="w-3 h-3" />
                              </button>
                              <span className="w-8 sm:w-10 text-center text-xs sm:text-sm font-medium">{item.quantity}</span>
                              <button
                                onClick={() => handleQuantityUpdate(item, item.quantity + 1)}
                                disabled={isUpdatingThis}
                                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                              >
                                <PlusIcon className="w-3 h-3" />
                              </button>
                            </div>
                            <button
                              onClick={() => handleRemoveItem(item)}
                              className="text-gray-400 hover:text-red-500 transition p-1.5 sm:p-2"
                            >
                              <TrashIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {/* Trust badges */}
            <div className="bg-white rounded-xl p-3 sm:p-5 border border-gray-100 shadow-sm">
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                {[
                  { icon: ShieldCheckIcon, text: t("cta_section.secure_payments", "Secure Payments"), color: 'text-green-600', bg: 'bg-green-50' },
                  { icon: TruckIcon, text: t("cart.free_shipping", "Free Shipping Over 5000 ETB"), color: 'text-blue-600', bg: 'bg-blue-50' },
                  { icon: CreditCardIcon, text: t("checkout.payment_method", "Payment Method"), color: 'text-purple-600', bg: 'bg-purple-50' },
                  { icon: SparklesIcon, text: t("product.authentic_origin", "Authentic Ethiopian Crafts"), color: 'text-ethiopian-gold', bg: 'bg-amber-50' }
                ].map((badge, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 ${badge.bg} rounded-full flex items-center justify-center shrink-0`}>
                      <badge.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${badge.color}`} />
                    </div>
                    <span className="text-[10px] sm:text-xs text-gray-600 leading-tight">{badge.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Right: Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-5">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                  <h2 className="font-semibold text-gray-800">{t("cart.order_summary", "Order Summary")}</h2>
                </div>
                <div className="p-5 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t("common.subtotal", "Subtotal")}</span>
                      <span className="font-medium text-gray-800">{formatCurrency(cartSummary.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t("common.shipping_fee", "Shipping Fee")}</span>
                      <span className="font-medium text-gray-800">{formatCurrency(cartSummary.shipping)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
                      <span className="text-gray-600">{t("common.vat", "VAT (15%)")}</span>
                      <span className="font-medium text-gray-800">{formatCurrency(cartSummary.tax)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold pt-2">
                      <span className="text-gray-900">{t("common.final_amount", "Total Amount")}</span>
                      <span className="text-ethiopian-gold">{formatCurrency(cartSummary.total)}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleCheckout}
                    className="w-full py-3 bg-ethiopian-gold text-white font-semibold rounded-lg hover:bg-amber-600 transition shadow-md"
                  >
                    {t("checkout.complete_order", "Complete Order")}
                  </button>
                  
                  <p className="text-center text-xs text-gray-400">
                    {t("cart.taxes_info", "Taxes and shipping calculated at checkout")}
                  </p>
                </div>
              </div>
              
              {/* AI Assistant Card */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <SparklesIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Zema AI Assistant</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Need help? Ask me anything</p>
                    <button className="mt-2 text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                      Chat now <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Clear cart confirmation modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <TrashIcon className="w-6 h-6 text-red-500" />
                </div>
                <button onClick={() => setShowClearConfirm(false)} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t("cart.clear_confirm_title", "Clear Cart?")}</h3>
              <p className="text-gray-500 mb-6">{t("cart.clear_confirm_message", "Are you sure you want to remove all items from your cart? This action cannot be undone.")}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  {t("common.cancel", "Cancel")}
                </button>
                <button
                  onClick={handleClearCart}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  {t("cart.clear_cart", "Clear Cart")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Cart;