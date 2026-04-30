/**
 * QuantitySelector Component
 * 
 * Reusable quantity control with +/- buttons and loading state
 * Features:
 * - Disabled states for boundary conditions (min/max quantity)
 * - Smooth transitions and hover effects
 * - Ethiopian theme colors and rounded borders
 */

import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../common/LoadingSpinner';

const QuantitySelector = ({ 
  quantity, 
  minQuantity = 1, 
  maxQuantity = 100, 
  onDecrease, 
  onIncrease, 
  isLoading = false 
}) => {
  return (
    <div className="flex items-center space-x-3">
      <span className="text-sm text-gray-600">Quantity:</span>
      <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
        <button
          onClick={onDecrease}
          disabled={quantity <= minQuantity || isLoading}
          className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Decrease quantity"
        >
          <MinusIcon className="w-4 h-4" />
        </button>
        
        <div className="px-4 py-2 min-w-[3rem] text-center">
          {isLoading ? (
            <LoadingSpinner size="small" />
          ) : (
            <span className="font-medium">{quantity}</span>
          )}
        </div>
        
        <button
          onClick={onIncrease}
          disabled={quantity >= maxQuantity || isLoading}
          className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Increase quantity"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default QuantitySelector;
