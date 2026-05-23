import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import {
  ShoppingCartIcon,
  HeartIcon,
  ArrowLeftIcon,
  ShareIcon,
  StarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TruckIcon,
  ShieldCheckIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartSolidIcon,
  StarIcon as StarSolidIcon
} from '@heroicons/react/24/solid';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { trackProductView } from '../utils/trackingUtils';
import { useCustomTranslation } from '../hooks/useCustomTranslation';
import { getBestProductImage, getImageUrl } from '../utils/imageUtils';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, formatCurrency } = useCart();
  const { t } = useCustomTranslation();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [filters, setFilters] = useState({ color: '', size: '' });
  const [activeSection, setActiveSection] = useState('artisan');
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Derived data
  const availableColors = product?.variations
    ? [...new Set(product.variations.map(v => v.color).filter(Boolean))]
    : [];
  const availableSizes = product?.variations
    ? [...new Set(product.variations.map(v => v.size).filter(Boolean))]
    : [];

  useEffect(() => {
    if (id) fetchProductDetails();
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/products/${id}`);
      const clean = response.data.product;
      if (clean.images && Array.isArray(clean.images)) {
        clean.images = clean.images.filter(img => img.url && !img.url.startsWith('blob:'));
      }
      setProduct(clean);
      trackProductView(id, clean.category);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  // Auto-select variant when filters change
  useEffect(() => {
    if (product?.variations?.length > 0) {
      const matched = product.variations.find(v =>
        (filters.color === '' || v.color === filters.color) &&
        (filters.size === '' || v.size === filters.size)
      );
      if (matched) setSelectedVariant(matched);
      else setSelectedVariant(null);
    }
  }, [filters, product]);

  const handleAddToCart = () => {
    if (product.variations?.length > 0 && !selectedVariant) {
      toast.error('Please select size and color');
      return;
    }
    addToCart(product, quantity, selectedVariant);
    toast.success('Added to cart');
  };

  const handleBuyNow = () => {
    if (product.variations?.length > 0 && !selectedVariant) {
      toast.error('Please select size and color');
      return;
    }
    addToCart(product, quantity, selectedVariant);
    navigate('/cart');
  };

  const handleToggleWishlist = async () => {
    if (!user) {
      toast.error('Please login to add to wishlist');
      navigate('/login', { state: { from: `/products/${id}` } });
      return;
    }
    await toggleWishlist(product);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out this authentic Ethiopian craft: ${product.name}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center">
        <LoadingSpinner />
        <p className="mt-4 text-gray-500 text-sm animate-pulse">Loading product...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <ErrorMessage message={error} />
        <button 
          onClick={() => navigate('/products')}
          className="mt-6 px-6 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-all font-medium"
        >
          Back to Shop
        </button>
      </div>
    </div>
  );

  if (!product) return null;

  const discount = product.comparePrice ? Math.round((1 - product.price / product.comparePrice) * 100) : 0;
  const hasDiscount = discount > 0;

  // Safeguard for images
  const productImages = product.images?.length > 0 
    ? product.images.map(img => {
        const url = typeof img === 'string' ? img : img?.url;
        return getImageUrl(url);
      }).filter(Boolean)
    : [getBestProductImage(product)];

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile Header - Fixed */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-900" />
          </button>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleShare}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ShareIcon className="w-5 h-5 text-gray-900" />
            </button>
            <button 
              onClick={handleToggleWishlist}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              {isInWishlist(product._id) ? (
                <HeartSolidIcon className="w-5 h-5 text-red-500" />
              ) : (
                <HeartIcon className="w-5 h-5 text-gray-900" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Header - Static */}
      <div className="hidden md:block bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <nav className="flex items-center text-sm font-medium">
            <button onClick={() => navigate('/products')} className="text-gray-500 hover:text-ethiopian-gold transition-colors">
              Products
            </button>
            <span className="mx-2 text-gray-300">/</span>
            <span className="text-gray-500">{product.category}</span>
            <span className="mx-2 text-gray-300">/</span>
            <span className="text-gray-900 truncate">{product.name}</span>
          </nav>
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-ethiopian-gold transition-all group"
          >
            <ArrowLeftIcon className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Back</span>
          </button>
        </div>
      </div>

      {/* Mobile Image Gallery */}
      <div className="relative mt-16 md:mt-0">
        <div className="md:max-w-7xl md:mx-auto md:px-4 md:py-8">
          <div className="md:grid md:grid-cols-2 md:gap-12 lg:gap-16">
            
            {/* Image Section */}
            <div className="md:col-span-1">
              <div className="aspect-square bg-gray-50 relative overflow-hidden md:rounded-xl">
                <img
                  src={productImages[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    e.target.src = '/images/gondar_drass1.jpg';
                    e.target.onerror = null;
                  }}
                />
                
                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                  {hasDiscount && (
                    <span className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                      -{discount}% OFF
                    </span>
                  )}
                  <span className="bg-ethiopian-gold text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                    Authentic
                  </span>
                </div>

                {/* Desktop Wishlist Button */}
                <button 
                  onClick={handleToggleWishlist}
                  className="hidden md:flex absolute top-4 right-4 p-3 bg-white/90 backdrop-blur-md rounded-full shadow-md hover:scale-110 transition-all border border-gray-100 z-10"
                >
                  {isInWishlist(product._id) ? (
                    <HeartSolidIcon className="w-5 h-5 text-red-500" />
                  ) : (
                    <HeartIcon className="w-5 h-5 text-gray-900" />
                  )}
                </button>

                {/* Image Navigation Dots - Mobile Only */}
                {productImages.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 md:hidden z-10">
                    {productImages.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImage(idx)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          selectedImage === idx ? 'bg-white w-6' : 'bg-white/50'
                        }`}
                        aria-label={`View image ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Thumbnail Strip */}
              {productImages.length > 1 && (
                <div className="flex gap-2 p-4 overflow-x-auto md:gap-3 md:p-0 md:mt-4 scrollbar-hide">
                  {productImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImage === idx 
                          ? 'border-ethiopian-gold shadow-md' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img src={img} className="w-full h-full object-cover" alt={`thumbnail ${idx + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info Section */}
            <div className="md:col-span-1">
              <div className="px-4 py-5 space-y-5 md:px-0 md:py-0 md:space-y-8">
                {/* Title and Category */}
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-bold text-ethiopian-gold uppercase tracking-wider">
                      {product.category}
                    </span>
                    <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg">
                      <StarSolidIcon className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {product.metrics?.averageRating?.toFixed(1) || '5.0'}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({product.metrics?.reviewCount || 0})
                      </span>
                    </div>
                  </div>
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                    {product.name}
                  </h1>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-3 pb-4 border-b border-gray-100">
                  <span className="text-3xl md:text-4xl font-bold text-gray-900">
                    {formatCurrency((selectedVariant ? selectedVariant.price : product.price) * quantity)}
                  </span>
                  {(selectedVariant?.comparePrice || product.comparePrice) && (
                    <span className="text-lg md:text-xl text-gray-400 line-through">
                      {formatCurrency((selectedVariant?.comparePrice || product.comparePrice) * quantity)}
                    </span>
                  )}
                </div>

                {/* Color Selection */}
                {availableColors.length > 0 && (
                  <div className="space-y-2.5">
                    <h3 className="text-sm font-semibold text-gray-900">Color</h3>
                    <div className="flex flex-wrap gap-2">
                      {availableColors.map(color => (
                        <button
                          key={color}
                          onClick={() => setFilters(prev => ({ ...prev, color }))}
                          className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                            filters.color === color
                              ? 'border-gray-900 bg-gray-900 text-white shadow-md'
                              : 'border-gray-300 text-gray-700 hover:border-gray-900 bg-white'
                          }`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Size Selection */}
                {availableSizes.length > 0 && (
                  <div className="space-y-2.5">
                    <h3 className="text-sm font-semibold text-gray-900">Size</h3>
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                      {availableSizes.map(size => (
                        <button
                          key={size}
                          onClick={() => setFilters(prev => ({ ...prev, size }))}
                          className={`py-3 rounded-lg border text-sm font-medium transition-all ${
                            filters.size === size
                              ? 'border-ethiopian-gold bg-ethiopian-gold/10 text-ethiopian-gold shadow-md'
                              : 'border-gray-300 text-gray-700 hover:border-gray-900 bg-white'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div className="flex items-center justify-between py-3 bg-gray-50 px-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-900">Quantity</h3>
                  <div className="flex items-center bg-white rounded-lg border border-gray-200 shadow-sm">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 rounded-l-lg transition-colors font-bold text-lg"
                    >
                      -
                    </button>
                    <span className="px-5 font-bold text-gray-900 text-base min-w-[40px] text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 rounded-r-lg transition-colors font-bold text-lg"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Action Buttons - Desktop only (mobile gets sticky bar below) */}
                <div className="hidden md:flex gap-4 pt-2">
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.98]"
                  >
                    <ShoppingCartIcon className="w-5 h-5" />
                    Add to Cart
                  </button>
                  <button
                    onClick={handleBuyNow}
                    className="flex-1 bg-gradient-to-r from-ethiopian-gold to-amber-500 text-white font-bold py-4 rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-200 hover:shadow-amber-300 active:scale-[0.98]"
                  >
                    Buy Now
                  </button>
                </div>

                {/* Description Preview */}
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">Description</h3>
                  <div className="relative">
                    <p className={`text-gray-600 leading-relaxed text-sm ${showFullDescription ? '' : 'line-clamp-3'}`}>
                      {product.description}
                    </p>
                    {product.description && product.description.length > 150 && (
                      <button
                        onClick={() => setShowFullDescription(!showFullDescription)}
                        className="text-ethiopian-gold font-medium text-sm mt-2 flex items-center gap-1 hover:text-amber-600 transition-colors"
                      >
                        {showFullDescription ? 'Show less' : 'Read more'}
                        {showFullDescription ? (
                          <ChevronUpIcon className="w-4 h-4" />
                        ) : (
                          <ChevronDownIcon className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Key Features */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <TruckIcon className="w-5 h-5 text-ethiopian-gold flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-900">Free Shipping</p>
                      <p className="text-xs text-gray-500">Worldwide</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <ShieldCheckIcon className="w-5 h-5 text-ethiopian-gold flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-900">Authentic</p>
                      <p className="text-xs text-gray-500">Handcrafted</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <ArrowPathIcon className="w-5 h-5 text-ethiopian-gold flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-900">30-Day Returns</p>
                      <p className="text-xs text-gray-500">Easy returns</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <StarIcon className="w-5 h-5 text-ethiopian-gold flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-900">Premium Quality</p>
                      <p className="text-xs text-gray-500">Artisan crafted</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Expandable Sections */}
      <div className="px-4 md:max-w-7xl md:mx-auto md:px-4 space-y-4 md:mt-16">
        <div className="md:grid md:grid-cols-1 md:gap-8">
          <div className="space-y-4">
          {/* Artisan Info */}
          <div className="border border-gray-200 rounded-lg">
            <button
              onClick={() => setActiveSection(activeSection === 'artisan' ? '' : 'artisan')}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <span className="font-semibold text-gray-900">Meet the Artisan</span>
              {activeSection === 'artisan' ? (
                <ChevronUpIcon className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {activeSection === 'artisan' && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="flex items-center gap-3 mt-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-600">
                      {product.artisan?.profile?.firstName ? product.artisan.profile.firstName[0] : 'A'}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {product.artisan?.profile?.storeName || 
                       (product.artisan?.profile?.firstName ? 
                        `${product.artisan.profile.firstName} ${product.artisan.profile.lastName}` : 
                        'Traditional Artisan')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {product.artisan?.profile?.experienceYears || 5}+ years experience
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-3">
                  {product.artisan?.profile?.bio || 
                   `Master craftsperson specializing in ${product.category} from ${product.originRegion || 'Ethiopia'}.`}
                </p>
              </div>
            )}
          </div>

          {/* Shipping Info */}
          <div className="border border-gray-200 rounded-lg">
            <button
              onClick={() => setActiveSection(activeSection === 'shipping' ? '' : 'shipping')}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <span className="font-semibold text-gray-900">Shipping & Returns</span>
              {activeSection === 'shipping' ? (
                <ChevronUpIcon className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {activeSection === 'shipping' && (
              <div className="px-4 pb-4 border-t border-gray-100 space-y-3 mt-3">
                <div>
                  <p className="font-medium text-gray-900">Shipping</p>
                  <p className="text-sm text-gray-600">Free worldwide shipping on all orders. Delivery in 5-10 business days.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Returns</p>
                  <p className="text-sm text-gray-600">30-day return policy. Items must be in original condition.</p>
                </div>
              </div>
            )}
          </div>

          {/* Reviews */}
          <div className="border border-gray-200 rounded-lg">
            <button
              onClick={() => setActiveSection(activeSection === 'reviews' ? '' : 'reviews')}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <span className="font-semibold text-gray-900">
                Reviews ({product.metrics?.reviewCount || 0})
              </span>
              {activeSection === 'reviews' ? (
                <ChevronUpIcon className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {activeSection === 'reviews' && (
              <div className="px-4 pb-4 border-t border-gray-100 mt-3">
                {product.reviews?.length > 0 ? (
                  <div className="space-y-4">
                    {product.reviews.slice(0, 3).map((review, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">{review.userName || 'Anonymous'}</span>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <StarSolidIcon 
                                key={i} 
                                className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400' : 'text-gray-200'}`} 
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No reviews yet. Be the first to review!</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Fixed Bottom Action Bar - Mobile ONLY */}
      <div className="md:hidden fixed inset-x-0 bottom-[56px] z-[10001] bg-white border-t border-gray-200 shadow-[0_-12px_38px_rgba(0,0,0,0.12)]">
        <div className="px-4 pb-4 pt-3 space-y-3 backdrop-blur-xl">
          {/* Price strip */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Total</p>
              <p className="text-xl font-black text-gray-900 truncate">
                {formatCurrency((selectedVariant ? selectedVariant.price : product.price) * quantity)}
              </p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full whitespace-nowrap">
              Free Ship
            </span>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleAddToCart}
              className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-gray-900/15 transition-all hover:bg-black active:scale-[0.98] min-h-[54px]"
            >
              <ShoppingCartIcon className="w-5 h-5" />
              <span>Add to Cart</span>
            </button>
            <button
              onClick={handleBuyNow}
              className="w-full bg-ethiopian-gold text-gray-900 font-bold py-4 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-300/30 transition-all hover:bg-yellow-500 active:scale-[0.98] min-h-[54px]"
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Padding for Mobile Fixed Action Bar + Mobile Nav */}
      <div className="md:hidden h-[210px]"></div>
    </div>
  );
};

export default ProductDetail;