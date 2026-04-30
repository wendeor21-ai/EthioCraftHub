/**
 * Theme Context for EthioCraft Global
 * Manages global theme settings (dark mode, colors, fonts)
 */

import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState({
    darkMode: localStorage.getItem('darkMode') === 'true',
    primaryColor: localStorage.getItem('primaryColor') || '#D4AF37',
    fontFamily: localStorage.getItem('fontFamily') || 'Inter'
  });

  useEffect(() => {
    // Apply theme to document
    applyTheme(theme);
  }, [theme]);

  const applyTheme = (newTheme) => {
    // Apply dark mode
    if (newTheme.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Apply primary color
    document.documentElement.style.setProperty('--primary-color', newTheme.primaryColor);
    
    // Apply font family
    document.documentElement.style.setProperty('--font-family', newTheme.fontFamily);
    document.body.style.fontFamily = newTheme.fontFamily;

    // Save to localStorage
    localStorage.setItem('darkMode', newTheme.darkMode);
    localStorage.setItem('primaryColor', newTheme.primaryColor);
    localStorage.setItem('fontFamily', newTheme.fontFamily);
  };

  const updateTheme = (updates) => {
    setTheme(prev => {
      const newTheme = { ...prev, ...updates };
      applyTheme(newTheme);
      return newTheme;
    });
  };

  const toggleDarkMode = () => {
    updateTheme({ darkMode: !theme.darkMode });
  };

  const setPrimaryColor = (color) => {
    updateTheme({ primaryColor: color });
  };

  const setFontFamily = (font) => {
    updateTheme({ fontFamily: font });
  };

  const resetTheme = () => {
    const defaultTheme = {
      darkMode: false,
      primaryColor: '#D4AF37',
      fontFamily: 'Inter'
    };
    setTheme(defaultTheme);
    applyTheme(defaultTheme);
  };

  const value = {
    theme,
    updateTheme,
    toggleDarkMode,
    setPrimaryColor,
    setFontFamily,
    resetTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
