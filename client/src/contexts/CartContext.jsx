/**
 * Shopping Cart Context for EthioCraft Global
 * 
 * Manages shopping cart state with:
 * - Add/remove items functionality
 * - Quantity management
 * - Local storage persistence
 * - Cart total calculations
 * - Ethiopian Birr (ETB) currency support
 */

import { createContext, useContext, useReducer, useEffect } from 'react';
import toast from 'react-hot-toast';

// Create Cart Context
const CartContext = createContext();

// Cart Actions
const CART_ACTIONS = {
  ADD_ITEM: 'ADD_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  UPDATE_QUANTITY: 'UPDATE_QUANTITY',
  CLEAR_CART: 'CLEAR_CART',
  LOAD_CART: 'LOAD_CART',
};

// Initial State
const initialState = {
  items: [],
  totalItems: 0,
  totalAmount: 0,
  currency: 'ETB',
};

// Cart Reducer
function cartReducer(state, action) {
  switch (action.type) {
    case CART_ACTIONS.ADD_ITEM: {
      const { product, quantity = 1, variant = null, selectedOptions = {}, selectedColor = null, selectedSize = null } = action.payload;
      const variantId = variant?._id || variant?.id || null;

      const existingItemIndex = state.items.findIndex(
        item => item.product._id === product._id && (item.variantId || null) === variantId
      );

      let newItems;

      if (existingItemIndex >= 0) {
        // Update existing item quantity
        newItems = state.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // Add new item
        newItems = [...state.items, { 
          product, 
          quantity, 
          variant, 
          variantId, 
          selectedOptions,
          selectedColor,
          selectedSize
        }];
      }

      const totals = calculateTotals(newItems);

      return {
        ...state,
        items: newItems,
        ...totals,
      };
    }

    case CART_ACTIONS.REMOVE_ITEM: {
      const { productId, variantId } = action.payload;
      const newItems = state.items.filter(
        item => !(item.product._id === productId && (item.variantId || null) === (variantId || null))
      );

      const totals = calculateTotals(newItems);

      return {
        ...state,
        items: newItems,
        ...totals,
      };
    }

    case CART_ACTIONS.UPDATE_QUANTITY: {
      const { productId, variantId, quantity } = action.payload;

      if (quantity <= 0) {
        return cartReducer(state, {
          type: CART_ACTIONS.REMOVE_ITEM,
          payload: { productId, variantId },
        });
      }

      const newItems = state.items.map(item =>
        (item.product._id === productId && (item.variantId || null) === (variantId || null))
          ? { ...item, quantity }
          : item
      );

      const totals = calculateTotals(newItems);

      return {
        ...state,
        items: newItems,
        ...totals,
      };
    }

    case CART_ACTIONS.CLEAR_CART:
      return {
        ...initialState,
        currency: state.currency,
      };

    case CART_ACTIONS.LOAD_CART:
      const totals = calculateTotals(action.payload);
      return {
        ...state,
        items: action.payload,
        ...totals,
      };

    default:
      return state;
  }
}

// Helper function to calculate cart totals
function calculateTotals(items) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce(
    (sum, item) => {
      const price = item.variant?.price || item.product.price;
      return sum + (price * item.quantity);
    },
    0
  );

  return {
    totalItems,
    totalAmount: Math.round(totalAmount * 100) / 100, // Round to 2 decimal places
  };
}

