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
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon
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

    if (productImages.length > 1) {
      setSelectedImage(index % productImages.length);
    }
  };

  useEffect(() => {
    if (availableColors.length > 0 && !filters.color) {
      setFilters(prev => ({ ...prev, color: availableColors[0] }));
    }
    if (availableSizes.length > 0 && !filters.size) {
      setFilters(prev => ({ ...prev, size: availableSizes[0] }));
    }
  }, [product]);

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
      <div className="relative mt-12 md:mt-0">
        <div className="md:max-w-7xl md:mx-auto md:px-4 md:py-6">
          <div className="md:grid md:grid-cols-2 md:gap-8 lg:gap-12">
            
            {/* Image Section */}
            <div className="md:col-span-1">
              <div 
                onClick={handleNextImage}
                className="aspect-square max-h-[300px] sm:max-h-[360px] md:max-h-none mx-auto w-full bg-gray-50 relative overflow-hidden md:rounded-2xl shadow-xs group cursor-pointer select-none"
                title={productImages.length > 1 ? "Click to view next photo" : product.name}
              >
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
                
                {/* Badges */}
                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10 pointer-events-none">
                  {hasDiscount && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                      -{discount}% OFF
                    </span>
                  )}
                  <span className="bg-ethiopian-gold text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                    Authentic
                  </span>
                </div>

                {/* Desktop Wishlist Button */}
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleToggleWishlist(); }}
                  className="hidden md:flex absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-md rounded-full shadow-sm hover:scale-105 transition-all border border-gray-100 z-10"
                >
                  {isInWishlist(product._id) ? (
                    <HeartSolidIcon className="w-4 h-4 text-red-500" />
                  ) : (
                    <HeartIcon className="w-4 h-4 text-gray-900" />
                  )}
                </button>

                {/* Navigation Arrows on Main Photo */}
                {productImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/80 hover:bg-white text-gray-800 shadow-md backdrop-blur-xs transition-all hover:scale-110 z-10"
                      aria-label="Previous photo"
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/80 hover:bg-white text-gray-800 shadow-md backdrop-blur-xs transition-all hover:scale-110 z-10"
                      aria-label="Next photo"
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>

                    <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white px-2.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 shadow-sm pointer-events-none z-10">
                      <span>{selectedImage + 1} / {productImages.length}</span>
                      <span className="text-white/40">•</span>
                      <span className="text-[9px] text-amber-200">Click photo</span>
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnail Strip */}
              {productImages.length > 1 && (
                <div className="flex gap-2 p-2 sm:p-3 overflow-x-auto md:gap-2.5 md:p-0 md:mt-3 scrollbar-hide">
                  {productImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImage(idx)}
                      className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImage === idx 
                          ? 'border-ethiopian-gold shadow-xs ring-2 ring-amber-500/20' 
                          : 'border-gray-200 hover:border-gray-300 opacity-75 hover:opacity-100'
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
              <div className="px-3.5 py-3 space-y-3 md:px-0 md:py-0 md:space-y-3.5">
                {/* Top Meta Strip */}
                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                  <span className="text-[10px] font-extrabold text-ethiopian-gold uppercase tracking-wider bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded">
                    {product.category}
                  </span>
                  <div className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded-md border border-gray-100">
                    <StarSolidIcon className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-xs font-bold text-gray-900">
                      {product.metrics?.averageRating?.toFixed(1) || '5.0'}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      ({product.metrics?.reviewCount || 0})
                    </span>
                  </div>
                </div>

                {/* Compact Horizontal Hero Card: Title (Left) + Price (Right) */}
                <div className="bg-gradient-to-r from-amber-50/40 via-amber-50/20 to-gray-50 rounded-xl p-3 border border-amber-100/80 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="min-w-0 flex-1">
                    <h1 className="text-sm sm:text-base font-bold text-gray-900 leading-snug line-clamp-2">
                      {product.name}
                    </h1>
                    {product.artisan?.shopName && (
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        By <span className="font-semibold text-gray-700">{product.artisan.shopName}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0 text-right bg-white px-2.5 py-1.5 rounded-lg border border-amber-200/80 shadow-2xs">
                    <div className="text-base sm:text-lg font-black text-amber-900 tracking-tight whitespace-nowrap">
                      {formatCurrency((selectedVariant ? selectedVariant.price : product.price) * quantity)}
                    </div>
                    {(selectedVariant?.comparePrice || product.comparePrice) && (
                      <div className="text-[10px] text-gray-400 line-through font-medium">
                        {formatCurrency((selectedVariant?.comparePrice || product.comparePrice) * quantity)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Color Selection Card */}
                {availableColors.length > 0 && (
                  <div className="bg-gray-50/80 rounded-xl p-2.5 border border-gray-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <span>Color / ቀለም:</span>
                        <span className="text-gray-900 font-extrabold normal-case bg-white px-1.5 py-0.5 rounded border border-gray-200 text-[11px]">
                          {filters.color || availableColors[0]}
                        </span>
                      </h3>
                      <span className="text-[10px] text-gray-400">{availableColors.length} options</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {availableColors.map((color, idx) => {
                        const isSelected = filters.color === color;
                        const colorHex = getColorHex(color);
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => handleColorClick(color, idx)}
                            className={`group relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                              isSelected
                                ? 'border-2 border-amber-600 bg-amber-50/95 text-amber-950 font-bold shadow-2xs ring-2 ring-amber-500/20'
                                : 'border border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                            }`}
                          >
                            <span
                              className="w-3 h-3 rounded-full border border-black/15 shadow-2xs flex-shrink-0"
                              style={{ backgroundColor: colorHex }}
                            />
                            <span>{color}</span>
                            {isSelected && (
                              <CheckIcon className="w-3 h-3 text-amber-600 stroke-[3]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Size Selection */}
                {availableSizes.length > 0 && (
                  <div className="bg-gray-50/80 rounded-xl p-2.5 border border-gray-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <span>Size / መጠን:</span>
                        <span className="text-gray-900 font-extrabold normal-case bg-white px-1.5 py-0.5 rounded border border-gray-200 text-[11px]">
                          {filters.size || availableSizes[0]}
                        </span>
                      </h3>
                      <span className="text-[10px] text-gray-400">{availableSizes.length} sizes</span>
                    </div>
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-1.5">
                      {availableSizes.map(size => {
                        const isSelected = filters.size === size;
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setFilters(prev => ({ ...prev, size }))}
                            className={`py-1.5 px-2 rounded-lg border text-xs font-semibold text-center transition-all ${
                              isSelected
                                ? 'border-2 border-amber-600 bg-amber-50/95 text-amber-950 shadow-2xs font-extrabold ring-2 ring-amber-500/20'
                                : 'border border-gray-200 text-gray-700 hover:border-gray-400 bg-white'
                            }`}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div className="flex items-center justify-between py-1.5 bg-gray-50/80 px-3 rounded-lg border border-gray-100">
                  <h3 className="text-xs font-bold text-gray-900">Quantity / ብዛት</h3>
                  <div className="flex items-center bg-white rounded-md border border-gray-200 shadow-2xs">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-50 rounded-l-md transition-colors font-bold text-sm"
                    >
                      -
                    </button>
                    <span className="px-3 font-bold text-gray-900 text-xs min-w-[28px] text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-50 rounded-r-md transition-colors font-bold text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Action Buttons - Desktop only (mobile gets sticky bar below) */}
                <div className="hidden md:flex gap-3 pt-1">
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 bg-gray-900 text-white font-bold py-2.5 px-4 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-1.5 text-xs sm:text-sm shadow-sm active:scale-[0.98]"
                  >
                    <ShoppingCartIcon className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </button>
                  <button
                    onClick={handleBuyNow}
                    className="flex-1 bg-gradient-to-r from-ethiopian-gold to-amber-500 text-white font-bold py-2.5 px-4 rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all text-xs sm:text-sm shadow-sm active:scale-[0.98]"
                  >
                    <span>Buy Now</span>
                  </button>
                </div>

                {/* Custom Tailoring / Sizing CTA */}
                {product.artisan && (
                  <button
                    type="button"
                    onClick={() => navigate('/custom-order', {
                      state: {
                        artisanId: product.artisan?._id || product.artisan?.id || product.artisan,
                        productId: product._id,
                        productName: product.name
                      }
                    })}
                    className="w-full py-2 px-3 bg-amber-50/80 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <span>✂️ ይህን ዲዛይን በራስዎ ልክ ያሰፉ (Order Custom Tailored)</span>
                  </button>
                )}

                {/* Description Preview */}
                <div className="space-y-1.5 pt-2.5 border-t border-gray-100">
                  <h3 className="text-xs font-bold text-gray-900">Description / መግለጫ</h3>
                  <div className="relative">
                    <p className={`text-gray-600 leading-relaxed text-xs ${showFullDescription ? '' : 'line-clamp-3'}`}>
                      {product.description}
                    </p>
                    {product.description && product.description.length > 150 && (
                      <button
                        onClick={() => setShowFullDescription(!showFullDescription)}
                        className="text-ethiopian-gold font-semibold text-xs mt-1 flex items-center gap-0.5 hover:text-amber-600 transition-colors"
                      >
                        {showFullDescription ? 'Show less' : 'Read more'}
                        {showFullDescription ? (
                          <ChevronUpIcon className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDownIcon className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Key Features */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="flex items-center gap-2 p-2 bg-gray-50/80 rounded-lg border border-gray-100">
                    <TruckIcon className="w-4 h-4 text-ethiopian-gold flex-shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold text-gray-900">Free Shipping</p>
                      <p className="text-[9px] text-gray-500">Worldwide delivery</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-gray-50/80 rounded-lg border border-gray-100">
                    <ShieldCheckIcon className="w-4 h-4 text-ethiopian-gold flex-shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold text-gray-900">100% Authentic</p>
                      <p className="text-[9px] text-gray-500">Handcrafted artisan</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-gray-50/80 rounded-lg border border-gray-100">
                    <ArrowPathIcon className="w-4 h-4 text-ethiopian-gold flex-shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold text-gray-900">Easy Returns</p>
                      <p className="text-[9px] text-gray-500">30-day guarantee</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-gray-50/80 rounded-lg border border-gray-100">
                    <StarIcon className="w-4 h-4 text-ethiopian-gold flex-shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold text-gray-900">Top Quality</p>
                      <p className="text-[9px] text-gray-500">Ethiopian heritage</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Expandable Sections */}
      <div className="px-3.5 sm:px-4 md:max-w-7xl md:mx-auto space-y-2.5 md:mt-8">
        <div className="md:grid md:grid-cols-1 md:gap-4">
          <div className="space-y-2.5">
          {/* Artisan Info */}
          <div className="border border-gray-200/80 rounded-xl overflow-hidden">
            <button
              onClick={() => setActiveSection(activeSection === 'artisan' ? '' : 'artisan')}
              className="w-full flex items-center justify-between p-3 text-left font-bold text-xs sm:text-sm text-gray-900 bg-gray-50/40 hover:bg-gray-50 transition-colors"
            >
              <span>Meet the Artisan / ስለ ባለሙያው</span>
              {activeSection === 'artisan' ? (
                <ChevronUpIcon className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDownIcon className="w-4 h-4 text-gray-500" />
              )}
            </button>
            {activeSection === 'artisan' && (
              <div className="p-3 border-t border-gray-100 bg-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-amber-100 text-amber-900 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                    {product.artisan?.profile?.firstName ? product.artisan.profile.firstName[0] : 'A'}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-gray-900">
                      {product.artisan?.profile?.storeName || 
                       (product.artisan?.profile?.firstName ? 
                        `${product.artisan.profile.firstName} ${product.artisan.profile.lastName}` : 
                        'Traditional Artisan')}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {product.artisan?.profile?.experienceYears || 5}+ years experience
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  {product.artisan?.profile?.bio || 
                   `Master craftsperson specializing in ${product.category} from ${product.originRegion || 'Ethiopia'}.`}
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/custom-order', {
                    state: {
                      artisanId: product.artisan?._id || product.artisan?.id || product.artisan,
                      productId: product._id,
                      productName: product.name
                    }
                  })}
                  className="mt-2.5 w-full py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1"
                >
                  <span>✂️ ከዚህ ባለሙያ ብጁ ዲዛይን እዘዝ (Order Custom Design)</span>
                </button>
              </div>
            )}
          </div>

          {/* Shipping Info */}
          <div className="border border-gray-200/80 rounded-xl overflow-hidden">
            <button
              onClick={() => setActiveSection(activeSection === 'shipping' ? '' : 'shipping')}
              className="w-full flex items-center justify-between p-3 text-left font-bold text-xs sm:text-sm text-gray-900 bg-gray-50/40 hover:bg-gray-50 transition-colors"
            >
              <span>Shipping & Returns / መላኪያ እና መመለሻ</span>
              {activeSection === 'shipping' ? (
                <ChevronUpIcon className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDownIcon className="w-4 h-4 text-gray-500" />
              )}
            </button>
            {activeSection === 'shipping' && (
              <div className="p-3 border-t border-gray-100 space-y-2 bg-white text-xs">
                <div>
                  <p className="font-bold text-gray-900">Shipping</p>
                  <p className="text-gray-600 text-xs">Free worldwide shipping on all orders. Delivery in 5-10 business days.</p>
                </div>
                <div>
                  <p className="font-bold text-gray-900">Returns</p>
                  <p className="text-gray-600 text-xs">30-day return policy. Items must be in original condition.</p>
                </div>
              </div>
            )}
          </div>

          {/* Reviews */}
          <div className="border border-gray-200/80 rounded-xl overflow-hidden">
            <button
              onClick={() => setActiveSection(activeSection === 'reviews' ? '' : 'reviews')}
              className="w-full flex items-center justify-between p-3 text-left font-bold text-xs sm:text-sm text-gray-900 bg-gray-50/40 hover:bg-gray-50 transition-colors"
            >
              <span>Reviews / አስተያየቶች ({product.metrics?.reviewCount || 0})</span>
              {activeSection === 'reviews' ? (
                <ChevronUpIcon className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDownIcon className="w-4 h-4 text-gray-500" />
              )}
            </button>
            {activeSection === 'reviews' && (
              <div className="p-3 border-t border-gray-100 bg-white">
                {product.reviews?.length > 0 ? (
                  <div className="space-y-3">
                    {product.reviews.slice(0, 3).map((review, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-gray-900">{review.userName || 'Anonymous'}</span>
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <StarSolidIcon 
                                key={i} 
                                className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400' : 'text-gray-200'}`} 
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-gray-600">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No reviews yet. Be the first to review!</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Fixed Bottom Action Bar - Mobile ONLY (Compact & Professional) */}
      <div className="md:hidden fixed inset-x-0 bottom-[56px] z-[10001] bg-white/95 backdrop-blur-md border-t border-gray-200/80 shadow-[0_-6px_20px_rgba(0,0,0,0.08)]">
        <div className="px-3 py-2 flex items-center gap-2.5">
          {/* Price strip */}
          <div className="min-w-0 flex flex-col justify-center">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">ድምር</span>
            <span className="text-sm font-black text-gray-900 truncate">
              {formatCurrency((selectedVariant ? selectedVariant.price : product.price) * quantity)}
            </span>
          </div>

          {/* Action Buttons - side by side */}
          <div className="flex-1 flex items-center gap-1.5">
            <button
              onClick={handleAddToCart}
              className="flex-1 bg-gray-900 text-white font-bold py-2 px-2 rounded-xl flex items-center justify-center gap-1 text-xs shadow-xs hover:bg-black active:scale-[0.98] transition-all"
            >
              <ShoppingCartIcon className="w-3.5 h-3.5" />
              <span className="truncate">Cart</span>
            </button>
            <button
              onClick={handleBuyNow}
              className="flex-1 bg-gradient-to-r from-ethiopian-gold to-amber-500 text-white font-bold py-2 px-2 rounded-xl flex items-center justify-center text-xs shadow-xs hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] transition-all"
            >
              <span className="truncate">Buy Now</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Padding for Mobile Fixed Action Bar + Mobile Nav */}
      <div className="md:hidden h-[75px]"></div>
    </div>
  );
};

export default ProductDetail;