/**
 * OrderSummary Component
 * 
 * Display cost breakdown and checkout actions
 * Features:
 * - Sticky sidebar layout with white background and shadow
 * - Cost breakdown: subtotal, shipping, tax, and total
 * - Shipping fee calculation (free if >= 1000 ETB)
 * - 15% VAT tax calculation
 * - Checkout button with gold gradient
 * - Continue shopping link
 */

import { Link } from 'react-router-dom';
import { HeartIcon } from '@heroicons/react/24/outline';
import ZemaAITip from './ZemaAITip';
import { useCustomTranslation } from '../../hooks/useCustomTranslation';

const OrderSummary = ({ summary, onCheckout, isAuthenticated, cartItems = [] }) => {
  const { subtotal, shipping, tax, total, itemCount } = summary;
  const { t } = useCustomTranslation();
  
  // Calculate how much more needed for free shipping
  const freeShippingThreshold = 1000;
  const amountForFreeShipping = freeShippingThreshold - subtotal;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('checkout.order_summary', 'Order Summary')}</h3>
      
      <div className="space-y-3 mb-6">
        <div className="flex justify-between">
          <span className="text-gray-600">{t('common.subtotal', 'Subtotal')} ({itemCount} {itemCount === 1 ? t('checkout.item', 'item') : t('checkout.items', 'items')})</span>
          <span className="font-medium">{subtotal.toFixed(2)} {t('product.price_unit', 'ETB')}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">{t('common.shipping_fee', 'Shipping')}</span>
          <span className="font-medium">
            {shipping === 0 ? (
              <span className="text-green-600 font-semibold">{t('common.free', 'Free')}</span>
            ) : (
              `${shipping.toFixed(2)} ${t('product.price_unit', 'ETB')}`
            )}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">{t('common.vat', 'Tax (15% VAT)')}</span>
          <span className="font-medium">{tax.toFixed(2)} {t('product.price_unit', 'ETB')}</span>
        </div>
        
        <div className="border-t border-gray-200 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">{t('common.final_amount', 'Total')}</span>
            <span className="text-xl font-bold text-ethiopian-gold">
              {total.toFixed(2)} {t('product.price_unit', 'ETB')}
            </span>
          </div>
        </div>
      </div>
      
      {/* Shipping Info */}
      {shipping === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
          <p className="text-green-800 text-sm font-medium">
            🎉 {t('cart.free_shipping_promo', 'You qualify for free shipping!')}
          </p>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
          <p className="text-blue-800 text-sm">
            {t('cart.free_shipping_needed', { amount: amountForFreeShipping.toFixed(2) }, `Add ${amountForFreeShipping.toFixed(2)} ETB more for free shipping`)}
          </p>
        </div>
      )}
      
      {/* Checkout Button */}
      <button
        onClick={onCheckout}
        className="w-full btn-ethiopian text-lg py-4 mb-4"
      >
        {isAuthenticated ? t('checkout.complete_order', 'Proceed to Checkout') : t('auth.login', 'Login to Checkout')}
      </button>
      
      {/* Continue Shopping */}
      <Link
        to="/products"
        className="block text-center text-ethiopian-gold hover:text-ethiopian-earth transition-colors"
      >
        {t('common.continue_shopping', 'Continue Shopping')}
      </Link>
      
      {/* Security Badge */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
          <HeartIcon className="w-4 h-4" />
          <span>{t('checkout.secure_checkout_msg', 'Secure checkout guaranteed')}</span>
        </div>
      </div>
      
      {/* Zema AI Tip */}
      <ZemaAITip cartItems={cartItems} />
    </div>
  );
};

export default OrderSummary;
