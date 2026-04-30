/**
 * 404 Not Found Page
 */

import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-ethiopian-gold">404</h1>
        <h2 className="text-3xl font-semibold text-gray-800 mt-4">Page Not Found</h2>
        <p className="text-gray-600 mt-2 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link 
          to="/" 
          className="btn-ethiopian inline-block"
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
