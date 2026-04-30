/**
 * EmptyCartState Component
 * 
 * Friendly message and call-to-action when cart is empty
 * Features:
 * - Shopping bag icon (96x96px)
 * - Encouraging message about discovering crafts
 * - "Continue Shopping" button with Ethiopian styling
 * - "Browse by category" secondary link
 */

import { Link } from 'react-router-dom';
import { ShoppingBagIcon } from '@heroicons/react/24/outline';
import { useCustomTranslation } from '../../hooks/useCustomTranslation';

const EmptyCartState = () => {
  const { t } = useCustomTranslation();
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center py-16">
          <div className="mb-8">
            <ShoppingBagIcon className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('cart.empty_title', 'Your Ethiopian craft collection is empty')}
            </h1>
            <p className="text-gray-600 text-lg">
              {t('cart.empty_subtitle', 'Discover authentic Ethiopian crafts and add them to your cart')}
            </p>
          </div>
          
          <div className="space-y-4">
            <Link
              to="/products"
              className="btn-ethiopian inline-flex items-center space-x-2"
            >
              <ShoppingBagIcon className="w-5 h-5" />
              <span>{t('cart.start_shopping', 'Continue Shopping')}</span>
            </Link>
            
            <div className="text-sm text-gray-500">
              <p>{t('nav.faqs', 'Looking for something specific?')}</p>
              <Link 
                to="/products" 
                className="text-ethiopian-gold hover:text-ethiopian-earth transition-colors"
              >
                {t('nav.shop', 'Browse by category')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmptyCartState;
