import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useCustomTranslation } from '../../hooks/useCustomTranslation';

/**
 * LanguageSwitcher Component
 * 
 * A professional dropdown for theme-consistent language switching.
 * Features:
 * - Persistent selected language
 * - Smooth transition and Lucide icons
 * - Professional layout with native language names
 */
const LanguageSwitcher = ({ compact = false }) => {
  const { i18n, changeLanguage, supportedLanguages } = useCustomTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (lngCode) => {
    changeLanguage(lngCode);
    setIsOpen(false);
  };

  const currentLng = supportedLanguages.find(l => l.code === i18n.language) || supportedLanguages[0];

  // Compact mode: small globe + 2-letter code, used in mobile navbar
  if (compact) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-gray-50 border border-gray-200 hover:border-ethiopian-gold transition-all"
          aria-label="Select Language"
        >
          <Globe className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-[11px] font-bold text-gray-700 uppercase leading-none">
            {currentLng.code.slice(0, 2)}
          </span>
          <ChevronDown className={`w-2.5 h-2.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 z-[9999]">
            <div className="px-3 py-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">
              Language
            </div>
            {supportedLanguages.map((language) => {
              const isActive = i18n.language === language.code;
              return (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-amber-50 ${isActive ? 'bg-amber-50/40' : ''}`}
                >
                  <div className="flex flex-col items-start">
                    <span className={`text-xs font-bold ${isActive ? 'text-ethiopian-gold' : 'text-gray-800'}`}>
                      {language.nativeName}
                    </span>
                    <span className="text-[9px] text-gray-400">{language.name}</span>
                  </div>
                  {isActive && <Check className="w-3.5 h-3.5 text-ethiopian-gold shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/50 backdrop-blur-sm border border-gray-200 hover:border-ethiopian-gold hover:bg-white transition-all duration-200 shadow-sm group"
        aria-label="Select Language"
      >
        <Globe className="w-4 h-4 text-gray-600 group-hover:text-ethiopian-gold transition-colors" />
        <span className="text-sm font-semibold text-gray-700">{currentLng.nativeName}</span>
        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-[100] animate-fade-in divide-y divide-gray-50">
          <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">
            Select Language
          </div>
          {supportedLanguages.map((language) => {
            const isActive = i18n.language === language.code;
            return (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-amber-50 group ${
                  isActive ? 'bg-amber-50/30' : ''
                }`}
              >
                <div className="flex flex-col items-start">
                  <span className={`font-bold ${isActive ? 'text-ethiopian-gold' : 'text-gray-900'}`}>
                    {language.nativeName}
                  </span>
                  <span className="text-[10px] text-gray-500">{language.name}</span>
                </div>
                {isActive && <Check className="w-4 h-4 text-ethiopian-gold" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
