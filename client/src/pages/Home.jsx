/**
 * Home Page for EthioCraft Global - Premium Modern Design
 * Hero section: text top-aligned, reduced font sizes, attractive styling
 */

import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  SparklesIcon,
  ArrowRightIcon,
  HeartIcon,
  ShoppingBagIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayIcon,
  PauseIcon,
  EyeIcon,
  GlobeAltIcon,
  CameraIcon
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import api from '../utils/api';
import { useAuth } from "../contexts/AuthContext";
import { useCustomTranslation } from "../hooks/useCustomTranslation";
import ProductCard from "../components/products/ProductCard";

// Ethiopian cultural category icons (SVG components)
const CrossIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
    <path d="M12 4v16M8 8h8M6 12h12" />
    <circle cx="12" cy="12" r="8" stroke="currentColor" fill="none" />
  </svg>
);

const CoffeeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
    <path d="M17 8h1a4 4 0 0 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8Z" />
    <path d="M6 2v4M10 2v4M14 2v4" />
  </svg>
);

const BasketIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
    <path d="M6 9V7a6 6 0 1 1 12 0v2" />
    <path d="M4 9h16a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" />
    <path d="M9 13h6" />
  </svg>
);

const LeatherIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
    <path d="M4 7h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <circle cx="12" cy="14" r="2" />
  </svg>
);

