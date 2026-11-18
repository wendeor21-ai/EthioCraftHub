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
  SparklesIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  TruckIcon,
  ArrowPathIcon,
  CreditCardIcon,
  StarIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  BuildingStorefrontIcon,
  ChatBubbleLeftRightIcon,
  TagIcon,
  LockClosedIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartSolidIcon,
  StarIcon as StarSolidIcon
} from '@heroicons/react/24/solid';
import ProductCard from '../components/products/ProductCard';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { trackProductView } from '../utils/trackingUtils';
import { useCustomTranslation } from '../hooks/useCustomTranslation';
import { getBestProductImage, getImageUrl } from '../utils/imageUtils';
import { 
  UserCircleIcon, 
  MapPinIcon, 
  BeakerIcon, 
  BookOpenIcon,
  ShoppingBagIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/solid';
import { Scissors } from 'lucide-react';

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
  const [selectedOptions, setSelectedOptions] = useState({});
  const [filters, setFilters] = useState({ color: '', size: '' });
  const [activeTab, setActiveTab] = useState('artisan'); // artisan, shipping
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Modals & Enhanced Reviews
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
  const [reviewsRatingFilter, setReviewsRatingFilter] = useState('all');
  const [reviewsCountryFilter, setReviewsCountryFilter] = useState('all');
  const [reviewsSortBy, setReviewsSortBy] = useState('default');
  const [expandedReviews, setExpandedReviews] = useState({});
  const [isWritingReview, setIsWritingReview] = useState(false);

  // Review state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [artisanLogoFailed, setArtisanLogoFailed] = useState(false);

  // Helper to safely render text (avoids Object-as-React-child crashes permanently)
  const safeText = (val, fallback = '') => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val.trim();
    if (typeof val === 'number') return String(val);
    if (typeof val === 'boolean') return String(val);
    if (Array.isArray(val)) {
      const parts = val.map(item => safeText(item)).filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : fallback;
    }
    if (typeof val === 'object') {
      return val.en || val.am || val.name || val.significance || val.title || val.text || val.value || fallback;
    }
    return fallback;
  };

  // Close modals on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsStoryModalOpen(false);
        setIsReviewsModalOpen(false);
      }
    };
    if (isStoryModalOpen || isReviewsModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStoryModalOpen, isReviewsModalOpen]);

  // Helper to mask user names (e.g. W***n, C***o)
  const maskUserName = (name) => {
    const safe = safeText(name, 'Customer');
    if (!safe) return 'Customer';
    if (safe.length <= 2) return `${safe[0]}***`;
    return `${safe[0]}***${safe[safe.length - 1]}`;
  };

  // Helper for country representations
  const getReviewCountry = (review, index) => {
    if (review?.country && review.country.flag) return review.country;
    const countries = [
      { code: 'ET', name: 'Ethiopia', flag: '🇪🇹' },
      { code: 'US', name: 'United States', flag: '🇺🇸' },
      { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
      { code: 'DE', name: 'Germany', flag: '🇩🇪' },
      { code: 'FR', name: 'France', flag: '🇫🇷' },
      { code: 'IT', name: 'Italy', flag: '🇮🇹' },
      { code: 'CA', name: 'Canada', flag: '🇨🇦' },
      { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
      { code: 'AE', name: 'UAE', flag: '🇦🇪' }
    ];
    return countries[index % countries.length];
  };

  const toggleExpandReview = (key) => {
    setExpandedReviews(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Derived data with resilient fallback for strings and objects
  const availableColors = [
    ...new Set([
      ...(product?.variations?.map(v => v.color).filter(Boolean) || []),
      ...(Array.isArray(product?.colors) ? product.colors.filter(Boolean) : []),
      ...(typeof product?.colors === 'string' && product.colors ? [product.colors] : [])
    ])
  ];

  const availableSizes = [
    ...new Set([
      ...(product?.variations?.map(v => v.size).filter(Boolean) || []),
      ...(Array.isArray(product?.sizes) ? product.sizes.filter(Boolean) : []),
      ...(typeof product?.sizes === 'string' && product.sizes ? [product.sizes] : [])
    ])
  ];

  // Helper to map color names to hex codes for swatch display
  const getColorHex = (colorName) => {
    if (!colorName) return '#e5e7eb';
    const name = String(colorName).toLowerCase().trim();
    if (name.includes('ነጭ') || name.includes('white')) return '#ffffff';
    if (name.includes('ጥቁር') || name.includes('black')) return '#18181b';
    if (name.includes('ቀይ') || name.includes('red')) return '#dc2626';
    if (name.includes('አረንጓዴ') || name.includes('green')) return '#16a34a';
    if (name.includes('ቢጫ') || name.includes('yellow')) return '#eab308';
    if (name.includes('ወርቅ') || name.includes('gold')) return '#d97706';
    if (name.includes('ሰማያዊ') || name.includes('blue')) return '#2563eb';
    if (name.includes('ቡናማ') || name.includes('brown')) return '#78350f';
    if (name.includes('ክሬም') || name.includes('cream') || name.includes('beige')) return '#fef3c7';
    if (name.includes('ብርቱካን') || name.includes('orange')) return '#ea580c';
    if (name.includes('ወይን') || name.includes('purple')) return '#7c3aed';
    if (name.includes('ግራጫ') || name.includes('grey') || name.includes('gray')) return '#9ca3af';
    return '#f3f4f6';
  };

  // Pre-select first color/size if available and none selected
  useEffect(() => {
    if (availableColors.length > 0 && !filters.color) {
      setFilters(prev => ({ ...prev, color: availableColors[0] }));
    }
    if (availableSizes.length > 0 && !filters.size) {
      setFilters(prev => ({ ...prev, size: availableSizes[0] }));
    }
  }, [product]);

  const handleNextImage = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (productImages.length > 1) {
      setSelectedImage(prev => (prev + 1) % productImages.length);
    }
  };

  const handlePrevImage = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (productImages.length > 1) {
      setSelectedImage(prev => (prev - 1 + productImages.length) % productImages.length);
    }
  };

  const handleColorClick = (color, index) => {
    setFilters(prev => ({ ...prev, color }));

    // 1. Try to find variation matching this color that has an explicit image
    if (product?.variations?.length > 0) {
      const variantWithImg = product.variations.find(v => v.color === color && (v.image || v.imageUrl));
      if (variantWithImg) {
        const vImg = getImageUrl(variantWithImg.image || variantWithImg.imageUrl);
        const targetIdx = productImages.findIndex(img => img === vImg);
        if (targetIdx !== -1) {
          setSelectedImage(targetIdx);
          return;
        }
      }
    }

    // 2. If productImages has multiple images, rotate/switch image for this color
    if (productImages.length > 1) {
      setSelectedImage(index % productImages.length);
    }
  };

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
      setArtisanLogoFailed(false);
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
    if (product.options?.length > 0) {
      const missing = product.options.some(opt => !selectedOptions[opt.name]);
      if (missing) {
        toast.error('Please select all options');
        return;
      }
    }
    addToCart(product, quantity, selectedVariant, selectedOptions);
    toast.success('Added to cart');
  };

  const handleBuyNow = () => {
    if (product.variations?.length > 0 && !selectedVariant) {
      toast.error('Please select size and color');
      return;
    }
    addToCart(product, quantity, selectedVariant, selectedOptions);
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

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to review');
      navigate('/login', { state: { from: `/products/${id}` } });
      return;
    }
    if (reviewComment.trim().length < 10) {
      toast.error('Review must be at least 10 characters');
      return;
    }
    setSubmittingReview(true);
    try {
      const response = await api.post(`/products/${id}/reviews`, {
        rating: reviewRating,
        comment: reviewComment.trim()
      });
      setProduct(prev => ({
        ...prev,
        reviews: [response.data.review, ...(prev.reviews || [])],
        metrics: {
          ...prev.metrics,
          averageRating: response.data.averageRating || prev.metrics?.averageRating,
          reviewCount: response.data.reviewCount || ((prev.reviews?.length || 0) + 1)
        }
      }));
      setReviewComment('');
      setReviewRating(5);
      setIsWritingReview(false);
      toast.success('Thank you! Review submitted successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Image rendering logic moved to imageUtils

  const renderStars = (rating, interactive = false) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && setReviewRating(star)}
          onMouseEnter={() => interactive && setHoveredStar(star)}
          onMouseLeave={() => interactive && setHoveredStar(0)}
          className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
        >
          <span className={star <= (interactive ? (hoveredStar || reviewRating) : rating) ? 'text-yellow-400' : 'text-gray-200'}>
            ★
          </span>
        </button>
      ))}
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center">
        <LoadingSpinner />
        <p className="mt-4 text-gray-500 font-medium animate-pulse">Unveiling Ethiopian Craftsmanship...</p>
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

  // Safeguard for images - handle both string and object formats from DB
  const productImages = product.images?.length > 0 
    ? product.images.map(img => {
        const url = typeof img === 'string' ? img : img?.url;
        return getImageUrl(url);
      }).filter(Boolean)
    : [getBestProductImage(product)];

  const allReviews = Array.isArray(product.reviews) ? product.reviews : [];

  const filteredReviews = allReviews.filter((r, idx) => {
    if (reviewsRatingFilter !== 'all' && Number(r.rating) !== Number(reviewsRatingFilter)) {
      return false;
    }
    const country = getReviewCountry(r, idx);
    if (reviewsCountryFilter !== 'all' && country.code !== reviewsCountryFilter) {
      return false;
    }
    return true;
  }).sort((a, b) => {
    if (reviewsSortBy === 'highest') return (Number(b.rating) || 5) - (Number(a.rating) || 5);
    if (reviewsSortBy === 'lowest') return (Number(a.rating) || 5) - (Number(b.rating) || 5);
    if (reviewsSortBy === 'recent') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    return 0;
  });

  const ethiopiaReviewCount = allReviews.filter((r, idx) => getReviewCountry(r, idx).code === 'ET').length;

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      {/* Top Breadcrumb Bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <nav className="flex items-center text-xs sm:text-sm font-medium">
            <button onClick={() => navigate('/products')} className="text-gray-500 hover:text-ethiopian-gold transition-colors">
              Products
            </button>
            <span className="mx-2 text-gray-300">/</span>
            <span className="text-gray-500">{product.category}</span>
            <span className="mx-2 text-gray-300">/</span>
            <span className="text-gray-900 truncate max-w-[150px] sm:max-w-none">{product.name}</span>
          </nav>
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 hover:text-ethiopian-gold transition-all group"
          >
            <ArrowLeftIcon className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>{t('common.back', 'Back')}</span>
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-16">
          
          {/* LEFT SIDE: Image Gallery (lg:col-span-7) */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden p-2 sm:p-3">
              <div 
                onClick={handleNextImage}
                className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 group cursor-pointer select-none"
                title={productImages.length > 1 ? "Click to view next photo" : product.name}
              >
                {/* Main Product Image with Click-to-Next */}
                <img
                  key={selectedImage}
                  src={productImages[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    e.target.src = '/images/gondar_drass1.jpg';
                    e.target.onerror = null;
                  }}
                />

                {/* AliExpress Style Bottom-Left Counter Pill */}
                <div className="absolute bottom-3 left-3 bg-black/65 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm pointer-events-none z-10">
                  <span>Item {selectedImage + 1}/{productImages.length}</span>
                  <span className="text-white/40">•</span>
                  <span>{filters.color || availableColors[0] || 'Color'}</span>
                </div>

                {/* AliExpress Style Bottom-Right Floating Wishlist Icon */}
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleToggleWishlist(); }}
                  className="absolute bottom-3 right-3 p-2.5 bg-white/95 backdrop-blur-md rounded-full shadow-md hover:scale-110 transition-all z-20 border border-gray-100 text-gray-900"
                  aria-label="Wishlist"
                >
                  {isInWishlist(product._id) ? (
                    <HeartSolidIcon className="w-5 h-5 text-red-500" />
                  ) : (
                    <HeartIcon className="w-5 h-5 text-gray-800" />
                  )}
                </button>
                
                {/* Navigation Arrows on Main Photo */}
                {productImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevImage}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/85 hover:bg-white text-gray-800 shadow-md backdrop-blur-xs transition-all hover:scale-110 z-10"
                      aria-label="Previous photo"
                    >
                      <ChevronLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextImage}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/85 hover:bg-white text-gray-800 shadow-md backdrop-blur-xs transition-all hover:scale-110 z-10"
                      aria-label="Next photo"
                    >
                      <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </>
                )}

                {/* Top Badges */}
                <div className="absolute top-3.5 left-3.5 flex flex-col gap-1.5 pointer-events-none z-10">
                  {hasDiscount && (
                    <span className="bg-[#FF2853] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">
                      -{discount}% OFF
                    </span>
                  )}
                  <span className="bg-ethiopian-gold text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">
                    Authentic
                  </span>
                </div>
              </div>

              {/* Thumbnails Row */}
              {productImages.length > 1 && (
                <div className="flex gap-2.5 overflow-x-auto py-3 px-1 no-scrollbar">
                  {productImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImage(idx)}
                      className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImage === idx 
                          ? 'border-[#FF2853] ring-2 ring-rose-500/25 scale-105' 
                          : 'border-transparent bg-gray-50 hover:border-gray-300 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img src={img} className="w-full h-full object-cover" crossOrigin="anonymous" alt={`thumbnail ${idx + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDE: Product Info & Actions Column (AliExpress Style) */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-5 lg:p-6 space-y-3.5">
              {/* Product Title & Social Proof (AliExpress Style) */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h1 className="text-base sm:text-lg font-bold text-gray-950 leading-snug line-clamp-2">
                    {product.name}
                  </h1>
                  {/* Dramatic Animated Motion Button to View Story */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsStoryModalOpen(true);
                    }}
                    className="shrink-0 relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-amber-950 bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-300 border border-amber-400 shadow-sm hover:shadow-md transition-all active:scale-95 group overflow-hidden cursor-pointer select-none"
                    title="Click to view cultural heritage story & craftsmanship"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600"></span>
                    </span>
                    <SparklesIcon className="w-3.5 h-3.5 text-amber-900 group-hover:rotate-12 transition-transform" />
                    <span className="font-extrabold tracking-tight">
                      ✨ View Story
                    </span>
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                  <div className="flex items-center text-amber-400">
                    {[1, 2, 3, 4, 5].map(s => (
                      <span key={s} className="text-xs">★</span>
                    ))}
                  </div>
                  <span className="font-extrabold text-gray-900">
                    {product.metrics?.averageRating?.toFixed(1) || '5.0'}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="font-medium text-gray-600">
                    {product.metrics?.sold || 34} sold
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                    Verified Artisan
                  </span>
                </div>
              </div>

              {/* AliExpress Style Sale & Price Banner */}
              <div className="rounded-xl overflow-hidden shadow-xs border border-rose-100">
                {/* Crimson Gradient Header Strip */}
                <div className="bg-gradient-to-r from-[#FF2853] via-[#FF3B47] to-[#FF5E36] text-white px-3.5 py-1.5 flex items-center justify-between text-xs font-black">
                  <span className="flex items-center gap-1">
                    <span>🔥</span>
                    <span>Heritage Craft Deal</span>
                  </span>
                  <span className="text-[11px] font-bold text-rose-100 uppercase tracking-wider">
                    Direct Artisan Fair-Trade
                  </span>
                </div>

                {/* Main Price Area */}
                <div className="bg-white p-3 sm:p-3.5 space-y-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-2xl sm:text-3xl font-black text-[#FF2853] tracking-tight">
                      ETB {((selectedVariant ? selectedVariant.price : product.price) * quantity).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="bg-rose-50 text-[#FF2853] text-[11px] font-black px-1.5 py-0.5 rounded border border-rose-200">
                      -{discount || 25}% now | Save ETB {Math.max(100, Math.round(((selectedVariant?.comparePrice || product.comparePrice || (product.price * 1.3)) - product.price) * quantity))}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-gray-400">
                    <span className="line-through">
                      ETB {((selectedVariant?.comparePrice || product.comparePrice || (product.price * 1.3)) * quantity).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span>|</span>
                    <span>Tax excluded, free artisan packaging</span>
                  </div>
                </div>
              </div>

              {/* AliExpress Coupon Strip */}
              <div className="bg-rose-50/60 hover:bg-rose-50 border border-rose-100/90 rounded-xl px-3.5 py-2 flex items-center justify-between cursor-pointer transition-colors shadow-2xs">
                <div className="flex items-center gap-2 text-xs">
                  <TagIcon className="w-4 h-4 text-[#FF2853] shrink-0" />
                  <span className="font-bold text-[#FF2853]">
                    ETB 150.00 off on orders over ETB 1,500.00
                  </span>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0" />
              </div>

              {/* Variations - Color with Picture Cards (AliExpress Style) */}
              {availableColors.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-800">
                      Color : <span className="font-extrabold text-gray-950">{filters.color || availableColors[0]}</span>
                    </span>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                  </div>

                  {/* Horizontal Scrollable Thumbnail Photo Cards */}
                  <div className="flex gap-2.5 overflow-x-auto py-1 scrollbar-hide">
                    {availableColors.map((color, idx) => {
                      const isSelected = filters.color === color;
                      const thumbImg = productImages[idx % productImages.length] || productImages[0];
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => handleColorClick(color, idx)}
                          className={`flex-shrink-0 flex flex-col items-center p-1 rounded-xl border-2 transition-all ${
                            isSelected
                              ? 'border-gray-950 bg-white ring-2 ring-gray-950/20 shadow-xs scale-102'
                              : 'border-gray-200 bg-gray-50/80 hover:border-gray-300'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                            <img src={thumbImg} className="w-full h-full object-cover" alt={color} />
                          </div>
                          <span className="text-[10px] font-semibold text-gray-800 mt-1 max-w-[56px] truncate text-center">
                            {color}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Variations - Size (AliExpress Style) */}
              {availableSizes.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-800">
                      Size : <span className="font-extrabold text-gray-950">{filters.size || availableSizes[0]}</span>
                    </span>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                  </div>

                  {/* Horizontal Pills */}
                  <div className="flex flex-wrap gap-2">
                    {availableSizes.map(size => {
                      const isSelected = filters.size === size;
                      const variantForSize = product.variations?.find(v => v.size === size);
                      const hasPriceDiff = variantForSize && variantForSize.price !== product.price;

                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setFilters(prev => ({ ...prev, size }))}
                          className={`px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                            isSelected
                              ? 'border-2 border-gray-950 bg-white font-extrabold text-gray-950 shadow-2xs'
                              : 'border border-gray-200 bg-gray-100/90 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <span>{size}</span>
                          {hasPriceDiff && (
                            <span className="ml-1 text-[10px] font-bold text-amber-700">
                              ({formatCurrency(variantForSize.price)})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="text-[11px] text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 flex items-center gap-1.5">
                    <span className="font-medium">Traditional Fit:</span>
                    <span>Standard Ethiopian Artisan Dimensions</span>
                  </div>
                </div>
              )}

              {/* Quantity Stepper */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Quantity</span>
                  <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                    <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                    In stock ({product.inventory?.quantity || 15} units available)
                  </span>
                </div>

                <div className="flex items-center bg-gray-100 rounded-lg border border-gray-200 h-9 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-9 h-full flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-colors font-bold text-base"
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span className="px-3 font-extrabold text-gray-900 text-xs min-w-[32px] text-center select-none bg-white h-full flex items-center justify-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-9 h-full flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-colors font-bold text-base"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* AliExpress Service Commitment Accordion Strip */}
              <div className="bg-white rounded-xl border border-gray-100 p-3.5 space-y-2.5 text-xs shadow-2xs mt-2">
                <div className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded">Brand+</span>
                    <span className="font-bold text-blue-600">Service commitment</span>
                  </div>
                  <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                </div>

                <div className="flex items-start gap-2.5 pt-2.5 border-t border-gray-100 cursor-pointer">
                  <TruckIcon className="w-4 h-4 text-gray-700 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">Shipping: Free Delivery</p>
                    <p className="text-[11px] text-gray-500">Estimated delivery: 2 - 4 business days in Ethiopia / Express Global</p>
                  </div>
                  <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
                </div>

                <div className="flex items-center gap-2.5 pt-2.5 border-t border-gray-100 cursor-pointer">
                  <ArrowPathIcon className="w-4 h-4 text-gray-700 shrink-0" />
                  <span className="font-medium text-gray-800 flex-1">Return & refund policy: 30-day money-back</span>
                  <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0" />
                </div>

                <div className="flex items-start gap-2.5 pt-2.5 border-t border-gray-100 cursor-pointer">
                  <LockClosedIcon className="w-4 h-4 text-gray-700 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">Security & Privacy: <span className="font-normal text-gray-600">secure personal details</span></p>
                    <p className="text-[11px] text-gray-500">Safe payments: protected by artisan escrow system</p>
                  </div>
                  <ChevronRightIcon className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
                </div>
              </div>

              {/* AliExpress Reviews Section */}
              <div className="bg-white rounded-xl border border-gray-100 p-3.5 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <h3 className="font-bold text-gray-900 text-sm">Reviews</h3>
                    <span className="text-xs font-black text-gray-800">
                      {product.metrics?.averageRating?.toFixed(1) || '5.0'}
                    </span>
                    <div className="flex text-amber-400 text-xs">
                      {[1, 2, 3, 4, 5].map(s => (
                        <span key={s} className="text-xs">
                          {s <= Math.round(product.metrics?.averageRating || 5) ? '★' : '☆'}
                        </span>
                      ))}
                    </div>
                    <span className="text-[11px] text-gray-400">
                      ({allReviews.length || product.metrics?.reviewCount || 0} ratings)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsReviewsModalOpen(true);
                    }}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>All from verified purchases</span>
                    <ChevronRightIcon className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Verified Buyer Sample Card - From REAL Database Data */}
                {allReviews.length > 0 ? (
                  <div 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsReviewsModalOpen(true);
                    }}
                    className="bg-gray-50/80 p-3 rounded-lg border border-gray-100 text-xs space-y-1.5 cursor-pointer hover:bg-gray-100/70 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <div className="flex text-amber-400 text-[10px]">
                          {[1, 2, 3, 4, 5].map(s => (
                            <span key={s}>
                              {s <= (Number(allReviews[0].rating) || 5) ? '★' : '☆'}
                            </span>
                          ))}
                        </div>
                        <span className="font-bold text-gray-800">
                          {maskUserName(allReviews[0].userName)}, {getReviewCountry(allReviews[0], 0).flag} {getReviewCountry(allReviews[0], 0).name}
                        </span>
                      </div>
                      <span className="text-gray-400 text-[10px]">Verified Purchase</span>
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {new Date(allReviews[0].createdAt || Date.now()).toLocaleDateString()} • {safeText(filters.color, 'Standard')} • Handcrafted
                    </div>
                    <p className="text-gray-700 text-xs leading-relaxed line-clamp-2">
                      "{safeText(allReviews[0].comment)}"
                    </p>
                  </div>
                ) : (
                  <div 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsReviewsModalOpen(true);
                    }}
                    className="bg-gray-50/80 p-3 rounded-lg border border-dashed border-gray-200 text-xs text-center cursor-pointer hover:bg-gray-100/70 transition-colors"
                  >
                    <p className="text-gray-500 font-medium text-[11px]">No reviews yet. Click to view or leave the first review!</p>
                  </div>
                )}
              </div>

              {/* Action Buttons - Desktop ONLY (mobile uses bottom bar) */}
              <div className="hidden sm:flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="flex-1 bg-white hover:bg-gray-50 text-gray-950 border-2 border-gray-950 font-bold py-3 px-4 rounded-full transition-all flex items-center justify-center gap-2 shadow-xs uppercase text-xs tracking-wider active:scale-[0.98]"
                >
                  <ShoppingCartIcon className="w-4 h-4" />
                  <span>{t("product.add_to_cart", "Add to Cart")}</span>
                </button>
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="flex-1 bg-gradient-to-r from-[#FF2853] to-[#FF4B3E] hover:from-[#E61F48] hover:to-[#EB3C2E] text-white font-extrabold py-3 px-4 rounded-full transition-all shadow-md shadow-rose-500/25 uppercase text-xs tracking-wider active:scale-[0.98]"
                >
                  <span>{t("product.buy_now", "Buy Now")}</span>
                </button>
              </div>

              {/* Product Highlights Grid (2x2) */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                {[
                  { icon: MapPinIcon, label: t("product.origin", "Origin"), value: product.originRegion || 'Ethiopia' },
                  { icon: BeakerIcon, label: t("product.material", "Material"), value: product.materials || 'Organic' },
                  { icon: TruckIcon, label: t("footer.shipping", "Shipping"), value: 'Global Delivery' },
                  { icon: ShieldCheckIcon, label: t("product.warranty", "Warranty"), value: 'Artisan Quality' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 bg-gray-50/80 rounded-lg border border-gray-100">
                    <item.icon className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold text-gray-400 uppercase leading-none mb-0.5">{item.label}</p>
                      <p className="text-[11px] font-bold text-gray-900 truncate leading-none">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Detailed Info & Master Artisan (Compact & Mobile-First) */}
        <div className="mt-8 sm:mt-10">
          {/* Segmented Tab Controls */}
          <div className="flex items-center gap-1.5 mb-3 p-1 bg-gray-100/90 rounded-2xl w-fit border border-gray-200/60 shadow-2xs">
            {[
              { id: 'artisan', label: '👤 የጥበብ ባለሙያው (Artisan)' },
              { id: 'shipping', label: '🚚 ማድረሻ እና ዋስትና (Shipping)' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-950 shadow-xs border border-gray-200/80 font-extrabold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
            <div className="p-3.5 sm:p-5">
            {activeTab === 'artisan' && (() => {
              const artisanTargetId = 
                product?.artisan?._id || 
                product?.artisan?.id || 
                product?.artisanId || 
                (typeof product?.artisan === 'string' ? product.artisan : null);

              const artisanDisplayName = safeText(
                product?.artisan?.profile?.storeName || 
                product?.artisan?.profile?.fullName || 
                (product?.artisan?.profile?.firstName ? `${product.artisan.profile.firstName} ${product.artisan.profile.lastName || ''}`.trim() : null) || 
                product?.artisan?.name,
                'ባህላዊ የእጅ ጥበብ ባለሙያ'
              );

              const artisanRegion = safeText(
                product?.artisan?.profile?.address?.region || 
                product?.artisan?.profile?.location || 
                product?.originRegion, 
                'ኢትዮጵያ'
              );

              const artisanLogo = product?.artisan?.profile?.storeLogo || product?.artisan?.profile?.profileImage;

              const handleGoToArtisan = (e) => {
                if (e) {
                  e.preventDefault();
                  e.stopPropagation();
                }
                if (artisanTargetId) {
                  navigate(`/artisan/${artisanTargetId}`);
                } else {
                  navigate(`/products?search=${encodeURIComponent(artisanDisplayName)}`);
                }
              };

              const handleCustomOrder = (e) => {
                if (e) {
                  e.preventDefault();
                  e.stopPropagation();
                }
                if (artisanTargetId) {
                  navigate(`/custom-order?artisanId=${artisanTargetId}`);
                } else {
                  navigate('/custom-order');
                }
              };

              return (
                <div className="max-w-4xl mx-auto space-y-3.5">
                  {/* Unified Artisan Header & Profile Card */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-yellow-50/50 border border-amber-200/80 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                      {/* Left: Avatar + Details */}
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar with Cultural Fallback */}
                        <div 
                          onClick={handleGoToArtisan}
                          className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shrink-0 border-2 border-white shadow-md bg-gradient-to-br from-amber-500 to-yellow-600 ring-2 ring-amber-300/80 cursor-pointer hover:scale-105 transition-transform flex items-center justify-center text-white"
                          title="የባለሙያውን ገጽ ይመልከቱ"
                        >
                          {artisanLogo && !artisanLogoFailed ? (
                            <img 
                              src={getImageUrl(artisanLogo)} 
                              alt={artisanDisplayName} 
                              className="w-full h-full object-cover" 
                              crossOrigin="anonymous"
                              onError={() => setArtisanLogoFailed(true)}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center">
                              <span className="text-xl sm:text-2xl font-black leading-none drop-shadow-xs">
                                {artisanDisplayName[0]}
                              </span>
                              <span className="text-[8px] uppercase tracking-wider text-amber-100 font-bold mt-0.5">ባለሙያ</span>
                            </div>
                          )}
                          {product.artisan?.profile?.isVerifiedArtisan && (
                            <div className="absolute -bottom-1 -right-1 p-0.5 bg-white rounded-full shadow-xs border border-amber-200">
                              <CheckBadgeIcon className="w-3.5 h-3.5 text-ethiopian-gold" />
                            </div>
                          )}
                        </div>

                        {/* Name, Region, Specialty */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 
                              onClick={handleGoToArtisan}
                              className="text-sm sm:text-base font-black text-gray-950 hover:text-amber-800 cursor-pointer transition-colors leading-tight truncate"
                            >
                              {artisanDisplayName}
                            </h3>
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
                              ✓ የተረጋገጠ
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium mt-0.5 flex-wrap">
                            <span>📍 {artisanRegion}</span>
                            <span>•</span>
                            <span className="text-amber-900 font-semibold">{safeText(product.category, 'ባህላዊ አልባሳት')}</span>
                          </div>

                          {/* Micro Stat Badges */}
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap text-[10px]">
                            <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-800 font-bold shadow-2xs">
                              ⏱️ {product.artisan?.profile?.experienceYears ?? 5}+ ዓመታት
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-800 font-bold shadow-2xs">
                              🧶 {product.artisan?.profile?.totalProducts ?? 10}+ ስራዎች
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-800 font-bold shadow-2xs">
                              ⭐ 4.9 (120+)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Direct Fast Action Buttons */}
                      <div className="flex items-center gap-2 sm:self-center shrink-0 pt-1 sm:pt-0">
                        <button
                          type="button"
                          onClick={handleCustomOrder}
                          className="flex-1 sm:flex-initial px-3.5 py-2 bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white rounded-xl font-bold text-xs shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer active:scale-95"
                        >
                          <Scissors className="w-3.5 h-3.5" />
                          <span>✂️ ትዕዛዝ ይጀምሩ</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleGoToArtisan}
                          className="flex-1 sm:flex-initial px-3 py-2 bg-white border border-amber-300/80 hover:bg-amber-50 text-amber-950 rounded-xl font-bold text-xs shadow-2xs transition-colors flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer active:scale-95"
                        >
                          <UserCircleIcon className="w-3.5 h-3.5 text-amber-700" />
                          <span>ሙሉ ፕሮፋይል →</span>
                        </button>
                      </div>
                    </div>

                    {/* Integrated Custom Design Banner */}
                    <div className="mt-3 pt-2.5 border-t border-amber-200/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 text-amber-950 font-medium text-center sm:text-left">
                        <span className="text-amber-600 font-bold">✨ ልዩ ዲዛይን:</span>
                        <span>እንደ ፍላጎትዎ እና ልክዎ የተዘጋጀ ባህላዊ ስራ ከባለሙያው ጋር በቀጥታ ማዘዝ ይችላሉ።</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-amber-900 font-semibold shrink-0">
                        <span className="bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200">📏 የግል ልኬት</span>
                        <span className="bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200">✂️ 100% በእጅ የተሰራ</span>
                      </div>
                    </div>
                  </div>

                  {/* Workshop Gallery Section - Only show when valid images exist and hide on error */}
                  {product.artisan?.profile?.workshopGallery?.length > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <span>📸</span>
                          <span>ከስራ ቦታው የተነሱ ፎቶዎች (Workshop)</span>
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">የእጅ ጥበብ ሂደት</span>
                      </div>
                      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                        {product.artisan.profile.workshopGallery.map((img, idx) => (
                          <div key={idx} className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-gray-200 shadow-2xs shrink-0 bg-gray-50">
                            <img 
                              src={getImageUrl(img)} 
                              alt={`Workshop ${idx + 1}`} 
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" 
                              crossOrigin="anonymous"
                              onError={(e) => {
                                e.currentTarget.parentElement.style.display = 'none';
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {activeTab === 'shipping' && (
              <div className="max-w-4xl mx-auto space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  {/* Global Shipping */}
                  <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100/80 space-y-1.5 text-center sm:text-left">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mx-auto sm:mx-0">
                      <TruckIcon className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-gray-900 text-xs sm:text-sm">ፈጣን እና አስተማማኝ ማድረሻ</h4>
                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      በአዲስ አበባ እና በዓለም አቀፍ ደረጃ በ DHL/FedEx Express በጥንቃቄ ታሽጎ በፈጣን ሁኔታ ይደርሳል።
                    </p>
                  </div>

                  {/* Authentic Craft Guarantee */}
                  <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-100/80 space-y-1.5 text-center sm:text-left">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mx-auto sm:mx-0">
                      <ShieldCheckIcon className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-gray-900 text-xs sm:text-sm">100% እውነተኛ የኢትዮጵያ ጥበብ</h4>
                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      እያንዳንዱ ምርት በእውነተኛ የኢትዮጵያ የእጅ ጥበብ ባለሙያዎች የተሰራ እና ጥራቱ የተረጋገጠ ነው።
                    </p>
                  </div>

                  {/* 30-Day Return Guarantee */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100/80 space-y-1.5 text-center sm:text-left">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto sm:mx-0">
                      <ArrowPathIcon className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-gray-900 text-xs sm:text-sm">የ30 ቀናት የመመለሻ ዋስትና</h4>
                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      በምርቱ ካልረኩ ወይም ችግር ካለበት በ30 ቀናት ውስጥ የመመለስ እና ገንዘብዎን የማግኘት ሙሉ ዋስትና።
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

        {/* RELATED PRODUCTS */}
        {product.similarProducts?.length > 0 && (
          <div className="mt-12 sm:mt-16">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 className="text-[10px] font-black text-ethiopian-gold uppercase tracking-[0.3em] mb-4">Curated for you</h2>
                <h3 className="text-4xl font-['Playfair_Display',serif] font-black text-gray-900">Similar Treasures</h3>
              </div>
              <button 
                onClick={() => navigate('/products')}
                className="hidden sm:block text-sm font-black text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-all"
              >
                View Collection →
              </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {product.similarProducts.slice(0, 4).map(related => (
                <ProductCard key={related._id} product={related} className="hover:-translate-y-2 transition-transform duration-300" />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ═══ MOBILE ONLY: AliExpress Style Bottom Sticky Bar ═══ */}
      <div className="sm:hidden fixed inset-x-0 bottom-[56px] z-[10001] bg-white border-t border-gray-200/90 px-3 py-2 shadow-[0_-8px_25px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          {/* Store Icon */}
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="flex flex-col items-center justify-center min-w-[38px] text-gray-700 hover:text-black transition-colors"
          >
            <BuildingStorefrontIcon className="w-5 h-5 text-gray-700" />
            <span className="text-[9px] font-medium mt-0.5">Store</span>
          </button>

          {/* Chat Icon */}
          <button
            type="button"
            onClick={() => navigate('/contact-support')}
            className="flex flex-col items-center justify-center min-w-[38px] text-gray-700 hover:text-black transition-colors"
          >
            <ChatBubbleLeftRightIcon className="w-5 h-5 text-gray-700" />
            <span className="text-[9px] font-medium mt-0.5">Chat</span>
          </button>

          {/* Add to Cart Pill Button (AliExpress Style) */}
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex-1 bg-white hover:bg-gray-50 text-gray-950 border border-gray-950 font-bold py-2.5 px-2 rounded-full flex items-center justify-center text-xs tracking-tight transition-all active:scale-[0.97] shadow-2xs whitespace-nowrap"
          >
            <span>{t("product.add_to_cart", "Add to cart")}</span>
          </button>

          {/* Buy Now Pill Button (AliExpress Style Crimson) */}
          <button
            type="button"
            onClick={handleBuyNow}
            className="flex-1 bg-gradient-to-r from-[#FF2853] to-[#FF4B3E] hover:from-[#E61F48] hover:to-[#EB3C2E] text-white font-extrabold py-2.5 px-2 rounded-full flex items-center justify-center text-xs tracking-tight shadow-md shadow-rose-500/25 transition-all active:scale-[0.97] whitespace-nowrap"
          >
            <span>{t("product.buy_now", "Buy now")}</span>
          </button>
        </div>
      </div>

      {/* Mobile spacer so content is not hidden behind sticky bar and bottom nav */}
      <div className="sm:hidden h-[120px]"></div>

      {/* ═══ CULTURAL HERITAGE STORY MODAL ═══ */}
      {isStoryModalOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              e.stopPropagation();
              setIsStoryModalOpen(false);
            }
          }}
          className="fixed inset-0 z-[10005] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-amber-100 overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-800 via-amber-700 to-yellow-700 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0 pr-3">
                <span className="p-2 bg-white/10 rounded-xl text-lg shrink-0">✨</span>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-base sm:text-lg leading-tight truncate">
                    {safeText(product.name, 'Cultural Heritage')}
                  </h3>
                  <p className="text-xs text-amber-100/90 font-medium truncate">
                    {safeText(product.category, 'Craft')} • Authentic Ethiopian Cultural Heritage
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsStoryModalOpen(false);
                }}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
                aria-label="Close"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-gray-700 text-sm flex-1">
              {/* Story / Narrative */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
                  <BookOpenIcon className="w-4 h-4 shrink-0" />
                  <span>The Heritage Story & Narrative</span>
                </div>
                <p className="text-gray-700 leading-relaxed font-normal whitespace-pre-line text-xs sm:text-sm bg-amber-50/50 p-4 rounded-xl border border-amber-100/60">
                  {safeText(product.description, 'Handcrafted with traditional Ethiopian techniques preserved across generations.')}
                </p>
              </div>

              {/* Cultural Significance */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
                  <SparklesIcon className="w-4 h-4 shrink-0" />
                  <span>Cultural Meaning & Tradition</span>
                </div>
                <p className="text-gray-600 leading-relaxed text-xs sm:text-sm">
                  {safeText(
                    product.culturalStory?.significance || product.culturalStory?.history || product.culturalStory,
                    'Each piece embodies deep Ethiopian heritage, reflecting centuries of weaving, sculpting, and artisan mastery practiced by highland communities.'
                  )}
                </p>
              </div>

              {/* Specifications & Craft Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-center">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Crafting Time</p>
                  <p className="text-xs sm:text-sm font-extrabold text-gray-900 mt-0.5">{product.craftingTime || 5} Days</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-center">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Technique</p>
                  <p className="text-xs sm:text-sm font-extrabold text-gray-900 mt-0.5 truncate">{safeText(product.craftsmanshipType, 'Handmade')}</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-center">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Origin</p>
                  <p className="text-xs sm:text-sm font-extrabold text-gray-900 mt-0.5 truncate">{safeText(product.originRegion, 'Ethiopia')}</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-center">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Materials</p>
                  <p className="text-xs sm:text-sm font-extrabold text-gray-900 mt-0.5 truncate">{safeText(product.materials, 'Organic')}</p>
                </div>
              </div>

              {/* Master Artisan Connection */}
              {product.artisan && (
                <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/70">
                  <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-amber-300">
                    {product.artisan?.profile?.storeLogo ? (
                      <img 
                        src={getImageUrl(product.artisan.profile.storeLogo)} 
                        alt="Artisan" 
                        className="w-full h-full object-cover" 
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="w-full h-full bg-amber-200 flex items-center justify-center text-amber-800 font-bold">
                        {safeText(product.artisan?.profile?.storeName || product.artisan?.name || product.artisan?.profile?.firstName || 'A')[0]}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                      Crafted by {safeText(product.artisan?.profile?.storeName || product.artisan?.profile?.firstName || product.artisan?.name, 'Master Artisan')}
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      {product.artisan?.profile?.experienceYears ?? 5}+ Years of Traditional Heritage Preservation
                    </p>
                  </div>
                  {product.artisan?._id && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsStoryModalOpen(false);
                        navigate(`/artisan/${product.artisan._id}`);
                      }}
                      className="shrink-0 text-xs font-bold text-amber-800 hover:text-amber-900 px-3 py-1.5 bg-white rounded-lg border border-amber-200 shadow-2xs hover:bg-amber-50 transition-colors cursor-pointer"
                    >
                      Profile →
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsStoryModalOpen(false);
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ALIEXPRESS STYLE VERIFIED REVIEWS MODAL / DRAWER ═══ */}
      {isReviewsModalOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              e.stopPropagation();
              setIsReviewsModalOpen(false);
            }
          }}
          className="fixed inset-0 z-[10006] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[85vh] sm:max-h-[88vh] overflow-hidden"
          >
            {/* Drawer Drag handle for mobile */}
            <div className="sm:hidden flex justify-center pt-2 pb-1">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
            </div>

            {/* Modal Header - Mobile-First Clean Amharic */}
            <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h3 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-1.5">
                  <span>ግምገማዎች እና አስተያየቶች</span>
                  <span className="text-gray-400 font-normal text-xs">(Reviews)</span>
                </h3>
                <div className="flex items-center gap-1 text-[11px] sm:text-xs text-gray-600 mt-0.5">
                  <span className="font-extrabold text-amber-600 text-xs">
                    {product.metrics?.averageRating?.toFixed(1) || '5.0'}
                  </span>
                  <span className="text-amber-400 text-xs">★</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-700 font-medium">
                    {allReviews.length || product.metrics?.reviewCount || 0} የተረጋገጡ ግምገማዎች
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsReviewsModalOpen(false);
                }}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-800 transition-colors cursor-pointer shrink-0"
                aria-label="Close"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Filters Row (AliExpress Style - Responsive & Mobile-Compact) */}
            <div className="px-3 sm:px-4 py-2 bg-gray-50/90 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px] shrink-0">
              {/* Sort selector */}
              <select
                value={reviewsSortBy}
                onChange={(e) => setReviewsSortBy(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-gray-700 outline-none hover:border-gray-400 cursor-pointer shadow-2xs shrink-0"
              >
                <option value="default">ቅደም ተከተል ⌵</option>
                <option value="highest">ከፍተኛ ደረጃ (Highest)</option>
                <option value="lowest">ዝቅተኛ ደረጃ (Lowest)</option>
                <option value="recent">የቅርብ ጊዜ (Recent)</option>
              </select>

              {/* Rating filter */}
              <select
                value={reviewsRatingFilter}
                onChange={(e) => setReviewsRatingFilter(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-gray-700 outline-none hover:border-gray-400 cursor-pointer shadow-2xs shrink-0"
              >
                <option value="all">ደረጃ ⌵</option>
                <option value="5">5 ★ ({allReviews.filter(r => Number(r.rating) === 5).length})</option>
                <option value="4">4 ★ ({allReviews.filter(r => Number(r.rating) === 4).length})</option>
                <option value="3">3 ★ ({allReviews.filter(r => Number(r.rating) === 3).length})</option>
                <option value="2">2 ★ ({allReviews.filter(r => Number(r.rating) === 2).length})</option>
                <option value="1">1 ★ ({allReviews.filter(r => Number(r.rating) === 1).length})</option>
              </select>

              {/* Country filter: All Countries */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setReviewsCountryFilter('all');
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors border cursor-pointer shrink-0 ${
                  reviewsCountryFilter === 'all'
                    ? 'bg-gray-900 text-white border-gray-900 shadow-2xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                }`}
              >
                🌍 ሁሉም ({allReviews.length})
              </button>

              {/* Country filter: Ethiopia */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setReviewsCountryFilter(reviewsCountryFilter === 'ET' ? 'all' : 'ET');
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors border flex items-center gap-1 cursor-pointer shrink-0 ${
                  reviewsCountryFilter === 'ET'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                }`}
              >
                <span>🇪🇹</span>
                <span>ኢትዮጵያ ({ethiopiaReviewCount})</span>
              </button>

              {/* Write Review Button Toggle */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setIsWritingReview(!isWritingReview);
                }}
                className={`ml-auto px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 border ${
                  isWritingReview
                    ? 'text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100'
                    : 'text-amber-900 bg-amber-100/90 border-amber-300/80 hover:bg-amber-200'
                }`}
              >
                {isWritingReview ? '✕ ሰርዝ (Cancel)' : '✍️ አስተያየት ጻፍ'}
              </button>
            </div>

            {/* Collapsible Write Review Form - Modern Compact Mobile Design */}
            {isWritingReview && (
              <div className="p-3 sm:p-4 bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-yellow-50/60 border-b border-amber-200/70">
                <form onSubmit={handleSubmitReview} className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
                      <span>የእርስዎ ደረጃ:</span>
                      <span className="text-[10px] text-gray-500 font-normal">(Rating)</span>
                    </span>
                    <div className="flex text-base">{renderStars(reviewRating, true)}</div>
                  </div>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="ስለዚህ የእጅ ጥበብ ምርት ያለዎትን እውነተኛ አስተያየት እዚህ ያጋሩ (ቢያንስ 10 ፊደላት)..."
                    rows="2"
                    className="w-full p-2 bg-white border border-amber-200/90 rounded-xl text-xs text-gray-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none placeholder:text-gray-400 shadow-2xs"
                  />
                  <div className="flex justify-end gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsWritingReview(false);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-white/80 rounded-lg cursor-pointer border border-transparent hover:border-gray-200 transition-colors"
                    >
                      ሰርዝ
                    </button>
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="px-3.5 py-1 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      {submittingReview ? 'በመላክ ላይ...' : '✓ አስተያየት ላክ'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Modal Body / Review Items List */}
            <div className="p-3 sm:p-4 overflow-y-auto space-y-3.5 flex-1 bg-white">
              {filteredReviews.length > 0 ? (
                filteredReviews.map((review, idx) => {
                  const reviewKey = review._id || idx;
                  const country = getReviewCountry(review, idx);
                  const safeComment = safeText(review.comment);
                  const isCommentLong = safeComment.length > 90;
                  const isExpanded = !!expandedReviews[reviewKey];

                  return (
                    <div
                      key={reviewKey}
                      className="pb-3 border-b border-gray-100 last:border-b-0 space-y-1"
                    >
                      {/* Top: Stars, User Name, Flag, Date */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* 5-star display */}
                          <div className="flex text-amber-400 text-xs">
                            {[1, 2, 3, 4, 5].map(s => (
                              <span key={s}>
                                {s <= (Number(review.rating) || 5) ? '★' : '☆'}
                              </span>
                            ))}
                          </div>
                          <span className="font-bold text-gray-900 text-xs">
                            {maskUserName(review.userName)}, {country.flag}
                          </span>
                          <span className="text-gray-400 text-[10px]">
                            {new Date(review.createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                          የተረጋገጠ ግዢ
                        </span>
                      </div>

                      {/* Variant Spec Line */}
                      <p className="text-[10px] text-gray-400">
                        ቀለም: {safeText(filters.color, 'ባህላዊ')} • መጠን: {safeText(filters.size, 'መደበኛ')} • በእጅ የተሰራ
                      </p>

                      {/* Comment text with Truncation (> 1.5 lines / 90 chars) */}
                      <div className="text-xs text-gray-800 leading-relaxed">
                        {isCommentLong && !isExpanded ? (
                          <p>
                            "{safeComment.slice(0, 90)}..."
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleExpandReview(reviewKey);
                              }}
                              className="text-amber-800 font-bold underline ml-1 hover:text-amber-900 cursor-pointer text-[11px]"
                            >
                              ሙሉውን አንብብ (Detail)
                            </button>
                          </p>
                        ) : isCommentLong && isExpanded ? (
                          <p>
                            "{safeComment}"
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleExpandReview(reviewKey);
                              }}
                              className="text-gray-400 font-medium underline ml-1 hover:text-gray-600 cursor-pointer text-[10px]"
                            >
                              አሳንስ (Collapse)
                            </button>
                          </p>
                        ) : (
                          <p>"{safeComment}"</p>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-gray-400 space-y-2">
                  <SparklesIcon className="w-8 h-8 text-amber-300 mx-auto" />
                  <p className="text-xs font-medium text-gray-500">በተመረጠው መስፈርት የተገኘ አስተያየት የለም።</p>
                  {allReviews.length === 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsWritingReview(true);
                      }}
                      className="mt-2 text-xs font-bold text-amber-700 underline cursor-pointer"
                    >
                      የመጀመሪያውን አስተያየት ይስጡ! (Be first to review)
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Modal Bottom note */}
            <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 shrink-0">
              <span>ⓘ ከዓለም ዙሪያ ከተረጋገጡ ደንበኞች የተሰጠ አስተያየት</span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsReviewsModalOpen(false);
                }}
                className="text-xs font-bold text-gray-800 hover:text-black cursor-pointer"
              >
                ዝጋ (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;