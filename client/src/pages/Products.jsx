/**
 * Products Page - Mobile-First Design
 * Mobile: no hero text, compact search bar, clean layout
 * Desktop: full hero + search + filters (unchanged)
 */

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  CameraIcon,
  SparklesIcon,
  MicrophoneIcon,
  ClockIcon,
  HeartIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import ProductList from "../components/products/ProductList";
import { useCustomTranslation } from "../hooks/useCustomTranslation";
import api from "../utils/api";

// ── SVG Icons ──────────────────────────────────────────────────
const CrossIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
    <path d="M12 4v16M8 8h8M6 12h12" /><circle cx="12" cy="12" r="8" />
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

// ── AI result card (visual search only) ───────────────────────
const ProductCardWithCart = ({ product, lazyLoad = true }) => {
  const [liked, setLiked] = useState(false);
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        <img
          src={product.image || `https://via.placeholder.com/400x400/F59E0B/FFFFFF?text=${encodeURIComponent(product.category || "Craft")}`}
          alt={product.name}
          className="w-full h-full object-cover"
          loading={lazyLoad ? "lazy" : "eager"}
        />
        <button
          onClick={(e) => { e.preventDefault(); setLiked(!liked); }}
          className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow-sm"
        >
          {liked ? <HeartSolidIcon className="w-3.5 h-3.5 text-red-500" /> : <HeartIcon className="w-3.5 h-3.5 text-gray-400" />}
        </button>
      </div>
      <div className="p-2">
        <p className="text-[11px] text-gray-700 line-clamp-2 leading-tight mb-1">{product.name}</p>
        <p className="text-sm font-bold text-[#e43a3a]">{product.price ? `${product.price} ETB` : "—"}</p>
      </div>
    </div>
  );
};

