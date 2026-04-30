import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import TRANSLATIONS_EN from './locales/en/translation.json';
import TRANSLATIONS_AM from './locales/am/translation.json';
import TRANSLATIONS_OM from './locales/om/translation.json';
import TRANSLATIONS_TI from './locales/ti/translation.json';

const resources = {
  en: {
    translation: TRANSLATIONS_EN
  },
  am: {
    translation: TRANSLATIONS_AM
  },
  om: {
    translation: TRANSLATIONS_OM
  },
  ti: {
    translation: TRANSLATIONS_TI
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'am', // Set default language to Amharic
    fallbackLng: 'am', // Set fallback language to Amharic
    
    // Names of languages (helpful for the switcher)
    supportedLngs: ['en', 'am', 'om', 'ti'],
    
    interpolation: {
      escapeValue: false // react already safes from xss
    },
    
    detection: {
      order: ['localStorage', 'cookie', 'navigator', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage', 'cookie']
    }
  });

export default i18n;
