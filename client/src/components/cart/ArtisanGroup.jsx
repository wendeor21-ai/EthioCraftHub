/**
 * ArtisanGroup Component
 * 
 * Groups cart items by artisan
 * Features:
 * - Artisan header with name and item count
 * - Ethiopian cream background with gold border
 * - Groups CartItem components under each artisan
 */

import CartItem from './CartItem';
import { useCustomTranslation } from '../../hooks/useCustomTranslation';

const ArtisanGroup = ({ artisan, onQuantityChange, onRemove, isUpdating }) => {
  const { t } = useCustomTranslation();
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-ethiopian-cream px-6 py-3 border-b border-ethiopian-gold/20">
        <h3 className="font-semibold text-ethiopian-brown">
          {t('cart.from_artisan', { name: artisan.name }, `From ${artisan.name}`)}
        </h3>
        <p className="text-sm text-gray-600">
          {artisan.items.length} {artisan.items.length === 1 ? t('checkout.item', 'item') : t('checkout.items', 'items')}
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {artisan.items.map((item) => (
          <CartItem
            key={item.product._id}
            item={item}
            onQuantityChange={onQuantityChange}
            onRemove={onRemove}
            isUpdating={isUpdating === `${item.product._id}-${item.variantId || 'default'}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ArtisanGroup;
