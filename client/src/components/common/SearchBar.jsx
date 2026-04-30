/**
 * SearchBar Component for EthioCraft Global
 * 
 * AI-Enhanced search with cultural context
 * Features debounced search and Ethiopian styling
 */

import React, { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

const SearchBar = ({ 
  value = '', 
  onChange, 
  placeholder = 'Search products...', 
  className = '',
  debounceMs = 300 
}) => {
  const [localValue, setLocalValue] = useState(value);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onChange) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, onChange, debounceMs]);

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleClear = () => {
    setLocalValue('');
    if (onChange) {
      onChange('');
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Icon */}
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
      </div>

      {/* Search Input */}
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="
          w-full 
          pl-10 
          pr-10 
          py-3 
          border 
          border-gray-300 
          rounded-lg 
          focus:outline-none 
          focus:ring-2 
          focus:ring-orange-500 
          focus:border-transparent 
          bg-white 
          text-gray-900 
          placeholder-gray-500
          shadow-sm
          transition-all
          duration-200
        "
      />

      {/* Clear Button */}
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;