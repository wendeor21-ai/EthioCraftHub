/**
 * CartItem Component
 * 
 * Display individual cart item with all product details and controls
 * Features:
 * - Product thumbnail (80x80px), product info, and controls
 * - Product name as clickable link, category badge, unit price
 * - Integrated QuantitySelector component
 * - Remove button with trash icon and hover effect
 * - Calculated subtotal with real-time updates
 * - Proper image URL handling with server base URL
 */

import { Link } from 'react-router-dom';
import { TrashIcon } from '@heroicons/react/24/outline';
import QuantitySelector from './QuantitySelector';
import { API_BASE_URL } from '../../config/api';
import { useCustomTranslation } from '../../hooks/useCustomTranslation';

const CartItem = ({ item, onQuantityChange, onRemove, isUpdating }) => {
  const { t } = useCustomTranslation();
  const { product, quantity } = item;
  const subtotal = product.price * quantity;

  // Get image URL - handle both array and direct URL
  const getImageUrl = () => {
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      // If images is an array, get the first image's URL
      const imageUrl = product.images[0].url || product.images[0];
      // Prepend server URL if it's a relative path
      return imageUrl.startsWith('http') ? imageUrl : `${API_BASE_URL}${imageUrl}`;
    } else if (product.image) {
      // Fallback to single image field
      return product.image.startsWith('http') ? product.image : `${API_BASE_URL}${product.image}`;
    }
    // Fallback to placeholder
    return '/placeholder-product.jpg';
  };

  return (
    <div className="p-6">
      <div className="flex items-start space-x-4">
        {/* Product Image */}
        <div className="flex-shrink-0">
          <img
            src={getImageUrl()}
            alt={product.name}
            className="w-20 h-20 object-cover rounded-lg"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/placeholder-product.jpg';
            }}
          />
        </div>

        {/* Product Details */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-1">
                <Link
                  to={`/products/${product._id}`}
                  className="hover:text-ethiopian-gold transition-colors"
                >
                  {product.name}
                </Link>
              </h4>
              <p className="text-sm text-gray-600 mb-1">
                {product.category}
              </p>
              
              {/* Variant & Selected Options Display */}
              {(item.variant || (item.selectedOptions && Object.keys(item.selectedOptions).length > 0)) && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {(item.variant?.size || item.selectedSize) && (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {t('product.size', 'Size')}: {item.variant?.size || item.selectedSize}
                    </span>
                  )}
                  {(item.variant?.color || item.selectedColor) && (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider border-l-2" style={{ borderLeftColor: item.variant?.colorHex || '#ccc' }}>
                      {t('product.color', 'Color')}: {item.variant?.color || item.selectedColor}
                    </span>
                  )}
                  {item.selectedOptions && Object.entries(item.selectedOptions).map(([key, value]) => (
                    <span key={key} className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {key}: {value}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-lg font-bold text-ethiopian-gold">
                {product.price.toFixed(2)} {t('product.price_unit', 'ETB')}
              </p>
            </div>

              <button
                onClick={() => onRemove(product._id, item.variantId)}
                className="text-red-500 hover:text-red-700 transition-colors p-1"
                title={t('cart.remove_item', 'Remove item')}
                aria-label={t('cart.remove_item', 'Remove item from cart')}
              >
                <TrashIcon className="w-5 h-5" />
              </button>
          </div>

          {/* Quantity Controls */}
          <div className="flex items-center justify-between mt-4">
            <QuantitySelector
              quantity={quantity}
              minQuantity={1}
              maxQuantity={product.inventory?.quantity || 100}
              onDecrease={() => onQuantityChange(product._id, item.variantId, quantity - 1)}
              onIncrease={() => onQuantityChange(product._id, item.variantId, quantity + 1)}
              isLoading={isUpdating}
            />

            <div className="text-right">
              <p className="text-lg font-bold text-gray-900" data-testid="item-subtotal">
                {subtotal.toFixed(2)} {t('product.price_unit', 'ETB')}
              </p>
            </div>
          </div>

          {/* Product Features */}
          {product.features && product.features.length > 0 && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-2">
                {product.features.slice(0, 3).map((feature, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-ethiopian-cream text-ethiopian-brown text-xs rounded-full"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartItem;
