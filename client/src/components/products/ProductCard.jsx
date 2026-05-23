/**
 * Product Card Component for EthioCraft Global
 * 
 * Features:
 * - Ethiopian-inspired design with cultural elements
 * - Product image with hover effects and robust fallback system
 * - Cultural story preview
 * - Artisan information
 * - Add to cart functionality
 * - Like/favorite functionality
 * - Price display in Ethiopian Birr (ETB)
 * - Availability status
 * - Improved loading states and error handling
 */

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HeartIcon,
  ShoppingCartIcon,
  EyeIcon,
  SparklesIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { getBestProductImage } from '../../utils/imageUtils';
import toast from 'react-hot-toast';

function ProductCard({ product, showArtisan = true, className = '', lazyLoad = true, disableTimeout = false, badge = null, showUnavailableStyling = false }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageState, setImageState] = useState({
    isLoading: true,
    hasError: false,
    currentImageSrc: '',
    retryCount: 0
  });
  const [isIntersecting, setIsIntersecting] = useState(!lazyLoad);
  const { addToCart, formatCurrency } = useCart();
  const { isAuthenticated, user } = useAuth();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const navigate = useNavigate();
  const imageRef = useRef(null);
  const observerRef = useRef(null);
  const timeoutRef = useRef(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Calculate discount price if promotion is active
  const getDiscountedPrice = () => {
    if (!product.promotionActive) {
      return null;
    }

    // First check if discountPrice is already calculated by backend
    if (product.discountPrice) {
      return product.discountPrice;
    }

    // Fallback: calculate from promotion data if available
    const promotion = product.promotionId;
    if (typeof promotion === 'object' && promotion.discountType) {
      if (promotion.discountType === 'percentage') {
        return product.price - (product.price * promotion.discountValue / 100);
      } else if (promotion.discountType === 'fixed') {
        return Math.max(0, product.price - promotion.discountValue);
      }
    }

    return null;
  };

  const discountedPrice = getDiscountedPrice();

  // Ethiopian craft fallback images based on category
  const defaultFallback = 'https://via.placeholder.com/400x400/F59E0B/FFFFFF?text=Ethiopian+Craft';
  const placeholderFallback = 'https://via.placeholder.com/400x400/D1D5DB/6B7280?text=No+Image';

  // Get the best image path using utility function
  const getBestImagePath = (product) => {
    if (!product) {
      console.log('getBestImagePath: No product provided');
      return defaultFallback;
    }

    console.log('getBestImagePath: Product images:', product.images);
    const result = getBestProductImage(product);
    console.log('getBestImagePath: Result from getBestProductImage:', result);
    return result;
  };

  // Get fallback image for failed loads using utility function
  const getProductFallbackImage = (product, retryCount = 0) => {
    // Always use reliable online placeholder to prevent disappearing products
    if (retryCount === 0) {
      // First fallback: try category-specific placeholder
      const categoryName = product?.category || 'Ethiopian Craft';
      return `https://via.placeholder.com/400x400/F59E0B/FFFFFF?text=${encodeURIComponent(categoryName)}`;
    } else {
      // Final fallback: generic placeholder
      return placeholderFallback;
    }
  };

  // Initialize image source when component mounts or product changes
  useEffect(() => {
    if (product && product._id) {
      console.log(`ProductCard ${product._id}: Raw product images:`, product.images);
      const initialImageSrc = getBestImagePath(product);
      console.log(`ProductCard ${product._id}: Constructed image URL:`, initialImageSrc);
      setImageState(prev => ({
        ...prev,
        currentImageSrc: initialImageSrc,
        isLoading: true,
        hasError: false,
        retryCount: 0
      }));
    }
  }, [product?._id]); // Only re-run when product ID changes

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (!lazyLoad || !imageRef.current) {
      setIsIntersecting(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.1
      }
    );

    observer.observe(imageRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [lazyLoad]);

  // Handle image loading with timeout (optional)
  useEffect(() => {
    // If timeout is disabled, don't set any timeout
    if (disableTimeout) return;

    if (!isIntersecting || !imageState.currentImageSrc) return;

    // Set timeout for all images (8 seconds for eager, 10 seconds for lazy)
    const timeoutDuration = lazyLoad ? 10000 : 8000;

    timeoutRef.current = setTimeout(() => {
      console.warn(`Image load timeout for: ${imageState.currentImageSrc}`);
      handleImageError();
    }, timeoutDuration);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isIntersecting, imageState.currentImageSrc, lazyLoad, disableTimeout]);

  // Handle successful image load
  const handleImageLoad = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    console.log(`Image loaded successfully: ${imageState.currentImageSrc}`);
    console.log(`Setting imageLoaded=true and isLoading=false`);
    setImageLoaded(true);
    setImageState(prev => ({
      ...prev,
      isLoading: false,
      hasError: false
    }));
  };

  // Handle image load error with fallback logic
  const handleImageError = (event) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Log the actual error for debugging
    if (event && event.type === 'error') {
      console.warn(`Image failed to load (error event): ${imageState.currentImageSrc}`);
    }

    setImageLoaded(true);

    setImageState(prev => {
      const newRetryCount = prev.retryCount + 1;
      const fallbackSrc = getProductFallbackImage(product, newRetryCount);

      console.warn(`Image failed to load: ${prev.currentImageSrc}, using fallback: ${fallbackSrc}`);

      return {
        ...prev,
        isLoading: false, // Stop loading immediately and show fallback
        hasError: false, // Never show error state, always show fallback
        currentImageSrc: fallbackSrc,
        retryCount: newRetryCount
      };
    });
  };

  // Handle add to cart
  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // For mock data, assume products are available
    const productWithInventory = {
      ...product,
      isAvailable: true,
      inventory: { quantity: 10 }
    };

    try {
      const result = addToCart(productWithInventory, 1);
      
      if (result && result.error === 'SELECTION_REQUIRED') {
        // Apply shake effect
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        
        // Notify user
        toast.error(result.message || 'Please select your preferred color and size.', {
          icon: '✨',
          duration: 3000
        });

        // Small delay before redirect to show the shake/toast
        setTimeout(() => {
          navigate(`/products/${product._id}`);
        }, 800);
        return;
      }

      if (result) {
        // Track interaction for AI recommendations
        // This would be implemented with an API call in a real application
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  // Handle like/unlike
  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error('Please login to add to wishlist');
      return;
    }

    await toggleWishlist(product);
  };

  // Get primary image or fallback - simplified approach
  const getPrimaryImage = () => {
    return imageState.currentImageSrc || getProductFallbackImage(product, 0);
  };

  const primaryImage = getPrimaryImage();

  // Format artisan name - handle both populated and unpopulated artisan data
  const getArtisanName = () => {
    if (!product.artisan) return 'Unknown Artisan';

    // If artisan is populated with profile data
    if (product.artisan.profile) {
      const firstName = product.artisan.profile.firstName || '';
      const lastName = product.artisan.profile.lastName || '';
      return `${firstName} ${lastName}`.trim() || 'Unknown Artisan';
    }

    // If artisan has direct name property
    if (product.artisan.name) {
      return product.artisan.name;
    }

    // If artisan is just an ID string
    if (typeof product.artisan === 'string') {
      return 'Unknown Artisan';
    }

    return 'Unknown Artisan';
  };

  const artisanName = getArtisanName();

  // Get cultural significance preview
  const culturalPreview = product.description || 'Rich cultural heritage and traditional craftsmanship';

  // Ensure product has required fields
  if (!product || !product._id || !product.name) {
    console.warn('ProductCard received invalid product data:', product);
    return null; // Return null instead of rendering invalid card
  }

  return (
    <div className={`product-card-mobile group cursor-pointer flex flex-col ${className}`}>
      <Link to={`/products/${product._id}`} className="block flex flex-col relative overflow-hidden">
        {/* Product Image - Responsive aspect ratio */}
        <div
          ref={imageRef}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`relative overflow-hidden bg-gray-100 aspect-square w-full shrink-0 ${showUnavailableStyling && product.inventory && product.inventory.quantity === 0 ? 'opacity-80' : ''}`}
        >
          {isIntersecting ? (
            <>
              {(() => {
                const backImg = product.images?.find(img => img.viewType === 'back')?.url;
                const showBack = isHovered && backImg;
                
                return (
                  <img
                    src={showBack ? backImg : primaryImage}
                    alt={product?.name || 'Ethiopian craft product'}
                    className={`w-full h-full object-cover transition-all duration-300 ${showBack ? 'scale-105' : 'md:group-hover:scale-105'} ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    loading={lazyLoad ? 'lazy' : 'eager'}
                    crossOrigin="anonymous"
                    style={{ display: 'block' }}
                  />
                );
              })()}

              {/* Loading placeholder */}
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                  <SparklesIcon className="w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 text-ethiopian-gold animate-pulse" />
                  <span className="ml-1 sm:ml-2 text-[10px] sm:text-xs text-gray-600 hidden sm:inline">Loading...</span>
                </div>
              )}
            </>
          ) : (
            // Lazy loading placeholder
            <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
              <div className="text-gray-400 text-center">
                <SparklesIcon className="w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 mx-auto mb-1 sm:mb-2 animate-pulse" />
                <div className="text-[10px] sm:text-sm hidden sm:block">Loading...</div>
              </div>
            </div>
          )}

          {/* Overlay with actions */}
          <div className="absolute inset-0 bg-black/0 md:group-hover:bg-black/20 transition-all duration-300 z-10">
            {/* Like Button - always visible on mobile, hover on desktop */}
            <button
              onClick={handleLike}
              className="absolute top-1 right-1 sm:top-2 sm:right-2 p-1 sm:p-1.5 bg-white/90 rounded-full text-gray-400 hover:text-red-500 shadow-sm md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 z-20"
              title={isInWishlist(product._id) ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isInWishlist(product._id) ? 
                <HeartSolidIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-red-500" /> : 
                <HeartIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
              }
            </button>

            {/* View Details - desktop hover only */}
            <div className="hidden md:flex absolute inset-0 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.location.href = `/products/${product._id}`;
                }}
                className="px-3 py-1.5 md:px-4 md:py-2 bg-white text-gray-800 font-bold rounded-full shadow-lg hover:bg-gray-800 hover:text-white transition-all duration-300 flex items-center gap-1.5 text-xs md:text-sm"
              >
                <EyeIcon className="w-3 h-3 md:w-4 md:h-4" />
                <span>View</span>
              </button>
            </div>
          </div>

          {/* Status badges - Bottom Left - responsive sizing */}
          <div className="absolute bottom-1 left-1 sm:bottom-1.5 sm:left-1.5 flex flex-col space-y-0.5 z-20">
            {/* Promotion Badge */}
            {product.promotionActive && product.promotionId && typeof product.promotionId === 'object' && product.promotionId.urgencyBadge && (
              <span className="px-1 py-0.5 sm:px-1.5 bg-[#e43a3a] text-white text-[7px] sm:text-[8px] font-bold rounded">
                🔥 {product.promotionId.badgeText || 'Sale'}
              </span>
            )}
            {badge && (
              <span className="px-1 py-0.5 sm:px-1.5 bg-[#e43a3a] text-white text-[7px] sm:text-[8px] font-bold rounded">
                {badge}
              </span>
            )}
          </div>

          {/* Unavailable overlay when requested */}
          {showUnavailableStyling && product.inventory && product.inventory.quantity === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="px-2 py-1 sm:px-3 bg-gray-800 bg-opacity-60 text-white text-[10px] sm:text-sm font-semibold rounded-md">
                Unavailable
              </span>
            </div>
          )}
        </div>

        {/* Product Information - Mobile-first responsive design */}
        <div className="p-1.5 sm:p-2 md:p-4 flex flex-col bg-white z-20">

          {/* Price - Most prominent element */}
          <div className="flex items-baseline gap-1 mb-0.5 sm:mb-1">
            {product.promotionActive && discountedPrice ? (
              <>
                <span className="text-xs sm:text-sm md:text-lg lg:text-xl font-bold text-[#e43a3a] leading-none">
                  {formatCurrency(discountedPrice)}
                </span>
                <span className="text-[8px] sm:text-[10px] md:text-xs text-gray-400 line-through leading-none">
                  {formatCurrency(product.price)}
                </span>
              </>
            ) : (
              <span className="text-xs sm:text-sm md:text-lg lg:text-xl font-bold text-[#e43a3a] leading-none">
                {formatCurrency(product.price)}
              </span>
            )}
          </div>

          {/* Product Name - Responsive text sizing */}
          <p className="text-[9px] sm:text-[11px] md:text-sm text-gray-700 line-clamp-2 leading-tight mb-0.5 sm:mb-1">
            {product.name}
          </p>

          {/* Rating + sold count row - tablet and desktop only */}
          <div className="hidden md:flex items-center gap-2 mt-1">
            <div className="flex items-center gap-0.5">
              <span className="text-ethiopian-gold text-xs">★</span>
              <span className="text-xs text-gray-500">
                {product.rating ? parseFloat(product.rating).toFixed(1) : '5.0'}
              </span>
            </div>
            <span className="text-xs text-gray-400">
              {product.metrics?.reviewCount || 0} sold
            </span>
          </div>

          {/* Bottom row - Stock info + Cart button */}
          <div className="flex items-center justify-between mt-0.5 sm:mt-1">
            {/* Stock/Category info */}
            {product.inventory && product.inventory.quantity === 0 ? (
              <span className="text-[8px] sm:text-[9px] text-red-500 font-medium">Out of stock</span>
            ) : product.inventory && product.inventory.quantity < 5 ? (
              <span className="text-[8px] sm:text-[9px] text-orange-500 font-medium">Only {product.inventory.quantity} left</span>
            ) : (
              <span className="text-[8px] sm:text-[9px] text-gray-400 truncate max-w-[60px] sm:max-w-none">{product.category}</span>
            )}

            {/* Cart button - responsive sizing */}
            <button
              onClick={handleAddToCart}
              disabled={!product.inventory || product.inventory.quantity < 1}
              className={`w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-9 lg:h-9 bg-[#e43a3a] rounded-full flex items-center justify-center text-white disabled:opacity-40 shrink-0 transition-transform active:scale-95 ${isShaking ? 'animate-shake' : ''}`}
              title="Add to Cart"
            >
              <ShoppingCartIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4" />
            </button>
          </div>
        </div>
      </Link>
    </div>
  );
}

export default ProductCard;