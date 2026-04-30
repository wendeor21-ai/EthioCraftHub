/**
 * LoadingSpinner Component
 * 
 * Reusable loading spinner with Ethiopian-inspired colors
 * Supports different sizes and customizable styling
 */

const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'orange', 
  className = '',
  text = 'Loading...' 
}) => {
  // Size configurations
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
    xlarge: 'w-16 h-16'
  };

  // Color configurations
  const colorClasses = {
    orange: 'border-orange-500',
    red: 'border-red-500',
    green: 'border-green-500',
    blue: 'border-blue-500',
    gray: 'border-gray-500'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Spinner */}
      <div
        className={`
          ${sizeClasses[size]} 
          ${colorClasses[color]}
          border-4 border-t-transparent 
          rounded-full 
          animate-spin
        `}
        role="status"
        aria-label="Loading"
      />
      
      {/* Loading text */}
      {text && (
        <p className="mt-2 text-sm text-gray-600 animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;