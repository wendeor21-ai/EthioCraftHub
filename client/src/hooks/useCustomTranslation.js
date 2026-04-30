import { useTranslation } from 'react-i18next';

/**
 * Custom hook for easy access to translation and language switching.
 * Wraps react-i18next's useTranslation with project-specific helpers.
 */
export const useCustomTranslation = () => {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const currentLanguage = i18n.language;

  return {
    t,
    i18n,
    changeLanguage,
    currentLanguage,
    supportedLanguages: [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'am', name: 'Amharic', nativeName: 'አማርኛ' },
      { code: 'om', name: 'Oromo', nativeName: 'Afaan Oromoo' },
      { code: 'ti', name: 'Tigrigna', nativeName: 'ትግርኛ' }
    ]
  };
};

export default useCustomTranslation;
