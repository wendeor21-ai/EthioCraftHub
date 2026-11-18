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
  const langCode = (currentLng?.code || 'en').toUpperCase().slice(0, 2);

  // Compact mode: small globe + 2-letter code, used in mobile navbar
  if (compact) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="h-9 px-2.5 rounded-full bg-gray-50/90 border border-gray-200 hover:border-amber-500 hover:bg-amber-50/50 flex items-center gap-1 text-xs font-bold text-gray-700 transition-all shadow-2xs cursor-pointer"
          aria-label="Select Language"
        >
          <Globe className="w-3.5 h-3.5 text-gray-600 shrink-0" />
          <span className="text-[11px] font-bold text-gray-800 uppercase leading-none">
            {currentLng.code.slice(0, 2)}
          </span>
          <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-amber-50 cursor-pointer ${isActive ? 'bg-amber-50/60 font-bold' : ''}`}
                >
                  <div className="flex flex-col items-start">
                    <span className={`text-xs ${isActive ? 'text-amber-700 font-bold' : 'text-gray-800 font-medium'}`}>
                      {language.nativeName}
                    </span>
                    <span className="text-[9px] text-gray-400">{language.name}</span>
                  </div>
                  {isActive && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
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
        className="h-9 px-2.5 rounded-full hover:bg-gray-50 transition-all duration-150 flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-emerald-900 cursor-pointer"
        aria-label="Select Language"
      >
        <Globe className="w-4 h-4 text-[#0F5132] shrink-0" />
        <span className="text-xs font-bold text-gray-800 uppercase tracking-tight">{langCode}</span>
        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-150 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-[100] animate-fadeIn divide-y divide-gray-50">
          <div className="px-3 py-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">
            Select Language
          </div>
          {supportedLanguages.map((language) => {
            const isActive = i18n.language === language.code;
            return (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-amber-50 cursor-pointer ${isActive ? 'bg-amber-50/60' : ''}`}
              >
                <div className="flex flex-col items-start">
                  <span className={`text-xs ${isActive ? 'text-amber-700 font-bold' : 'text-gray-800 font-medium'}`}>
                    {language.nativeName}
                  </span>
                  <span className="text-[9px] text-gray-400">{language.name}</span>
                </div>
                {isActive && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
