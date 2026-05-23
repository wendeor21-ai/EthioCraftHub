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
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 sm:w-8 sm:h-8">
    <path d="M12 4v16M8 8h8M6 12h12" />
    <circle cx="12" cy="12" r="8" stroke="currentColor" fill="none" />
  </svg>
);

const CoffeeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 sm:w-8 sm:h-8">
    <path d="M17 8h1a4 4 0 0 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8Z" />
    <path d="M6 2v4M10 2v4M14 2v4" />
  </svg>
);

const BasketIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 sm:w-8 sm:h-8">
    <path d="M6 9V7a6 6 0 1 1 12 0v2" />
    <path d="M4 9h16a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" />
    <path d="M9 13h6" />
  </svg>
);

const LeatherIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 sm:w-8 sm:h-8">
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

      {/* ── HERO CAROUSEL ── */}
      <section className="relative overflow-hidden w-full">
        <div className="relative w-full">
          {/* Mobile: 200px | Desktop: 480-700px */}
          <div className="relative h-[200px] sm:h-[480px] lg:h-[700px] w-full">
            {heroSlides.map((slide, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out ${
                  index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                }`}
              >
                <div className="absolute inset-0 w-full h-full">
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="w-full h-full object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-black/30" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/30 to-transparent" />
                </div>

                {/* Content — centered on mobile, top-aligned on desktop */}
                <div className="relative h-full flex flex-col justify-center sm:justify-start items-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-20 sm:pt-20 lg:pt-28">
                  <div className="max-w-3xl text-center w-full">
                    {/* Title */}
                    <h1
                      className="text-base sm:text-3xl lg:text-5xl font-bold text-white mb-1 sm:mb-2 leading-tight drop-shadow-xl"
                      dangerouslySetInnerHTML={{ __html: getLocalized(slide, 'title', 'home.hero_headline') }}
                    />
                    {/* Subtitle — hidden on mobile to save space */}
                    <p className="hidden sm:block text-ethiopian-gold text-base lg:text-lg mb-4 font-bold drop-shadow-lg">
                      {getLocalized(slide, 'subtitle', 'home.hero_subheadline')}
                    </p>
                    {/* CTA — single row on mobile */}
                    <div className="flex flex-row items-center justify-center gap-2 mt-2 sm:mt-0 sm:gap-3">
                      <Link
                        to={slide.link}
                        className="inline-flex items-center gap-1.5 bg-ethiopian-gold text-white px-3 py-1.5 sm:px-6 sm:py-3 rounded-full font-semibold text-xs sm:text-sm shadow-lg"
                      >
                        <span>{getLocalized(slide, 'cta', 'home.shop_now')}</span>
                        <ArrowRightIcon className="w-3 h-3" />
                      </Link>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSearchingImage}
                        className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md text-white border border-white/40 px-3 py-1.5 sm:px-5 sm:py-3 rounded-full font-semibold text-xs sm:text-sm relative"
                      >
                        {isSearchingImage
                          ? <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          : <CameraIcon className="w-3 h-3" />
                        }
                        <span className="hidden sm:inline">{t('nav.visual_search', 'Visual Search')}</span>
                        <span className="sm:hidden">AI Search</span>
                        <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[7px] px-1 py-0.5 rounded-full font-bold">AI</div>
                      </button>
                      <input type="file" ref={fileInputRef} onChange={handleImageSearch} accept="image/*" className="hidden" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Arrows — hidden on mobile */}
          <button onClick={prevSlide} className="hidden sm:flex absolute left-6 lg:left-8 top-1/2 -translate-y-1/2 z-30 bg-white/20 backdrop-blur-md hover:bg-white/40 rounded-full p-3 shadow-lg">
            <ChevronLeftIcon className="w-5 h-5 text-white" />
          </button>
          <button onClick={nextSlide} className="hidden sm:flex absolute right-6 lg:right-8 top-1/2 -translate-y-1/2 z-30 bg-white/20 backdrop-blur-md hover:bg-white/40 rounded-full p-3 shadow-lg">
            <ChevronRightIcon className="w-5 h-5 text-white" />
          </button>

          {/* Dots — compact on mobile */}
          <div className="absolute bottom-2 sm:bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-1.5 sm:gap-3">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => { setIsAutoPlaying(false); setCurrentSlide(index); setTimeout(() => setIsAutoPlaying(true), 10000); }}
                className={`transition-all duration-500 rounded-full ${
                  index === currentSlide
                    ? "w-6 sm:w-10 h-1.5 sm:h-2 bg-ethiopian-gold"
                    : "w-1.5 sm:w-2 h-1.5 sm:h-2 bg-white/50"
                }`}
              />
            ))}
          </div>

          {/* Auto-play toggle — desktop only */}
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className="hidden sm:flex absolute bottom-8 right-8 z-30 bg-black/40 backdrop-blur-md hover:bg-black/60 rounded-full p-2.5 shadow-lg"
          >
            {isAutoPlaying ? <PauseIcon className="w-4 h-4 text-white" /> : <PlayIcon className="w-4 h-4 text-white" />}
          </button>
        </div>
      </section>

      {/* ── CATEGORIES ──
           Mobile:  horizontal scroll strip, py-3, no heading margin waste
           Desktop: centered grid, py-16 (unchanged)              */}
      <section className="py-3 sm:py-16 bg-white border-b border-gray-100 sm:border-none">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Heading — hidden on mobile */}
          <div className="hidden sm:block text-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-light text-gray-800 mb-2 tracking-tight">
              {t('home.shop_by_category', 'Shop by Category')}
            </h2>
            <div className="w-12 h-0.5 bg-ethiopian-gold mx-auto" />
          </div>

          {/* Mobile: compact label + scroll row */}
          <p className="sm:hidden text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
            {t('home.shop_by_category', 'Shop by Category')}
          </p>

          {/* Mobile scroll row */}
          <div
            className="sm:hidden flex gap-3 overflow-x-auto pb-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categories.map((category) => (
              <Link
                key={category._id}
                to={`/products?category=${category._id}`}
                className="flex flex-col items-center shrink-0 gap-1"
              >
                <div className={`w-12 h-12 rounded-xl ${category.bgColor} flex items-center justify-center`}>
                  <div className="text-ethiopian-gold" style={{ transform: 'scale(0.7)' }}>
                    {category.icon}
                  </div>
                </div>
                <span className="text-[9px] font-semibold text-gray-600 text-center whitespace-nowrap leading-tight">
                  {category.name}
                </span>
              </Link>
            ))}
          </div>

          {/* Desktop grid (unchanged) */}
          <div className="hidden sm:flex flex-wrap justify-center gap-8 md:gap-12">
            {categories.map((category) => (
              <Link
                key={category._id}
                to={`/products?category=${category._id}`}
                className="group flex flex-col items-center"
              >
                <div className={`w-24 h-24 rounded-2xl ${category.bgColor} flex items-center justify-center mb-3 transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1`}>
                  <div className="text-ethiopian-gold group-hover:scale-110 transition-transform duration-300">
                    {category.icon}
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-600 group-hover:text-ethiopian-gold transition-colors text-center">
                  {t(`categories.${category._id.toLowerCase().replace(' ', '_')}`, category.name)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── RECOMMENDED PRODUCTS ──
           Mobile:  py-4, compact heading, 2-col grid, no bottom margin waste
           Desktop: py-16, full heading (unchanged)               */}
      <section className="py-4 sm:py-16 bg-white sm:bg-gradient-to-br sm:from-gray-50 sm:via-white sm:to-gray-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">

          {/* Mobile heading — inline, compact */}
          <div className="flex items-center justify-between mb-3 sm:hidden">
            <h2 className="text-sm font-bold text-gray-800">
              {t('home.recommended_title', 'Recommended for You')}
            </h2>
            <Link to="/products" className="text-xs text-ethiopian-gold font-semibold flex items-center gap-0.5">
              See all <ArrowRightIcon className="w-3 h-3" />
            </Link>
          </div>

          {/* Desktop heading (unchanged) */}
          <div className="hidden sm:block text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-light text-gray-800 tracking-tight">
              {t('home.recommended_title', 'Recommended for You')}
            </h2>
            <p className="text-gray-400 mt-2 text-sm">
              {t('home.recommended_subtitle', 'Personalized selections tailored to your taste')}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-6 sm:py-12">
              <div className="w-8 h-8 sm:w-10 sm:h-10 border-2 sm:border-3 border-ethiopian-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-0.5 sm:gap-4 lg:gap-8">
              {featuredProducts.map((product, index) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  showArtisan={false}
                />
              ))}
            </div>
          )}

          {/* View all — desktop only (mobile has inline link above) */}
          <div className="hidden sm:block text-center mt-12">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 border-2 border-ethiopian-gold text-ethiopian-gold hover:bg-ethiopian-gold hover:text-white px-6 py-2.5 rounded-full font-semibold transition-all duration-300"
            >
              {t('home.view_all_recommendations', 'View All Recommendations')}
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ──
           Mobile:  py-4, compact card, single-column buttons, minimal padding
           Desktop: py-20, full card (unchanged)                  */}
      <section className="py-4 sm:py-20 bg-gradient-to-r from-ethiopian-gold/5 via-amber-50 to-ethiopian-gold/5">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-md sm:shadow-xl p-4 sm:p-10 md:p-12 text-center">

            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 bg-ethiopian-gold/10 px-3 py-1 rounded-full mb-3 sm:mb-6">
              <GlobeAltIcon className="w-3 h-3 sm:w-4 sm:h-4 text-ethiopian-gold" />
              <span className="text-[10px] sm:text-xs font-semibold text-ethiopian-gold uppercase tracking-wider">
                {t('cta_section.community_badge')}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-base sm:text-3xl md:text-4xl font-semibold sm:font-light text-gray-800 mb-1.5 sm:mb-3 tracking-tight">
              {t('cta_section.journey_title')}
            </h2>

            {/* Subtitle — hidden on mobile */}
            <p className="hidden sm:block text-gray-500 text-base mb-8 max-w-lg mx-auto">
              {t('cta_section.subtitle')}
            </p>

            {/* Buttons — row on mobile */}
            <div className="flex flex-row sm:flex-row gap-2 sm:gap-4 justify-center mt-3 sm:mt-0">
              <Link
                to="/products"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-ethiopian-gold hover:bg-amber-600 text-white px-4 sm:px-8 py-2 sm:py-3 rounded-full font-semibold text-xs sm:text-base transition-all shadow-md"
              >
                <ShoppingBagIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="truncate">{t('cta_section.explore_btn')}</span>
              </Link>
              <Link
                to="/register"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 border-2 border-ethiopian-gold text-ethiopian-gold hover:bg-ethiopian-gold hover:text-white px-4 sm:px-8 py-2 sm:py-3 rounded-full font-semibold text-xs sm:text-base transition-all"
              >
                <HeartIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="truncate">{t('cta_section.member_btn')}</span>
              </Link>
            </div>

            {/* Trust badges — hidden on mobile */}
            <div className="hidden sm:flex mt-8 pt-6 border-t border-gray-100 items-center justify-center gap-6 text-xs text-gray-400">
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