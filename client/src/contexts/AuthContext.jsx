/**
 * Authentication Context for EthioCraft Global
 * 
 * Provides authentication state and methods throughout the app:
 * - Login/logout functionality
 * - User state management
 * - JWT token handling
 * - Role-based access control
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { authAPI } from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is logged in on app start
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('user');

      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setIsAuthenticated(true);

          // If account requires password change, stop loading and redirect to security page immediately
          if (parsedUser.mustChangePassword) {
            setLoading(false);
            // avoid redirect loop if already on /security
            try {
              const path = window.location && window.location.pathname;
              if (!path || !path.startsWith('/security')) {
                window.location.href = '/security';
              }
            } catch (e) {
              window.location.href = '/security';
            }
            return;
          }
          
          // Fetch fresh user data from backend to get latest verification status
          try {
            const response = await authAPI.getMe();
            const freshUser = response.data.user;
            
            // Ensure user data has both id and _id for compatibility
            if (freshUser.id && !freshUser._id) {
              freshUser._id = freshUser.id;
            }
            
            setUser(freshUser);
            localStorage.setItem('user', JSON.stringify(freshUser));
            console.log('✅ User data refreshed from backend:', {
              email: freshUser.email,
              role: freshUser.role,
              verificationStatus: freshUser.verification?.status
            });
          } catch (error) {
            console.warn('⚠️ Could not refresh user data from backend, using cached data:', error.message);
            // Continue with cached data if backend fetch fails
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (credentials) => {
    try {
      setLoading(true);
      console.log('🔐 Attempting login with:', { email: credentials.email });
      
      const response = await authAPI.login(credentials);
      console.log('✅ Login response:', response.data);
      
      // Handle both token structures (tokens.accessToken or token)
      const token = response.data.tokens?.accessToken || response.data.token;
      const userData = response.data.user;
      
      if (!token || !userData) {
        console.error('❌ Invalid response structure:', response.data);
        throw new Error('Invalid response from server');
      }
      
      // Ensure user data has both id and _id for compatibility
      if (userData.id && !userData._id) {
        userData._id = userData.id;
      }
      
      // Store token and user data (clear any stale user cache first)
      localStorage.removeItem('user');
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      setIsAuthenticated(true);
      
      console.log('✅ Login successful for user:', userData.email, 'Role:', userData.role);
      // If backend requires password change on next login, redirect to security page
      if (userData.mustChangePassword) {
        // ensure stored then stop loading and redirect (avoid loop if already on /security)
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setLoading(false);
        try {
          const path = window.location && window.location.pathname;
          if (!path || !path.startsWith('/security')) {
            window.location.href = '/security';
          }
        } catch (e) {
          window.location.href = '/security';
        }
        return { success: true, user: userData };
      }

      return { success: true, user: userData };
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);

      // Show the actual server error message so the user knows what went wrong
      const serverMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Login failed';
      toast.error(serverMessage);
      
      // Handle 423 Locked status specially
      if (error.response?.status === 423) {
        const lockUntil = error.response?.data?.lockUntil;
        let message = 'Account is temporarily locked due to multiple failed login attempts.';
        
        if (lockUntil) {
          const unlockTime = new Date(lockUntil);
          const now = new Date();
          const minutesLeft = Math.ceil((unlockTime - now) / 60000);
          
          if (minutesLeft > 60) {
            const hoursLeft = Math.ceil(minutesLeft / 60);
            message = `Account is locked for ${hoursLeft} more hour${hoursLeft > 1 ? 's' : ''}. Please try again later or contact support.`;
          } else if (minutesLeft > 0) {
            message = `Account is locked for ${minutesLeft} more minute${minutesLeft > 1 ? 's' : ''}. Please try again later or contact support.`;
          } else {
            message = 'Account is locked. Please try again in a few moments or contact support.';
          }
        }
        
        return { success: false, error: message, locked: true };
      }
      
      const message = error.response?.data?.message || error.message || 'Login failed';
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      setLoading(true);
      console.log('📝 Attempting registration with:', { 
        email: userData.email, 
        role: userData.role,
        profile: userData.profile 
      });
      
      const response = await authAPI.register(userData);
      console.log('✅ Registration response:', response.data);
      
      // Handle both token structures (tokens.accessToken or token)
      const token = response.data.tokens?.accessToken || response.data.token;
      const newUser = response.data.user;
      
      if (!token || !newUser) {
        console.error('❌ Invalid response structure:', response.data);
        throw new Error('Invalid response from server');
      }
      
      // Ensure user data has both id and _id for compatibility
      if (newUser.id && !newUser._id) {
        newUser._id = newUser.id;
      }
      
      // Store token and user data
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(newUser));
      
      setUser(newUser);
      setIsAuthenticated(true);
      
      console.log('✅ Registration successful for user:', newUser.email, 'Role:', newUser.role);
      return { success: true, user: newUser };
    } catch (error) {
      console.error('❌ Registration error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      const message = error.response?.data?.message || error.message || 'Registration failed';
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call logout endpoint (optional)
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and state
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Update user data
  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // Check if user has specific role
  const hasRole = (role) => {
    return user?.role === role;
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roles) => {
    return roles.includes(user?.role);
  };

  // Get redirect path based on user role and status
  const getRedirectPath = (userRole, userObject = null) => {
    // Use provided userObject or state user
    const currentUser = userObject || user;
    
    switch (userRole) {
      case 'admin':
        return '/admin/dashboard';
      case 'artisan':
        // If not verified, force redirect to verification page
        if (currentUser?.verification?.status !== 'approved') {
          return '/artisan/verification';
        }
        return '/artisan/dashboard';
      case 'customer':
        return '/products';
      default:
        return '/';
    }
  };

  // Check if artisan is verified
  const isVerifiedArtisan = () => {
    return user?.role === 'artisan' && user?.verification?.status === 'approved';
  };

  // Refresh user data from backend
  const refreshUser = async () => {
    try {
      const response = await authAPI.getMe();
      const userData = response.data.user;
      
      // Ensure user data has both id and _id for compatibility
      if (userData.id && !userData._id) {
        userData._id = userData.id;
      }
      
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return null;
    }
  };

  // loginWithToken — used by OAuthCallback after social login redirect
  // Hydrates auth state directly from token + user payload (no API call needed)
  // Wrapped in useCallback to maintain a stable reference across renders
  const loginWithToken = useCallback((accessToken, refreshToken, userData) => {
    // Ensure id/_id consistency
    if (userData.id && !userData._id) userData._id = userData.id;
    if (userData._id && !userData.id) userData.id = userData._id;

    localStorage.setItem('authToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));

    setUser(userData);
    setIsAuthenticated(true);

    console.log('✅ OAuth login hydrated:', userData.email, '|', userData.role);
  }, []); // empty deps: only uses setUser/setIsAuthenticated which are stable

  const value = {
    user,
    token: localStorage.getItem('authToken'), // FIX 3: Expose token for API calls
    loading,
    isAuthenticated,
    login,
    loginWithToken,
    register,
    logout,
    updateUser,
    refreshUser,
    hasRole,
    hasAnyRole,
    getRedirectPath,
    isVerifiedArtisan,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};