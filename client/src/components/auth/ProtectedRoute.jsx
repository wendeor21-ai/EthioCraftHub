/**
 * Protected Route Component for EthioCraft Global
 * 
 * Handles authentication and role-based authorization:
 * - Redirects unauthenticated users to login
 * - Checks user roles for access control
 * - Shows loading state during auth check
 * - Handles artisan verification requirements
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

const ProtectedRoute = ({ 
  children, 
  roles = [], 
  requireVerification = false,
  redirectTo = '/login' 
}) => {
  const { isAuthenticated, user, loading, hasAnyRole, isVerifiedArtisan } = useAuth();
  const location = useLocation();

  console.log('🔒 ProtectedRoute Check:', {
    path: location.pathname,
    isAuthenticated,
    user: user?.email,
    role: user?.role,
    loading,
    requiredRoles: roles
  });

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('❌ Not authenticated, redirecting to login');
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role-based access
  if (roles.length > 0 && !hasAnyRole(roles)) {
    console.log('❌ User does not have required role, redirecting');
    // Redirect based on user role
    if (user?.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (user?.role === 'artisan') {
      return <Navigate to="/artisan/dashboard" replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }

  // Check artisan verification requirement
  // Always allow access to the verification page itself to prevent redirect loops
  if (requireVerification && user?.role === 'artisan' && !isVerifiedArtisan() && location.pathname !== '/artisan/verification') {
    console.log('❌ Artisan not verified, redirecting to verification');
    return <Navigate to="/artisan/verification" replace />;
  }

  // If user must change password, force them to security page (allow /security itself)
  if (user?.mustChangePassword && !location.pathname.startsWith('/security')) {
    console.log('🔐 User must change password, redirecting to security');
    return <Navigate to="/security" replace />;
  }

  console.log('✅ Access granted');
  // User is authenticated and authorized
  return children;
};

// Specific route components for common use cases
export const AdminRoute = ({ children }) => (
  <ProtectedRoute roles={['admin']}>
    {children}
  </ProtectedRoute>
);

export const ArtisanRoute = ({ children, requireVerification = true }) => (
  <ProtectedRoute 
    roles={['artisan', 'admin']} 
    requireVerification={requireVerification}
  >
    {children}
  </ProtectedRoute>
);

export const CustomerRoute = ({ children }) => (
  <ProtectedRoute roles={['customer', 'artisan', 'admin']}>
    {children}
  </ProtectedRoute>
);

export const VerifiedArtisanRoute = ({ children }) => (
  <ProtectedRoute 
    roles={['artisan', 'admin']} 
    requireVerification={true}
  >
    {children}
  </ProtectedRoute>
);

export default ProtectedRoute;