// ── Main Products Component ────────────────────────────────────
const Products = () => {
  const { t } = useCustomTranslation();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCategory] = useState(searchParams.get("category") || "all");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches] = useState(["Ethiopian coffee set", "Handwoven scarf", "Silver cross necklace"]);
  const location = useLocation();
  const fileInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const [aiMatches, setAiMatches] = useState(location.state?.aiResults || null);
  const [aiPreview, setAiPreview] = useState(location.state?.aiImage || null);
  const [isSearchingImage, setIsSearchingImage] = useState(false);
  const categoryFromUrl = searchParams.get("category");

  // Speech recognition
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SR();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";
      recognitionRef.current.onresult = (e) => {
        setSearchQuery(e.results[0][0].transcript.replace(/\./g, "").trim());
        setIsListening(false);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
    return () => recognitionRef.current?.stop();
  }, []);

  // Scroll listener
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleVoiceSearch = () => {
    if (!recognitionRef.current) { alert("Voice search not supported."); return; }
    if (isListening) { recognitionRef.current.stop(); setIsListening(false); }
    else { setIsListening(true); try { recognitionRef.current.start(); } catch { setIsListening(false); } }
  };

  const handleImageSearch = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSearchingImage(true);
    setAiMatches(null);
    const fd = new FormData();
    fd.append("searchImage", file);
    try {
      const res = await api.post("/products/search/image", fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (res.data.success) { setAiMatches(res.data.products); setAiPreview(URL.createObjectURL(file)); }
    } catch { alert("Visual Search failed."); }
    finally { setIsSearchingImage(false); }
  };

  const handleSearchSubmit = (e) => { e.preventDefault(); setShowSuggestions(false); };

  const suggestionItems = [
    { icon: "🔥", text: "Trending: Ethiopian coffee ceremony sets" },
    { icon: "⭐", text: "Best rated handwoven textiles" },
    { icon: "🆕", text: "New arrivals this week" },
    { icon: "💰", text: "Under 500 ETB" },
  ];

  const craftCards = [
    { label: t("categories.textiles", "Textiles"), Icon: CrossIcon,  iconBg: "from-blue-100 to-blue-200",    barColor: "from-blue-500 to-blue-600",    link: "/products?category=Textiles",      fullDesc: t("product_discovery.textiles_desc", "Traditional Ethiopian weaving creates beautiful fabrics with intricate patterns and vibrant colors."), delay: 0 },
    { label: t("categories.leather_goods", "Leather"),  Icon: CoffeeIcon, iconBg: "from-amber-100 to-amber-200",  barColor: "from-amber-500 to-amber-600",  link: "/products?category=Leather%20Goods", fullDesc: t("product_discovery.leather_desc", "Ethiopian leather craftsmanship is renowned worldwide for its quality and durability."), delay: 0.1 },
    { label: t("categories.basketry", "Basketry"), Icon: BasketIcon, iconBg: "from-emerald-100 to-emerald-200", barColor: "from-emerald-500 to-emerald-600", link: "/products?category=Basketry", fullDesc: t("product_discovery.basketry_desc", "Ancient basketry techniques create functional and decorative pieces using natural materials."), delay: 0.2 },
    { label: t("categories.jewelry", "Jewelry"),  Icon: LeatherIcon, iconBg: "from-purple-100 to-purple-200", barColor: "from-purple-500 to-purple-600", link: "/products?category=Jewelry",    fullDesc: t("product_discovery.jewelry_desc", "Traditional Ethiopian jewelry features intricate metalwork and symbolic designs."), delay: 0.3 },
  ];

  return (
    <div className="min-h-screen bg-white">

      {/* HERO: hidden on mobile, shown on desktop */}
      <div className="hidden sm:block bg-gradient-to-r from-ethiopian-gold/5 via-amber-50/20 to-ethiopian-gold/5 py-10 md:py-16 border-b border-gray-100">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl md:text-5xl font-extrabold mb-3 font-['Playfair_Display',serif] text-gray-900">
              {t("product_discovery.hero_title")}
            </h1>
            <div className="w-20 h-1 bg-ethiopian-gold mx-auto mb-4 rounded-full" />
            <p className="text-base md:text-lg max-w-2xl mx-auto text-gray-600 font-medium leading-relaxed">
              {t("product_discovery.hero_subtitle")}
            </p>
          </motion.div>
        </div>
      </div>

      {/* SEARCH BAR
          Mobile:  compact gray pill, no voice/camera clutter
          Desktop: full bar with voice + camera + suggestions   */}
      <div
        className={`sticky z-40 w-full bg-white border-b border-gray-100 transition-shadow ${isScrolled ? "shadow-md" : "shadow-sm"}`}
        style={{ top: 52 }}
      >
        {/* ── Mobile search ── */}
        <div className="sm:hidden px-2 py-2 bg-white border-b-2 border-gray-100">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-gray-100 rounded-full px-3 py-2 gap-1.5 min-w-0">
              <MagnifyingGlassIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search crafts..."
                className="flex-1 bg-transparent outline-none text-gray-700 placeholder-gray-400 min-w-0 text-sm"
                style={{ fontSize: "16px", lineHeight: "1.2" }}
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery("")} className="shrink-0 text-gray-400">
                  <XMarkIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="shrink-0 bg-ethiopian-gold text-white text-xs font-semibold px-4 py-2 rounded-full whitespace-nowrap"
            >
              Search
            </button>
          </form>
        </div>

        {/* ── Desktop search ── */}
        <div className="hidden sm:block px-4 py-3">
          <div className="max-w-3xl mx-auto relative">
            <form onSubmit={handleSearchSubmit}>
              <div className="flex items-center bg-white border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-ethiopian-gold/30 focus-within:border-ethiopian-gold/50 shadow-sm transition-all">
                <span className="pl-4 shrink-0 text-gray-400">
                  <MagnifyingGlassIcon className="w-5 h-5" />
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder={t("nav.search_placeholder", "Search authentic Ethiopian crafts...")}
                  className="flex-1 py-3 px-3 bg-transparent outline-none text-gray-700 placeholder-gray-400 text-sm min-w-0"
                  style={{ fontSize: "16px" }}
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery("")} className="p-2 text-gray-400 shrink-0">
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleVoiceSearch}
                  className={`p-2 rounded-full mr-0.5 transition-colors ${isListening ? "text-red-500 animate-pulse" : "text-gray-400 hover:text-ethiopian-gold"}`}
                >
                  <MicrophoneIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-full mr-1 text-gray-400 hover:text-ethiopian-gold transition-colors"
                >
                  <CameraIcon className="w-4 h-4" />
                </button>
                <button
                  type="submit"
                  className="bg-ethiopian-gold hover:bg-amber-600 text-white text-sm font-semibold px-5 py-3 rounded-r-2xl shrink-0 transition-colors"
                >
                  Search
                </button>
              </div>

              {showSuggestions && !searchQuery && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  <div className="p-3 border-b border-gray-50">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Recent</p>
                    {recentSearches.map((s, i) => (
                      <button key={i} onClick={() => setSearchQuery(s)} className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg text-left">
                        <ClockIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{s}</span>
                      </button>
                    ))}
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Trending</p>
                    {suggestionItems.map((item, i) => (
                      <button key={i} onClick={() => setSearchQuery(item.text)} className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg text-left">
                        <span className="text-sm shrink-0">{item.icon}</span>
                        <span className="truncate">{item.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
            <input type="file" ref={fileInputRef} onChange={handleImageSearch} accept="image/*" className="hidden" />
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="px-0 sm:container sm:mx-auto sm:px-4 py-0 sm:py-4">

        {/* Voice listening modal */}
        {isListening && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl p-8 text-center max-w-xs mx-4 shadow-2xl">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <MicrophoneIcon className="w-8 h-8 text-red-500" />
              </div>
              <p className="font-bold text-gray-800 mb-1">Listening...</p>
              <p className="text-gray-500 text-sm">Speak to search</p>
            </div>
          </div>
        )}

        {/* AI image search loading */}
        {isSearchingImage && (
          <div className="flex flex-col items-center py-10 mx-3 sm:mx-0 mb-4 bg-amber-50/50 rounded-2xl border border-ethiopian-gold/20">
            <div className="w-10 h-10 border-4 border-ethiopian-gold border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-ethiopian-gold text-sm font-medium animate-pulse">Analyzing image...</p>
          </div>
        )}

        {/* AI results */}
        {aiMatches && !isSearchingImage && (
          <div className="mb-4 mx-2 sm:mx-0">
            <div className="bg-amber-50 border border-ethiopian-gold/30 rounded-xl p-3 sm:p-5 mb-3 flex items-start gap-3">
              {aiPreview && (
                <img src={aiPreview} alt="Query" className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg border-2 border-white shadow-sm shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <SparklesIcon className="w-3.5 h-3.5 text-ethiopian-gold shrink-0" />
                  <p className="font-bold text-gray-900 text-sm">{aiMatches.length} matching products</p>
                </div>
                <p className="text-gray-500 text-xs">Visually similar to your image</p>
              </div>
              <button
                onClick={() => { setAiMatches(null); setAiPreview(null); }}
                className="text-xs font-semibold text-gray-500 hover:text-red-500 border border-gray-200 px-2.5 py-1 rounded-full bg-white shrink-0"
              >
                Clear
              </button>
            </div>
            {aiMatches.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-0.5 sm:gap-4">
                {aiMatches.map((product) => (
                  <div key={product._id} className="relative">
                    <div className="absolute top-1.5 left-1.5 z-20 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <SparklesIcon className="w-2.5 h-2.5" />
                      {Math.round(product.similarityScore * 100)}%
                    </div>
                    <ProductCardWithCart product={product} lazyLoad={false} />
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3 my-4 mx-2 sm:mx-0">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-gray-400 text-[10px] uppercase tracking-widest whitespace-nowrap">Browse catalog</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
          </div>
        )}

        {/* Product list */}
        <ProductList
          searchQuery={searchQuery}
          category={selectedCategory !== "all" ? selectedCategory : categoryFromUrl}
          showFilters={true}
          onClearSearch={() => setSearchQuery("")}
        />
      </div>

      {/* CULTURAL SECTION: 4 cols always */}
      <div className="bg-gradient-to-b from-white to-gray-50 py-6 sm:py-14 md:py-20 border-t border-gray-100 mt-2 sm:mt-0">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="text-center mb-4 sm:mb-10 md:mb-14">
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }}>
              <span className="inline-block px-2.5 py-0.5 bg-ethiopian-gold/10 text-ethiopian-gold text-[10px] sm:text-sm font-semibold rounded-full mb-1.5 sm:mb-4 tracking-wide">
                Craftsmanship Heritage
              </span>
              <h2 className="text-sm sm:text-2xl md:text-4xl font-bold text-gray-900 mb-1 sm:mb-4 font-['Playfair_Display',serif]">
                Ethiopian Craft Traditions
              </h2>
              <div className="w-8 sm:w-16 h-0.5 bg-ethiopian-gold mx-auto mb-1 sm:mb-6" />
              <p className="hidden sm:block text-gray-600 max-w-3xl mx-auto text-base md:text-lg font-light leading-relaxed">
                Ethiopia's rich cultural heritage is reflected in its diverse artisan traditions, from ancient weaving to intricate jewelry making.
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-4 gap-1.5 sm:gap-4 md:gap-6">
            {craftCards.map(({ label, Icon, iconBg, barColor, link, fullDesc, delay }) => (
              <motion.a
                key={label}
                href={link}
                whileHover={{ y: -4 }}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay }}
                viewport={{ once: true }}
                className="group relative bg-white rounded-lg sm:rounded-2xl overflow-hidden shadow-sm sm:shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col"
              >
                <div className={`h-0.5 sm:h-1 w-full bg-gradient-to-r ${barColor}`} />
                {/* Mobile body */}
                <div className="flex flex-col items-center px-1 pt-2.5 pb-2.5 sm:hidden">
                  <div className={`w-9 h-9 bg-gradient-to-br ${iconBg} rounded-lg flex items-center justify-center mb-1.5 text-ethiopian-gold overflow-hidden`}>
                    <span className="block" style={{ transform: "scale(0.5)", transformOrigin: "center" }}>
                      <Icon />
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-800 text-center leading-tight">{label}</span>
                </div>
                {/* Desktop body */}
                <div className="hidden sm:flex flex-col items-center p-5 md:p-8 text-center flex-1">
                  <div className={`w-14 h-14 md:w-20 md:h-20 bg-gradient-to-br ${iconBg} rounded-2xl flex items-center justify-center mb-3 md:mb-5 group-hover:scale-110 transition-transform duration-300 shadow-md text-ethiopian-gold`}>
                    <Icon />
                  </div>
                  <h3 className="text-base md:text-xl font-bold mb-2 md:mb-3 text-gray-800">{label}</h3>
                  <p className="text-gray-500 text-xs md:text-sm leading-relaxed">{fullDesc}</p>
                  <span className="mt-3 md:mt-5 text-ethiopian-gold text-xs md:text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300">
                    Learn More →
                  </span>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fade-in { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
          .animate-fade-in { animation: fade-in 0.2s ease-out; }
        `,
      }} />
    </div>
  );
};

export default Products;
