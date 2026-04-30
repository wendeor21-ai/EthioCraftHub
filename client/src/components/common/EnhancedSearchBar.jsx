/**
 * Enhanced SearchBar Component for EthioCraft Global
 * 
 * Features:
 * - Text search with backend integration
 * - Voice search using Web Speech API
 * - Image search using Gemini AI
 * - Ethiopian-inspired design
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  MicrophoneIcon,
  CameraIcon,
  XMarkIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { trackSearch } from '../../utils/trackingUtils';
import { useCustomTranslation } from '../../hooks/useCustomTranslation';

const EnhancedSearchBar = ({
  placeholder,
  className = '',
  onSearch,
  value,
  autoFocus = false
}) => {
  const { t } = useCustomTranslation();
  const displayPlaceholder = placeholder || t('nav.search_placeholder', 'Search authentic Ethiopian crafts...');
  const [searchQuery, setSearchQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const searchRef = useRef(null);
  const suggestionsRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const navigate = useNavigate();

  // Sync external value
  useEffect(() => {
    if (value !== undefined && value !== searchQuery) {
      setSearchQuery(value);
    }
  }, [value]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        setIsListening(false);
        // Auto-submit after voice input
        handleSearch(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          setError(t('errors.voice_no_speech', "Didn't catch that. Please try speaking again."));
        } else {
          setError(t('errors.voice_failed', 'Voice search failed. Please try again.'));
        }
        setIsListening(false);
        setTimeout(() => setError(''), 3000);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Fetch suggestions with debounce
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length < 2) {
        setSuggestions([]);
        setShowSuggestions(false); // Hide suggestions if query is too short
        return;
      }

      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const origin = apiUrl.replace(/\/api\/?$/, "");
        const response = await axios.get(`${origin}/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`);
        if (response.data.success) {
          setSuggestions(response.data.suggestions);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error('Suggestions fetch error:', err);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Handle outside click to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle text search
  const handleSearch = (query = searchQuery) => {
    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      setShowSuggestions(false);
      // Track search for recommendations
      trackSearch(trimmedQuery);

      if (onSearch) {
        onSearch(trimmedQuery);
      } else {
        navigate(`/products?search=${encodeURIComponent(trimmedQuery)}`);
      }
    } else {
      if (onSearch) {
        onSearch('');
      } else {
        navigate('/products');
      }
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion.text);
    setShowSuggestions(false);
    if (suggestion.type === 'product') {
      navigate(`/products/${suggestion.id}`);
    } else if (suggestion.type === 'category') {
      navigate(`/products?category=${encodeURIComponent(suggestion.text)}`);
    } else {
      handleSearch(suggestion.text);
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch();
  };

  // Handle voice search
  const handleVoiceSearch = () => {
    if (!recognitionRef.current) {
      setError(t('errors.voice_unsupported', 'Voice search is not supported in your browser.'));
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setError('');
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setError(t('errors.voice_failed', 'Could not start voice search.'));
        setIsListening(false);
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  // Handle image search
  const handleImageSearch = async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError(t('errors.image_invalid', 'Please upload an image file.'));
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError(t('errors.image_too_large', 'Image size must be less than 5MB.'));
      setTimeout(() => setError(''), 3000);
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result.split(',')[1];

        try {
          // Send to backend for Gemini AI analysis
          const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
          const origin = apiUrl.replace(/\/api\/?$/, "");
          const response = await axios.post(`${origin}/api/search/image`, {
            image: base64Image,
            mimeType: file.type
          });

          if (response.data.success && response.data.searchQuery) {
            setSearchQuery(response.data.searchQuery);
            // Navigate to products with AI-generated search query
            navigate(`/products?search=${encodeURIComponent(response.data.searchQuery)}&imageSearch=true`);
          } else {
            setError(t('errors.image_analysis_failed', 'Could not analyze image. Please try again.'));
            setTimeout(() => setError(''), 3000);
          }
        } catch (error) {
          console.error('Image search error:', error);
          setError(error.response?.data?.message || t('errors.image_analysis_failed', 'Image search failed. Please try again.'));
          setTimeout(() => setError(''), 3000);
        } finally {
          setIsAnalyzing(false);
        }
      };

      reader.onerror = () => {
        setError(t('errors.image_read_failed', 'Failed to read image file.'));
        setTimeout(() => setError(''), 3000);
        setIsAnalyzing(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Image processing error:', error);
      setError(t('errors.image_process_failed', 'Failed to process image.'));
      setTimeout(() => setError(''), 3000);
      setIsAnalyzing(false);
    }
  };

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSearch(file);
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Trigger file input click
  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  // Clear search
  const handleClear = () => {
    setSearchQuery('');
    setError('');
    if (onSearch) {
      onSearch('');
    } else {
      navigate('/products');
    }
  };

  return (
    <div className={`relative ${className}`} ref={searchRef}>
      <form onSubmit={handleSubmit} className="relative z-50">
        {/* Unified Search Bar */}
        <div className="group relative flex items-center bg-gray-50/50 rounded-full border border-gray-200 focus-within:border-ethiopian-gold focus-within:ring-2 focus-within:ring-amber-50 transition-all duration-300">
          {/* Search Icon */}
          <div className="pl-4 pr-2 pointer-events-none flex-shrink-0">
            <MagnifyingGlassIcon className={`w-5 h-5 transition-colors ${searchQuery ? 'text-ethiopian-gold' : 'text-gray-400'}`} />
          </div>

          {/* Input Field */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
            placeholder={displayPlaceholder}
            autoFocus={autoFocus}
            disabled={isListening || isAnalyzing}
            className="w-full py-2.5 bg-transparent text-gray-900 placeholder-gray-400 font-medium text-sm focus:outline-none"
          />

          {/* Action Icons Wrapper */}
          <div className="flex items-center pr-3 space-x-1">
            {searchQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}

            <div className="h-6 w-[1px] bg-gray-200 mx-1"></div>

            <button
              type="button"
              onClick={handleVoiceSearch}
              className={`p-2 rounded-full transition-all ${isListening ? 'bg-red-50 text-red-500 border border-red-200' : 'text-gray-400 hover:text-ethiopian-gold hover:bg-amber-50'}`}
              title={t('nav.voice_search', 'Voice Search')}
            >
              <MicrophoneIcon className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={triggerImageUpload}
              className={`p-2 rounded-full transition-all ${isAnalyzing ? 'bg-orange-50 text-orange-500 border border-orange-200' : 'text-gray-400 hover:text-ethiopian-gold hover:bg-amber-50'}`}
              title={t('nav.visual_search', 'Visual Search')}
            >
              <CameraIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-gray-50">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('nav.quick_results', 'Quick Results')}</h4>
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full flex items-center px-4 py-3 hover:bg-gray-50 transition-colors text-left group"
              >
                <div className={`p-2 rounded-lg mr-3 ${suggestion.type === 'category' ? 'bg-amber-50 text-amber-600' :
                  suggestion.type === 'brand' ? 'bg-blue-50 text-blue-600' :
                    'bg-gray-50 text-gray-600'
                  }`}>
                  {suggestion.type === 'category' ? <SparklesIcon className="w-4 h-4" /> :
                    suggestion.type === 'brand' ? <MagnifyingGlassIcon className="w-4 h-4" /> :
                      <MagnifyingGlassIcon className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-ethiopian-gold transition-colors">{suggestion.text}</p>
                  <p className="text-[10px] text-gray-400 uppercase font-black">{suggestion.type}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error/Status Overlay */}
      {(error || isListening || isAnalyzing) && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-[110]">
          {error && (
            <div className="bg-red-50 text-red-600 text-xs py-2 px-4 rounded-lg border border-red-100 shadow-sm animate-bounce">
              {error}
            </div>
          )}
          {isListening && (
            <div className="bg-white text-gray-800 text-sm py-3 px-4 rounded-xl shadow-lg border border-gray-100 flex items-center justify-center space-x-2 animate-in fade-in slide-in-from-top-2">
              <span className="font-bold text-red-500">{t('nav.listening', 'Listening')}</span>
              <div className="flex space-x-1 pt-1">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          {isAnalyzing && (
            <div className="bg-white text-gray-800 text-sm py-4 px-5 rounded-xl shadow-lg border border-gray-100 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-orange-500 flex items-center gap-2">
                  <SparklesIcon className="w-5 h-5 animate-pulse" />
                  {t('nav.analyzing_image', 'Scanning Image...')}
                </span>
              </div>
              <div className="w-full bg-orange-100 rounded-full h-2 overflow-hidden relative">
                <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                <div className="h-full bg-orange-500 w-full rounded-full animate-pulse flex items-center justify-center"></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedSearchBar;
