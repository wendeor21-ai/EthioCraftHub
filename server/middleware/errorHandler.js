/**
 * Error Handling Middleware for EthioCraft Global
 * 
 * Provides centralized error handling with:
 * - Consistent error response format
 * - Environment-specific error details
 * - Error logging and monitoring
 * - Security-conscious error messages
 */

const mongoose = require('mongoose');

/**
 * Custom error class for application-specific errors
 */
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle Mongoose validation errors
 * @param {Error} error - Mongoose validation error
 * @returns {Object} - Formatted error response
 */
const handleValidationError = (error) => {
  const errors = Object.values(error.errors).map(err => ({
    field: err.path,
    message: err.message,
    value: err.value
  }));
  
  return {
    statusCode: 400,
    error: 'Validation Error',
    message: 'Invalid input data provided',
    code: 'VALIDATION_ERROR',
    details: errors
  };
};

/**
 * Handle Mongoose duplicate key errors
 * @param {Error} error - Mongoose duplicate key error
 * @returns {Object} - Formatted error response
 */
const handleDuplicateKeyError = (error) => {
  const field = Object.keys(error.keyValue)[0];
  const value = error.keyValue[field];
  
  let message = `${field} '${value}' already exists`;
  
  // Product-specific duplicate messages
  if (field === 'name') {
    message = `A product with the name '${value}' already exists. Please use a unique name.`;
  } else if (field === 'slug') {
    message = `A product with this URL slug already exists. Try changing the product name.`;
  } else if (field === 'sku') {
    message = `SKU '${value}' is already in use. Each variant must have a unique SKU.`;
  }
  
  return {
    statusCode: 409,
    error: 'Duplicate Entry',
    message,
    code: 'DUPLICATE_ENTRY',
    details: {
      field,
      value
    }
  };
};

/**
 * Handle Mongoose cast errors (invalid ObjectId, etc.)
 * @param {Error} error - Mongoose cast error
 * @returns {Object} - Formatted error response
 */
const handleCastError = (error) => {
  return {
    statusCode: 400,
    error: 'Invalid Data Format',
    message: `Invalid ${error.path}: ${error.value}`,
    code: 'INVALID_FORMAT',
    details: {
      field: error.path,
      value: error.value,
      expectedType: error.kind
    }
  };
};

/**
 * Handle JWT errors
 * @param {Error} error - JWT error
 * @returns {Object} - Formatted error response
 */
const handleJWTError = (error) => {
  const errorMap = {
    'JsonWebTokenError': {
      statusCode: 401,
      message: 'Invalid authentication token',
      code: 'INVALID_TOKEN'
    },
    'TokenExpiredError': {
      statusCode: 401,
      message: 'Authentication token has expired',
      code: 'TOKEN_EXPIRED'
    },
    'NotBeforeError': {
      statusCode: 401,
      message: 'Authentication token not active yet',
      code: 'TOKEN_NOT_ACTIVE'
    }
  };
  
  const errorInfo = errorMap[error.name] || {
    statusCode: 401,
    message: 'Authentication failed',
    code: 'AUTH_ERROR'
  };
  
  return {
    ...errorInfo,
    error: 'Authentication Error'
  };
};

/**
 * Handle file upload errors
 * @param {Error} error - Multer or file upload error
 * @returns {Object} - Formatted error response
 */
const handleFileUploadError = (error) => {
  const errorMap = {
    'LIMIT_FILE_SIZE': {
      statusCode: 413,
      message: 'File size too large',
      code: 'FILE_TOO_LARGE'
    },
    'LIMIT_FILE_COUNT': {
      statusCode: 400,
      message: 'Too many files uploaded',
      code: 'TOO_MANY_FILES'
    },
    'LIMIT_UNEXPECTED_FILE': {
      statusCode: 400,
      message: 'Unexpected file field',
      code: 'UNEXPECTED_FILE'
    }
  };
  
  const errorInfo = errorMap[error.code] || {
    statusCode: 400,
    message: 'File upload failed',
    code: 'UPLOAD_ERROR'
  };
  
  return {
    ...errorInfo,
    error: 'File Upload Error'
  };
};

/**
 * Main error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  
  // Log error for monitoring
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?._id,
    timestamp: new Date().toISOString()
  });
  
  let response = {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    requestId: req.id || 'unknown'
  };
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    response = handleValidationError(err);
  } else if (err.code === 11000) {
    response = handleDuplicateKeyError(err);
  } else if (err.name === 'CastError') {
    response = handleCastError(err);
  } else if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(err.name)) {
    response = handleJWTError(err);
  } else if (err.code && err.code.startsWith('LIMIT_')) {
    response = handleFileUploadError(err);
  } else if (err.isOperational) {
    // Operational errors (AppError instances)
    response = {
      error: err.message,
      message: err.message,
      code: err.code || 'OPERATIONAL_ERROR',
      timestamp: new Date().toISOString(),
      requestId: req.id || 'unknown'
    };
  }
  
  // Set status code
  const statusCode = response.statusCode || err.statusCode || 500;
  
  // Remove statusCode from response body
  delete response.statusCode;
  
  // In production, don't leak error details
  if (process.env.NODE_ENV === 'production') {
    // Remove sensitive information
    delete response.stack;
    
    // Generic message for 500 errors
    if (statusCode === 500) {
      response = {
        error: 'Internal Server Error',
        message: 'Something went wrong on our end. Please try again later.',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        requestId: req.id || 'unknown'
      };
    }
  } else {
    // In development, include stack trace
    response.stack = err.stack;
  }
  
  res.status(statusCode).json(response);
};

/**
 * Handle 404 errors for undefined routes
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route ${req.originalUrl} not found`,
    404,
    'ROUTE_NOT_FOUND'
  );
  
  next(error);
};

/**
 * Async error wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Validation error helper
 */
const createValidationError = (message, field = null, value = null) => {
  const error = new AppError(message, 400, 'VALIDATION_ERROR');
  if (field) {
    error.details = { field, value };
  }
  return error;
};

/**
 * Authorization error helper
 */
const createAuthError = (message = 'Authentication required', code = 'AUTH_REQUIRED') => {
  return new AppError(message, 401, code);
};

/**
 * Forbidden error helper
 */
const createForbiddenError = (message = 'Access forbidden', code = 'ACCESS_FORBIDDEN') => {
  return new AppError(message, 403, code);
};

/**
 * Not found error helper
 */
const createNotFoundError = (resource = 'Resource', code = 'NOT_FOUND') => {
  return new AppError(`${resource} not found`, 404, code);
};

/**
 * Conflict error helper
 */
const createConflictError = (message, code = 'CONFLICT') => {
  return new AppError(message, 409, code);
};

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  createValidationError,
  createAuthError,
  createForbiddenError,
  createNotFoundError,
  createConflictError
};