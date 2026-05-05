/**
 * Products Page for EthioCraft Global
 * 
 * Main product browsing page with:
 * - Enhanced international search UI
 * - Product grid display with floating cart icon on images
 * - Ethiopian cultural design elements with custom SVG icons
 */

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  CameraIcon,
  SparklesIcon,
  MicrophoneIcon,
  ClockIcon,
  ShoppingBagIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import ProductList from '../components/products/ProductList';
import { useCustomTranslation } from '../hooks/useCustomTranslation';
import api from '../utils/api';
import { ScissorsIcon } from '@heroicons/react/24/outline';

// ========== Ethiopian Cultural SVG Icons ==========
const MeasuringTapeIcon = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 12c0-1.66-4.03-3-9-3S3 10.34 3 12s4.03 3 9 3 9-1.34 9-3Z" />
    <path d="M3 12v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6" />
    <path d="M9 9v3" />
    <path d="M15 9v3" />
    <path d="M12 9.5v2.5" />
    <path d="M6 10.5v1.5" />
    <path d="M18 10.5v1.5" />
  </svg>
);

const CrossIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
    <path d="M12 4v16M8 8h8M6 12h12" />
    <circle cx="12" cy="12" r="8" stroke="currentColor" fill="none" />
  </svg>
);

const CoffeeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
    <path d="M17 8h1a4 4 0 0 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8Z" />
    <path d="M6 2v4M10 2v4M14 2v4" />
  </svg>
);

const BasketIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
    <path d="M6 9V7a6 6 0 1 1 12 0v2" />
    <path d="M4 9h16a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" />
    <path d="M9 13h6" />
  </svg>
);

const LeatherIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
    <path d="M4 7h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <circle cx="12" cy="14" r="2" />
  </svg>
);

