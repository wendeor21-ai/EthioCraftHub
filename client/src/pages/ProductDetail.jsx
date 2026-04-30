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
  CheckCircleIcon
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
  const [activeTab, setActiveTab] = useState('description'); // description, specs, reviews

  // Review state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);

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
        reviews: [...(prev.reviews || []), response.data.review],
        metrics: {
          ...prev.metrics,
          averageRating: response.data.averageRating,
          reviewCount: response.data.reviewCount
        }
      }));
      setReviewComment('');
      setReviewRating(5);
      toast.success('Review submitted!');
    } catch (err) {
      toast.error('Failed to submit review');
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
            <span>{t('Back')}</span>
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-16">
          
          {/* LEFT SIDE: Image Gallery (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="relative group aspect-square rounded-3xl overflow-hidden bg-white shadow-xl shadow-gray-200/50 border border-gray-100">
              {/* Dual View Interaction Logic */}
              {(() => {
                const frontImg = product.images?.find(img => img.viewType === 'front');
                const backImg = product.images?.find(img => img.viewType === 'back');
                const currentImg = productImages[selectedImage];
                
                // If the selected image is the Front one and there's a Back one, enable the toggle
                const isSelectedFront = frontImg && getImageUrl(frontImg.url) === currentImg;
                const isSelectedBack = backImg && getImageUrl(backImg.url) === currentImg;
                
                return (
                  <>
                    <img
                      src={currentImg}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        e.target.src = '/images/gondar_drass1.jpg';
                        e.target.onerror = null;
                      }}
                    />
                    
                    {/* View Badge */}
                    <div className="absolute top-6 left-6 flex flex-col gap-2">
                      {hasDiscount && (
                        <div className="px-4 py-2 bg-red-600 text-white text-[10px] font-black rounded-full shadow-lg uppercase tracking-widest">
                          -{discount}%
                        </div>
                      )}
                      {(isSelectedFront || isSelectedBack) && (
                        <div className="px-4 py-2 bg-ethiopian-gold/90 backdrop-blur-md text-white text-[10px] font-black rounded-full shadow-lg uppercase tracking-widest border border-white/20">
                          {isSelectedFront ? 'Front View' : 'Back Detail'}
                        </div>
                      )}
                    </div>

                    {/* Interactive Toggle for Front/Back */}
                    {(frontImg && backImg) && (isSelectedFront || isSelectedBack) && (
                      <div className="absolute inset-x-0 bottom-8 flex justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const target = isSelectedFront ? backImg : frontImg;
                            const targetIdx = productImages.findIndex(img => img === getImageUrl(target.url));
                            if (targetIdx !== -1) setSelectedImage(targetIdx);
                          }}
                          className="px-6 py-3 bg-gray-900/90 backdrop-blur-xl text-white text-[10px] font-black rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10 hover:bg-black transition-all hover:scale-105 ring-4 ring-white/5"
                        >
                          <ArrowPathIcon className="w-4 h-4 text-ethiopian-gold" />
                          <span>SWITCH TO {isSelectedFront ? 'BACK' : 'FRONT'} VIEW</span>
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}

              <button 
                onClick={handleToggleWishlist}
                className="absolute top-6 right-6 p-3 bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:scale-110 transition-all z-10"
              >
                {isInWishlist(product._id) ? (
                  <HeartSolidIcon className="w-6 h-6 text-red-500" />
                ) : (
                  <HeartIcon className="w-6 h-6 text-gray-900" />
                )}
              </button>
            </div>

            {/* Thumbnails */}
            {productImages.length > 1 && (
              <div className="flex gap-4 overflow-x-auto py-2 no-scrollbar scroll-smooth">
                {productImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`flex-shrink-0 w-20 sm:w-24 aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                      selectedImage === idx 
                        ? 'border-ethiopian-gold ring-4 ring-ethiopian-gold/10' 
                        : 'border-white hover:border-gray-200 shadow-sm'
                    }`}
                  >
                    <img src={img} className="w-full h-full object-cover" crossOrigin="anonymous" alt={`${product.name} - view ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT SIDE: Product Details & Purchase Actions (lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-ethiopian-gold/10 text-ethiopian-gold text-[10px] font-bold uppercase tracking-widest rounded-full">
                  {product.category}
                </span>
                <div className="flex items-center gap-1 border-l border-gray-200 pl-3">
                  <StarSolidIcon className="w-4 h-4 text-[#fbbf24]" />
                  <span className="text-sm font-bold text-gray-900">{product.metrics?.averageRating?.toFixed(1) || '5.0'}</span>
                  <span className="text-xs text-gray-500 font-medium ml-1">({product.metrics?.reviewCount || 0} reviews)</span>
                </div>
              </div>

              <h1 className="text-3xl sm:text-4xl font-['Playfair_Display',serif] font-black text-gray-900 mb-4 leading-tight">
                {product.name}
              </h1>

              <div className="flex items-baseline gap-4 mb-4">
                <span className="text-4xl font-bold text-gray-900 tracking-tight">
                  {formatCurrency(selectedVariant ? selectedVariant.price : product.price)}
                </span>
                {(selectedVariant?.comparePrice || product.comparePrice) && (
                  <span className="text-xl text-gray-400 line-through font-medium">
                    {formatCurrency(selectedVariant?.comparePrice || product.comparePrice)}
                  </span>
                )}
              </div>

              <p className="text-gray-600 leading-relaxed text-base italic border-l-2 border-ethiopian-gold/30 pl-4 mb-6">
                "{product.shortDescription || `Authentic ${product.category} handcrafted with centuries-old techniques.`}"
              </p>
            </div>

            {/* Selection Options */}
            <div className="space-y-6 mb-8 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              {/* Variations - Color/Size */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {availableColors.length > 0 && (
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-3">Color</label>
                    <div className="flex flex-wrap gap-2">
                      {availableColors.map(color => (
                        <button
                          key={color}
                          onClick={() => setFilters(prev => ({ ...prev, color }))}
                          className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                            filters.color === color
                              ? 'border-ethiopian-gold bg-ethiopian-gold/5 text-ethiopian-gold'
                              : 'border-gray-100 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {availableSizes.length > 0 && (
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-3">Size</label>
                    <div className="flex flex-wrap gap-2">
                      {availableSizes.map(size => {
                        const variantForSize = product.variations.find(v => v.size === size);
                        const hasPriceDiff = variantForSize && variantForSize.price !== product.price;
                        
                        return (
                          <button
                            key={size}
                            onClick={() => setFilters(prev => ({ ...prev, size }))}
                            className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all flex flex-col items-center ${
                              filters.size === size
                                ? 'border-ethiopian-gold bg-ethiopian-gold/5 text-gray-900'
                                : 'border-gray-100 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            <span>{size}</span>
                            {hasPriceDiff && (
                              <span className="text-[10px] font-bold text-ethiopian-gold">
                                {formatCurrency(variantForSize.price)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Options */}
              {product.options?.map((opt, idx) => (
                <div key={idx}>
                  <label className="block text-sm font-bold text-gray-900 mb-3">{opt.name}</label>
                  <div className="flex flex-wrap gap-2">
                    {opt.values.map(val => (
                      <button
                        key={val}
                        onClick={() => setSelectedOptions(prev => ({ ...prev, [opt.name]: val }))}
                        className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                          selectedOptions[opt.name] === val
                            ? 'border-ethiopian-gold bg-ethiopian-gold/5 text-ethiopian-gold'
                            : 'border-gray-100 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Quantity Selector */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <span className="text-sm font-bold text-gray-900 uppercase tracking-wider">Quantity</span>
                <div className="flex items-center bg-gray-50 p-1 rounded-2xl border border-gray-100">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center text-gray-900 font-bold hover:text-ethiopian-gold transition-colors"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-bold text-gray-900">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center text-gray-900 font-bold hover:text-ethiopian-gold transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="flex flex-col gap-4 mb-8">
              <button
                onClick={handleAddToCart}
                className="w-full bg-[#1e293b] text-white font-black py-5 rounded-3xl hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-gray-200"
              >
                <ShoppingBagIcon className="w-6 h-6" />
                <span className="uppercase tracking-widest text-sm">Add to Cart</span>
              </button>
              <button
                onClick={handleBuyNow}
                className="w-full bg-ethiopian-gold hover:bg-amber-600 text-white font-black py-5 rounded-3xl transition-all shadow-xl shadow-amber-100"
              >
                <span className="uppercase tracking-widest text-sm">Buy Now</span>
              </button>
            </div>

            {/* High-end Product Summary / Metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-gray-100">
                <MapPinIcon className="w-6 h-6 text-ethiopian-gold shrink-0" />
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Region</h4>
                  <p className="text-sm font-bold text-gray-900">{product.originRegion || 'Highland Ethiopia'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-gray-100">
                <BeakerIcon className="w-6 h-6 text-ethiopian-gold shrink-0" />
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Material</h4>
                  <p className="text-sm font-bold text-gray-900">{product.materials || 'Organic Textiles'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-gray-100">
                <CheckBadgeIcon className="w-6 h-6 text-ethiopian-gold shrink-0" />
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Craft</h4>
                  <p className="text-sm font-bold text-gray-900">{product.category || 'Traditional Craft'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-gray-100">
                <TruckIcon className="w-6 h-6 text-ethiopian-gold shrink-0" />
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global</h4>
                  <p className="text-sm font-bold text-gray-900">Tracked Shipping</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Detailed Info & Community */}
        <div className="mt-20">
          <div className="flex flex-wrap gap-1 mb-10 p-1 bg-gray-100/50 rounded-2xl w-fit">
            {['description', 'artisan', 'reviews', 'shipping'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'description' ? 'Product Story' : 
                 tab === 'artisan' ? 'The Artisan' : 
                 tab === 'reviews' ? `Community Reviews (${product.reviews?.length || 0})` : 
                 'Shipping & Delivery'}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-[3rem] p-8 sm:p-12 border border-gray-100 shadow-sm min-h-[400px]">
            {activeTab === 'description' && (
              <div className="max-w-4xl mx-auto">
                <div className="relative mb-12">
                   <span className="absolute -top-10 -left-6 text-8xl font-serif text-ethiopian-gold/10 pointer-events-none">"</span>
                   <h2 className="text-4xl font-['Playfair_Display',serif] font-black text-gray-900 mb-8 relative z-10">Historical Significance & Heritage</h2>
                   <p className="text-xl text-gray-600 leading-relaxed font-['Inter',sans-serif]">
                     {product.description}
                   </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-16">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-amber-50 rounded-2xl">
                        <BookOpenIcon className="w-6 h-6 text-ethiopian-gold" />
                      </div>
                      <h3 className="text-xl font-black text-gray-900">Cultural Story</h3>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      {product.culturalStory?.significance || "Each piece tells a unique story of Ethiopian tradition, preserving techniques passed down through generations."}
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-amber-50 rounded-2xl">
                        <SparklesIcon className="w-6 h-6 text-ethiopian-gold" />
                      </div>
                      <h3 className="text-xl font-black text-gray-900">Master Craftsmanship</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { label: 'Crafting Time', value: `${product.craftingTime || 5} days` },
                        { label: 'Primary Technique', value: product.craftsmanshipType || 'Handmade' },
                        { label: 'Materials', value: product.materials || 'Organic Mix' },
                        { label: 'Region', value: product.originRegion || 'Highland Ethiopia' }
                      ].map((item, i) => (
                        <div key={i} className="flex justify-between py-3 border-b border-gray-50 last:border-b-0">
                          <span className="text-gray-500 font-medium">{item.label}</span>
                          <span className="text-gray-900 font-bold">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'artisan' && (
              <div className="max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-12">
                  {/* Clickable Artisan Avatar → navigates to artisan profile */}
                  <div className="shrink-0">
                    <button
                      onClick={() => product.artisan?._id && navigate(`/artisan/${product.artisan._id}`)}
                      className="relative group focus:outline-none"
                      title="View artisan profile"
                    >
                      <div className="w-48 h-48 rounded-[3rem] overflow-hidden border-4 border-white shadow-2xl ring-4 ring-transparent group-hover:ring-ethiopian-gold/30 transition-all duration-300">
                        {product.artisan?.profile?.image ? (
                           <img 
                            src={getImageUrl(product.artisan.profile.image)} 
                            alt={product.artisan.profile.firstName} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                           />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-ethiopian-gold/20 to-orange-100 flex items-center justify-center">
                            <UserCircleIcon className="w-24 h-24 text-ethiopian-gold/40" />
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-4 -right-4 p-4 bg-white rounded-full shadow-lg border border-gray-100">
                        <CheckBadgeIcon className="w-8 h-8 text-ethiopian-gold" />
                      </div>
                      {/* Hover overlay */}
                      <div className="absolute inset-0 rounded-[3rem] bg-ethiopian-gold/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <span className="text-xs font-black text-ethiopian-gold bg-white/90 px-3 py-1 rounded-full shadow-sm translate-y-4 group-hover:translate-y-0 transition-transform duration-300">View Profile</span>
                      </div>
                    </button>
                  </div>

                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-[10px] font-black text-ethiopian-gold uppercase tracking-[0.3em] mb-4">Master artisan</h2>
                    {/* Clickable Artisan Name → navigates to artisan profile */}
                    <button
                      onClick={() => product.artisan?._id && navigate(`/artisan/${product.artisan._id}`)}
                      className="text-left group focus:outline-none"
                    >
                      <h3 className="text-4xl font-['Playfair_Display',serif] font-black text-gray-900 mb-4 group-hover:text-ethiopian-gold transition-colors duration-200 underline-offset-4 group-hover:underline decoration-ethiopian-gold/40">
                        {product.artisan?.profile?.firstName ? `${product.artisan.profile.firstName} ${product.artisan.profile.lastName}` : (product.artisan?.name || 'Traditional Artisan')}
                      </h3>
                    </button>
                    <p className="text-gray-600 text-lg leading-relaxed mb-8 max-w-2xl">
                      {product.artisan?.profile?.bio || `A master of ${product.category} from the ${product.originRegion || 'highland'} region, dedicated to preserving Ethiopia's artistic heritage through unmatched craftsmanship.`}
                    </p>
                    
                    <div className="flex flex-wrap justify-center md:justify-start gap-6 mb-8">
                      <div>
                        <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">experience</span>
                        <span className="text-xl font-bold text-gray-900">15+ Years</span>
                      </div>
                      <div className="w-[1px] h-10 bg-gray-200 hidden sm:block"></div>
                      <div>
                        <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">products</span>
                        <span className="text-xl font-bold text-gray-900">400+ Pieces</span>
                      </div>
                      <div className="w-[1px] h-10 bg-gray-200 hidden sm:block"></div>
                      <div>
                        <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Impact</span>
                        <span className="text-xl font-bold text-gray-900">Preserved 4 Traditions</span>
                      </div>
                    </div>

                    {/* CTA to View Full Artisan Profile */}
                    {product.artisan?._id && (
                      <button
                        onClick={() => navigate(`/artisan/${product.artisan._id}`)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-ethiopian-gold text-white font-bold text-sm rounded-2xl hover:bg-amber-600 transition-all shadow-md shadow-amber-100 hover:shadow-amber-200 hover:-translate-y-0.5"
                      >
                        <UserCircleIcon className="w-5 h-5" />
                        View Full Profile & Order Custom Design
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="max-w-4xl mx-auto space-y-12">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-8 pb-12 border-b border-gray-100">
                  <div className="text-center sm:text-left">
                    <div className="text-7xl font-['Playfair_Display',serif] font-black text-gray-900 mb-2">
                      {product.metrics?.averageRating?.toFixed(1) || '5.0'}
                    </div>
                    {renderStars(Math.round(product.metrics?.averageRating || 5))}
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-2">Verified global feedback</div>
                  </div>
                  
                  <div className="flex-1 w-full max-w-sm space-y-3">
                    {[5, 4, 3, 2, 1].map(lvl => (
                      <div key={lvl} className="flex items-center gap-4">
                        <span className="text-xs font-bold text-gray-500 w-4">{lvl}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-ethiopian-gold" 
                            style={{ width: `${lvl === 5 ? 85 : lvl === 4 ? 12 : 1}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {!user ? (
                    <button onClick={() => navigate('/login')} className="px-8 py-4 border-2 border-gray-900 text-gray-900 font-black rounded-2xl hover:bg-gray-900 hover:text-white transition-all text-sm uppercase tracking-widest">
                       Login to review
                    </button>
                  ) : null}
                </div>

                <div className="space-y-10">
                  {(product.reviews || []).length > 0 ? (
                    (product.reviews || []).map((review, idx) => (
                      <div key={idx} className="group">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-xl font-black text-gray-400 group-hover:bg-ethiopian-gold group-hover:text-white transition-all">
                              {review.userName?.[0] || 'A'}
                            </div>
                            <div>
                               <h4 className="font-bold text-gray-900">{review.userName || 'Verified Buyer'}</h4>
                               <p className="text-xs text-gray-400 font-medium">{new Date(review.createdAt).toLocaleDateString()} • Verified Purchase</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {renderStars(review.rating)}
                          </div>
                        </div>
                        <p className="text-gray-600 leading-relaxed pl-18 md:pl-18">{review.comment}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-20 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                       <SparklesIcon className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                       <p className="text-gray-400 font-medium underline underline-offset-4 decoration-ethiopian-gold/20">No reviews yet. Be the first to share your experience.</p>
                    </div>
                  )}
                </div>

                {user && (
                  <div className="mt-16 bg-gray-50 p-8 sm:p-10 rounded-[3rem] border border-gray-100 transition-all focus-within:shadow-2xl focus-within:shadow-gray-200">
                    <h4 className="text-2xl font-['Playfair_Display',serif] font-black text-gray-900 mb-6">Leave Your Impression</h4>
                    <form onSubmit={handleSubmitReview} className="space-y-8">
                      <div>
                        <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Rating</div>
                        {renderStars(reviewRating, true)}
                      </div>
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 block">Your Review</label>
                        <textarea
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="What makes this piece special to you?"
                          rows="4"
                          className="w-full p-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-ethiopian-gold/10 focus:border-ethiopian-gold outline-none transition-all placeholder:text-gray-300"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={submittingReview}
                        className="bg-gray-900 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-black transition-all disabled:opacity-50 shadow-xl shadow-gray-200"
                      >
                        {submittingReview ? 'Submitting...' : 'Post Review'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'shipping' && (
              <div className="max-w-4xl mx-auto">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                    <div className="space-y-8">
                       <div className="flex items-center gap-4">
                          <div className="p-4 bg-blue-50 rounded-2xl"><TruckIcon className="w-8 h-8 text-blue-600" /></div>
                          <h3 className="text-2xl font-black text-gray-900">Global Shipping</h3>
                       </div>
                       <p className="text-gray-600 leading-relaxed">
                         We ship our authentic crafts globally from Addis Ababa. Each piece is carefully packed with traditional protective techniques and modern eco-friendly materials to ensure it reaches you in pristine condition.
                       </p>
                       <ul className="space-y-4">
                          {['DHL & FedEx Express options', 'Insured carbon-neutral delivery', 'Real-time tracking available'].map((li, i) => (
                            <li key={i} className="flex items-center gap-3 text-sm font-bold text-gray-700">
                               <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                               <span>{li}</span>
                            </li>
                          ))}
                       </ul>
                    </div>

                    <div className="space-y-8">
                       <div className="flex items-center gap-4">
                          <div className="p-4 bg-orange-50 rounded-2xl"><ArrowPathIcon className="w-8 h-8 text-orange-600" /></div>
                          <h3 className="text-2xl font-black text-gray-900">Returns Policy</h3>
                       </div>
                       <p className="text-gray-600 leading-relaxed">
                         Your satisfaction is paramount. If your purchase doesn't meet your expectations for any reason, we offer a dedicated return window.
                       </p>
                       <div className="p-6 bg-orange-50/50 rounded-3xl border border-orange-100">
                          <h4 className="font-bold text-orange-900 mb-2">30-Day Window</h4>
                          <p className="text-sm text-orange-800/80">Items must be in original condition with all artisan tags intact. Custom-made orders may have restricted return terms.</p>
                       </div>
                    </div>
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* RELATED PRODUCTS */}
        {product.similarProducts?.length > 0 && (
          <div className="mt-32">
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
    </div>
  );
};


export default ProductDetail;