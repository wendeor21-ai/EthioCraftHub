/**
 * ErrorMessage Component
 * 
 * Displays error messages with retry functionality
 * Ethiopian-inspired styling with cultural colors
 */

const ErrorMessage = ({ 
  message = 'Something went wrong', 
  onRetry = null,
  type = 'error',
  className = ''
}) => {
  // Type configurations
  const typeStyles = {
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: '❌'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: '⚠️'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: 'ℹ️'
    }
  };

  const styles = typeStyles[type] || typeStyles.error;

  return (
    <div className={`
      ${styles.bg} 
      ${styles.border} 
      border 
      rounded-lg 
      p-4 
      ${className}
    `}>
      <div className="flex items-start">
        {/* Icon */}
        <div className="flex-shrink-0 mr-3 text-lg">
          {styles.icon}
        </div>
        
        {/* Content */}
        <div className="flex-1">
          <p className={`${styles.text} text-sm font-medium`}>
            {message}
          </p>
          
          {/* Retry Button */}
          {onRetry && (
            <button
              onClick={onRetry}
              className={`
                mt-3 
                ${styles.text} 
                text-sm 
                font-medium 
                underline 
                hover:no-underline 
                focus:outline-none 
                focus:ring-2 
                focus:ring-offset-2 
                focus:ring-red-500
                transition-all 
                duration-200
              `}
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;