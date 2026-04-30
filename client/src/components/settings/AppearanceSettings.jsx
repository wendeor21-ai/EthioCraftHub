/**
 * Appearance Settings Component
 * 
 * Allows users to toggle between Light and Dark mode
 * Uses Tailwind CSS dark mode with localStorage persistence
 */

import { useState, useEffect } from 'react';
import { 
  SunIcon, 
  MoonIcon,
  ComputerDesktopIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

const AppearanceSettings = () => {
  const [theme, setTheme] = useState('light');

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (newTheme) => {
    const root = window.document.documentElement;
    
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else if (newTheme === 'light') {
      root.classList.remove('dark');
    } else {
      // System preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  const themes = [
    {
      id: 'light',
      name: 'Light',
      description: 'Clean and bright interface',
      icon: SunIcon,
      preview: 'bg-white border-gray-200'
    },
    {
      id: 'dark',
      name: 'Dark',
      description: 'Easy on the eyes in low light',
      icon: MoonIcon,
      preview: 'bg-gray-900 border-gray-700'
    },
    {
      id: 'system',
      name: 'System',
      description: 'Matches your device settings',
      icon: ComputerDesktopIcon,
      preview: 'bg-gradient-to-r from-white to-gray-900 border-gray-400'
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Appearance
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Customize how EthioCraft Global looks on your device
        </p>
      </div>

      {/* Theme Options */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Theme Mode
        </label>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {themes.map((themeOption) => {
            const Icon = themeOption.icon;
            const isSelected = theme === themeOption.id;
            
            return (
              <button
                key={themeOption.id}
                onClick={() => handleThemeChange(themeOption.id)}
                className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
                  isSelected
                    ? 'border-ethiopian-gold bg-amber-50 dark:bg-gray-700'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                {/* Selected Indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-ethiopian-gold rounded-full flex items-center justify-center">
                    <CheckIcon className="w-4 h-4 text-white" />
                  </div>
                )}

                {/* Theme Preview */}
                <div className={`w-full h-20 rounded-lg mb-3 border-2 ${themeOption.preview}`} />

                {/* Theme Info */}
                <div className="flex items-center space-x-3 mb-2">
                  <Icon className={`w-5 h-5 ${
                    isSelected ? 'text-ethiopian-gold' : 'text-gray-600 dark:text-gray-400'
                  }`} />
                  <span className={`font-semibold ${
                    isSelected ? 'text-ethiopian-gold' : 'text-gray-900 dark:text-white'
                  }`}>
                    {themeOption.name}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 text-left">
                  {themeOption.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview Section */}
      <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Preview
        </h3>
        
        <div className="space-y-4">
          {/* Sample Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Sample Product Card
            </h4>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
              This is how your content will look with the selected theme.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-ethiopian-gold font-bold">1,500 ETB</span>
              <button className="px-4 py-2 bg-ethiopian-gold text-white rounded-lg text-sm hover:bg-ethiopian-earth transition-colors">
                Add to Cart
              </button>
            </div>
          </div>

          {/* Sample Text */}
          <div className="space-y-2">
            <p className="text-gray-900 dark:text-white font-medium">
              Primary Text Color
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Secondary Text Color
            </p>
            <p className="text-gray-500 dark:text-gray-500">
              Muted Text Color
            </p>
          </div>
        </div>
      </div>

      {/* Additional Settings */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
              About Dark Mode
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Dark mode reduces eye strain in low-light environments and can help save battery on OLED screens. 
              Your preference is saved and will be applied across all pages.
            </p>
          </div>
        </div>
      </div>

      {/* Save Confirmation */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Theme changes are saved automatically
        </p>
        <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
          <CheckIcon className="w-5 h-5" />
          <span className="text-sm font-medium">Saved</span>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSettings;