// ========== Enhanced Product Card with Floating Cart Icon ==========
const ProductCardWithCart = ({ product, showArtisan = true, lazyLoad = true }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Placeholder for add-to-cart logic (frontend only)
    console.log('Added to cart:', product.name);
    alert(`🛒 "${product.name}" added to cart!`);
  };

  const handleLike = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLiked(!isLiked);
  };

  return (
    <div
      className="group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div className="relative h-64 overflow-hidden bg-gray-100">
        <img
          src={product.image || `https://picsum.photos/id/${product._id}/400/400`}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading={lazyLoad ? 'lazy' : 'eager'}
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

        {/* Floating Add to Cart Button - Bottom Right, visible on hover */}
        <button
          onClick={handleAddToCart}
          className={`absolute bottom-4 right-4 z-20 bg-white rounded-full p-3 shadow-lg transition-all duration-300 transform hover:scale-110 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
        >
          <ShoppingBagIcon className="w-5 h-5 text-ethiopian-gold" />
        </button>

        {/* Like Button - Top Right */}
        <button
          onClick={handleLike}
          className="absolute top-3 right-3 z-20 bg-white/80 backdrop-blur-sm rounded-full p-1.5 transition-all duration-300 hover:bg-red-50"
        >
          {isLiked ? (
            <HeartSolidIcon className="w-4 h-4 text-red-500" />
          ) : (
            <HeartIcon className="w-4 h-4 text-gray-500 hover:text-red-500 transition-colors" />
          )}
        </button>

        {/* Quick View on Hover */}
        <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-1.5 transition-all duration-300 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}>
          <span className="text-xs font-medium text-gray-800 flex items-center gap-1">
            <SparklesIcon className="w-3 h-3" />
            Quick View
          </span>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        {showArtisan && product.artisan && (
          <p className="text-xs text-ethiopian-gold mb-1 font-medium">{product.artisan}</p>
        )}
        <h3 className="font-semibold text-gray-800 mb-1 line-clamp-1 group-hover:text-ethiopian-gold transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center gap-1 mb-2">
          {[...Array(5)].map((_, i) => (
            <svg key={i} className={`w-3 h-3 ${i < Math.floor(product.rating || 4.8) ? 'text-ethiopian-gold' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
          <span className="text-xs text-gray-400 ml-1">({product.rating || 4.8})</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xl font-bold text-ethiopian-gold">${product.price || 89}</span>
          <span className="text-xs text-gray-400 line-through">${(product.price * 1.2).toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
};

// ========== Main Products Component ==========
const Products = () => {
  const { t } = useCustomTranslation();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recentSearches, setRecentSearches] = useState(['Ethiopian coffee set', 'Handwoven scarf', 'Silver cross necklace']);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const [aiMatches, setAiMatches] = useState(location.state?.aiResults || null);
  const [aiPreview, setAiPreview] = useState(location.state?.aiImage || null);
  const [isSearchingImage, setIsSearchingImage] = useState(false);

  const recognitionRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const rawTranscript = event.results[0][0].transcript;
        let cleanedTerm = rawTranscript.replace(/\./g, '').trim();
        const lowerTerm = cleanedTerm.toLowerCase();
        let searchLogicTerm = cleanedTerm;

        const phonetics = [
          { pattern: /zamb|zem/i, correct: 'Zembil' },
          { pattern: /jobe|jeb/i, correct: 'Jebena' },
          { pattern: /inje|enje/i, correct: 'Enjera' },
          { pattern: /shur|sher/i, correct: 'Sheruba' },
          { pattern: /gab|kab/i, correct: 'Gabi' }
        ];

        let isLocalName = false;
        for (const { pattern, correct } of phonetics) {
          if (pattern.test(lowerTerm)) {
            searchLogicTerm = correct;
            isLocalName = true;
            break;
          }
        }

        if (!isLocalName && searchLogicTerm.length > 3) {
          searchLogicTerm = searchLogicTerm.substring(0, 4);
        }

        setSearchQuery(searchLogicTerm);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const handleVoiceSearch = () => {
    if (!recognitionRef.current) {
      alert('Voice search is not supported in your browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error(error);
        setIsListening(false);
      }
    }
  };

  const handleImageSearch = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSearchingImage(true);
    setAiMatches(null);
    const formData = new FormData();
    formData.append('searchImage', file);
    try {
      const res = await api.post('/products/search/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setAiMatches(res.data.products);
        setAiPreview(URL.createObjectURL(file));
      }
    } catch (err) {
      console.error(err);
      alert('Visual Search failed.');
    } finally {
      setIsSearchingImage(false);
    }
  };

  const categoryFromUrl = searchParams.get('category');

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const suggestionItems = [
    { icon: '🔥', text: 'Trending: Ethiopian coffee ceremony sets', type: 'trending' },
    { icon: '⭐', text: 'Best rated handwoven textiles', type: 'popular' },
    { icon: '🆕', text: 'New arrivals this week', type: 'new' },
    { icon: '💰', text: 'Under 500 ETB', type: 'budget' },
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setRecentSearches(prev => [searchQuery, ...prev.filter(s => s !== searchQuery)].slice(0, 5));
      setShowSuggestions(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-ethiopian-gold/5 via-amber-50/20 to-ethiopian-gold/5 py-12 overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23CFA66E' fill-rule='evenodd'%3E%3Cpath d='M30 30l-5-5-5 5 5 5 5-5zm0-20l-5-5-5 5 5 5 5-5zm0 40l-5-5-5 5 5 5 5-5zm20-20l-5-5-5 5 5 5 5-5zm-40 0l-5-5-5 5 5 5 5-5z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '40px 40px'
          }}
        ></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >

            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 font-['Playfair_Display',serif] text-gray-900">
              {t('product_discovery.hero_title')}
            </h1>
            <div className="w-24 h-1.5 bg-ethiopian-gold mx-auto mb-6 rounded-full"></div>
            <p className="text-lg mb-0 max-w-3xl mx-auto text-gray-700 font-medium leading-relaxed">
              {t('product_discovery.hero_subtitle')}
            </p>
          </motion.div>
        </div>
      </div>


      {/* Search Bar */}
      <div className={`sticky top-16 z-40 w-full transition-all duration-300 ${isScrolled ? 'bg-white shadow-lg border-b border-gray-100' : 'bg-white/95 backdrop-blur-md border-b border-gray-100'}`}>
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-ethiopian-gold/20 via-ethiopian-gold/10 to-ethiopian-gold/20 rounded-2xl blur-xl group-focus-within:blur-2xl transition-all duration-500 opacity-0 group-focus-within:opacity-100"></div>
                <div className="relative flex items-center w-full bg-white border-2 border-gray-200 rounded-2xl shadow-sm hover:shadow-md focus-within:shadow-lg focus-within:border-ethiopian-gold/50 transition-all duration-300">
                  <div className="pl-5 pr-2">
                    <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 group-focus-within:text-ethiopian-gold transition-colors" />
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="Search by product, material, story, or region..."
                    className="flex-1 py-4 text-gray-700 placeholder-gray-400 bg-transparent outline-none text-base"
                  />
                  <div className="flex items-center gap-1 pr-2">
                    <button
                      type="button"
                      onClick={handleVoiceSearch}
                      className={`p-2 rounded-full transition-all duration-200 ${isListening ? 'bg-red-100 text-red-500 animate-pulse' : 'text-gray-400 hover:text-ethiopian-gold hover:bg-amber-50'}`}
                      title="Voice search"
                    >
                      <MicrophoneIcon className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded-full text-gray-400 hover:text-ethiopian-gold hover:bg-amber-50 transition-colors"
                      title="Search by image"
                    >
                      <CameraIcon className="w-5 h-5" />
                    </button>
                    {searchQuery && (
                      <button type="button" onClick={() => setSearchQuery('')} className="p-2 rounded-full text-gray-400 hover:text-gray-600">
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button type="submit" className="ml-1 px-5 py-2 bg-ethiopian-gold hover:bg-ethiopian-gold/90 text-white text-sm font-medium rounded-xl transition-all duration-200 shadow-md hover:shadow-lg">
                      Search
                    </button>
                  </div>
                </div>

                {showSuggestions && !searchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in">
                    <div className="p-3 border-b border-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Recent</span>
                        <button className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
                      </div>
                      {recentSearches.map((search, idx) => (
                        <button key={idx} onClick={() => setSearchQuery(search)} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                          <ClockIcon className="w-4 h-4 text-gray-400" />
                          {search}
                        </button>
                      ))}
                    </div>
                    <div className="p-3">
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">Trending Now</span>
                      {suggestionItems.map((item, idx) => (
                        <button key={idx} onClick={() => setSearchQuery(item.text)} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                          <span className="text-base">{item.icon}</span>
                          {item.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </form>
            <input type="file" ref={fileInputRef} onChange={handleImageSearch} accept="image/*" className="hidden" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-10">
        {/* Voice Search Modal */}
        {isListening && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl p-8 text-center max-w-sm mx-4">
              <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <MicrophoneIcon className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Listening...</h3>
              <p className="text-gray-500 text-sm">Speak clearly to search for products</p>
            </div>
          </div>
        )}

        {/* AI Visual Search Results */}
        {isSearchingImage && (
          <div className="flex flex-col justify-center items-center py-16 mb-8 bg-amber-50/50 rounded-3xl border border-ethiopian-gold/20">
            <div className="w-12 h-12 border-4 border-ethiopian-gold border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-ethiopian-gold font-medium animate-pulse">Running Visual AI Analysis...</p>
          </div>
        )}

        {aiMatches && !isSearchingImage && (
          <div className="mb-12">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-ethiopian-gold/30 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-center gap-6 shadow-md">
              {aiPreview && <img src={aiPreview} alt="Search Query" className="w-24 h-24 object-cover rounded-xl shadow-md border-2 border-white" />}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                  <SparklesIcon className="w-6 h-6 text-ethiopian-gold" />
                  <h2 className="text-2xl font-bold text-gray-900">Matching Products Found</h2>
                </div>
                <p className="text-gray-600">Our AI has found {aiMatches.length} items visually similar to your uploaded image.</p>
              </div>
              <button onClick={() => { setAiMatches(null); setAiPreview(null); }} className="px-6 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-red-500 transition-all shadow-sm">
                Clear AI Search
              </button>
            </div>

            {aiMatches.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-2xl">
                <p className="text-gray-500 text-lg">No visually similar products found above the match threshold.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
                {aiMatches.map((product) => (
                  <div key={product._id} className="relative group">
                    <div className="absolute -top-3 left-3 z-20 bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded-md shadow-lg flex items-center gap-1">
                      <SparklesIcon className="w-3 h-3" />
                      {Math.round(product.similarityScore * 100)}% Match
                    </div>
                    <ProductCardWithCart product={product} showArtisan={true} lazyLoad={false} />
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-4 my-10">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-gray-400 font-medium text-sm uppercase tracking-widest">Or browse regular catalog</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>
          </div>
        )}

        {/* Results Header */}
        <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Showing</span>
            <span className="text-sm font-semibold text-gray-800">24</span>
            <span className="text-sm text-gray-500">products</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Sort by:</span>
            <select className="text-sm text-gray-600 bg-transparent border-none focus:outline-none cursor-pointer">
              <option>Featured</option>
              <option>Newest</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Note: ProductList component will render regular products. 
            If you need the cart icon there too, you'd need to modify ProductList to use ProductCardWithCart.
            For brevity, we keep ProductList as is, but you can replace its internal ProductCard similarly. */}
        <ProductList
          searchQuery={searchQuery}
          category={selectedCategory !== 'all' ? selectedCategory : categoryFromUrl}
          showFilters={true}
          onClearSearch={() => setSearchQuery('')}
        />
      </div>

      {/* Cultural Information Section with Ethiopian SVG Icons */}
      <div className="bg-gradient-to-b from-white to-gray-50 py-20 border-t border-gray-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <span className="inline-block px-4 py-1 bg-ethiopian-gold/10 text-ethiopian-gold text-sm font-semibold rounded-full mb-4 tracking-wide">
                Craftsmanship Heritage
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-['Playfair_Display',serif]">
                Ethiopian Craft Traditions
              </h2>
              <div className="w-16 h-0.5 bg-ethiopian-gold mx-auto mb-6"></div>
              <p className="text-gray-600 max-w-3xl mx-auto text-lg font-light leading-relaxed">
                Ethiopia's rich cultural heritage is reflected in its diverse artisan traditions. From ancient weaving techniques to intricate jewelry making, each craft category represents centuries of knowledge passed down through generations.
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Textiles - Cross Icon */}
            <motion.div
              whileHover={{ y: -8 }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0 }}
              viewport={{ once: true }}
              className="group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 cursor-pointer"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              <div className="p-8 text-center">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-md text-ethiopian-gold">
                  <CrossIcon />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-800">Textiles</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Traditional Ethiopian weaving creates beautiful fabrics with intricate patterns and vibrant colors.
                </p>
                <button className="mt-5 text-ethiopian-gold text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                  Learn More →
                </button>
              </div>
            </motion.div>

            {/* Leather - Coffee Icon */}
            <motion.div
              whileHover={{ y: -8 }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              viewport={{ once: true }}
              className="group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 cursor-pointer"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              <div className="p-8 text-center">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-md text-ethiopian-gold">
                  <CoffeeIcon />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-800">Leather</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Ethiopian leather craftsmanship is renowned worldwide for its quality and durability.
                </p>
                <button className="mt-5 text-ethiopian-gold text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                  Learn More →
                </button>
              </div>
            </motion.div>

            {/* Basketry - Basket Icon */}
            <motion.div
              whileHover={{ y: -8 }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              viewport={{ once: true }}
              className="group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 cursor-pointer"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              <div className="p-8 text-center">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-md text-ethiopian-gold">
                  <BasketIcon />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-800">Basketry</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Ancient basketry techniques create functional and decorative pieces using natural materials.
                </p>
                <button className="mt-5 text-ethiopian-gold text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                  Learn More →
                </button>
              </div>
            </motion.div>

            {/* Jewelry - Leather Icon */}
            <motion.div
              whileHover={{ y: -8 }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              viewport={{ once: true }}
              className="group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 cursor-pointer"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              <div className="p-8 text-center">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-md text-ethiopian-gold">
                  <LeatherIcon />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-800">Jewelry</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Traditional Ethiopian jewelry features intricate metalwork and symbolic designs.
                </p>
                <button className="mt-5 text-ethiopian-gold text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                  Learn More →
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}} />
    </div>
  );
};

export default Products;