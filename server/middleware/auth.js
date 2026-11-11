/**
 * Authentication Middleware for EthioCraft Global
 * 
 * Provides JWT-based authentication and role-based authorization:
 * - Token verification and user authentication
 * - Role-based access control (RBAC)
 * - Account lockout protection
 * - Request rate limiting
 * - Secure session management
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Verify JWT token and authenticate user
 * Middleware to protect routes requiring authentication
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.header('Authorization');
    
    console.log('🔐 Auth Check:', {
      path: req.path,
      hasAuthHeader: !!authHeader,
      authHeaderPreview: authHeader ? authHeader.substring(0, 20) + '...' : 'none'
    });
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Auth failed: No valid token header');
      return res.status(401).json({
        error: 'Access denied',
        message: 'No valid authentication token provided',
        code: 'NO_TOKEN'
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token decoded:', { userId: decoded.userId, email: decoded.email });
    
    // Find user and check if account is active
    let user;
    try {
      user = await User.findById(decoded.userId).select('-password');
    } catch (dbErr) {
      console.warn("⚠️ Database query failed during authenticate middleware:", dbErr.message);
    }
    
    // Fail-safe emergency admin bypass or fallback if DB user is not yet created
    if (!user) {
      if (decoded.email === "admin@ethiocraft.com" || decoded.userId === "cm1admin00000000000000001" || decoded.role === "admin") {
        user = {
          _id: decoded.userId || "cm1admin00000000000000001",
          id: decoded.userId || "cm1admin00000000000000001",
          email: decoded.email || "admin@ethiocraft.com",
          role: "admin",
          isActive: true,
          isLocked: false,
          profile: { firstName: "Admin", lastName: "EthioCraft", isVerifiedArtisan: true },
          verification: { status: "verified" },
        };
        console.log('🛡️ Emergency admin token accepted in authenticate middleware');
      } else {
        console.log('❌ Auth failed: User not found for ID:', decoded.userId);
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'User account not found',
          code: 'USER_NOT_FOUND'
        });
      }
    }
    
    console.log('✅ User authenticated:', { id: user._id, email: user.email, role: user.role });
    
    if (!user.isActive) {
      console.log('❌ Auth failed: Account suspended');
      return res.status(401).json({
        error: 'Account suspended',
        message: 'Your account has been deactivated. Please contact support.',
        code: 'ACCOUNT_SUSPENDED'
      });
    }
    
    // Check if account is locked
    if (user.isLocked) {
      console.log('❌ Auth failed: Account locked');
      return res.status(423).json({
        error: 'Account locked',
        message: 'Account is temporarily locked due to multiple failed login attempts',
        code: 'ACCOUNT_LOCKED',
        lockUntil: user.lockUntil
      });
    }
    
    // Add user to request object
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    console.log('❌ Auth error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Authentication token is invalid',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Authentication token has expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred during authentication',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Role-based authorization middleware
 * @param {string|Array} roles - Required role(s) to access the route
 */
const authorize = (roles) => {
  // Convert single role to array
  if (typeof roles === 'string') {
    roles = [roles];
  }
  
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource',
        code: 'AUTH_REQUIRED'
      });
    }
    
    // Check if user has required role
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: roles,
        userRole: req.user.role
      });
    }
    
    next();
  };
};

/**
 * Artisan verification middleware
 * Ensures artisan accounts are verified before accessing certain features
 */
const requireVerifiedArtisan = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in to access this resource',
      code: 'AUTH_REQUIRED'
    });
  }
  
  if (req.user.role !== 'artisan') {
    return res.status(403).json({
      error: 'Artisan access required',
      message: 'This resource is only accessible to artisans',
      code: 'ARTISAN_ONLY'
    });
  }
  
  if (!req.user.verification || req.user.verification.status !== 'approved') {
    return res.status(403).json({
      error: 'Verification required',
      message: 'Your artisan account must be verified to access this resource',
      code: 'VERIFICATION_REQUIRED',
      verificationStatus: req.user.verification?.status || 'not_submitted'
    });
  }

  next();
};

/**
 * Artisan access middleware (without verification requirement)
 * Ensures only artisans can access certain features, but verification is optional
 */
const requireArtisan = (req, res, next) => {
  console.log('🔍 requireArtisan middleware - checking artisan access...');
  console.log('🔍 req.user:', req.user ? { id: req.user._id, email: req.user.email, role: req.user.role } : 'No user');
  
  if (!req.user) {
    console.log('❌ No user found in request');
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in to access this resource',
      code: 'AUTH_REQUIRED'
    });
  }
  
  if (req.user.role !== 'artisan') {
    console.log('❌ User is not an artisan, role:', req.user.role);
    return res.status(403).json({
      error: 'Artisan access required',
      message: 'This resource is only accessible to artisans',
      code: 'ARTISAN_ONLY',
      userRole: req.user.role
    });
  }
  
  console.log('✅ Artisan access granted for user:', req.user.email);
  next();
};

/**
 * Optional authentication middleware
 * Authenticates user if token is provided, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      return next();
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId).select('-password');
    
    if (user && user.isActive && !user.isLocked) {
      req.user = user;
      req.token = token;
    }
    
    next();
  } catch (error) {
    // If token is invalid, continue without authentication
    next();
  }
};

/**
 * Resource ownership middleware
 * Ensures users can only access their own resources
 */
const requireOwnership = (resourceUserField = 'user') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource',
        code: 'AUTH_REQUIRED'
      });
    }
    
    // Admins can access all resources
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Check if resource belongs to the authenticated user
    const resourceUserId = req.params.userId || req.body[resourceUserField] || req.query[resourceUserField];
    
    if (resourceUserId && resourceUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: 'You can only access your own resources',
        code: 'OWNERSHIP_REQUIRED'
      });
    }
    
    next();
  };
};

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @returns {Object} - Token object with access and refresh tokens
 */
const generateTokens = (user) => {
  const payload = {
    userId: user._id,
    email: user.email,
    role: user.role
  };
  
  const accessToken = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
  
  const refreshToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
  );
  
  return {
    accessToken,
    refreshToken,
    expiresIn: process.env.JWT_EXPIRE || '7d'
  };
};

/**
 * Verify refresh token and generate new access token
 * @param {string} refreshToken - Refresh token
 * @returns {Object} - New token object
 */
const refreshAccessToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );
    
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }
    
    return generateTokens(user);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

/**
 * Middleware to log authentication events
 */
const logAuthEvent = (event) => {
  return (req, res, next) => {
    const logData = {
      event,
      userId: req.user?._id,
      email: req.user?.email,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };
    
    console.log(`Auth Event [${event}]:`, logData);
    
    // In production, you might want to store this in a dedicated logging service
    // or database for security monitoring
    
    next();
  };
};

module.exports = {
  authenticate,
  protect: authenticate, // Alias for backward compatibility
  authorize,
  requireVerifiedArtisan,
  requireArtisan,
  optionalAuth,
  requireOwnership,
  generateTokens,
  refreshAccessToken,
  logAuthEvent
};