function Home() {
  const { isAuthenticated, user } = useAuth();
  const { t, i18n } = useCustomTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const currentLang = i18n.language?.split('-')[0] || 'am';

  const getLocalized = (item, field, fallbackKey) => {
    if (!item) return fallbackKey ? t(fallbackKey) : '';
    // 1. Try language specific field (e.g. title_am)
    if (item[`${field}_${currentLang}`]) return item[`${field}_${currentLang}`];
    // 2. Try legacy field if current is English
    if (currentLang === 'en' && item[field]) return item[field];
    // 3. Fallback to global translation or legacy field as last resort
    return fallbackKey ? t(fallbackKey) : item[field] || '';
  };
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [homeConfig, setHomeConfig] = useState(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [hoveredProduct, setHoveredProduct] = useState(null);

  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [isSearchingImage, setIsSearchingImage] = useState(false);

  const handleImageSearch = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSearchingImage(true);
    const formData = new FormData();
    formData.append('searchImage', file);

    try {
      const res = await api.post('/products/search/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000
      });
      if (res.data.success) {
        navigate('/products', { state: { aiResults: res.data.products, aiImage: URL.createObjectURL(file) } });
      }
    } catch (err) {
      console.error('Image search failed', err);
      alert('Visual Search failed to process the image.');
    } finally {
      setIsSearchingImage(false);
    }
  };

  // Fetch Homepage Config from API
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get('/settings/homepage');
        if (res.data.success && res.data.data) {
          setHomeConfig(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching homepage config:', err);
      } finally {
        setConfigLoaded(true);
      }
    };
    fetchConfig();
  }, []);

  // Fetch recommended products
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        let products = [];

        try {
          // If authenticated, get personalized recommendations
          const endpoint = (isAuthenticated && user?._id) ? `/products/recommendations/${user?._id}` : '/products/recommendations';
          const response = await api.get(endpoint, { params: { limit: 8 } });
          products = response.data.recommendations || response.data.products || [];
        } catch (recErr) {
          console.warn('Recommendations fetch failed, falling back to products', recErr);
          const response = await api.get('/products', { params: { limit: 8, status: 'active' } });
          products = response.data.products || [];
        }

        // Final data sanitization
        const cleanProducts = products.map(p => {
          const item = { ...p };
          if (Array.isArray(item.images)) {
            item.images = item.images.filter(img => {
              const url = typeof img === 'string' ? img : img?.url;
              return url && !url.startsWith('blob:');
            });
          }
          return item;
        });

        if (cleanProducts.length > 0) {
          setFeaturedProducts(cleanProducts);
        } else {
          // If still empty, use sample data but with absolute fallback images
          setFeaturedProducts([
            { _id: 'sample1', name: "Ethiopian Shawl", price: 45, category: 'Textiles', images: [] },
            { _id: 'sample2', name: "Coffee Ceremony Set", price: 120, category: 'Pottery', images: [] }
          ]);
        }
      } catch (err) {
        console.error('Error in fetchRecommendations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, [isAuthenticated, user?._id]);

  // Categories with Ethiopian cultural icons
  const categories = [
    { _id: "Textiles", name: "Textiles", icon: <CrossIcon />, color: "#b87b2e", bgColor: "bg-amber-50" },
    { _id: "Jewelry", name: "Jewelry", icon: <CoffeeIcon />, color: "#d97706", bgColor: "bg-amber-50" },
    { _id: "Basketry", name: "Basketry", icon: <BasketIcon />, color: "#10b981", bgColor: "bg-emerald-50" },
    { _id: "Leather Goods", name: "Leather Goods", icon: <LeatherIcon />, color: "#ea580c", bgColor: "bg-orange-50" }
  ];

  // Hero slides data fallback
  const defaultHeroSlides = [
    {
      title_en: "Discover Authentic Ethiopian Crafts",
      title_am: "ትክክለኛ የኢትዮጵያ የእጅ ጥበብ ውጤቶችን ያግኙ",
      title_or: "Oomisha harkaa Itoophiyaa isa dhugaa argadhu",
      title_ti: "ትክክለኛ ኢትዮጵያዊ ናይ ኢድ ጥበብ ስራሕቲ ርኸቡ",
      subtitle_en: "Handcrafted Treasures from the Heart of Africa",
      subtitle_am: "ከአፍሪካ እምብርት በእጅ የተሰሩ ውድ ቅርሶች",
      image: "https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&w=1600&q=90",
      cta_en: "Explore Collection",
      cta_am: "ስብስቦችን ያስሱ",
      link: "/products",
      badge_en: "New Collection",
      badge_am: "አዲስ ስብስብ"
    },
    {
      title_en: "Where Heritage Meets Modernity",
      title_am: "ቅርስ ከዘመናዊነት ጋር የሚገናኝበት",
      subtitle_en: "Timeless Craftsmanship for the Global Citizen",
      subtitle_am: "ለዓለም አቀፍ ዜጋ ዘላለማዊ የእጅ ጥበብ",
      image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1600&q=90",
      cta_en: "Discover More",
      cta_am: "ተጨማሪ እወቅ",
      link: "/products",
      badge_en: "Artisan Made",
      badge_am: "በባለሙያ የተሰራ"
    }
  ];

  const heroSlides = homeConfig?.heroSlides?.length > 0 ? homeConfig.heroSlides : defaultHeroSlides;

  // Auto-advance carousel - 15 seconds
  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 15000);
    return () => clearInterval(timer);
  }, [isAutoPlaying, heroSlides.length]);

  const nextSlide = () => {
    setIsAutoPlaying(false);
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const prevSlide = () => {
    setIsAutoPlaying(false);
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const StarRating = ({ rating }) => {
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <StarSolidIcon key={i} className={`w-3 h-3 ${i < Math.floor(rating) ? 'text-ethiopian-gold' : 'text-gray-200'}`} />
        ))}
        <span className="text-xs text-gray-500 ml-1">({rating})</span>
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-white transition-opacity duration-700 ${configLoaded ? 'opacity-100' : 'opacity-0'}`}>

      {/* Hero Carousel Section - Text top-aligned, reduced font sizes */}
      <section className="relative overflow-hidden w-full max-w-full">
        <div className="relative w-[100vw] max-w-full" style={{ width: '100vw', maxWidth: '100%' }}>
          <div className="relative h-[600px] lg:h-[700px] w-full">
            {heroSlides.map((slide, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out ${index === currentSlide
                  ? "opacity-100 z-10"
                  : "opacity-0 z-0 pointer-events-none"
                  }`}
              >
                {/* Background Image with Lighter Overlay */}
                <div className="absolute inset-0 w-full h-full">
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="w-full h-full object-cover object-center"
                    style={{ width: '100vw', maxWidth: '100%', objectFit: 'cover' }}
                  />
                  {/* Light overlay for readability */}
                  <div className="absolute inset-0 bg-black/20"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-black/10 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>

                {/* Content Container - Top aligned (pt-20 lg:pt-28) */}
                <div className="relative h-full flex flex-col justify-start items-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-20 pt-20 lg:pt-28">
                  <div className="max-w-3xl text-center">
                    <div className="relative">


                      {/* Title - smaller font */}
                      <h1
                        className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-2 leading-tight animate-fade-in-up animation-delay-100 drop-shadow-2xl"
                        dangerouslySetInnerHTML={{ __html: getLocalized(slide, 'title', 'home.hero_headline') }}
                      />

                      {/* Subtitle - smaller */}
                      <p className="text-ethiopian-gold text-base lg:text-lg mb-2 font-bold animate-fade-in-up animation-delay-200 drop-shadow-lg">
                        {getLocalized(slide, 'subtitle', 'home.hero_subheadline')}
                      </p>



                      {/* CTA Buttons - slightly smaller */}
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in-up animation-delay-400 group">
                        <Link
                          to={slide.link}
                          className="inline-flex items-center gap-2 bg-gradient-to-r from-ethiopian-gold to-amber-500 hover:from-ethiopian-gold hover:to-amber-600 text-white px-6 py-3 rounded-full font-semibold text-sm transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg"
                        >
                          <span>{getLocalized(slide, 'cta', 'home.shop_now')}</span>
                          <ArrowRightIcon className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isSearchingImage}
                          className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border border-white/30 px-5 py-3 rounded-full font-semibold text-sm transition-all duration-300 transform hover:scale-105 shadow-lg relative cursor-pointer"
                        >
                          {isSearchingImage ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div> : <CameraIcon className="w-4 h-4" />}
                          <span>{isSearchingImage ? 'Processing...' : 'Visual Search'}</span>
                          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow-md">AI</div>
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleImageSearch} accept="image/*" className="hidden" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 z-30 bg-white/20 backdrop-blur-md hover:bg-white/40 rounded-full p-3 transition-all duration-300 hover:scale-110 shadow-lg"
          >
            <ChevronLeftIcon className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 z-30 bg-white/20 backdrop-blur-md hover:bg-white/40 rounded-full p-3 transition-all duration-300 hover:scale-110 shadow-lg"
          >
            <ChevronRightIcon className="w-5 h-5 text-white" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-3">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setIsAutoPlaying(false);
                  setCurrentSlide(index);
                  setTimeout(() => setIsAutoPlaying(true), 10000);
                }}
                className={`transition-all duration-500 rounded-full ${index === currentSlide
                  ? "w-10 h-2 bg-ethiopian-gold shadow-lg shadow-ethiopian-gold/50"
                  : "w-2 h-2 bg-white/50 hover:bg-white/80 hover:w-4"
                  }`}
              />
            ))}
          </div>

          {/* Auto-play Toggle */}
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className="absolute bottom-8 right-4 lg:right-8 z-30 bg-black/40 backdrop-blur-md hover:bg-black/60 rounded-full p-2.5 transition-all duration-300 shadow-lg"
          >
            {isAutoPlaying ? (
              <PauseIcon className="w-4 h-4 text-white" />
            ) : (
              <PlayIcon className="w-4 h-4 text-white" />
            )}
          </button>

          {/* Slide Counter */}
          <div className="absolute top-8 right-4 lg:right-8 z-30 bg-black/30 backdrop-blur-md rounded-full px-3 py-1.5 text-xs font-mono text-white/80">
            {String(currentSlide + 1).padStart(2, '0')} / {String(heroSlides.length).padStart(2, '0')}
          </div>
        </div>
      </section>

      {/* Categories Section - Enhanced with Ethiopian cultural icons */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-light text-gray-800 mb-2 tracking-tight">
              Shop by Category
            </h2>
            <div className="w-12 h-0.5 bg-ethiopian-gold mx-auto"></div>
          </div>

          <div className="flex flex-wrap justify-center gap-8 md:gap-12">
            {categories.map((category) => (
              <Link
                key={category._id}
                to={`/products?category=${category._id}`}
                className="group flex flex-col items-center"
              >
                <div className={`w-24 h-24 rounded-2xl ${category.bgColor} flex items-center justify-center mb-3 transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1 group-hover:border-2 group-hover:border-ethiopian-gold/30`}>
                  <div className="text-ethiopian-gold transition-transform duration-300 group-hover:scale-110">
                    {category.icon}
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-600 group-hover:text-ethiopian-gold transition-colors">
                  {category.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Recommended for You Section */}
      <section className="py-16 bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center gap-2 mb-3">

            </div>
            <h2 className="text-3xl lg:text-4xl font-light text-gray-800 tracking-tight">
              Recommended for You
            </h2>
            <p className="text-gray-400 mt-2 text-sm">
              Personalized selections tailored to your taste
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 border-3 border-ethiopian-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {featuredProducts.map((product, index) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  showArtisan={false}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                />
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 border-2 border-ethiopian-gold text-ethiopian-gold hover:bg-ethiopian-gold hover:text-white px-6 py-2.5 rounded-full font-semibold transition-all duration-300"
            >
              View All Recommendations
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>



      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-ethiopian-gold/5 via-amber-50 to-ethiopian-gold/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl shadow-xl p-10 md:p-12 text-center">
            <div className="inline-flex items-center gap-2 bg-ethiopian-gold/10 px-4 py-2 rounded-full mb-6">
              <GlobeAltIcon className="w-4 h-4 text-ethiopian-gold" />
              <span className="text-xs font-semibold text-ethiopian-gold uppercase tracking-wider">{t('cta_section.community_badge')}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-light text-gray-800 mb-3 tracking-tight">
              {t('cta_section.journey_title')}
            </h2>
            <p className="text-gray-500 text-base mb-8 max-w-lg mx-auto">
              {t('cta_section.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 bg-ethiopian-gold hover:bg-amber-600 text-white px-8 py-3 rounded-full font-semibold transition-all duration-300 shadow-md hover:shadow-lg"
              >
                <ShoppingBagIcon className="w-4 h-4" />
                {t('cta_section.explore_btn')}
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 border-2 border-ethiopian-gold text-ethiopian-gold hover:bg-ethiopian-gold hover:text-white px-8 py-3 rounded-full font-semibold transition-all duration-300"
              >
                <HeartIcon className="w-4 h-4" />
                {t('cta_section.member_btn')}
              </Link>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-6 text-xs text-gray-400">
              <span className="flex items-center gap-1">✓ {t('cta_section.free_returns')}</span>
              <span className="flex items-center gap-1">✓ {t('cta_section.secure_payments')}</span>
              <span className="flex items-center gap-1">✓ {t('cta_section.support')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* CSS animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
          opacity: 0;
        }
        .animation-delay-100 { animation-delay: 0.1s; }
        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-300 { animation-delay: 0.3s; }
        .animation-delay-400 { animation-delay: 0.4s; }
      `}} />
    </div>
  );
}

export default Home;