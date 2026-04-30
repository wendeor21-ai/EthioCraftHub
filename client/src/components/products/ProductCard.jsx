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
    <div className={`group cursor-pointer flex flex-col h-full bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-300 ${className}`} style={{ minHeight: '420px' }}>
      <Link to={`/products/${product._id}`} className="block h-full flex flex-col relative overflow-hidden rounded-t-lg">
        {/* Product Image - Full Bleed */}
        <div
          ref={imageRef}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`relative overflow-hidden bg-gray-50 aspect-[4/5] w-full shrink-0 ${showUnavailableStyling && product.inventory && product.inventory.quantity === 0 ? 'opacity-80' : ''}`}
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
                    className={`w-full h-full object-cover transition-all duration-700 ${showBack ? 'scale-105 transform translate-y-1' : 'group-hover:scale-110'} ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    loading={lazyLoad ? 'lazy' : 'eager'}
                    crossOrigin="anonymous"
                    style={{ display: 'block', minHeight: '200px' }}
                  />
                );
              })()}

              {/* Loading placeholder */}
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                  <SparklesIcon className="w-8 h-8 text-ethiopian-gold animate-pulse" />
                  <span className="ml-2 text-xs text-gray-600">Loading...</span>
                </div>
              )}
            </>
          ) : (
            // Lazy loading placeholder
            <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
              <div className="text-gray-400 text-sm text-center">
                <SparklesIcon className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                <div>Image will load when visible</div>
              </div>
            </div>
          )}

          {/* Overlay with actions */}
          <div className="absolute inset-0 bg-black/5 group-hover:bg-black/20 transition-all duration-300 z-10">
            {/* Top Right Like Button - Hover Only */}
            <button
              onClick={handleLike}
              className="absolute top-3 right-3 p-2 bg-white/95 rounded-full text-gray-400 hover:text-red-500 shadow-md opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 hover:scale-105 z-20"
              title={isInWishlist(product._id) ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isInWishlist(product._id) ? <HeartSolidIcon className="w-5 h-5 text-red-500" /> : <HeartIcon className="w-5 h-5" />}
            </button>

            {/* View Details Call to Action Hover */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.location.href = `/products/${product._id}`;
                }}
                className="px-6 py-3 bg-white text-[#1e293b] font-bold rounded-full shadow-2xl hover:bg-[#1e293b] hover:text-white transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 flex items-center gap-2"
              >
                <EyeIcon className="w-5 h-5" />
                <span>View Details</span>
              </button>
            </div>
          </div>

          {/* Status badges - Bottom Left */}
          <div className="absolute bottom-2 left-2 flex flex-col space-y-1 z-20">
            {/* Promotion Urgency Badge */}
            {product.promotionActive && product.promotionId && typeof product.promotionId === 'object' && product.promotionId.urgencyBadge && (
              <span className="px-2 py-0.5 bg-white/50 backdrop-blur-sm border border-pink-500 text-pink-600 text-[10px] font-bold rounded shadow-sm animate-pulse">
                🔥 {product.promotionId.badgeText || 'Limited Time!'}
              </span>
            )}
            {badge && (
              <span className="px-2 py-0.5 bg-white/50 backdrop-blur-sm border border-orange-500 text-orange-600 text-[10px] font-bold rounded shadow-sm animate-pulse">
                {badge}
              </span>
            )}
            {/* Stock Status Badges */}
            {product.inventory && product.inventory.quantity > 0 && product.inventory.quantity < 5 && (
              <span className="px-2 py-0.5 bg-white/60 backdrop-blur-sm border border-orange-400 text-orange-600 text-[10px] font-bold rounded shadow-sm">
                Limited Stock
              </span>
            )}
            {product.inventory && product.inventory.quantity === 0 && (
              <span className="px-2 py-0.5 bg-white/60 backdrop-blur-sm border border-red-500 text-red-600 text-[10px] font-bold rounded shadow-sm">
                Out of Stock
              </span>
            )}
            {product.inventory && product.inventory.quantity >= 5 && (
              <span className="px-2 py-0.5 bg-white/60 backdrop-blur-sm border border-emerald-500 text-emerald-600 text-[10px] font-bold rounded shadow-sm">
                In Stock
              </span>
            )}
          </div>

          {/* Unavailable overlay when requested */}
          {showUnavailableStyling && product.inventory && product.inventory.quantity === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="px-3 py-1 bg-gray-800 bg-opacity-60 text-white text-sm font-semibold rounded-md">
                Unavailable
              </span>
            </div>
          )}

          {/* View count */}
          {product.metrics?.views > 0 && (
            <div className="absolute top-2 right-2 flex items-center space-x-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
              <EyeIcon className="w-3 h-3" />
              <span>{product.metrics.views}</span>
            </div>
          )}
        </div>

        {/* Product Information */}
        <div className="px-5 py-4 flex flex-col flex-grow bg-white z-20">
          {/* Category Badges & Rating Row */}
          <div className="flex items-center justify-between mb-3">
            <span className="px-3 py-1 bg-gray-100 text-ethiopian-gold text-[10px] uppercase tracking-wider font-bold rounded-full border border-gray-100">
              {product.category}
            </span>
            <div className="flex items-center space-x-1 border border-gray-100 px-2.5 py-1 rounded-full bg-gray-50">
              <span className="text-ethiopian-gold text-xs">★</span>
              <span className="text-xs font-bold text-[#1e293b]">
                {product.rating ? parseFloat(product.rating).toFixed(1) : (product.metrics?.averageRating ? parseFloat(product.metrics.averageRating).toFixed(1) : '5.0')}
              </span>
              <span className="text-[10px] text-gray-400 font-medium ml-1">
                ({product.metrics?.reviewCount || (Array.isArray(product.reviews) ? product.reviews.length : product.reviews) || Math.floor(Math.random() * 50) + 5})
              </span>
            </div>
          </div>

          {/* Product Name */}
          <h3 className="font-['Playfair_Display',serif] font-bold text-lg text-gray-900 mb-1 line-clamp-1 group-hover:text-ethiopian-gold transition-colors duration-200 leading-snug">
            {product.name}
          </h3>

          {/* Artisan Information */}
          {showArtisan && (
            <div className="mb-2">
              <span className="text-[11px] text-gray-500 uppercase tracking-widest font-semibold flex items-center gap-1">
                <span className="w-3 h-[1px] bg-gray-300"></span>
                {artisanName}
              </span>
            </div>
          )}

          {/* 2-Line Product Description */}
          <p className="text-sm text-gray-600 font-sans leading-relaxed line-clamp-2 mb-4 flex-grow">
            {product.description || `Authentic ${product.category} handcrafted with premium materials by local Ethiopian artisans.`}
          </p>

          {/* Price Bar */}
          <div className="pt-3 mt-auto flex items-center justify-between">
            <div className="flex items-baseline gap-2 font-['Inter',sans-serif]">
              {product.promotionActive && discountedPrice ? (
                <>
                  <span className="text-xl font-bold text-red-600 tracking-tight">
                    {formatCurrency(discountedPrice)}
                  </span>
                  <span className="text-sm text-gray-400 line-through font-medium">
                    {formatCurrency(product.price)}
                  </span>
                </>
              ) : (
                <span className="text-xl font-bold tracking-tight text-gray-900">
                  {formatCurrency(product.price)}
                </span>
              )}
            </div>

            {/* Quick Add To Cart Button Component replacement */}
            <button
              onClick={handleAddToCart}
              disabled={!product.inventory || product.inventory.quantity < 1}
              className={`w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-600 hover:bg-[#1e293b] hover:text-white transition-all shadow-sm disabled:opacity-50 ${isShaking ? 'animate-shake' : ''}`}
              title="Quick Add to Cart"
            >
              <ShoppingCartIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </Link>
    </div>
  );
}

export default ProductCard;