// Cart Provider Component
export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('ethiocraft_cart');
    if (savedCart) {
      try {
        const cartItems = JSON.parse(savedCart);
        dispatch({
          type: CART_ACTIONS.LOAD_CART,
          payload: cartItems,
        });
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
        localStorage.removeItem('ethiocraft_cart');
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('ethiocraft_cart', JSON.stringify(state.items));
  }, [state.items]);

  // Add item to cart
  const addToCart = (product, quantity = 1, variant = null, selectedOptions = {}) => {
    // Determine max available quantity
    
    // NEW: Validation for mandatory selections (Global)
    if (!variant && !Object.keys(selectedOptions).length > 0) {
      const hasVariations = product.variations && product.variations.length > 0;
      const hasOptions = product.options && product.options.length > 0;
      
      if (hasVariations || hasOptions) {
        return { 
          success: false, 
          error: 'SELECTION_REQUIRED',
          message: 'Please select your preferred options before adding to cart.' 
        };
      }
    }

    let maxAvailable = product.inventory?.quantity || 0;
    if (variant) {
      maxAvailable = variant.quantity !== undefined ? variant.quantity : maxAvailable;
    }

    // Prevent adding products/variants with 0 stock
    if (maxAvailable === 0) {
      toast.error('This option is out of stock');
      return false;
    }

    // Validate product availability
    if (!product.isAvailable && product.isAvailable !== undefined && !variant) {
      toast.error('This product is currently unavailable');
      return false;
    }

    // Check inventory including what's already in cart
    const variantId = variant?._id || variant?.id;
    const existingItem = state.items.find(item =>
      item.product._id === product._id && item.variantId === variantId
    );
    const currentQuantity = existingItem ? existingItem.quantity : 0;
    const newTotalQuantity = currentQuantity + quantity;

    if (newTotalQuantity > maxAvailable) {
      toast.error(`Only ${maxAvailable} items available in stock`);
      return false;
    }

    // Extract specific color/size for backend consistency
    const selectedColor = variant?.color || selectedOptions?.color || selectedOptions?.Color || null;
    const selectedSize = variant?.size || selectedOptions?.size || selectedOptions?.Size || null;

    dispatch({
      type: CART_ACTIONS.ADD_ITEM,
      payload: { 
        product, 
        quantity, 
        variant, 
        selectedOptions,
        selectedColor,
        selectedSize 
      },
    });

    const itemLabel = variant ? `${product.name} (${variant.size || ''} ${variant.color || ''})` : product.name;

    toast.success(
      `${itemLabel} added to cart`,
      {
        icon: '🛒',
        style: {
          background: '#D1FAE5',
          color: '#065F46',
        },
      }
    );

    return true;
  };

  // Remove item from cart
  const removeFromCart = (productId, variantId = null) => {
    // Force variantId to null if it's undefined
    const normalizedVariantId = variantId || null;
    const item = state.items.find(item => item.product._id === productId && (item.variantId || null) === normalizedVariantId);

    dispatch({
      type: CART_ACTIONS.REMOVE_ITEM,
      payload: { productId, variantId: normalizedVariantId },
    });

    if (item) {
      toast.success(
        `${item.product.name} removed from cart`,
        {
          icon: '🗑️',
          style: {
            background: '#FEE2E2',
            color: '#991B1B',
          },
        }
      );
    }
  };

  // Update item quantity
  const updateQuantity = (productId, variantId = null, quantity) => {
    // Force variantId to null if it's undefined
    const normalizedVariantId = variantId || null;
    const item = state.items.find(item => item.product._id === productId && (item.variantId || null) === normalizedVariantId);

    if (!item) return false;

    // Check inventory limits
    let maxAvailable = item.product.inventory?.quantity || 0;
    if (item.variant) {
      maxAvailable = item.variant.quantity !== undefined ? item.variant.quantity : maxAvailable;
    }

    if (quantity > maxAvailable) {
      toast.error(`Only ${maxAvailable} items available`);
      return false;
    }

    dispatch({
      type: CART_ACTIONS.UPDATE_QUANTITY,
      payload: { productId, variantId: normalizedVariantId, quantity: Number(quantity) },
    });

    return true;
  };

  // Clear entire cart
  const clearCart = () => {
    dispatch({ type: CART_ACTIONS.CLEAR_CART });
    toast.success('Cart cleared');
  };

  // Get item quantity by product ID
  const getItemQuantity = (productId, variantId = null) => {
    const item = state.items.find(item => item.product._id === productId && item.variantId === variantId);
    return item ? item.quantity : 0;
  };

  // Check if item is in cart
  const isInCart = (productId, variantId = null) => {
    return state.items.some(item => item.product._id === productId && item.variantId === variantId);
  };

  // Format currency for display
  const formatCurrency = (amount, currency = state.currency) => {
    const formatter = new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    });

    // Handle ETB formatting (Ethiopian Birr)
    if (currency === 'ETB') {
      return `${amount.toFixed(2)} ETB`;
    }

    return formatter.format(amount);
  };

  // Calculate shipping cost (Ethiopian context)
  const calculateShipping = () => {
    if (state.totalAmount >= 1000) {
      return 0; // Free shipping for orders over 1000 ETB
    }
    return 50; // Standard shipping fee
  };

  // Calculate tax (15% VAT in Ethiopia)
  const calculateTax = () => {
    return Math.round(state.totalAmount * 0.15 * 100) / 100;
  };

  // Get cart summary with all costs
  const getCartSummary = () => {
    const subtotal = state.totalAmount;
    const shipping = calculateShipping();
    const tax = calculateTax();
    const total = subtotal + shipping + tax;

    return {
      subtotal,
      shipping,
      tax,
      total,
      itemCount: state.totalItems,
      currency: state.currency,
    };
  };

  // Get unique artisans in cart (for multi-artisan orders)
  const getCartArtisans = () => {
    const artisans = new Map();

    state.items.forEach(item => {
      const artisanId = item.product.artisan._id || item.product.artisan;
      const artisanName = item.product.artisan.profile
        ? `${item.product.artisan.profile.firstName} ${item.product.artisan.profile.lastName}`
        : 'Unknown Artisan';

      if (!artisans.has(artisanId)) {
        artisans.set(artisanId, {
          id: artisanId,
          name: artisanName,
          items: [],
        });
      }
      artisans.get(artisanId).items.push(item);
    });

    return Array.from(artisans.values());
  };

  const value = {
    // State
    items: state.items,
    totalItems: state.totalItems,
    totalAmount: state.totalAmount,
    currency: state.currency,

    // Actions
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,

    // Utilities
    getItemQuantity,
    isInCart,
    formatCurrency,
    getCartSummary,
    getCartArtisans,
    calculateShipping,
    calculateTax,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

// Custom hook to use cart context
export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }

  return context;
}

export default CartContext;