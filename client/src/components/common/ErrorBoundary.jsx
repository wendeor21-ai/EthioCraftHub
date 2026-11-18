import React from 'react';

/**
 * Global & Component-level Error Boundary for EthioCraft Global
 * Prevents unhandled JavaScript errors from freezing or unmounting the application.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center my-4">
          <p className="text-sm font-bold text-amber-900 mb-2">
            Something went wrong displaying this section.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-4 py-1.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

